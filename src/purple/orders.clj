(ns purple.orders
  (:use purple.util
        [purple.db :only [conn !select !insert !update mysql-escape-str]])
  (:require [purple.config :as config]
            [purple.coupons :as coupons]
            [purple.couriers :as couriers]
            [purple.payment :as payment]
            [purple.sift :as sift]
            [clojure.java.jdbc :as sql]
            [clj-time.core :as time]
            [clj-time.coerce :as time-coerce]
            [ardoq.analytics-clj :as segment]
            [clojure.string :as s]))

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

(defn get-by-id
  "Gets an order from db by order's id."
  [db-conn id]
  (first (!select db-conn
                  "orders"
                  ["*"]
                  {:id id})))


(defn get-by-user
  "Gets all of a user's orders."
  [db-conn user-id]
  (!select db-conn
           "orders"
           ["*"]
           {:user_id user-id}
           :append "ORDER BY target_time_start DESC"))

(defn get-by-courier
  "Gets all of a courier's assigned orders."
  [db-conn courier-id]
  (let [courier-zip-codes  ((resolve 'purple.dispatch/get-courier-zips)
                            db-conn courier-id)
        os (!select db-conn "orders" ["*"] {}
                    :custom-where
                    (str "(courier_id = \""
                         (mysql-escape-str courier-id)
                         "\" AND target_time_start > "
                         (- (quot (System/currentTimeMillis) 1000)
                            (* 60 60 24 16)) ;; 16 days
                         ") "
                         "ORDER BY target_time_end DESC"))
        customer-ids (distinct (map :user_id os))
        customers (group-by :id
                            (!select db-conn
                                     "users"
                                     [:id :name :phone_number]
                                     {}
                                     :custom-where
                                     (str "id IN (\""
                                          (s/join "\",\"" customer-ids)
                                          "\")")))
        vehicle-ids (->> os
                         ;; TODO filter this to only include orders from past 24 hours maybe?
                         
                         (map :vehicle_id)
                         distinct)
        vehicles (group-by :id
                           (!select db-conn
                                    "vehicles"
                                    ["*"]
                                    {}
                                    :custom-where
                                    (str "id IN (\""
                                         (s/join "\",\"" vehicle-ids)
                                         "\")")))]
    (map #(assoc %
                 :customer
                 (first (get customers (:user_id %)))
                 :vehicle
                 (first (get vehicles (:vehicle_id %))))
         os)))

(defn orders-in-same-market
  [o os]
  (let [order->zone-id (resolve 'purple.dispatch/order->zone-id)
        order->market-id #(quot (order->zone-id %) 50)
        market-id-of-o (order->market-id o)]
    (filter (comp (partial = market-id-of-o) order->market-id) os)))

(defn segment-props
  "Get a map of all the standard properties we track on orders via segment."
  [o]
  (assoc (select-keys o [:vehicle_id :gallons :gas_type :lat :lng
                         :address_street :address_city :address_state
                         :address_zip :license_plate :coupon_code
                         :referral_gallons_used])
         :order_id (:id o)
         :gas_price (cents->dollars (:gas_price o))
         :service_fee (cents->dollars (:service_fee o))
         :total_price (cents->dollars (:total_price o))
         :target_time_start (unix->DateTime (:target_time_start o))
         :target_time_end (unix->DateTime (:target_time_end o))
         :zone_id ((resolve 'purple.dispatch/order->zone-id) o)))

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
            :time_paid (:created charge)}
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
              ((resolve 'purple.dispatch/get-fuel-prices) zip-code))
             (- gallons
                (min gallons
                     referral-gallons-used)))
          ((keyword (str time))
           ((resolve 'purple.dispatch/get-service-fees) zip-code))
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
             ((resolve 'purple.dispatch/get-one-hour-orders-allowed)
              (:address_zip o)))
         (let [zone-id ((resolve 'purple.dispatch/order->zone-id) o)]
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
        time-bracket ((resolve 'purple.dispatch/get-service-time-bracket)
                      (:address_zip order))
        time-start (first time-bracket)
        time-end   (+ (last time-bracket) 10)]
    (<= time-start
        order-time
        time-end)))

(defn infer-gas-type-by-price
  "This is only for backwards compatiblity."
  [gas-price zip-code]
  (let [fuel-prices ((resolve 'purple.dispatch/get-fuel-prices) zip-code)]
    (if (= gas-price ((keyword "87") fuel-prices))
      "87"
      (if (= gas-price ((keyword "91") fuel-prices))
        "91"
        "87" ;; if we can't find it then assume 87
        ))))

(defn new-order-text
  [db-conn o charge-authorized?]
  (str "New order:"
       (if charge-authorized?
         "\nCharge Authorized."
         "\n!CHARGE FAILED TO AUTHORIZE!")
       (let [unpaid-balance ((resolve 'purple.users/unpaid-balance)
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
        license-plate (coupons/get-license-plate-by-vehicle-id db-conn
                                                               (:vehicle_id order))
        user ((resolve 'purple.users/get-user-by-id) db-conn user-id)
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
      {:success false
       :message (str "Sorry, the price changed while you were creating your "
                     "order. Please press the back button TWICE to go back to the "
                     "map and start over.")}

      (not (valid-time-limit? db-conn o))
      {:success false
       :message (str "Sorry, we currently are experiencing high demand and "
                     "can't promise a delivery within that time limit. Please "
                     "go back and choose the \"within 3 hours\" option.")}

      (not (within-time-bracket? o))
      {:success false
       :message (let [service-time-bracket
                      ((resolve 'purple.dispatch/get-service-time-bracket)
                       (:address_zip o))]
                  (str "Sorry, the service hours for this ZIP code are "
                       (minute-of-day->hmma (first service-time-bracket))
                       " to "
                       (minute-of-day->hmma (last service-time-bracket))
                       " every day."))}
      
      :else
      (do (!insert db-conn "orders" (select-keys o [:id :user_id :vehicle_id
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
            (coupons/mark-gallons-as-used db-conn
                                          (:user_id o)
                                          (:referral_gallons_used o)))
          (when-not (s/blank? (:coupon_code o))
            (coupons/mark-code-as-used db-conn
                                       (:coupon_code o)
                                       (:license_plate o)
                                       (:user_id o)))
          (future
            (let [order->zone-id (resolve 'purple.dispatch/order->zone-id)
                  include-user-data (resolve 'purple.users/include-user-data)
                  auth-charge-user (resolve 'purple.users/auth-charge-user)

                  available-couriers
                  (->> (couriers/get-all-available db-conn)
                       (couriers/filter-by-zone (order->zone-id o))
                       (include-user-data db-conn))
                  
                  auth-charge-result
                  (if (zero? (:total_price o))
                    {:success true}
                    (auth-charge-user db-conn
                                      (:user_id o)
                                      (:id o)
                                      (:total_price o)
                                      (gen-charge-description db-conn
                                                              o)))
                  
                  charge-authorized? (:success auth-charge-result)]
              
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
                     (concat (map :phone_number available-couriers)
                             (only-prod ["3103109961" ;; Joe
                                         "7143154380" ;; Gustavo
                                         "3234592100" ;; Rana
                                         ])))
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
           :message_title "Order Accepted"}))))

(defn update-status
  "Assumed to have been auth'd properly already."
  [db-conn order-id status]
  (sql/with-connection db-conn
    (sql/do-prepared
     (str "UPDATE orders SET "
          ;; change status
          "status = \"" (mysql-escape-str status) "\", "
          ;; update event log
          "event_log = CONCAT(event_log, \""
          (mysql-escape-str status) " " (quot (System/currentTimeMillis) 1000)
          "\", '|') WHERE id = \""
          (mysql-escape-str order-id)
          "\""))))

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

;; note that it takes order-id, not order
(defn accept
  [db-conn order-id]
  (do (update-status db-conn order-id "accepted")
      {:success true}))

;; note that it takes order-id, not order
(defn assign
  [db-conn order-id courier-id & {:keys [no-reassigns]}]
  (let [o (get-by-id db-conn order-id)
        send-push (resolve 'purple.users/send-push)
        text-user (resolve 'purple.users/text-user)]
    (when (or (not no-reassigns)
              (= "unassigned" (:status o)))
      (update-status db-conn order-id "assigned")
      (!update db-conn "orders" {:courier_id courier-id} {:id order-id})
      (set-courier-busy db-conn courier-id true)
      (send-push db-conn courier-id "You have been assigned a new order.")
      (text-user db-conn courier-id (new-order-text db-conn o true))
      {:success true})))

(defn stamp-with-refund
  "Give it a refund object from Stripe."
  [db-conn order-id refund]
  (!update db-conn
           "orders"
           {:stripe_refund_id (:id refund)}
           {:id order-id}))

(defn after-payment
  [db-conn o]
  (do (coupons/apply-referral-bonus db-conn (:coupon_code o))
      (segment/track segment-client (:user_id o) "Complete Order"
                     (assoc (segment-props o)
                            :revenue (cents->dollars (:total_price o))))
      ((resolve 'purple.users/send-push) db-conn (:user_id o)
       "Your delivery has been completed. Thank you!")))

(defn complete
  "Completes order and charges user."
  [db-conn o]
  (do (update-status db-conn (:id o) "complete")
      (update-courier-busy db-conn (:courier_id o))
      (if (or (zero? (:total_price o))
              (s/blank? (:stripe_charge_id o)))
        (after-payment db-conn o)
        (let [capture-result (payment/capture-stripe-charge
                              (:stripe_charge_id o))]
          (if (:success capture-result)
            (do (stamp-with-charge db-conn (:id o) (:charge capture-result))
                (after-payment db-conn o))
            capture-result)))))

(defn begin-route
  "This is a courier action."
  [db-conn o]
  (do (update-status db-conn (:id o) "enroute")
      ((resolve 'purple.users/send-push) db-conn (:user_id o)
       "A courier is enroute to your location. Please ensure that your fueling door is open.")))

(defn service
  "This is a courier action."
  [db-conn o]
  (do (update-status db-conn (:id o) "servicing")
      ((resolve 'purple.users/send-push) db-conn (:user_id o)
       "We are currently servicing your vehicle.")))

(defn next-status
  [status]
  (get config/status->next-status status))

(defn update-status-by-courier
  [db-conn user-id order-id status]
  (if-let [order (get-by-id db-conn order-id)]
    (if (not= "cancelled" (:status order))
      (if (not= status (next-status (:status order)))
        {:success false
         :message (if (= status "assigned")
                    "Oops... it looks like another courier accepted that order before you."
                    "Your app seems to be out of sync. Try going back to the Orders list and pulling down to refresh it. Or, you might need to close the app completely and restart it.")}
        (let [update-result
              (case status
                "assigned" (if (couriers/on-duty? db-conn user-id) ;; security
                             (assign db-conn order-id user-id)
                             {:success false
                              :message "Your app may have gotten disconnected. Try closing the app completely and restarting it. Then wait 10 seconds."})
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
            ((resolve 'purple.users/details) db-conn user-id)
            update-result)))
      {:success false
       :message "That order was cancelled."})
    {:success false
     :message "An order with that ID could not be found."}))

(defn update-status-by-admin
  [db-conn order-id]
  (if-let [order (get-by-id db-conn order-id)]
    (let [advanced-status (next-status (:status order))]
      ;; Orders with "complete", "cancelled" or "unassigned" statuses can not be
      ;; advanced. These orders should not be modifiable in the dashboard
      ;; console, however this is checked on the server below.
      (cond
        (contains? #{"complete" "cancelled" "unassigned"} (:status order))
        {:success false
         :message (str "An order's status can not be advanced if it is already "
                       "complete, cancelled, or unassigned.")}
        ;; Likewise, the dashboard user should not be allowed to advanced
        ;; to "assigned", but we check it on the server anyway.
        (contains? #{"assigned"} advanced-status)
        {:success false
         :message (str "An order's status can not be advanced to assigned. "
                       "Please assign a courier to this order in "
                       "order to advance this order.")}
        ;; update the status to "accepted"
        (= advanced-status "accepted")
        (do (accept db-conn order-id)
            ;; let the courier know
            ((resolve 'purple.users/send-push) db-conn (:courier_id order)
             "An order that was assigned to you is now marked as Accepted.")
            {:success true
             :message advanced-status})
        ;; update the status to "enroute"
        (= advanced-status "enroute")
        (do (begin-route db-conn order)
            ;; let the courier know
            ((resolve 'purple.users/send-push) db-conn (:courier_id order)
             "Your order status has been advanced to enroute.")
            {:success true
             :message advanced-status})
        ;; update the status to "servicing"
        (= advanced-status "servicing")
        (do (service db-conn order)
            ;; let the courier know
            ((resolve 'purple.users/send-push) db-conn (:courier_id order)
             "Your order status has been advanced to servicing.")
            {:success true
             :message advanced-status})
        ;; update the order to "complete"
        (= advanced-status "complete")
        (do (complete db-conn order)
            ;; let the courier know
            ((resolve 'purple.users/send-push) db-conn (:courier_id order)
             "Your order status has been advanced to complete.")
            {:success true
             :message advanced-status})
        ;; something wasn't caught
        :else {:success false
               :message "An unknown error occured."
               :status advanced-status}))
    ;; the order was not found on the server
    {:success false
     :message "An order with that ID could not be found."}))

(defn assign-to-courier-by-admin
  "Assign new-courier-id to order-id and alert the couriers of the
  order reassignment"
  [db-conn order-id new-courier-id]
  (let [order (get-by-id db-conn order-id)
        old-courier-id (:courier_id order)
        change-order-assignment #(!update db-conn "orders"
                                          {:courier_id new-courier-id}
                                          {:id order-id})
        notify-new-courier #((resolve 'purple.users/send-push)
                             db-conn new-courier-id
                             (str "You have been assigned a new order,"
                                  " please check your "
                                  "Orders to view it"))
        notify-old-courier #((resolve 'purple.users/send-push)
                             db-conn old-courier-id
                             (str "You are no longer assigned to the order at: "
                                  (:address_street order)))]
    (cond
      (= (:status order) "unassigned")
      (do
        ;; because the accept fn sets the couriers busy status to true,
        ;; there is no need to further update the courier's status
        (assign db-conn order-id new-courier-id)
        ;; response
        {:success true
         :message (str order-id " has been assigned to " new-courier-id)})
      (contains? #{"assigned" "accepted" "enroute" "servicing"} (:status order))
      (do
        ;; update the order so that is assigned to new-courier-id
        (change-order-assignment)
        ;; set the new-courier to busy
        (set-courier-busy db-conn new-courier-id true)
        ;; adjust old courier to correct busy setting
        (update-courier-busy db-conn old-courier-id)
        ;; notify the new-courier that they have a new order
        (notify-new-courier)
        ;; notify the old-courier that they lost an order
        (notify-old-courier)
        ;; response
        {:success true
         :message (str order-id " has been assigned from " new-courier-id " to "
                       old-courier-id)})
      (contains? #{"complete" "cancelled"} (:status order))
      (do
        ;; update the order so that is assigned to new-courier
        (change-order-assignment)
        ;; response
        {:success true
         :message (str order-id " has been assigned from " new-courier-id " to "
                       old-courier-id)})
      :else
      {:success false
       :message "An unknown error occured."})))

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
  (do (update-rating db-conn order-id (:number_rating rating) (:text_rating rating))
      ((resolve 'purple.users/details) db-conn user-id)))

(defn cancel
  [db-conn user-id order-id & {:keys [origin-was-dashboard
                                      notify-customer
                                      suppress-user-details
                                      override-cancellable-statuses]}]
  (if-let [o (get-by-id db-conn order-id)]
    (if (in? (or override-cancellable-statuses
                 config/cancellable-statuses)
             (:status o))
      (do (update-status db-conn order-id "cancelled")
          (future
            ;; return any free gallons that may have been used
            (when (not= 0 (:referral_gallons_used o))
              (coupons/mark-gallons-as-unused db-conn
                                              (:user_id o)
                                              (:referral_gallons_used o))
              (!update db-conn
                       "orders"
                       {:referral_gallons_used 0}
                       {:id order-id}))
            ;; free up that coupon code for that vehicle
            (when-not (s/blank? (:coupon_code o))
              (coupons/mark-code-as-unused db-conn
                                           (:coupon_code o)
                                           (:vehicle_id o)
                                           (:user_id o))
              (!update db-conn
                       "orders"
                       {:coupon_code ""}
                       {:id order-id}))
            ;; let the courier know the order has been cancelled
            (when-not (s/blank? (:courier_id o))
              (update-courier-busy db-conn (:courier_id o))
              ((resolve 'purple.users/send-push) db-conn (:courier_id o)
               "The current order has been cancelled."))
            ;; let the user know the order has been cancelled
            (when notify-customer
              ((resolve 'purple.users/send-push)
               db-conn user-id
               "Your order has been cancelled. If you have any questions, please email us at info@purpledelivery.com."))
            (when-not (s/blank? (:stripe_charge_id o))
              (let [refund-result (payment/refund-stripe-charge
                                   (:stripe_charge_id o))]
                (when (:success refund-result)
                  (stamp-with-refund db-conn
                                     order-id
                                     (:refund refund-result)))))
            (segment/track segment-client (:user_id o) "Cancel Order"
                           (assoc (segment-props o)
                                  :cancelled-by-user (not origin-was-dashboard))))
          (if suppress-user-details
            {:success true}
            ((resolve 'purple.users/details) db-conn user-id)))
      {:success false
       :message "Sorry, it is too late for this order to be cancelled."})
    {:success false
     :message "An order with that ID could not be found."}))

(defn orders-since-date
  "Get all orders since date. A blank date will return all orders. When
  unix-epoch? is true, assume date is in unix epoch seconds"
  [db-conn date & [unix-epoch?]]
  (!select db-conn "orders"
           [:id :lat :lng :status :gallons :gas_type
            :total_price :timestamp_created :address_street
            :address_city :address_state :address_zip :user_id
            :courier_id :vehicle_id :license_plate
            :target_time_start :target_time_end]
           {}
           :custom-where
           (str "timestamp_created > "
                (if unix-epoch?
                  (str "FROM_UNIXTIME(" date ")")
                  (str "'" date "'")))))

(defn orders-since-date-with-supplementary-data
  "Get all orders since date. A blank date will return all orders. Additional
  supplementary data is assoc'd onto the orders. When unix-epoch? is true,
  assume date is in unix epoch seconds"
  [db-conn date & [unix-epoch?]]
  (let [os (orders-since-date db-conn date unix-epoch?)
        users-by-id (into {}
                          (map (juxt :id identity)
                               ((resolve 'purple.users/get-users-by-ids)
                                db-conn
                                (distinct
                                 (concat (map :user_id os)
                                         (map :courier_id os))))))
        id->name #(:name (get users-by-id %))
        id->phone_number #(:phone_number (get users-by-id %))]
    {:orders (map #(assoc %
                          :courier_name (id->name (:courier_id %))
                          :customer_name (id->name (:user_id %))
                          :customer_phone_number (id->phone_number (:user_id %)))
                  os)}))
