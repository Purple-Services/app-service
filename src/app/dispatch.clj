(ns app.dispatch
  (:require [common.db :refer [conn !select !insert !update]]
            [common.config :as config]
            [common.util :refer [! cents->dollars-str five-digit-zip-code
                                 get-event-time in? minute-of-day->hmma now-unix
                                 only-prod segment-client send-sms
                                 split-on-comma unix->minute-of-day]]
            [common.orders :as orders]
            [common.users :as users]
            [common.zones :refer [get-fuel-prices get-service-fees
                                  get-service-time-bracket
                                  get-zone-by-zip-code order->zone-id
                                  zip-in-zones?]]
            [common.subscriptions :as subscriptions]
            [ardoq.analytics-clj :as segment]
            [clojure.algo.generic.functor :refer [fmap]]
            [clojure.java.jdbc :as sql]
            [clojure.string :as s]
            [clojure.walk :refer [keywordize-keys stringify-keys]]
            [overtone.at-at :as at-at]
            [app.couriers :as couriers]
            [app.orders :refer [get-all-current]]
            [app.users :refer [call-user]]
            [opt.planner :refer [compute-suggestion]]))

(defn get-gas-prices
  "Given a zip-code, return the gas prices."
  [zip-code]
  (if (zip-in-zones? zip-code)
    {:success true
     :gas_prices (get-fuel-prices zip-code)}
    {:success false
     :message "Location Outside Service Area"
     ;; to make legacy app versions happy
     :gas_prices {:87 0 :91 0}}))

(defn delivery-time-map
  [time-str service-fee num-free num-free-used sub-discount]
  (let [fee-str #(if (= % 0) "free" (str "$" (cents->dollars-str %)))
        gen-text #(str time-str " (" % ")")]
    (if (not (nil? num-free)) ;; using a subscription?
      (let [num-free-left (- num-free num-free-used)]
        (if (pos? num-free-left)
          {:service_fee 0
           :text (gen-text (str num-free-left " left"))}
          (let [after-discount (max 0 (+ service-fee sub-discount))]
            {:service_fee after-discount
             :text (gen-text (fee-str after-discount))})))
      {:service_fee service-fee
       :text (gen-text (fee-str service-fee))})))

(defn delivery-times-map
  "Given subscription usage map and service fee, create the delivery-times map."
  [sub service-fees]
  (merge {}
         ;; don't include the 3-hour option is they're using 1-hour subscription
         (when (not (pos? (or (:num_free_one_hour sub) 0)))
           {180 (merge {:order 0}
                       (delivery-time-map "within 3 hours"
                                          (:180 service-fees)
                                          (:num_free_three_hour sub)
                                          (:num_free_three_hour_used sub)
                                          (:discount_three_hour sub)))})
         {60 (merge {:order 1}
                    (delivery-time-map "within 1 hour"
                                       (:60 service-fees)
                                       (:num_free_one_hour sub)
                                       (:num_free_one_hour_used sub)
                                       (:discount_one_hour sub)))}))

(defn num-couriers-connected-in-market
  "How many couriers are currently connected and on duty in the market that this
  zone is in?"
  [zone-id]
  (->> (couriers/get-all-connected (conn))
       (couriers/filter-by-market (quot zone-id 50))
       count))

(defn enough-couriers?
  "Does the market that this ZIP is in have enough couriers to offer service?"
  [zip-code subscription]
  (let [zone-id (:id (get-zone-by-zip-code zip-code))]
    (or (in? [0 2 3] (quot zone-id 50)) ;; LA, OC, SEA are exempt from this constraint
        (and (not (nil? (:id subscription))) ;; subscribers are exempt
             (not= (:id subscription) 0))
        (pos? (num-couriers-connected-in-market zone-id)))))

;; TODO this function should consider if a zone is actually "active"
(defn available
  [good-time? zip-code subscription enough-couriers-delay octane]
  {:octane octane
   :gallon_choices config/gallon-choices
   :default_gallon_choice config/default-gallon-choice
   :price_per_gallon (get (get-fuel-prices zip-code) (keyword octane))
   :times (->> (get-service-fees zip-code)
               (delivery-times-map subscription)
               (filter (fn [[time time-map]]
                         (and good-time?
                              @enough-couriers-delay)))
               (into {}))
   :tire_pressure_check_price config/tire-pressure-check-price
   ;; for legacy app versions (< 1.2.2)
   :gallons 15})

(defn availability
  "Get an availability map to tell client what orders it can offer to user."
  [db-conn zip-code user-id]
  (let [user (users/get-user-by-id db-conn user-id)
        subscription (when (subscriptions/valid-subscription? user)
                       (subscriptions/get-with-usage db-conn user))]
    (segment/track segment-client user-id "Availability Check"
                   {:address_zip (five-digit-zip-code zip-code)})
    (merge
     {:success true
      :user (merge (select-keys user users/safe-authd-user-keys)
                   {:subscription_usage subscription})
      :system {:referral_referred_value config/referral-referred-value
               :referral_referrer_gallons config/referral-referrer-gallons
               :subscriptions
               (into {} (map (juxt :id identity)
                             (!select db-conn "subscriptions" ["*"] {})))}}
     ;; construct a map of availability
     (if (and (zip-in-zones? zip-code) (:active (get-zone-by-zip-code zip-code)))
       ;; we service this ZIP code
       (let [[open-minute close-minute] (get-service-time-bracket zip-code)
             good-time? (<= open-minute
                            (unix->minute-of-day (now-unix))
                            close-minute)
             enough-couriers-delay (delay (enough-couriers? zip-code subscription))]
         {:availabilities (map (partial available
                                        good-time?
                                        zip-code
                                        subscription
                                        enough-couriers-delay)
                               ["87" "91"])
          :unavailable-reason ;; iff unavailable (client determines from :availabilities)
          (cond (= 5 open-minute close-minute) ;; special case for closing zone
                (do (segment/track segment-client user-id "Availability Check Said Unavailable"
                                   {:address_zip (five-digit-zip-code zip-code)
                                    :reason "manual-closure-no-couriers"})
                    (str "We are busy. There are no couriers available. Please "
                         "try again later."))

                (= 6 open-minute close-minute)
                (do (segment/track segment-client user-id "Availability Check Said Unavailable"
                                   {:address_zip (five-digit-zip-code zip-code)
                                    :reason "manual-closure-holiday"})
                    (str "We are closed for the holiday. We will be back soon. "
                         "Please enjoy your holiday!"))

                (= 7 open-minute close-minute)
                (do (segment/track segment-client user-id "Availability Check Said Unavailable"
                                   {:address_zip (five-digit-zip-code zip-code)
                                    :reason "manual-closure-inclement-weather"})
                    (str "We want everyone to stay safe and are closed due to "
                         "inclement weather. We will be back shortly!"))

                ;; This one should only be used for the weekend.
                (= 8 open-minute close-minute)
                (do (segment/track segment-client user-id "Availability Check Said Unavailable"
                                   {:address_zip (five-digit-zip-code zip-code)
                                    :reason "manual-closure-custom"})
                    (let [zone-id (:id (get-zone-by-zip-code zip-code))]
                      (cond
                        (= 1 (quot zone-id 50)) ;; san diego
                        (str "Sorry, the service hours for this ZIP code are "
                             "7:30am to 8:30pm, Monday to Friday. Thank you "
                             "for your business.")
                        
                        (= 2 (quot zone-id 50)) ;; oc
                        (str "Sorry, the service hours for this ZIP code are "
                             "9am to 3:30pm, Monday to Friday. Thank you "
                             "for your business.")

                        (= 3 (quot zone-id 50)) ;; seattle
                        (str "Sorry, the service hours for this ZIP code are "
                             "3pm to 8:30pm, Monday to Friday. Thank you "
                             "for your business.")

                        :else
                        (str "Sorry, this ZIP code is currently closed."))))

                (not good-time?)
                (do (segment/track segment-client user-id "Availability Check Said Unavailable"
                                   {:address_zip (five-digit-zip-code zip-code)
                                    :reason "outside-service-hours"})
                    (let [zone-id (:id (get-zone-by-zip-code zip-code))]
                      (cond
                        (in? [1 2 3] (quot zone-id 50))
                        (str "Sorry, the service hours for this ZIP code are "
                             (minute-of-day->hmma open-minute)
                             " to "
                             (minute-of-day->hmma close-minute)
                             ", Monday to Friday. Thank you for your business.")

                        :else
                        (str "Sorry, the service hours for this ZIP code are "
                             (minute-of-day->hmma open-minute)
                             " to "
                             (minute-of-day->hmma close-minute)
                             " every day."))))

                (not @enough-couriers-delay)
                (do (segment/track segment-client user-id "Availability Check Said Unavailable"
                                   {:address_zip (five-digit-zip-code zip-code)
                                    :reason "no-couriers-available"})
                    (str "We are busy. There are no couriers available. Please "
                         "try again later."))

                ;; it's available, no unavailable-reason needed
                :else "")})
       ;; we don't service this ZIP code
       {:availabilities [{:octane "87" :gallons 15 :times {} :price_per_gallon 0}
                         {:octane "91" :gallons 15 :times {} :price_per_gallon 0}]
        :unavailable-reason
        (do (segment/track segment-client user-id "Availability Check Said Unavailable"
                           {:address_zip (five-digit-zip-code zip-code)
                            :reason "outside-service-area"})
            (str "Sorry, we are unable to deliver gas to your "
                 "location. We are rapidly expanding our service "
                 "area and hope to offer service to your "
                 "location very soon."))}))))

(defn update-courier-state
  "Marks couriers as disconnected as needed."
  [db-conn]
  (let [expired-couriers (->> (couriers/get-all-expired db-conn)
                              (users/include-user-data db-conn))]
    (when-not (empty? expired-couriers)
      (only-prod (run!
                  #(send-sms
                    (:phone_number %)
                    "You have just disconnected from the Purple Courier App.")
                  expired-couriers))
      (sql/with-connection db-conn
        (sql/update-values
         "couriers"
         [(str "id IN (\""
               (s/join "\",\"" (map :id expired-couriers))
               "\")")]
         {:connected 0})))))

(defn remind-couriers
  "Notifies couriers if they have not Accepted an order that's assign to them."
  [db-conn]
  (let [assigned-orders (!select db-conn "orders" ["*"] {:status "assigned"})
        tardy? (fn [time-assigned]
                 (<= (+ time-assigned config/courier-reminder-time)
                     (quot (System/currentTimeMillis) 1000)
                     (+ time-assigned config/courier-reminder-time
                        (- (quot config/process-interval 1000) 1))))
        twilio-url (str config/base-url "twiml/courier-new-order")
        f #(when (tardy? (get-event-time (:event_log %) "assigned"))
             (call-user db-conn (:courier_id %) twilio-url))]
    (run! f assigned-orders)))

(defn new-assignments
  [os cs]
  (let [new-and-first #(and (:new_assignment %)
                            (= 1 (:courier_pos %)))]
    (filter
     (comp new-and-first val)
     (fmap (comp keywordize-keys (partial into {}))
           (compute-suggestion
            {"orders" (->> os
                           (map #(assoc %
                                        :status_times
                                        (-> (:event_log %)
                                            (s/split #"\||\s")
                                            (->> (remove s/blank?)
                                                 (apply hash-map)
                                                 (fmap read-string)))
                                        :zone (order->zone-id %)))
                           (map (juxt :id stringify-keys))
                           (into {}))
             "couriers" (->> cs
                             (map #(assoc % :zones (apply list (:zones %))))
                             (map (juxt :id stringify-keys))
                             (into {}))})))))

;; We start with a prev-state of blank; so that auto-assign is called when
;; server is booted.
(def prev-state (atom {:current-orders []
                       :on-duty-couriers []}))

;; If you added to the select-keys for 'cs' and include :last_ping
;; or :lat and :lng, then auto-assign would run every time courier changes
;; position; which may or may not be desirable.
(defn get-state
  [os cs]
  {:current-orders (map #(select-keys % [:id :status :courier_id]) os)
   :on-duty-couriers (map #(select-keys % [:id :active :on_duty :connected
                                           :busy :zones]) cs)})

(defn diff-state?
  "Has state changed significantly to trigger an auto-assign call?"
  [os cs]
  {:post [(reset! prev-state (get-state os cs))]}
  (not= @prev-state (get-state os cs)))

(defn auto-assign
  [db-conn]
  (let [os (get-all-current db-conn)
        cs (couriers/get-all-on-duty db-conn)]
    (!insert
     db-conn
     "state_log"
     {:data
      (str {:current-orders (map #(select-keys % [:id :status :courier_id]) os)
            :on-duty-couriers (map #(select-keys % [:id :active :on_duty
                                                    :connected :busy :zones
                                                    :gallons_87 :gallons_91
                                                    :lat :lng :last_ping]) cs)})
      })
    (when (diff-state? os cs)
      (run! #(orders/assign db-conn (key %) (:courier_id (val %))
                            :no-reassigns true)
            (new-assignments os cs)))))

