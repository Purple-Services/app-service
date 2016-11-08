(ns app.fleet
  (:require [common.config :as config]
            [common.db :refer [!select !insert !update mysql-escape-str]]
            [common.util :refer [rand-str-alpha-num coerce-double]]
            [common.zones :refer [get-zip-def]]
            [clojure.string :as s]))

(defn get-fleet-location-by-id
  [db-conn fleet-location-id]
  (first (!select db-conn "fleet_locations" ["*"] {:id fleet-location-id})))

(defn get-fleet-locations
  [db-conn courier-id lat lng]
  (let [locations (!select db-conn "fleet_locations" ["*"] {})]
    {:success true
     :accounts locations
     :default_account_id (:id (first locations))}))

(defn add-delivery
  "Report a delivery of fuel for a fleet account."
  [db-conn fleet-location-id courier-id vin license-plate gallons gas-type is-top-tier]
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
              :fleet_location_id fleet-location-id
              :vin (s/upper-case vin)
              :license_plate (s/upper-case license-plate)
              :gallons gallons
              :gas_type gas-type
              :is_top_tier (or is-top-tier false)
              ;; for reference, record gas price at this point in space-time
              :gas_price (-> (get-fleet-location-by-id db-conn fleet-location-id)
                             :address_zip
                             (#(get-zip-def db-conn %))
                             :gas-price
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
