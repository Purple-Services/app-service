(ns purple.couriers
  (:use purple.util
        [purple.db :only [conn !select !insert !update mysql-escape-str]])
  (:require [purple.config :as config]
            [clojure.string :as s]))

(defn get-all-connected
  "All the couriers that are currently connected."
  [db-conn]
  (map #(assoc % :zones (set (map (fn [x] (Integer. x))
                                  (split-on-comma (:zones %)))))
       (!select db-conn
                "couriers"
                ["*"]
                {:active true
                 :on_duty true
                 :connected true})))

(defn available-couriers
  [db-conn]
  (map #(assoc % :zones (set (map (fn [x] (Integer. x))
                                  (split-on-comma (:zones %)))))
       (!select db-conn
                "couriers"
                ["*"]
                {:active true
                 :on_duty true
                 :connected true
                 :busy false})))

(defn all-couriers
  "Return all couriers with their names"
  [db-conn]
  (map #(assoc % :name
               (:name
                ((resolve 'purple.users/get-user-by-id) db-conn (:id %))))
       (!select db-conn "couriers" "*" {})))
