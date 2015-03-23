(ns purple.dispatch
  (:use clojure.data.priority-map)
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
            [purple.orders :as orders]
            [clojure.java.jdbc :as sql]
            [overtone.at-at :as at-at]
            [clojure.string :as s]))

(defn get-all-zones
  "Get all zones from the database."
  [db-conn]
  (db/select db-conn "zones" ["*"] {}))

;; holds all zone definitions in local mem, some parsing in there too
(def zones (map #(assoc % :zip_codes (util/split-on-comma (:zip_codes %)))
                (get-all-zones (db/conn))))

;; When server is booted up, we have to construct 'zones' map; which is a map
;; of priority-maps of orders in each zone.
;; (def zq {ZONE-ID-1 (priority-map orders...)
;;          ZONE-ID-2 (priority-map orders...)})
;; When a new order is created, we have to add it to the queue (priority map)
;; of the zone that the destination resides in.

;; a map of all zones, each with a priority-map to hold their orders
(def zq (into {} (map #(identity [(:id %) (atom (priority-map))]) zones)))
       
(defn order->zone-id
  "Determine which zone the order is in; gives the zone id."
  [order]
  (let [zip-code (subs (:address_zip order) 0 5)]
    (:id (first (filter #(util/in? (:zip_codes %) zip-code)
                        zones)))))

(defn priority-score
  "Compute the priority score (an int) of the order."
  [order]
  (:target_time_end order))

(defn add-order-to-zq
  "Adds order to its zone's queue."
  [order]
  (swap! (get zq (order->zone-id order))
         conj [(:id order) (priority-score order)]))

;; on server boot, put any existing unassigned orders into the zq
(when (not *compile-files*)
  (doall (map add-order-to-zq
              (orders/get-all-unassigned (db/conn)))))

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

;; we currently are only checking zip code
;; we assume up to 15 gallons available and both time brackets always available
(defn availability
  "Get courier availability for given constraints."
  [zip-code]
  (let [any-zones? (not (empty? (filter #(util/in? (:zip_codes %) zip-code)
                                        zones)))]
    {:success true
     :availability [{:octane "87"
                     :gallons (if any-zones?
                                15
                                0)
                     :time [1 3]
                     :price_per_gallon @config/gas-price-87}
                    {:octane "91"
                     :gallons (if any-zones?
                                15
                                0)
                     :time [1 3]
                     :price_per_gallon @config/gas-price-91}]}))

(def job-pool (at-at/mk-pool))

(def process-db-conn (db/conn)) ;; ok to use same conn forever? (have to test..)

(defn available-couriers
  [db-conn]
  (map #(assoc % :zones (map (fn [x] (Integer. x))
                             (util/split-on-comma (:zones %))))
       (db/select db-conn
                  "couriers"
                  ["*"]
                  {:active true
                   :on_duty true
                   :connected true
                   :busy false})))

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

(defn take-order-from-zone
  "Tries to take one order from the chosen zone."
  [zone]
  (let [pm (get zq zone)]
    (when-let [o (peek @pm)]
      (swap! pm pop)
      o)))

(defn match-order
  [pm-entry db-conn courier-id] ;; pm-entry: Priority-Map Entry (key-value pair)
  (when pm-entry
    (let [order-id (first pm-entry)]
      (orders/assign-to-courier db-conn order-id courier-id))))

(defn take-order-from-zones
  "Does take-order-from-zone over multiple zones. Stops after first hit."
  [db-conn courier-id zones]
  (doseq [z zones
          :let [o (take-order-from-zone z)]
          :while (nil? (doto o (match-order db-conn courier-id)))]))

(defn match-orders-with-couriers
  [db-conn]
  (doall (map #(take-order-from-zones db-conn (:id %) (:zones %))
              (available-couriers db-conn))))

(defn process
  "Does a few periodic tasks."
  []
  (do (update-courier-state process-db-conn)
      (match-orders-with-couriers process-db-conn)))

(when (not *compile-files*)
  (def process-job (at-at/every config/process-interval
                                process
                                job-pool)))

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

;; on server boot, set initial gas prices locally from database
(when (not *compile-files*)
  (let [c (first (db/select (db/conn) "config" ["*"] {:id 1}))]
    (reset! config/gas-price-87 (:gas_price_87 c))
    (reset! config/gas-price-91 (:gas_price_91 c))))

(defn change-gas-price
  "Updates gas prices locally and in the database."
  [db-conn gas-price-87 gas-price-91]
  (do (reset! config/gas-price-87 gas-price-87)
      (reset! config/gas-price-91 gas-price-91)
      (db/update db-conn
                 "config"
                 {:gas_price_87 gas-price-87
                  :gas_price_91 gas-price-91}
                 {:id 1})
      {:success true}))

;; (defn square [x] (* x x))

;; (defn disp-squared
;;   "Calculate displacement squared between two coords."
;;   [x1 y1 x2 y2]
;;   (+ (square (- x2 x1))
;;      (square (- y2 y1))))

;; (defn couriers-in-range
;;   [db-conn lat lng]
;;   (->> (map #(assoc % :disp (disp-squared lat lng (:lat %) (:lng %)))
;;             (couriers db-conn))
;;        (filter (comp (partial > config/max-service-disp-squared) :disp))))
