;; These can be run from the repl if you paste them in users.clj

(defn historical-segment-identify-and-signup-event
  []
  (run! #(do (println (:id %))
           (segment/identify segment-client (:id %)
                               {:email (:email %)
                                :name (:name %)
                                :phone (:phone_number %)
                                :gender (:gender %)
                                :referral_code (:referral_code %)
                                :app_version (:app_version %)
                                :createdAt (time-coerce/from-sql-time
                                            (:timestamp_created %))}
                               {:timestamp (time-coerce/from-sql-time
                                            (:timestamp_created %))}
                               )
             (segment/track segment-client (:id %) "Sign Up"
                            {}
                            {:timestamp (time-coerce/from-sql-time
                                            (:timestamp_created %))})
             )
        (!select (conn) "users" ["*"] {}
                         :custom-where
                         "timestamp_created < '2015-09-30 23:04:55' ORDER BY timestamp_created ASC")))

(defn historical-segment-add-vehicle-event
  []
  (run! #(do (println (:id %))
             (segment/track segment-client (:user_id %) "Add Vehicle"
                            (assoc (select-keys % [:year :make :model
                                                   :color :gas_type
                                                   :license_plate])
                                   :vehicle_id (:id %))
                            {:timestamp (time-coerce/from-sql-time
                                            (:timestamp_created %))}))
        (!select (conn) "vehicles" ["*"] {}
                         :custom-where
                         "timestamp_created < '2015-09-30 23:04:55' ORDER BY timestamp_created ASC")))





;; These can be run from the repl if you paste them in orders.clj

(defn historical-segment-orders
  []
  (run! #(do (println (:id %))
             (segment/track segment-client (:user_id %) "Request Order"
                            (assoc (segment-props %)
                                   :charge-authorized (boolean (:paid %)))
                            {:timestamp (time-coerce/from-sql-time
                                         (:timestamp_created %))})
             (try (when (= "complete" (:status %))
                    (segment/track segment-client (:user_id %) "Complete Order"
                                   (assoc (segment-props %)
                                          :revenue (cents->dollars (:total_price %)))
                                   {:timestamp (unix->DateTime
                                                (-> (str "kludgeFix 1|" (:event_log %))
                                                    (s/split #"\||\s")
                                                    (->> (apply hash-map))
                                                    (get "complete")
                                                    Integer.))}))
                  (when (= "cancelled" (:status %))
                    (segment/track segment-client (:user_id %) "Cancel Order"
                                   (assoc (segment-props %)
                                          :cancelled-by-user true)
                                   {:timestamp (unix->DateTime
                                                (-> (str "kludgeFix 1|" (:event_log %))
                                                    (s/split #"\||\s")
                                                    (->> (apply hash-map))
                                                    (get "cancelled")
                                                    Integer.))}))
                  (catch Exception e (println e))))
        (!select (conn) "orders" ["*"] {}
                 :custom-where
                 "timestamp_created < '2015-09-30 23:04:55' ORDER BY timestamp_created ASC")))
