(ns purple.orders
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
            [purple.payment :as payment]
            [clojure.java.jdbc :as sql]
            [clojure.string :as s]))

;; Order status definitions
;; unassigned - not assigned to any courier yet
;; assigned   - assigned to a courier
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
                          {:courier_id courier-id}
                          :append "ORDER BY target_time_start DESC")
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

(def keys-for-new-orders
  "A new order should have all these keys, and only these."
  [:vehicle_id
   :status
   :target_time_start
   :target_time_end
   :gallons
   :special_instructions
   :lat
   :lng
   :address_street
   :address_city
   :address_state
   :address_zip
   :gas_price
   :service_fee
   :total_price])

(defn add
  "The user-id given is assumed to have been auth'd already."
  [db-conn user-id order]
  (let [id (util/rand-str-alpha-num 20)
        o (assoc order
            :status "unassigned"
            :target_time_start (quot (System/currentTimeMillis) 1000)
            :target_time_end (+ (quot (System/currentTimeMillis) 1000)
                                (* 3600
                                   (case (:time order)
                                     "< 1 hr" 1
                                     "< 3 hr" 3)))
            :gallons (Integer. (:gallons order))
            :lat (Double. (:lat order))
            :lng (Double. (:lng order))
            )
        o-to-insert (assoc (select-keys o keys-for-new-orders)
                      :id id
                      :user_id user-id)]
    (db/insert db-conn "orders" o-to-insert)
    ((resolve 'purple.dispatch/add-order-to-zq) o-to-insert)
    (util/send-email {:from "purpleservicesfeedback@gmail.com"
                      :to "elwell.christopher@gmail.com"
                      :subject "Purple - New Order"
                      :body (str o-to-insert)})
    {:success true}))

(defn update-status
  "Assumed to have been auth'd properly already."
  [db-conn order-id status]
  (sql/with-connection db-conn
    (sql/do-prepared
     (str "UPDATE orders SET "
          "status = '" status "', "
          "event_log = CONCAT(event_log, '"
          status " " (quot (System/currentTimeMillis) 1000)
          "', '|') WHERE id = '"
          order-id
          "'"))))

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
    (boolean (some #(util/in? busy-statuses (:status %)) orders))))

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
      ((resolve 'purple.users/send-push) db-conn courier-id
       "You have been assigned a new order.")))

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
      (let [charge-result ((resolve 'purple.users/charge-user)
                           db-conn (:user_id o) (:total_price o))]
        (if (:success charge-result)
          (do (stamp-with-charge db-conn (:id o) (:charge charge-result))
              ((resolve 'purple.users/send-push) db-conn (:user_id o)
               "Your delivery has been completed. Thank you!"))
          charge-result))))

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

(defn update-status-by-courier
  [db-conn user-id order-id status]
  (if-let [order (get-by-id db-conn order-id)]
    ;; make sure the auth'd user is indeed the courier for this order
    (if (= user-id (:courier_id order))
      (let [update-result (case status
                            "enroute" (begin-route db-conn order)
                            "servicing" (service db-conn order)
                            "complete" (complete db-conn order)
                            {:success false
                             :message "Invalid status."})]
        ;; send back error message or user details if successful
        (if (:success update-result)
          ((resolve 'purple.users/details) db-conn user-id)
          update-result))
      {:success false
       :message "Permission denied."})
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

(def cancellable-statuses ["unassigned" "assigned" "accepted" "enroute"])

(defn cancel
  [db-conn user-id order-id]
  (if-let [o (get-by-id db-conn order-id)]
    (if (util/in? cancellable-statuses (:status o))
      (do (update-status db-conn order-id "cancelled")
          (set-courier-busy db-conn (:courier_id o) false)
          ((resolve 'purple.users/send-push) db-conn (:courier_id o)
           "The current order has been cancelled.")
          ((resolve 'purple.users/details) db-conn user-id))
      {:success false
       :message "Sorry, it is too late for this order to be cancelled."})
    {:success false
     :message "An order with that ID could not be found."}))
