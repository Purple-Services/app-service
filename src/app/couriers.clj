(ns app.couriers
  (:require [common.config :as config]
            [common.couriers :refer [get-couriers parse-courier-zones]]
            [common.db :refer [!select !insert !update mysql-escape-str]]
            [common.util :refer [in? ver< now-unix rand-str-alpha-num coerce-double]]
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

(defn on-duty?
  "Is this courier on duty?"
  [db-conn id]
  (in? (map :id (get-all-on-duty db-conn)) id))

(defn ping
  "The courier app periodically pings us with courier status details."
  [db-conn user-id app-version lat lng gallons_87 gallons_91 set-on-duty]
  (merge (if (ver< (or app-version "0") "1.11.8")
           {:success false
            :message "Please update your courier app to the latest version. You seem to be using the customer app or an old version of the courier app. https://purpleapp.com/courierapp"
            :message_title "Error"}
           (!update db-conn
                    "couriers"
                    (merge {:lat lat
                            :lng lng
                            :gallons_87 gallons_87
                            :gallons_91 gallons_91
                            :connected 1
                            :last_ping (quot (System/currentTimeMillis) 1000)}
                           (when-not (nil? set-on-duty)
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

(defn get-gas-purchases
  [db-conn courier-id]
  {:success true
   :gas_purchases
   (or (!select db-conn "gas_purchases" ["*"] {}
                :custom-where
                (str "deleted != 1 "
                     "AND courier_id = \"" (mysql-escape-str courier-id) "\" "
                     "ORDER BY timestamp_created DESC LIMIT 30"))
       [])})

(defn add-gas-purchase
  "For a courier to report a purchase of fuel."
  [db-conn courier-id gallons total-price gas-type lat lng timestamp-recorded &
   {:keys [no-select-query]}]
  (cond
    (not (pos? gallons))
    {:sucess false :message "You must enter a number of Gallons greater than 0."}
    
    (not (pos? total-price))
    {:sucess false :message "You must enter a Total Price greater than 0."}
    
    :else
    (do (when (empty? (!select db-conn ; pass thru w/o adding if already exists
                               "gas_purchases"
                               ["1"]
                               {:courier_id courier-id
                                :gallons gallons
                                :total_price total-price
                                :gas_type gas-type
                                :timestamp_recorded timestamp-recorded}))
          (!insert db-conn
                   "gas_purchases"
                   {:id (rand-str-alpha-num 20)
                    :courier_id courier-id
                    :gallons gallons
                    :total_price (int (* total-price 100))
                    :gas_type gas-type
                    :lat lat
                    :lng lng
                    :timestamp_recorded timestamp-recorded}))
        (when-not no-select-query
          (get-gas-purchases db-conn courier-id)))))

(defn add-gas-purchases
  [db-conn
   courier-id ; i.e., the auth'd user-id
   gas-purchases]
  (run! #(add-gas-purchase db-conn
                           courier-id
                           (if (s/blank? (:gallons %))
                             0
                             (coerce-double (:gallons %)))
                           (if (s/blank? (:total_price %))
                             0
                             (coerce-double (:total_price %)))
                           (:gas_type %)
                           (:lat %)
                           (:lng %)
                           (:timestamp_recorded %)
                           :no-select-query true)
        gas-purchases)
  (get-gas-purchases db-conn courier-id))

(defn edit-gas-purchase
  [db-conn gas-purchase-id courier-id gallons total-price gas-type
   timestamp-recorded & {:keys [no-select-query]}]
  (cond
    (not (pos? gallons))
    {:sucess false :message "You must enter a number of Gallons greater than 0."}
    
    (not (pos? total-price))
    {:sucess false :message "You must enter a Total Price greater than 0."}
    
    :else
    (do (!update db-conn
                 "gas_purchases"
                 {:courier_id courier-id
                  :gallons gallons
                  :total_price (int (* total-price 100))
                  :gas_type gas-type}
                 {:id gas-purchase-id})
        (when-not no-select-query
          (get-gas-purchases db-conn courier-id)))))

(defn delete-gas-purchase
  [db-conn courier-id gas-purchase-id]
  (do (!update db-conn
               "gas_purchases"
               {:deleted 1}
               {:courier_id courier-id
                :id gas-purchase-id})
      (get-gas-purchases db-conn courier-id)))
