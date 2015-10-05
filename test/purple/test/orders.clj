(ns purple.test.orders
  (:require [purple.orders :as orders]
            [purple.db :refer [!select conn !update]]
            [purple.dispatch :as dispatch]
            [purple.test.db :refer [db-config]]
            [clojure.test :refer [use-fixtures deftest is test-ns testing]]))

(defn test-order
  "Create a test order."
  []
  (let [test-user (first (!select db-config "users" ["*"]
                                  {:email "test@test.com"}))
        user-id   (:id test-user)
        vehicle-id (:id
                    (first
                     (sort-by :timestamp_created
                              (!select db-config "vehicles" ["*"]
                                       {:user_id user-id
                                        :active 1}))))
        delivery-time "180"
        zip "90210"
        octane "87"
        gallons 10
        service-fee ((keyword (str delivery-time))
                     (dispatch/get-service-fees zip))
        gas-price (:87 (:gas_prices (dispatch/get-gas-prices zip)))
        total-price (+ (* gallons gas-price) service-fee)
        order {:time delivery-time
               :vehicle_id vehicle-id
               :address_street "383-399 Civic Center Dr"
               :special_instructions ""
               :service_fee service-fee
               :total_price total-price
               :coupon_code ""
               :gas_price gas-price
               :gallons gallons
               :gas_type octane
               :lat "34.074606839269514"
               :lng "-118.39825344813232"
               :address_zip zip
               :user_id user-id}]
    order))

(defn add-order
  "Add an order to the database"
  [order]
  (orders/add db-config (:user_id order) order))

(defn unassigned-orders
  "Can the courier only see unassigned orders in their assigned zone?"
  []
  (let [zone-id 3
        zone-zip (-> (filter #(= (:id %) 3) @dispatch/zones)
                     first
                     :zip_codes
                     first)
        order     (assoc (test-order) :address_zip zone-zip)
        courier-id "lGYvXf9qcRdJHzhAAIbH"]
    ;; change Test Courier 1's zones to just 1
    (!update db-config "couriers" {:zones "1"} {:id courier-id})
    ;; test that the zone id is correct
    (is (= zone-id (:id (dispatch/get-zone-by-zip-code zone-zip))))
    ;; add an order to zone 3
    (add-order order)
    ;; Test Courier 1 should not be able to see the unassigned order
    ;; this assumes there are no unassigned orders in the couriers zone!
    (is (= 0 (count (filter #(= (:status %) "unassigned")
                            (orders/get-by-courier
                             db-config
                             courier-id)))))
    ;; change Test Courier 1's zones to include zone 3
    (!update db-config "couriers" {:zones "1,3"} {:id courier-id})
    ;; Test Courier 1 should be able to see it
    (is (= 1 (count (filter #(= (:status %) "unassigned")
                            (orders/get-by-courier
                             db-config
                             courier-id)))))
    ;; Change Test Courier 1's zones back to just "1"
    (!update db-config "couriers" {:zones "1"} {:id courier-id})
    ;; test courier 1 should no longer be able to see it
    (is (= 0 (count (filter #(= (:status %) "unassigned")
                            (orders/get-by-courier
                             db-config
                             courier-id)))))
    ;; cancel the order. Note: this assumes there are no other
    ;; unassigned orders!
    (let [order (first (!select db-config
                                "orders"
                                [:id :user_id]
                                {:status "unassigned"}))]
      (orders/cancel db-config (:user_id order) (:id order)
                     :notify-customer false
                     :suppress-user-details true))))

(deftest test-dispatch
  (unassigned-orders))

;; this needs a db fixture in order to work properly,
;; but the db fixture needs to be generalized across tests
;;
;; (deftest within-time-bracket-test
;;   (testing "Does the within-time-bracket function work properly?"
;;     (let []
;;       (is (true? (orders/within-time-bracket?
;;                   {:address_zip "90210"
;;                    :target_time_start
;;                    (util/date-time-to-time-zone-long
;;                     (time/date-time 2015 10 5 7 30)
;;                     (time/time-zone-for-id "America/Los_Angeles")
;;                     )}))))))
