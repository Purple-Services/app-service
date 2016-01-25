(ns purple.couriers
  (:use purple.util
        [purple.db :only [conn !select !insert !update mysql-escape-str]])
  (:require [purple.config :as config]
            [clojure.string :as s]))

(defn parse-courier-zones
  "Converts couriers' 'zones' from string to a set of Integer's."
  [c]
  (->> (:zones c)
       split-on-comma
       (map #(Integer. %))
       set
       (assoc c :zones)))

(defn get-couriers
  "Gets couriers from db. Optionally add WHERE constraints."
  [db-conn & {:keys [where]}]
  (map parse-courier-zones
       (!select db-conn "couriers" ["*"] (merge {} where))))

(defn all-couriers
  "All couriers."
  [db-conn]
  (get-couriers db-conn))

(defn get-all-on-duty
  "All the couriers that are currently connected."
  [db-conn]
  (get-couriers db-conn :where {:active true
                                :on_duty true}))

(defn get-all-connected
  "All the couriers that are currently connected."
  [db-conn]
  (get-couriers db-conn :where {:active true
                                :on_duty true
                                :connected true}))

(defn get-all-available
  "All the connected couriers that aren't busy."
  [db-conn]
  (get-couriers db-conn :where {:active true
                                :on_duty true
                                :connected true
                                :busy false}))

(defn get-all-expired
  "All the 'connected' couriers that haven't pinged recently."
  [db-conn]
  (map parse-courier-zones
       (!select db-conn "couriers" ["*"] {}
                :custom-where
                (str "active = 1 AND connected = 1 AND ("
                     (quot (System/currentTimeMillis) 1000)
                     " - last_ping) > "
                     config/max-courier-abandon-time))))

(defn filter-by-zone
  "Only couriers that work in this zone."
  [zone-id couriers]
  (filter #(in? (:zones %) zone-id) couriers))

(defn filter-by-market
  "Only couriers that work in this market."
  [market-id couriers]
  (let [zone-id->market-id #(quot % 50)
        zones->markets (partial map zone-id->market-id)]
    (filter #(in? (zones->markets (:zones %)) market-id) couriers)))

(defn on-duty?
  "Is this courier on duty?"
  [db-conn id]
  (in? (map :id (get-all-on-duty db-conn)) id))
