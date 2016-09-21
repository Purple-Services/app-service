(ns app.couriers
  (:require [common.config :as config]
            [common.couriers :refer [get-couriers parse-courier-markets]]
            [common.db :refer [!select !insert !update mysql-escape-str]]
            [common.util :refer [in? ver< now-unix]]
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
  (map parse-courier-markets
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
  [db-conn lat lng dest-lat dest-lng]
  (let [blacklist (map :station_id
                       (!select db-conn
                                "station_blacklist"
                                [:station_id]
                                {}
                                :custom-where
                                (str (quot (System/currentTimeMillis) 1000)
                                     " < until")))
        result (map (comp #(clojure.set/rename-keys % {:street :address_street})
                          #(select-keys % [:id :brand :street :lat :lng])
                          :station)
                    (if dest-lat
                      (gas-rec/compute-suggestions lat lng dest-lat dest-lng
                                                   {:blacklist blacklist})
                      (gas-rec/compute-suggestions lat lng
                                                   {:blacklist blacklist})))]
    (if (seq result)
      (merge {:success true}
             (first result))
      {:success false
       :message "No gas stations found."})))

(defn blacklist-station
  "Blacklist a gas station by ID."
  [db-conn user-id station-id reason]
  (let [reason->until {"Permanently closed"    1999999999
                       "Not open right now"    (+ (now-unix) 43200)  ; +12 hours
                       "Long line"             (+ (now-unix) 10800)  ; +3 hours
                       "Gas card not accepted" 1999999999
                       "Price is too high"     (+ (now-unix) 864000) ; +10 days
                       "Other"                 1999999999}
        result (!insert db-conn
                        "station_blacklist"
                        {:station_id station-id
                         :creator_user_id user-id
                         :reason reason
                         :until (reason->until reason)})]
    (if (:success result)
      {:success true
       :message "Thank you for reporting this station! Please search again to find a new station."
       :message_title "Thanks!"}
      {:success false
       :message "That station does not exist."
       :message_title "Error"})))
