(ns purple.dispatch
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
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
  []
  (db/select process-db-conn
             "orders"
             ["*"]
             {:status "unassigned"}
             :append "ORDER BY target_time_start DESC"))

(defn match-orders-with-couriers
  [orders]
  (println orders))

(defn process
  []
  (-> (fetch-orders)
      match-orders-with-couriers))

(when (not *compile-files*)
  (def process-job (at-at/every config/process-interval
                                process
                                job-pool)))



(def availability-db-conn (db/conn))

(defn couriers
  []
  (db/select availability-db-conn
             "couriers"
             ["*"]
             {}))

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
  [lat lng]
  (let [c (->> (map #(assoc % :disp (disp-squared lat lng (:lat %) (:lng %)))
                    (couriers))
               (filter (comp (partial > config/max-service-disp-squared) :disp)))]
    [{:octane "87"
      :gallons (:gallons_87 (apply max-key :gallons_87 c))
      :time [1 3]}
     {:octane "91"
      :gallons (:gallons_91 (apply max-key :gallons_91 c))
      :time [1 3]}]))

;; (availability 34.048819 -118.432994)


