(ns app.fleet
  (:require [common.config :as config]
            [common.db :refer [!select !insert !update mysql-escape-str]]
            [common.util :refer [rand-str-alpha-num coerce-double]]
            [common.zoning :refer [get-zip-def]]
            [clojure.string :as s]))

(defn get-account-by-id
  [db-conn account-id]
  (first (!select db-conn "fleet_accounts" ["*"] {:id account-id})))

(defn get-accounts
  [db-conn courier-id lat lng]
  (let [accounts (!select db-conn "fleet_accounts" ["*"] {})]
    {:success true
     :accounts accounts
     :default_account_id (:id (first accounts))}))

(defn add-delivery
  "Report a delivery of fuel for a fleet account."
  [db-conn account-id courier-id vin license-plate gallons gas-type is-top-tier]
  (cond
    (and (s/blank? vin) (s/blank? license-plate))
    {:sucess false :message "You must enter a VIN or a License Plate."}
    
    (= 0 gallons)
    {:sucess false :message "You must enter the number of gallons delivered."}
    
    :else
    (!insert db-conn
             "fleet_deliveries"
             {:id (rand-str-alpha-num 20)
              :courier_id courier-id
              :account_id account-id
              :vin (s/upper-case vin)
              :license_plate (s/upper-case license-plate)
              :gallons gallons
              :gas_type gas-type
              :is_top_tier (or is-top-tier false)
              ;; for reference, record gas price at this point in space-time
              :gas_price (-> (get-account-by-id db-conn account-id)
                             :address_zip
                             get-zip-def
                             (get gas-type))})))

(defn add-deliveries
  [db-conn
   courier-id ; i.e., the auth'd user-id
   deliveries]
  (run! #(add-delivery db-conn
                       (:account_id %)
                       courier-id
                       (:vin %)
                       (:license_plate %)
                       (:gallons %)
                       (:gas_type %)
                       (:is_top_tier %))
        deliveries))
