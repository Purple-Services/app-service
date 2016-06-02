(ns app.couriers
  (:require [common.config :as config]
            [common.couriers :refer [process-courier get-couriers]]
            [common.db :refer [!select !update mysql-escape-str]]
            [common.util :refer [in? ver<]]
            [opt.gas-station-recommendation :as gas-rec]
            [clojure.string :as s]))

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
  (map process-courier
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

(defn ping
  "The courier app periodically pings us with courier status details."
  [db-conn user-id app-version lat lng gallons_87 gallons_91 set-on-duty]
  (merge (if (ver< (or app-version "0") "1.11.0")
           {:success false
            :message "Please update your courier app to the latest version. You seem to be using the customer app or an old version of the courier app."
            :message_title "Error"}
           (!update db-conn
                    "couriers"
                    (merge {:lat lat
                            :lng lng
                            :gallons_87 gallons_87
                            :gallons_91 gallons_91
                            :connected 1
                            :last_ping (quot (System/currentTimeMillis) 1000)}
                           (when (not (nil? set-on-duty))
                             {:on_duty set-on-duty}))
                    {:id user-id}))
         {:on_duty (on-duty? db-conn user-id)}))

(defn get-stations
  "Get gas station suggestions."
  [lat lng]
  (let [result (map (comp #(clojure.set/rename-keys % {:street :address_street})
                          #(select-keys % [:id :brand :street :lat :lng])
                          :station)
                    (gas-rec/compute-suggestions lat lng {}))]
    (if (seq result)
      (merge {:success true}
             (first result))
      {:success false
       :message "No gas stations found."})))
