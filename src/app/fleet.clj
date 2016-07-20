(ns app.fleet
  (:require [common.config :as config]
            [common.db :refer [!select !insert !update mysql-escape-str]]
            [common.util :refer [in? rand-str-alpha-num]]
            [common.zones :refer [get-fuel-prices]]
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
  [db-conn account-id courier-id vin license-plate gallons gas-type is-top-tier]
  (!insert db-conn
           "fleet_deliveries"
           {:id (rand-str-alpha-num 20)
            :courier_id courier-id
            :account_id account-id
            :vin vin
            :license_plate license-plate
            :gallons gallons
            :gas_type gas-type
            :is_top_tier is-top-tier
            :gas_price (-> (get-account-by-id db-conn account-id)
                           :address_zip
                           get-fuel-prices
                           (get (keyword gas-type)))}))
