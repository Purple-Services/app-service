(ns purple.dispatch
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
            [clojure.java.jdbc :as sql]
            [overtone.at-at :as at-at]
            [clojure.string :as s]))

(comment [:id
          :status
          :user_id
          :vehicle_id
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

(def job-pool (at-at/mk-pool))

(def process-db-conn (db/conn)) ;; ok to use same conn forever (will have to test)

(defn fetch-orders
  [db-conn]
  (db/select db-conn
             "orders"
             ["*"]
             {:status "unassigned"}
             :append "ORDER BY target_time_start DESC"))

(defn match-orders-with-couriers
  [orders]
  true
  ;; (println orders)
  )

(defn update-courier-state
  [db-conn]
  (sql/with-connection db-conn
    (sql/update-values
     "couriers"
     [(str "active = 1 AND connected = 1 AND ("
           (quot (System/currentTimeMillis) 1000)
           " - last_ping) > "
           config/max-courier-abandon-time)]
     {:connected 0})))

(defn process
  "Does a few periodic tasks."
  []
  (do (update-courier-state process-db-conn)
      (-> (fetch-orders process-db-conn)
          match-orders-with-couriers)))

(when (not *compile-files*)
  (def process-job (at-at/every config/process-interval
                                process
                                job-pool)))

(defn couriers
  [db-conn]
  (db/select db-conn
             "couriers"
             ["*"]
             {:active true
              :on_duty true
              :connected true}))

(defn square [x] (* x x))

(defn disp-squared
  "Calculate displacement squared between two coords."
  [x1 y1 x2 y2]
  (+ (square (- x2 x1))
     (square (- y2 y1))))

;; Example "courier availability" map
(comment [{:octane "87"
           :gallons 15
           :time [1 3]} ;; i.e., within 1 hour or 3 hours
          {:octane "91"
           :gallons 10
           :time [3]}])

(defn availability
  "Get courier availability for given constraints."
  [db-conn lat lng]
  (let [c (->> (map #(assoc % :disp (disp-squared lat lng (:lat %) (:lng %)))
                    (couriers db-conn))
               (filter (comp (partial > config/max-service-disp-squared) :disp)))]
    {:success true
     :availability [{:octane "87"
                     :gallons (if (empty? c)
                                0
                                (:gallons_87 (apply max-key :gallons_87 c)))
                     :time [1 3]}
                    {:octane "91"
                     :gallons (if (empty? c)
                                0
                                (:gallons_91 (apply max-key :gallons_91 c)))
                     :time [1 3]}]}))

