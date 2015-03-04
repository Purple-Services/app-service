(ns purple.orders
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
            [purple.payment :as payment]
            [clojure.java.jdbc :as sql]
            [clojure.string :as s]))

(defn get-all
  [db-conn]
  (db/select db-conn
             "orders"
             ["*"]
             {}))

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

;; (get-by-courier (db/conn) "lGYvXf9qcRdJHzhAAIbH")

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
            )]
    (db/insert db-conn
               "orders"
               (assoc (select-keys o keys-for-new-orders)
                 :id id
                 :user_id user-id))
    {:success true}))

(defn update-status
  "Assumed to have been auth'd properly already."
  [db-conn order-id status]
  (db/update db-conn
             "orders"
             {:status status}
             {:id order-id}))

(defn cancel
  [db-conn user-id order-id]
  (let [order (get-by-id db-conn order-id)]
    (if order
      ;; put more logic in here for checking cancellation eligibility
      (if (util/in? ["unassigned" "accepted" "enroute"] (:status order))
        (do (update-status db-conn order-id "cancelled")
            ((resolve 'purple.users/details) db-conn user-id))
        {:success false
         :message "Sorry, it is too late for this order to be cancelled."})
      {:success false
       :message "An order with that ID could not be found."})))

(defn assign-to-courier
  [db-conn order-id courier-id]
  (do (sql/with-connection db-conn
        (sql/do-prepared
         (str "UPDATE couriers SET queue = CONCAT(queue, '"
              order-id
              "', '|') WHERE id = '"
              courier-id
              "'")))
      (update-status db-conn order-id "enroute")))

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
      (let [charge-result ((resolve 'purple.users/charge-user)
                           db-conn (:user_id o) (:total_price o))]
        (if (:success charge-result)
          (do (stamp-with-charge db-conn (:id o) charge-result)
              (util/send-push "Your delivery has been completed. Thank you!"))
          charge-result))))

(defn accept
  "Accepts order. This is a courier action."
  [db-conn o]
  (update-status db-conn (:id o) "accepted"))

(defn begin-route
  "This is a courier action."
  [db-conn o]
  (do (update-status db-conn (:id o) "enroute")
      (util/send-push "A courier is enroute to your location.")))

(defn service
  "This is a courier action."
  [db-conn o]
  (do (update-status db-conn (:id o) "servicing")
      (util/send-push "We are currently servicing your vehicle.")))

(defn update-status-by-courier
  [db-conn user-id order-id status]
  (let [order (get-by-id db-conn order-id)]
    (if order
      ;; make sure the auth'd user is indeed the courier for this order
      (if (= user-id (:courier_id order))
        (let [update-result (case status
                              "accepted" (accept db-conn order)
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
       :message "An order with that ID could not be found."})))

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
