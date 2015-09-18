(ns purple.orders
  (:use purple.util
        [purple.db :only [conn !select !insert !update mysql-escape-str]])
  (:require [purple.config :as config]
            [purple.coupons :as coupons]
            [purple.couriers :as couriers]
            [purple.payment :as payment]
            [clojure.java.jdbc :as sql]
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
  (let [orders (!select db-conn
                        "orders"
                        ["*"]
                        {}
                        :custom-where
                        (str "(courier_id = \""
                             (mysql-escape-str courier-id)
                             "\" AND target_time_start > "
                             (- (quot (System/currentTimeMillis) 1000)
                                (* 60 60 24 16)) ;; 16 days
                             ") OR status = \"unassigned\" ORDER BY target_time_end DESC"))
        customer-ids (distinct (map :user_id orders))
        customers (group-by :id
                            (!select db-conn
                                     "users"
                                     [:id :name :phone_number]
                                     {}
                                     :custom-where
                                     (str "id IN (\""
                                          (s/join "\",\"" customer-ids)
                                          "\")")))
        vehicle-ids (distinct (map :vehicle_id orders))
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
         orders)))

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
           {:paid (:captured charge)
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
   referral-gallons-used]
  (max 0
       (+ (* (octane->gas-price octane)
             (- gallons
                (min gallons
                     referral-gallons-used)))
          (:service_fee (get config/delivery-times time))
          (if-not (s/blank? coupon-code)
            (:value (coupons/code->value db-conn coupon-code vehicle-id user-id))
            0))))

(defn valid-price?
  "Is the stated 'total_price' accurate?"
  [db-conn o]
  (= (:total_price o)
     (calculate-cost db-conn
                     (:gas_type o)
                     (:gallons o)
                     (:time-limit o)
                     (:coupon_code o)
                     (:vehicle_id o)
                     (:user_id o)
                     (:referral_gallons_used o))))

(defn valid-time-limit?
  "Check if the Time choice is truly available."
  [db-conn o]
  (if (< (:time-limit o) 180)
    (and (>= (unix->minute-of-day (:target_time_start o))
             config/one-hour-orders-allowed)
         (let [zone-id ((resolve 'purple.dispatch/order->zone-id) o)
               pm ((resolve 'purple.dispatch/get-map-by-zone-id) zone-id)
               num-orders-in-queue (count @pm)
               num-couriers (max 1
                                 (count (filter #(in? (:zones %) zone-id)
                                                (couriers/get-all-connected db-conn))))]
           (< num-orders-in-queue
              (* 1 num-couriers))))
    true))

(defn infer-gas-type-by-price
  "This is only for backwards compatiblity."
  [gas-price]
  (if (= gas-price (octane->gas-price "87"))
    "87"
    (if (= gas-price (octane->gas-price "91"))
      "91"
      "87"))) ;; if we can't find it then assume 87

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
                (cents->dollars unpaid-balance))))
       "\nDue: " (unix->full
                  (:target_time_end o))
       "\n" (:address_street o) ", "
       (:address_zip o)
       "\n" (:gallons o)
       " Gallons of " (:gas_type o)))

(defn add
  "The user-id given is assumed to have been auth'd already."
  [db-conn user-id order]
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
                                (infer-gas-type-by-price (:gas_price order)))
            :lat (unless-p Double/isNaN (Double. (:lat order)) 0)
            :lng (unless-p Double/isNaN (Double. (:lng order)) 0)
            :license_plate license-plate
            ;; we'll use as many referral gallons as available
            :referral_gallons_used (min (Integer. (:gallons order))
                                        referral-gallons-available)
            :coupon_code (format-coupon-code (or (:coupon_code order) "")))]

    (cond
     (not (valid-price? db-conn o))
     {:success false
      :message (str "Sorry, the price changed while you were creating your "
                    "order. Please press the back button to go back to the "
                    "map and start over.")}

     (not (valid-time-limit? db-conn o))
     {:success false
      :message (str "Sorry, we currently are experiencing high demand and "
                    "can't promise a delivery within that time limit. Please "
                    "go back and choose the \"within 3 hours\" option.")}
     
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
         ((resolve 'purple.dispatch/add-order-to-zq) o)
         (when-not (zero? (:referral_gallons_used o))
           (coupons/mark-gallons-as-used db-conn
                                         (:user_id o)
                                         (:referral_gallons_used o)))
         (when-not (s/blank? (:coupon_code o))
           (coupons/mark-code-as-used db-conn
                                      (:coupon_code o)
                                      (:license_plate o)
                                      (:user_id o)))
         (future (let [connected-couriers (couriers/get-all-connected db-conn)
                       available-couriers (remove :busy connected-couriers)

                       users-by-id
                       (group-by :id
                                 ((resolve 'purple.users/get-users-by-ids)
                                  db-conn (map :id connected-couriers)))
                       
                       id->phone-number
                       #(:phone_number (first (get users-by-id %)))
                       
                       auth-charge-result
                       (if (zero? (:total_price o))
                         {:success true}
                         ((resolve 'purple.users/auth-charge-user)
                          db-conn
                          (:user_id o)
                          (:id o)
                          (:total_price o)
                          (gen-charge-description db-conn o)))
                       
                       charge-authorized? (:success auth-charge-result)]
                   (when (and charge-authorized?
                              (not (zero? (:total_price o))))
                     (stamp-with-charge db-conn
                                        (:id o)
                                        (:charge auth-charge-result)))
                   (only-prod (send-email {:to "chris@purpledelivery.com"
                                           :subject "Purple - New Order"
                                           :body (str o)}))
                   (run! #((resolve 'purple.users/send-push)
                           db-conn (:id %) (str "New order available. "
                                                "Please press Accept "
                                                "Order ASAP."))
                         available-couriers)
                   (run! #(send-sms % (new-order-text db-conn
                                                      o
                                                      charge-authorized?))
                         (concat (map (comp id->phone-number :id)
                                      connected-couriers)
                                 (only-prod ["3235782263" ;; Bruno
                                             "3106919061" ;; JP
                                             "8589228571" ;; Lee
                                             ])))))
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
          "status = \"" (mysql-escape-str status) "\", "
          "event_log = CONCAT(event_log, \""
          (mysql-escape-str status) " " (quot (System/currentTimeMillis) 1000)
          "\", '|') WHERE id = \""
          (mysql-escape-str order-id)
          "\""))))

(def busy-statuses ["assigned" "accepted" "enroute" "servicing"])

;; Not really a useful function anymore since we keep track of busy status in
;; the couriers table now
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

(defn accept
  "There should be exactly one or zero orders in 'accepted' state, per courier."
  [db-conn order-id courier-id]
  (do (update-status db-conn order-id "accepted")
      (!update db-conn
               "orders"
               {:courier_id courier-id}
               {:id order-id})
      (set-courier-busy db-conn courier-id true)
      {:success true}))

(defn assign-to-courier
  [db-conn order-id courier-id]
  ;; we currently skip over the "assigned" status, since couriers must accept
  ;; all assignments
  (accept db-conn order-id courier-id))

(defn stamp-with-refund
  "Give it a refund object from Stripe."
  [db-conn order-id refund]
  (!update db-conn
           "orders"
           {:stripe_refund_id (:id refund)}
           {:id order-id}))

(defn after-payment
  [db-conn order]
  (do (coupons/apply-referral-bonus db-conn (:coupon_code order))
      ((resolve 'purple.users/send-push) db-conn (:user_id order)
       "Your delivery has been completed. Thank you!")))

(defn complete
  "Completes order and charges user."
  [db-conn o]
  (do (update-status db-conn (:id o) "complete")
      (set-courier-busy db-conn (:courier_id o) false)
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
                "assigned" (if (in? (map :id
                                         ((resolve 'purple.dispatch/available-couriers) db-conn))
                                    user-id)
                             (do ((resolve 'purple.dispatch/remove-order-from-zq) order)
                                 (assign-to-courier db-conn order-id user-id))
                             {:success false
                              :message "You can only have one order at a time. If you aren't working on any orders right now, your app may have gotten disconnected. Try closing the app completely and restarting it. Then wait 10 seconds. Or, if you just opened the app you will also have to wait 10 seconds."})
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
  [db-conn user-id order-id & {:keys [notify-customer suppress-user-details]}]
  (if-let [o (get-by-id db-conn order-id)]
    (if (in? config/cancellable-statuses (:status o))
      (do (update-status db-conn order-id "cancelled")
          ((resolve 'purple.dispatch/remove-order-from-zq) o)
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
              (set-courier-busy db-conn (:courier_id o) false)
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
                                     (:refund refund-result))))))
          (if suppress-user-details
            {:success true}
            ((resolve 'purple.users/details) db-conn user-id)))
      {:success false
       :message "Sorry, it is too late for this order to be cancelled."})
    {:success false
     :message "An order with that ID could not be found."}))
