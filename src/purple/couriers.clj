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
  (let [all-couriers (!select db-conn "couriers" "*" {})
        users-by-id  (->> (!select db-conn "users"
                                   [:id :name :email :phone_number :os
                                    :app_version]
                                   {:is_courier true})
                          (group-by :id))
        id->name   #(:name (first (get users-by-id %)))
        id->phone_number #(:phone_number (first (get users-by-id %)))]
    (map #(assoc % :name
                 (id->name (:id %))
                 :phone_number
                 (id->phone_number (:id %)))
         all-couriers)))
