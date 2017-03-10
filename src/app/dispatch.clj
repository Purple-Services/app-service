(ns app.dispatch
  (:require [common.db :refer [conn !select !insert !update]]
            [common.config :as config]
            [common.util :refer [! cents->dollars-str five-digit-zip-code
                                 get-event-time in? minute-of-day->hmma
                                 now-unix only-prod only-prod-or-dev
                                 segment-client send-sms split-on-comma
                                 unix->minute-of-day log-error catch-notify
                                 unix->day-of-week]]
            [common.orders :as orders]
            [common.users :as users]
            [common.zones :refer [get-zip-def is-open-now? order->zones]]
            [common.subscriptions :as subscriptions]
            [common.users :refer [is-child-user-with-no-vehicles?]]
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
  [db-conn zip-code]
  (if-let [zip-def (get-zip-def db-conn zip-code)]
    {:success true
     :gas_prices (:gas-price zip-def)}
    {:success false
     :message "Location Outside Service Area"
     ;; to make legacy app versions happy that expect :gas_prices always
     :gas_prices {:87 0 :91 0}}))

(defn delivery-time-map
  "Build a map that describes a delivery time option for the mobile app."
  [time-str      ; e.g., "within 5 hours"
   delivery-fee  ; fee amount in cents
   num-free      ; number of free deliveries that subscription provides
   num-free-used ; number of free deliveries already used in this period
   sub-discount  ; the discount the subscription gives after all free used
   is-available?] ; is this time option currently available?
  (let [fee-str #(if (= % 0) "free" (str "$" (cents->dollars-str %)))
        gen-text #(str time-str " (" % ")")]
    (if (not (nil? num-free)) ;; using a subscription?
      (let [num-free-left (- num-free num-free-used)]
        (if (pos? num-free-left)
          {:service_fee 0 ; the mobile app calls delivery fee "service_fee"
           :text (gen-text (if (< num-free-left 1000)
                             (str num-free-left " left")
                             (fee-str 0)))}
          (let [after-discount (max 0 (+ delivery-fee sub-discount))]
            {:service_fee after-discount
             :text (gen-text (if is-available?
                               (fee-str after-discount)
                               "sold out"))})))
      {:service_fee delivery-fee
       :text (gen-text (if is-available?
                         (fee-str delivery-fee)
                         "sold out"))})))

(defn delivery-times-map
  "Given subscription usage map and service fee, create the delivery-times map."
  [user zip-def sub delivery-fees]
  (let [has-free-three-hour? (pos? (or (:num_free_three_hour sub) 0))
        has-free-one-hour? (pos? (or (:num_free_one_hour sub) 0))
        times {:0 60
               :1 180
               :2 300}
        available-times (->> (:time-choices zip-def)
                             vals
                             (#(cond-> %
                                 has-free-one-hour? (conj 60)
                                 has-free-three-hour? (conj 180)))
                             distinct)]
    (->> times
         (#(for [[k v] %
                 :let [[num-as-word time-str]
                       (case v
                         300 ["five" "within 5 hours"]
                         180 ["three" "within 3 hours"]
                         60  ["one" "within 1 hour"])]]
             [v (assoc (delivery-time-map time-str
                                          (get delivery-fees v)
                                          (((comp keyword str)
                                            "num_free_" num-as-word "_hour") sub)
                                          (((comp keyword str)
                                            "num_free_" num-as-word "_hour_used") sub)
                                          (((comp keyword str)
                                            "discount_" num-as-word "_hour") sub)
                                          (in? available-times v))
                       :order (Integer. (name k)))]))
         (into {}))))

(defn available
  [user good-time? zip-def subscription octane]
  {:octane octane
   :gallon_choices (cond
                     (users/is-managed-account? user) {:0 7.5 :1 10 :2 15
                                                       :3 20 :4 25 :5 30}
                     (in? [1 2] (:id subscription)) {:0 7.5 :1 10 :2 15
                                                     :3 20}
                     :else (:gallon-choices zip-def))
   :default_gallon_choice (:default-gallon-choice zip-def)
   :price_per_gallon (get (:gas-price zip-def) octane)
   :times (->> (:delivery-fee zip-def)
               (delivery-times-map user zip-def subscription)
               (filter (fn [[time time-map]]
                         ;; currently, not very complex filtering here
                         good-time?))
               (into {}))
   ;; default_time_choice not implemented in app yet
   :default_time_choice (:default-gallon-choice zip-def)
   :tire_pressure_check_price (:tire-pressure-price zip-def)
   ;; for legacy app versions (< 1.2.2)
   :gallons 15})

(defn availabilities-map
  [db-conn zip-code user subscription]
  (if-let [zip-def (get-zip-def db-conn zip-code)]
    (if-not (is-child-user-with-no-vehicles? db-conn user)
      {:availabilities (map (partial available
                                     user
                                     (is-open-now? zip-def)
                                     zip-def
                                     subscription)
                            ["87" "91"])
       :unavailable-reason ; not always seen but always set (app compatibility)
       (cond
         (not (is-open-now? zip-def))
         (do (only-prod-or-dev
              (segment/track segment-client (:id user)
                             "Availability Check Said Unavailable"
                             {:address_zip zip-code
                              :reason "outside-service-hours-or-closed"}))
             (:closed-message zip-def))
         
         ;; it's available, no unavailable-reason needed
         :else "")}
      ;; is a child user that doesn't have any vehicles
      {:availabilities
       ;; This is the quirky way we tell the app we don't provide service here.
       [{:octane "87" :gallons 15 :times {} :price_per_gallon 0}
        {:octane "91" :gallons 15 :times {} :price_per_gallon 0}]
       :unavailable-reason
       (do (only-prod-or-dev
            (segment/track segment-client (:id user)
                           "Availability Check Said Unavailable"
                           {:address_zip zip-code
                            :reason "child-user-no-vehicles"}))
           (str "Sorry, you have no vehicles assigned to your account. "
                "Please contact your account manager."))})
    ;; We don't service this ZIP code at all.
    {:availabilities
     ;; This is the quirky way we tell the app we don't provide service here.
     [{:octane "87" :gallons 15 :times {} :price_per_gallon 0}
      {:octane "91" :gallons 15 :times {} :price_per_gallon 0}]
     :unavailable-reason
     (do (only-prod-or-dev
          (segment/track segment-client (:id user)
                         "Availability Check Said Unavailable"
                         {:address_zip zip-code
                          :reason "outside-service-area"}))
         (str "Sorry, we are unable to deliver gas to your "
              "location. We are rapidly expanding our service "
              "area and hope to offer service to your "
              "location very soon."))}))

(defn availability
  "Get an availability map to tell client what orders it can offer to user."
  [db-conn zip-code-any-length user-id]
  (let [user (users/get-user-by-id db-conn user-id)
        subscription (when (subscriptions/valid? user)
                       (subscriptions/get-with-usage db-conn user))
        zip-code (five-digit-zip-code zip-code-any-length)]
    (only-prod-or-dev (segment/track segment-client user-id "Availability Check"
                                     {:address_zip zip-code}))
    (merge {:success true
            :user (merge (select-keys user users/safe-authd-user-keys)
                         {:subscription_usage subscription})
            :system {:referral_referred_value config/referral-referred-value
                     :referral_referrer_gallons config/referral-referrer-gallons
                     :subscriptions (subscriptions/get-all-mapped-by-id db-conn)}}
           ;; this will give us :availabilities & :unavailable-reason
           (availabilities-map db-conn zip-code user subscription))))

(defn update-courier-state
  "Marks couriers as disconnected as needed."
  [db-conn]
  (let [expired-couriers (->> (couriers/get-all-expired db-conn)
                              (users/include-user-data db-conn))]
    (when-not (empty? expired-couriers)
      (only-prod (run! ;; notify all courier that got disconnected but are 'on_duty'
                  #(send-sms
                    (:phone_number %)
                    (str "You've been disconnected from the Purple Courier app. "
                         "This can happen if you are in an area with a poor "
                         "internet connection. You may need to close the app and "
                         "re-open it. If the problem persists, please contact a "
                         "Purple dispatch manager."))
                  (filter :on_duty expired-couriers)))
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
  [orders couriers]
  (let [suggestions (fmap (comp keywordize-keys (partial into {}))
                          (compute-suggestion
                           {"orders" (->> orders
                                          (map #(assoc %
                                                       :status_times
                                                       (-> (:event_log %)
                                                           (s/split #"\||\s")
                                                           (->> (remove s/blank?)
                                                                (apply hash-map)
                                                                (fmap read-string)))
                                                       :zones (order->zones (conn) %)))
                                          (map (juxt :id stringify-keys))
                                          (into {}))
                            "couriers" (->> couriers
                                            (map #(assoc % :zones (apply list (:zones %))))
                                            (map (juxt :id stringify-keys))
                                            (into {}))}))
        skim-the-top (fn [[k v]]
                       (and (:new_assignment v)
                            (or (= 1 ; is first priority assignment?
                                   (:courier_pos v))
                                ;; or, part of a currently assigned cluster?
                                (some->> (:cluster_first_order v)
                                         (get suggestions)
                                         :courier_pos
                                         (= 1)))))]
    (filter skim-the-top suggestions)))

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
  (catch-notify
   (let [os (get-all-current db-conn)
         cs (couriers/get-all-on-duty db-conn)]
     (!insert db-conn
              "state_log"
              {:data (str {:current-orders
                           (map #(select-keys % [:id :status :courier_id]) os)
                           :on-duty-couriers
                           (map #(select-keys % [:id :active :on_duty
                                                 :connected :busy :zones
                                                 :gallons_87 :gallons_91
                                                 :lat :lng :last_ping]) cs)})})
     (when (diff-state? os cs)
       (run! #(orders/assign db-conn (key %) (:courier_id (val %))
                             :no-reassigns true)
             (new-assignments os cs))))))
