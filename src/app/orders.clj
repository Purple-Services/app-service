(ns app.orders
  (:require [common.coupons :refer [format-coupon-code
                                    get-license-plate-by-vehicle-id
                                    mark-code-as-used
                                    mark-gallons-as-used]]
            [common.db :refer [!select !insert !update]]
            [common.orders :refer [accept assign begin-route complete get-by-id
                                   next-status segment-props service
                                   unpaid-balance]]
            [common.users :refer [details get-user-by-id include-user-data]]
            [common.util :refer [cents->dollars-str in?
                                 minute-of-day->hmma
                                 only-prod
                                 rand-str-alpha-num
                                 segment-client
                                 send-email
                                 send-sms
                                 unless-p unix->fuller unix->full
                                 unix->minute-of-day]]
            [common.zones :refer [get-fuel-prices get-service-fees
                                  get-service-time-bracket
                                  get-one-hour-orders-allowed order->zone-id]]
            [app.coupons :as coupons]
            [app.couriers :as couriers]
            [app.sift :as sift]
            [app.users :refer [auth-charge-user]]
            [ardoq.analytics-clj :as segment]
            [clojure.string :as s]
            [cheshire.core :refer [generate-string]]))

;; Order status definitions
;; unassigned - not assigned to any courier yet
;; assigned   - assigned to a courier (usually we are skipping over this status)
;; accepted   - courier accepts this order as their current task (can be forced)
;; enroute    - courier has begun task (can't be forced; always done by courier)
;; servicing  - car is being serviced by courier (e.g., pumping gas)
;; complete   - order has been fulfilled
;; cancelled  - order has been cancelled (either by customer or system)

(defn get-all
  [db-conn]
  (!select db-conn
           "orders"
           ["*"]
           {}
           :append "ORDER BY target_time_start DESC"))

(defn get-all-unassigned
  [db-conn]
  (!select db-conn
           "orders"
           ["*"]
           {:status "unassigned"}
           :append "ORDER BY target_time_start DESC"))

(defn get-all-current
  "Unassigned or in process."
  [db-conn]
  (!select db-conn
           "orders"
           ["*"]
           {}
           :append (str "AND status IN ("
                        "'unassigned',"
                        "'assigned',"
                        "'accepted',"
                        "'enroute',"
                        "'servicing'"
                        ") ORDER BY target_time_start DESC")))

(defn orders-in-same-market
  [o os]
  (let [order->market-id #(quot (order->zone-id %) 50)
        market-id-of-o (order->market-id o)]
    (filter (comp (partial = market-id-of-o) order->market-id) os)))

(defn gen-charge-description
  [db-conn order]
  (str "Delivery of up to "
       (:gallons order) " Gallons of Gasoline ("
       (->> (!select db-conn
                     "vehicles"
                     [:gas_type]
                     {:id (:vehicle_id order)})
            first
            :gas_type)
       " Octane)\n" "Where: "
       (:address_street order)
       "\n" "When: "
       (unix->fuller
        (quot (System/currentTimeMillis) 1000))))

(defn stamp-with-charge
  "Give it a charge object from Stripe."
  [db-conn order-id charge]
  (!update db-conn
           "orders"
           {:paid (:captured charge) ;; NOT THE SAME as (:paid charge)
            :stripe_charge_id (:id charge)
            :stripe_customer_id_charged (:customer charge)
            :stripe_balance_transaction_id (:balance_transaction charge)
            :time_paid (:created charge)
            :payment_info (-> charge
                              :source
                              (select-keys
                               [:id :brand :exp_month :exp_year :last4])
                              generate-string)}
           {:id order-id}))

(defn calculate-cost
  "Calculate cost of order based on current prices."
  [db-conn
   octane       ;; String
   gallons      ;; Integer
   time         ;; Integer, minutes
   coupon-code  ;; String
   vehicle-id   ;; String
   user-id
   referral-gallons-used
   zip-code     ;; String
   & {:keys [bypass-zip-code-check]}]
  (max 0
       (+ (* ((keyword octane)
              (get-fuel-prices zip-code))
             (- gallons
                (min gallons
                     referral-gallons-used)))
          ((keyword (str time))
           (get-service-fees zip-code))
          (if-not (s/blank? coupon-code)
            (:value (coupons/code->value
                     db-conn
                     coupon-code
                     vehicle-id
                     user-id
                     zip-code
                     :bypass-zip-code-check bypass-zip-code-check))
            0))))

(defn valid-price?
  "Is the stated 'total_price' accurate?"
  [db-conn o & {:keys [bypass-zip-code-check]}]
  (= (:total_price o)
     (calculate-cost db-conn
                     (:gas_type o)
                     (:gallons o)
                     (:time-limit o)
                     (:coupon_code o)
                     (:vehicle_id o)
                     (:user_id o)
                     (:referral_gallons_used o)
                     (:address_zip o)
                     :bypass-zip-code-check bypass-zip-code-check)))

(defn valid-time-limit?
  "Is that Time choice (e.g., 1 hour / 3 hour) truly available?"
  [db-conn o]
  (if (< (:time-limit o) 180)
    ;; if less than 3 hours time limit, check if it is allowed according to:
    ;; time of day & number of available couriers
    (and (>= (unix->minute-of-day (:target_time_start o))
             (get-one-hour-orders-allowed
              (:address_zip o)))
         (let [zone-id (order->zone-id o)]
           ;; Less one-hour orders in this zone (unassigned or current)
           ;; than connected couriers who are assigned to this zone?
           (< (->> (get-all-current db-conn)
                   (orders-in-same-market o)
                   (filter #(= (* 60 60) ;; only one-hour orders
                               (- (:target_time_end %)
                                  (:target_time_start %))))
                   count)
              (->> (couriers/get-all-connected db-conn)
                   (couriers/filter-by-market (quot zone-id 50))
                   count))))
    true)) ;; 3-hour or greater is always available

(defn within-time-bracket?
  "Is the order being placed within the time bracket?"
  [order]
  (let [order-time (unix->minute-of-day (:target_time_start order))
        time-bracket (get-service-time-bracket
                      (:address_zip order))
        time-start (first time-bracket)
        time-end   (+ (last time-bracket) 10)]
    (<= time-start
        order-time
        time-end)))

(defn infer-gas-type-by-price
  "This is only for backwards compatiblity."
  [gas-price zip-code]
  (let [fuel-prices (get-fuel-prices zip-code)]
    (if (= gas-price ((keyword "87") fuel-prices))
      "87"
      (if (= gas-price ((keyword "91") fuel-prices))
        "91"
        "87" ;; if we can't find it then assume 87
        ))))

(defn new-order-text
  [db-conn o charge-authorized?]
  (str "New order:"
       (let [unpaid-balance (unpaid-balance
                             db-conn (:user_id o))]
         (when (> unpaid-balance 0)
           (str "\n!UNPAID BALANCE: $"
                (cents->dollars-str unpaid-balance))))
       "\nDue: " (unix->full
                  (:target_time_end o))
       "\n" (:address_street o) ", "
       (:address_zip o)
       "\n" (:gallons o)
       " Gallons of " (:gas_type o)))

(defn add
  "The user-id given is assumed to have been auth'd already."
  [db-conn user-id order & {:keys [bypass-zip-code-check]}]
  (let [time-limit (case (:time order)
                     ;; these are under the old system
                     "< 1 hr" 60
                     "< 3 hr" 180
                     ;; the rest are handled as new system
                     ;; which means it is simply given in minutes
                     (Integer. (:time order)))
        license-plate (get-license-plate-by-vehicle-id db-conn
                                                       (:vehicle_id order))
        user (get-user-by-id db-conn user-id)
        referral-gallons-available (:referral_gallons user)
        o (assoc (select-keys order [:vehicle_id :special_instructions
                                     :address_street :address_city
                                     :address_state :address_zip :gas_price
                                     :service_fee :total_price])
                 :id (rand-str-alpha-num 20)
                 :user_id user-id
                 :status "unassigned"
                 :target_time_start (quot (System/currentTimeMillis) 1000)
                 :target_time_end (+ (quot (System/currentTimeMillis) 1000)
                                     (* 60 time-limit))
                 :time-limit time-limit
                 :gallons (Integer. (:gallons order))
                 :gas_type (unless-p nil?
                                     (:gas_type order)
                                     (infer-gas-type-by-price (:gas_price order)
                                                              (:address_zip order)))
                 :lat (unless-p Double/isNaN (Double. (:lat order)) 0)
                 :lng (unless-p Double/isNaN (Double. (:lng order)) 0)
                 :license_plate license-plate
                 ;; we'll use as many referral gallons as available
                 :referral_gallons_used (min (Integer. (:gallons order))
                                             referral-gallons-available)
                 :coupon_code (format-coupon-code (or (:coupon_code order) "")))]

    (cond
      (not (valid-price? db-conn o :bypass-zip-code-check bypass-zip-code-check))
      (do (segment/track segment-client (:user_id o) "Request Order Failed"
                         (assoc (segment-props o)
                                :reason "price-changed-during-review"))
          {:success false
           :message (str "Sorry, the price changed while you were creating your "
                         "order. Please press the back button TWICE to go back "
                         "to the map and start over.")})

      (not (valid-time-limit? db-conn o))
      (do (segment/track segment-client (:user_id o) "Request Order Failed"
                         (assoc (segment-props o)
                                :reason "high-demand"))
          {:success false
           :message (str "Sorry, we currently are experiencing high demand and "
                         "can't promise a delivery within that time limit. Please "
                         "go back and choose the \"within 3 hours\" option.")})

      (not (within-time-bracket? o))
      (do (segment/track segment-client (:user_id o) "Request Order Failed"
                         (assoc (segment-props o)
                                :reason "outside-service-hours"))
          {:success false
           :message (let [service-time-bracket
                          (get-service-time-bracket
                           (:address_zip o))]
                      (str "Sorry, the service hours for this ZIP code are "
                           (minute-of-day->hmma (first service-time-bracket))
                           " to "
                           (minute-of-day->hmma (last service-time-bracket))
                           " today."))})
      
      :else
      (let [auth-charge-result (if (zero? (:total_price o))
                                 {:success true}
                                 (auth-charge-user
                                  db-conn
                                  (:user_id o)
                                  (:id o)
                                  (:total_price o)
                                  (gen-charge-description db-conn o)))
            charge-authorized? (:success auth-charge-result)]
        (if (not charge-authorized?)
          (do ;; payment failed, do not allow order to be placed
            (segment/track segment-client (:user_id o) "Request Order Failed"
                           (assoc (segment-props o)
                                  :charge-authorized charge-authorized? ;; false
                                  :reason "failed-charge"))
            ;; TODO send notification to us? (async?)
            {:success false
             :message (str "Sorry, we were unable to charge your credit card. "
                           "Please go to the \"Account\" page and tap on "
                           "\"Payment Method\" to add a new card.")
             :message_title "Unable to Charge Card"})
          (do ;; successful payment (or free order), place order...
            (!insert db-conn "orders" (select-keys o [:id :user_id :vehicle_id
                                                      :status :target_time_start
                                                      :target_time_end
                                                      :gallons :gas_type
                                                      :special_instructions
                                                      :lat :lng :address_street
                                                      :address_city :address_state
                                                      :address_zip :gas_price
                                                      :service_fee :total_price
                                                      :license_plate :coupon_code
                                                      :referral_gallons_used]))
            (when-not (zero? (:referral_gallons_used o))
              (mark-gallons-as-used db-conn
                                            (:user_id o)
                                            (:referral_gallons_used o)))
            (when-not (s/blank? (:coupon_code o))
              (mark-code-as-used db-conn
                                         (:coupon_code o)
                                         (:license_plate o)
                                         (:user_id o)))
            (future ;; we can process the rest of this asynchronously
              (let [available-couriers
                    (->> (couriers/get-all-available db-conn)
                         (couriers/filter-by-zone (order->zone-id o))
                         (include-user-data db-conn))]
                
                (when (and charge-authorized? (not (zero? (:total_price o))))
                  (stamp-with-charge db-conn (:id o) (:charge auth-charge-result)))

                ;; fraud detection
                (when (not (zero? (:total_price o)))
                  (let [c (:charge auth-charge-result)]
                    (sift/charge-authorization
                     o user
                     (if charge-authorized?
                       {:stripe-charge-id (:id c)
                        :successful? true
                        :card-last4 (:last4 (:card c))
                        :stripe-cvc-check (:cvc_check (:card c))
                        :stripe-funding (:funding (:card c))
                        :stripe-brand (:brand (:card c))
                        :stripe-customer-id (:customer c)}
                       {:stripe-charge-id (:charge (:error c))
                        :successful? false
                        :decline-reason-code (:decline_code (:error c))}))))
                
                (only-prod
                 (run! #(send-sms % (new-order-text db-conn o charge-authorized?))
                       (only-prod ["3103109961" ;; Joe
                                   "7143154380" ;; Gustavo
                                   "3234592100" ;; Rana
                                   ]))
                 (send-email {:to "chris@purpledelivery.com"
                              :subject "Purple - New Order"
                              :body (str o)}))
                
                (segment/track segment-client (:user_id o) "Request Order"
                               (assoc (segment-props o)
                                      :charge-authorized charge-authorized?))))
            {:success true
             :message (str "Your order has been accepted, and a courier will be "
                           "on the way soon! Please ensure that the fueling door "
                           "on your gas tank is unlocked.")
             :message_title "Order Accepted"}))))))

(def busy-statuses ["assigned" "accepted" "enroute" "servicing"])

(defn courier-busy?
  "Is courier currently working on an order?"
  [db-conn courier-id]
  (let [orders (!select db-conn
                        "orders"
                        [:id :status]
                        {:courier_id courier-id})]
    (boolean (some #(in? busy-statuses (:status %)) orders))))

(defn set-courier-busy
  [db-conn courier-id busy]
  (!update db-conn
           "couriers"
           {:busy busy}
           {:id courier-id}))

(defn update-courier-busy [db-conn courier-id]
  "Determine if courier-id is busy and toggle the appropriate state. A courier
is considered busy if there are orders that have not been completed or cancelled
and their id matches the order's courier_id"
  (let [busy? (courier-busy? db-conn courier-id)]
    (set-courier-busy db-conn courier-id busy?)))

(defn update-status-by-courier
  [db-conn user-id order-id status]
  (if-let [order (get-by-id db-conn order-id)]
    (if (not= "cancelled" (:status order))
      (if (not= status (next-status (:status order)))
        {:success false
         :message
         (if (= status "assigned")
           (str "Oops... it looks like another courier accepted that order "
                "before you.")
           (str "Your app seems to be out of sync. Try going back to the "
                "Orders list and pulling down to refresh it. Or, you might "
                "need to close the app completely and restart it."))}
        (let [update-result
              (case status
                "assigned" (if (couriers/on-duty? db-conn user-id) ;; security
                             (assign db-conn order-id user-id)
                             {:success false
                              :message (str "Your app may have gotten "
                                            "disconnected. Try closing the "
                                            "app completely and restarting it. "
                                            "Then wait 10 seconds.")})
                "accepted" (if (= user-id (:courier_id order))
                             (accept db-conn order-id)
                             {:success false
                              :message "Permission denied."})
                "enroute" (if (= user-id (:courier_id order))
                            (begin-route db-conn order)
                            {:success false
                             :message "Permission denied."})
                "servicing" (if (= user-id (:courier_id order))
                              (service db-conn order)
                              {:success false
                               :message "Permission denied."})
                "complete" (if (= user-id (:courier_id order))
                             (complete db-conn order)
                             {:success false
                              :message "Permission denied."})
                {:success false
                 :message "Invalid status."})]
          ;; send back error message or user details if successful
          (if (:success update-result)
            (details db-conn user-id)
            update-result)))
      {:success false
       :message "That order was cancelled."})
    {:success false
     :message "An order with that ID could not be found."}))

(defn update-rating
  "Assumed to have been auth'd properly already."
  [db-conn order-id number-rating text-rating]
  (!update db-conn
           "orders"
           {:number_rating number-rating
            :text_rating text-rating}
           {:id order-id}))

(defn rate
  [db-conn user-id order-id rating]
  (do (update-rating
       db-conn order-id (:number_rating rating) (:text_rating rating))
      (details db-conn user-id)))
