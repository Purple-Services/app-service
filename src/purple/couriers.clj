(ns purple.couriers
  (:use purple.util
        [purple.db :only [conn !select !insert !update mysql-escape-str]])
  (:require [purple.config :as config]
            [clojure.string :as s]))

(defn get-all-connected
  "All the couriers that are currently connected."
  [db-conn]
  (map #(assoc % :zones (map (fn [x] (Integer. x))
                             (split-on-comma (:zones %))))
       (!select db-conn
                "couriers"
                ["*"]
                {:active true
                 :on_duty true
                 :connected true})))
