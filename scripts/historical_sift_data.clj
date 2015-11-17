;; to be run from repl while in users.clj namespace

(defn historical-sift-create-account-event
  []
  (run! #(if (= % :pause)
           (Thread/sleep 5)
           (do (println (:id %))
               (println (sift/create-account %
                                             {:event-time
                                              (int (/ (.getTime (:timestamp_created %))
                                                      1000))}))
               (println (sift/update-account %
                                             {:event-time
                                              (int (/ (.getTime (:timestamp_created %))
                                                      1000))}))
               ))
        (interpose
         :pause
         (!select (conn) "users" ["*"] {}
                  :custom-where
                  "timestamp_created < '2015-10-15 00:02:00' ORDER BY timestamp_created ASC"))))



;; in orders.clj namespace

(defn historical-sift-transaction-event
  []
  (let [users-by-id (group-by :id
                              (!select (conn) "users" [:id :email :name :phone_number] {}))
        id->user #(first (get users-by-id %))]
    (run!
     #(do (println (:id %))


          (println (sift/charge-authorization
                    (assoc %
                           :time-limit (/ (- (:target_time_end %)
                                             (:target_time_start %))
                                          60))
                    (id->user (:user_id %))
                    (merge {:successful? (boolean (:paid %))
                            :stripe-charge-id (:stripe_charge_id %)
                            :stripe-customer-id (:stripe_customer_id_charged %)
                            
                            :event-time
                            (int (/ (.getTime (:timestamp_created %))
                                    1000))}
                           (when-not (s/blank? (:stripe_charge_id %))
                             (let [c (payment/get-stripe-charge (:stripe_charge_id %))]
                               {:card-last4 (:last4 (:source c))
                                :decline-reason-code (:failure_code c)
                                :stripe-cvc-check (:cvc_check (:source c))
                                :stripe-funding (:funding (:source c))
                                :stripe-brand (:brand (:source c))})))))
          )
     (!select (conn) "orders" ["*"] {}
              :custom-where
              (str "timestamp_created < '2015-10-15 00:02:00' "
                   "ORDER BY timestamp_created DESC")))))
