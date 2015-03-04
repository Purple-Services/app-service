(ns purple.dispatch
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
            [purple.orders :as orders]
            [clojure.java.jdbc :as sql]
            [overtone.at-at :as at-at]
            [clojure.string :as s]))

(def job-pool (at-at/mk-pool))

(def process-db-conn (db/conn)) ;; ok to use same conn forever (will have to test)

(defn fetch-orders
  [db-conn]
  (db/select db-conn
             "orders"
             ["*"]
             {:status "unassigned"}
             :append "ORDER BY target_time_start DESC"))

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

(defn couriers-in-range
  [db-conn lat lng]
  (->> (map #(assoc % :disp (disp-squared lat lng (:lat %) (:lng %)))
            (couriers db-conn))
       (filter (comp (partial > config/max-service-disp-squared) :disp))))

(defn match-orders-with-couriers
  [db-conn orders]
  (map #(->> (couriers-in-range db-conn (:lat %) (:lng %))
             (apply min-key :disp)
             :id
             (orders/assign-to-courier db-conn (:id %)))
       orders))

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
      (->> (fetch-orders process-db-conn)
           (match-orders-with-couriers process-db-conn))))

(when (not *compile-files*)
  (def process-job (at-at/every config/process-interval
                                process
                                job-pool)))

;; Example "courier availability" map
(comment [{:octane "87"
           :gallons 15
           :time [1 3] ;; i.e., within 1 hour or 3 hours
           :price_per_gallon 247 ;; in cents
           } 
          {:octane "91"
           :gallons 10
           :time [3]
           :price_per_gallon 285}])

(defn availability
  "Get courier availability for given constraints."
  [db-conn lat lng]
  (let [c (couriers-in-range db-conn lat lng)]
    {:success true
     :availability [{:octane "87"
                     :gallons (if (empty? c)
                                0
                                (:gallons_87 (apply max-key :gallons_87 c)))
                     :time [1 3]
                     :price_per_gallon 247}
                    {:octane "91"
                     :gallons (if (empty? c)
                                0
                                (:gallons_91 (apply max-key :gallons_91 c)))
                     :time [1 3]
                     :price_per_gallon 285}]}))

(defn courier-ping
  [db-conn user-id lat lng gallons]
  (db/update db-conn
             "couriers"
             {:lat lat
              :lng lng
              :gallons_87 (Integer. (:87 gallons))
              :gallons_91 (Integer. (:91 gallons))
              :connected 1
              :last_ping (quot (System/currentTimeMillis) 1000)}
             {:id user-id}))
