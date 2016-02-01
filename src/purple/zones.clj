(ns purple.zones
  (:require [clojure.walk :refer [stringify-keys]]
            [bouncer.core :as b]
            [bouncer.validators :as v]
            [purple.db :refer [conn !select !insert !update]]
            ))

(defn read-zone-strings
  "Given a zone from the database, convert edn strings to clj data"
  [zone]
  (assoc zone
         :fuel_prices (stringify-keys
                       (read-string (:fuel_prices zone)))
         :service_fees (stringify-keys
                        (read-string (:service_fees zone)))
         :service_time_bracket (read-string
                                (:service_time_bracket zone))))

(defn get-zone-by-id
  [db-conn id]
  (first (!select db-conn
                  "zones"
                  ["*"]
                  {:id id})))

(def zone-validations
  {:price-87 [[v/required :message "87 Octane price can not be blank!"]
              [v/number
               :message "87 Octance price must be in a dollar amount"]
              [v/in-range [1 5000] :message
               "Price must be within $0.01 and $50.00"]]
   :price-91 [[v/required :message "91 Octane price can not be blank!"]
              [v/number
               :message "91 Octance price must be in a dollar amount"]
              [v/in-range [1 5000] :message
               "Price must be within $0.01 and $50.00"]]
   :service-fee-60 [[v/required :message
                     "One hour service fee can not be blank!"]
                    [v/number
                     :message
                     "One hour service fee must be in a dollar amount"]
                    [v/in-range [0 5000] :message
                     "Price must be within $0.00 and $50.00"]]
   :service-fee-180 [[v/required :message
                      "Three hour service fee can not be blank!"]
                     [v/number
                      :message
                      "Three hour service fee must be in a dollar amount"]
                     [v/in-range [0 5000] :message
                      "Price must be within $0.00 and $50.00"]]
   :service-time-bracket-begin [[v/required :message
                                 "Begin time can not be blank!"]
                                [v/number
                                 :message "Service time must be a number"]
                                [v/integer
                                 :message
                                 "Service time must be a whole number!"]
                                [v/in-range [0 1440]
                                 :message
                                 "Service time must be between 0 and 1440"]
                                ]
   :service-time-bracket-end [[v/required :message
                               "End time can not be blank!"]
                              [v/number
                               :message "Service time must be a number"]
                              [v/integer
                               :message
                               "Service time must be a whole number!"]
                              [v/in-range [0 1440]
                               :message
                               "Service time must be between 0 and 1440"
                               ]]
   })

(defn validate-and-update-zone!
  "Given a zone map, validate it. If valid, create zone else return the
  bouncer error map"
  [db-conn zone]
  (if (b/valid? zone zone-validations)
    (let [{:keys [price-87 price-91 service-fee-60 service-fee-180
                  service-time-bracket-begin service-time-bracket-end]} zone
                  ]
      (!update db-conn "zones"
               {:fuel_prices (str {:87 price-87
                                   :91 price-91})
                :service_fees (str {:60 service-fee-60
                                    :180 service-fee-180})
                :service_time_bracket (str [service-time-bracket-begin
                                            service-time-bracket-end])
                }
               {:id (:id zone)}))
    {:success false
     :validation (b/validate zone zone-validations)}))
