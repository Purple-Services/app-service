(ns purple.orders
  (:use purple.util)
  (:require [purple.config :as config]
            [purple.db :as db]
            [purple.payment :as payment]
            [purple.coupons :as coupons]
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
  (db/select db-conn
             "orders"
             ["*"]
             {}
             :append "ORDER BY target_time_start DESC"))

(defn get-all-unassigned
  [db-conn]
  (db/select db-conn
             "orders"
             ["*"]
             {:status "unassigned"}
             :append "ORDER BY target_time_start DESC"))

(defn get-by-id
  "Gets a user from db by user-id."
  [db-conn id]
  (first (db/select db-conn
                    "orders"
                    ["*"]
                    {:id id})))


(defn get-by-user
  "Gets all of a user's orders."
  [db-conn user-id]
  (db/select db-conn
             "orders"
             ["*"]
             {:user_id user-id}
             :append "ORDER BY target_time_start DESC"))

(defn get-by-courier
  "Gets all of a courier's assigned orders."
  [db-conn courier-id]
  (let [orders (db/select db-conn
                          "orders"
                          ["*"]
                          {}
                          :custom-where
                          (str "(courier_id = \""
                               (db/mysql-escape-str courier-id)
                               "\" AND target_time_start > "
                               (- (quot (System/currentTimeMillis) 1000)
                                  (* 60 60 24 16)) ;; 16 days
                               ") OR status = \"unassigned\" ORDER BY target_time_end DESC"))
        customer-ids (distinct (map :user_id orders))
        customers (group-by :id
                            (db/select db-conn
                                       "users"
                                       [:id :name :phone_number]
                                       {}
                                       :custom-where
                                       (str "id IN (\""
                                            (apply str
                                                   (interpose "\",\"" customer-ids))
                                            "\")")))
        vehicle-ids (distinct (map :vehicle_id orders))
        vehicles (group-by :id
                           (db/select db-conn
                                      "vehicles"
                                      ["*"]
                                      {}
                                      :custom-where
                                      (str "id IN (\""
                                           (apply str
                                                  (interpose "\",\"" vehicle-ids))
                                           "\")")))]
    (map #(assoc %
            :customer
            (first (get customers (:user_id %)))
            :vehicle
            (first (get vehicles (:vehicle_id %))))
         orders)))

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
          (if (not (s/blank? coupon-code))
            (:value (coupons/code->value db-conn coupon-code vehicle-id user-id))
            0))))

(defn valid-price?
  "Is the stated 'total_price' accurate?"
  [db-conn o]
  (= (:total_price o)
     (calculate-cost db-conn
                     (:gas_type o)
                     (:gallons o)
                     (:time-in-minutes o)
                     (:coupon_code o)
                     (:vehicle_id o)
                     (:user_id o)
                     (:referral_gallons_used o))))

(defn connected-couriers
  [db-conn]
  (map #(assoc % :zones (map (fn [x] (Integer. x))
                             (split-on-comma (:zones %))))
       (db/select db-conn
                  "couriers"
                  ["*"]
                  {:active true
                   :on_duty true
                   :connected true})))

(defn valid-time?
  [db-conn o]
  (if (< (:time-in-minutes o) 180)
    (let [zone-id ((resolve 'purple.dispatch/order->zone-id) o)
          pm ((resolve 'purple.dispatch/get-map-by-zone-id) zone-id)
          num-orders-in-queue (count @pm)
          num-couriers (max 1
                            (count (filter #(in? (:zones %) zone-id)
                                           (connected-couriers db-conn))))]
      (< num-orders-in-queue
                                        ;(* 2 num-couriers)))
         (* 1 num-couriers)))
    true))

(defn infer-gas-type-by-price
  "This is only for backwards compatiblity."
  [gas-price]
  (if (= gas-price (octane->gas-price "87"))
    "87"
    (if (= gas-price (octane->gas-price "91"))
      "91"
      "87"))) ;; if we can't find it then assume 87

(defn add
  "The user-id given is assumed to have been auth'd already."
  [db-conn user-id order]
  (let [time-in-minutes (case (:time order)
                          ;; these are under the old system
                          "< 1 hr" 60
                          "< 3 hr" 180
                          ;; the rest are handled as new system
                          ;; which means it is given in minutes
                          (Integer. (:time order)))

        license-plate (some-> (db/select db-conn
                                         "vehicles"
                                         ["license_plate"]
                                         {:id (:vehicle_id order)})
                              first
                              :license_plate)

        referral-gallons-available
        (:referral_gallons ((resolve 'purple.users/get-user-by-id) db-conn user-id))
        
        o (assoc (select-keys order [:vehicle_id :special_instructions
                                     :address_street :address_city
                                     :address_state :address_zip :gas_price
                                     :service_fee :total_price])
            :id (rand-str-alpha-num 20)
            :user_id user-id
            :status "unassigned"
            :target_time_start (quot (System/currentTimeMillis) 1000)
            :target_time_end (+ (quot (System/currentTimeMillis) 1000)
                                (* 60 time-in-minutes))
            :time-in-minutes time-in-minutes
            :gallons (Integer. (:gallons order))
            :gas_type (if (nil? (:gas_type order))
                        (infer-gas-type-by-price (:gas_price order))
                        (:gas_type order))
            :lat (Double. (:lat order))
            :lng (Double. (:lng order))
            :license_plate license-plate
            :referral_gallons_used (min (Integer. (:gallons order))
                                        referral-gallons-available)
            :coupon_code (s/upper-case (or (:coupon_code order) "")))]
    (if (valid-price? db-conn o)
      (if (valid-time? db-conn o)
        (do (db/insert db-conn "orders" (select-keys o [:id :user_id :vehicle_id
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
            (when (not (= 0 (:referral_gallons_used o)))
              (coupons/mark-gallons-as-used db-conn
                                            (:user_id o)
                                            (:referral_gallons_used o)))
            (when (not (s/blank? (:coupon_code o)))
              (coupons/mark-code-as-used db-conn
                                         (:coupon_code o)
                                         (:license_plate o)
                                         (:user_id o)))
            (future (doall (map #((resolve 'purple.users/send-push)
                                  db-conn (:id %) "New order available. Please accept ASAP if interested.")
                                ((resolve 'purple.dispatch/available-couriers) db-conn)))
                    (send-email {:to "chris@purpledelivery.com"
                                 :subject "Purple - New Order"
                                 :body (str o)})
                    (when (= config/db-user "purplemasterprod") ;; only in production
                      (doall (map #(send-sms %
                                             (str "New order:\n"
                                                  "Due: " (unix->full
                                                           (:target_time_end o))
                                                  "\n" (:address_street o)
                                                  ", " (:address_zip o)))
                                  ["3235782263" ;; Bruno
                                   "3106919061" ;; JP
                                   "8589228571" ;; Lee
                                   ]))))
            {:success true})
        {:success false
         :message "Sorry, we currently are experiencing high volume and can't promise a delivery within that time limit. Please go back and choose the \"within 3 hours\" option."})
      {:success false
       :message "Sorry, the price changed while you were creating your order. Please press the back button to go back to the map and start over."})))

(defn update-status
  "Assumed to have been auth'd properly already."
  [db-conn order-id status]
  (sql/with-connection db-conn
    (sql/do-prepared
     (str "UPDATE orders SET "
          "status = \"" (db/mysql-escape-str status) "\", "
          "event_log = CONCAT(event_log, \""
          (db/mysql-escape-str status) " " (quot (System/currentTimeMillis) 1000)
          "\", '|') WHERE id = \""
          (db/mysql-escape-str order-id)
          "\""))))

(def busy-statuses ["assigned" "accepted" "enroute" "servicing"])

;; Not really a useful function anymore since we keep track of busy status in
;; the couriers table now
(defn courier-busy?
  "Is courier currently working on an order?"
  [db-conn courier-id]
  (let [orders (db/select db-conn
                          "orders"
                          [:id :status]
                          {:courier_id courier-id})]
    (boolean (some #(in? busy-statuses (:status %)) orders))))

(defn set-courier-busy
  [db-conn courier-id busy]
  (db/update db-conn
             "couriers"
             {:busy busy}
             {:id courier-id}))

(defn accept
  "There should be exactly one or zero orders in 'accepted' state, per courier."
  [db-conn order-id courier-id]
  (do (update-status db-conn order-id "accepted")
      (db/update db-conn
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

(defn stamp-with-charge
  "Give it a charge object from Stripe."
  [db-conn order-id charge]
  (db/update db-conn
             "orders"
             {:paid true
              :stripe_charge_id (:id charge)
              :stripe_customer_id_charged (:customer charge)
              :stripe_balance_transaction_id (:balance_transaction charge)
              :time_paid (:created charge)}
             {:id order-id}))

(defn complete
  "Completes order and charges user."
  [db-conn o]
  (do (update-status db-conn (:id o) "complete")
      (set-courier-busy db-conn (:courier_id o) false)
      (if (= 0 (:total_price o))
        (do (coupons/apply-referral-bonus db-conn (:coupon_code o))
            ((resolve 'purple.users/send-push) db-conn (:user_id o)
             "Your delivery has been completed. Thank you!"))
        (let [charge-description (str "Delivery of "
                                      (:gallons o) " Gallons of Gasoline ("
                                      (->> (db/select db-conn
                                                      "vehicles"
                                                      [:gas_type]
                                                      {:id (:vehicle_id o)})
                                           first
                                           :gas_type)
                                      " Octane)\n" "Where: "
                                      (:address_street o)
                                      "\n" "When: "
                                      (unix->fuller
                                       (quot (System/currentTimeMillis) 1000)))
              charge-result ((resolve 'purple.users/charge-user) db-conn
                             (:user_id o) (:total_price o) charge-description)]
          (if (:success charge-result)
            (do (stamp-with-charge db-conn (:id o) (:charge charge-result))
                (coupons/apply-referral-bonus db-conn (:coupon_code o))
                ((resolve 'purple.users/send-push) db-conn (:user_id o)
                 "Your delivery has been completed. Thank you!"))
            charge-result)))))

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
                    "Your app seems to be out of sync. Try closing the app completely and restarting it.")}
        (let [update-result
              (case status
                "assigned" (if (in? (map :id
                                         ((resolve 'purple.dispatch/available-couriers) db-conn))
                                    user-id)
                             (do ((resolve 'purple.dispatch/remove-order-from-zq) order)
                                 (assign-to-courier db-conn order-id user-id))
                             {:success false
                              :message "You can only have one order at a time. If you aren't working on any orders right now, your app may have gotten disconnected. Try closing the app completely and restarting it. Then wait 10 seconds."})
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
  (db/update db-conn
             "orders"
             {:number_rating number-rating
              :text_rating text-rating}
             {:id order-id}))

(defn rate
  [db-conn user-id order-id rating]
  (do (update-rating db-conn order-id (:number_rating rating) (:text_rating rating))
      ((resolve 'purple.users/details) db-conn user-id)))

(defn cancel
  [db-conn user-id order-id]
  (if-let [o (get-by-id db-conn order-id)]
    (if (in? config/cancellable-statuses (:status o))
      (do (update-status db-conn order-id "cancelled")
          ((resolve 'purple.dispatch/remove-order-from-zq) o)
          ;; return any free gallons that may have been used
          (when (not (= 0 (:referral_gallons_used o)))
            (coupons/mark-gallons-as-unused db-conn
                                            (:user_id o)
                                            (:referral_gallons_used o))
            (db/update db-conn
                       "orders"
                       {:referral_gallons_used 0}
                       {:id order-id}))
          ;; free up that coupon code for that vehicle
          (when (not (s/blank? (:coupon_code o)))
            (coupons/mark-code-as-unused db-conn
                                         (:coupon_code o)
                                         (:vehicle_id o)
                                         (:user_id o))
            (db/update db-conn
                       "orders"
                       {:coupon_code ""}
                       {:id order-id}))
          (when (not (s/blank? (:courier_id o)))
            (set-courier-busy db-conn (:courier_id o) false)
            ((resolve 'purple.users/send-push) db-conn (:courier_id o)
             "The current order has been cancelled."))
          ((resolve 'purple.users/details) db-conn user-id))
      {:success false
       :message "Sorry, it is too late for this order to be cancelled."})
    {:success false
     :message "An order with that ID could not be found."}))
