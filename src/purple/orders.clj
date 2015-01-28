(ns purple.orders
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
            [clojure.string :as s]))

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

(def keys-for-new-orders
  "A new order should have all these keys, and only these."
  [:vehicle_id
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
            :status "new"
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

