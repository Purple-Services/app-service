(ns app.test.orders
  (:require [clojure.test :refer [use-fixtures deftest is test-ns testing]]
            [common.util :refer [time-zone rand-str-alpha-num]]
            [common.db :refer [!select conn !update !insert]]
            [common.couriers :refer [get-by-courier]]
            [common.orders :refer [cancel]]
            [common.zones :refer [get-service-fees get-zones
                                  get-zone-by-zip-code
                                  order->zone-id]]
            [app.orders :as orders]
            [app.users :as users]
            [app.dispatch :as dispatch]
            [app.couriers :as couriers]
            [app.test.db-tools :refer [database-fixture ebdb-test-config]]
            [clj-time.core :as time]
            [clj-time.coerce :as time-coerce]))

(def test-courier-id (atom ""))
(def test-courier-id-2 (atom ""))

(defn add-test-courier
  [courier-id-atom]
  (let [courier-user (users/register ebdb-test-config
                                     (str "testcourier"
                                          (rand-str-alpha-num 10)
                                          "@test.com")
                                     "qwerty123"
                                     :client-ip "127.0.0.1")
        courier-id (:id (:user courier-user))]
    (!insert ebdb-test-config
             "couriers"
             {:id courier-id
              :active 1
              :on_duty 0
              :connected 0
              :busy 0
              :zones ""
              :gallons_87 0
              :gallons_91 0
              :lat 0
              :lng 0})
    (reset! courier-id-atom courier-id)))

(use-fixtures :once
  database-fixture  
  #((run! add-test-courier [test-courier-id test-courier-id-2]) (%)))

(defn test-order
  "Create a test order."
  [db-config]
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
                     (get-service-fees zip))
        gas-price (:87 (:gas_prices (dispatch/get-gas-prices zip)))
        total-price (+ (* gallons gas-price) service-fee)
        order {:time delivery-time
               :vehicle_id vehicle-id
               :address_street "123 Foo Br"
               :special_instructions ""
               :service_fee service-fee
               :total_price total-price
               :coupon_code ""
               :gas_price gas-price
               :gallons gallons
               :gas_type octane
               :lat (str "34.0" (rand-int 9))
               :lng (str "-118.4" (rand-int 9) )
               :address_zip zip
               :user_id user-id}]
    order))

(defn add-order
  "Add an order to the database"
  [order db-config]
  (orders/add db-config (:user_id order) order))

(defn unassigned-orders
  "Can the courier only see unassigned orders in their assigned zone?"
  []
  (let [db-config ebdb-test-config
        zone-id 3
        zone-zip (-> (filter #(= (:id %) 3)
                             (get-zones db-config))
                     first
                     :zip_codes
                     first)
        gas-price (:87 (:gas_prices (dispatch/get-gas-prices zone-zip)))
        service-fee ((keyword "180") (get-service-fees zone-zip))
        order    (assoc (test-order db-config)
                        :address_zip zone-zip
                        :gas_price gas-price
                        :service_fee service-fee
                        :total_price (+ (* 10 gas-price) service-fee))
        courier-id @test-courier-id]
    ;; change Test Courier 1's zones to just 6
    (!update db-config "couriers" {:zones "6"} {:id courier-id})
    ;; test that the zone id is correct
    (is (= zone-id (:id (get-zone-by-zip-code zone-zip))))
    ;; add an order to zone 3
    ;; Test Courier 1 should not be able to see the unassigned order
    ;; this assumes there are no unassigned orders in the couriers zone!
    (is (= 0 (count (get-by-courier
                     db-config
                     courier-id)))
        "Test Courier 1 should not be able to see the unassigned order")
    ;; change Test Courier 1's zones to include zone 3
    (!update db-config "couriers" {:zones "6,3"} {:id courier-id})
                                        ; (app.orders/assign db-config  (:courier_id (val %)))
    ;; (println courier-id)
    ;; (is (= 1 (count (get-by-courier
    ;;                  db-config
    ;;                  courier-id)))
    ;;     "Test Courier 1 should be able to see it")
    (!update db-config "couriers" {:zones "6"} {:id courier-id})
    ;; cancel the order. Note: this assumes there are no other
    ;; unassigned orders!
    (let [order (first (!select db-config
                                "orders"
                                [:id :user_id]
                                {:status "unassigned"}))]
      (cancel db-config (:user_id order) (:id order)
              :notify-customer false
              :suppress-user-details true))))

(deftest test-dispatch
  (unassigned-orders))

(defn within-time-bracket-test
  "Test that date-time falls within time-bracket in zip-code. time-zone
  corresponds to the one being used on the server. db-config must correspond
  to the same one being used by the fixture."
  [date-time time-bracket zip-code time-zone db-config]
  (let [zone-id  (get-zone-by-zip-code zip-code)]
    ;; change the database configuration
    (!update ebdb-test-config "zones"
             {:service-time-bracket
              time-bracket}
             {:id zone-id})
    ;; update the zone atom
    (is (true? (orders/within-time-bracket?
                {:address_zip zip-code
                 :target_time_start
                 (-> (time/from-time-zone date-time time-zone)
                     (time-coerce/to-long)
                     (quot 1000))})))))

(defn outside-time-bracket-test
  "Test that date-time falls outside time-bracket in zip-code. time-zone
  corresponds to the one being used on the server. db-config must correspond
  to the same one being used by the fixture."
  [date-time time-bracket zip-code time-zone db-config]
  (let [zone-id  (get-zone-by-zip-code zip-code)]
    ;; change the database configuration
    (!update ebdb-test-config "zones"
             {:service-time-bracket
              time-bracket}
             {:id zone-id})
    ;; update the zone atom
    (is (false? (orders/within-time-bracket?
                 {:address_zip zip-code
                  :target_time_start
                  (-> (time/from-time-zone date-time time-zone)
                      (time-coerce/to-long)
                      (quot 1000))})))))

(deftest test-within-time-bracket
  ;; the following dates fall within daylight saving time
  (testing "7:30am is within the time bracket of [450 1350]"
    (within-time-bracket-test (time/date-time 2015 10 5 7 30)
                              "[450 1350]"
                              "90210"
                              time-zone
                              ebdb-test-config))
  (testing "10:30pm is within the time bracket of [450 1350]"
    (within-time-bracket-test (time/date-time 2015 10 5 22 30)
                              "[450 1350]"
                              "90210"
                              time-zone
                              ebdb-test-config))
  (testing "10:41pm is outside the time bracket of [450 1350]"
    (outside-time-bracket-test (time/date-time 2015 10 5 22 41)
                               "[450 1350]"
                               "90210"
                               time-zone
                               ebdb-test-config))
  (testing "7:29am is outside the time bracket of [450 1350]"
    (outside-time-bracket-test (time/date-time 2015 10 5 7 29)
                               "[450 1350]"
                               "90210"
                               time-zone
                               ebdb-test-config)))

(deftest get-connected-couriers-zone
  (testing "Only the couriers within a zone that are not busy are selected"
    (let [db-config ebdb-test-config
          zone-id 3
          zone-zip (-> (filter #(= (:id %) zone-id) (get-zones db-config))
                       first
                       :zip_codes
                       first)
          order     (assoc (test-order db-config) :address_zip zone-zip)
          courier-id @test-courier-id 
          courier-id-2 @test-courier-id-2
          ]
      ;; set all couriers as connected, not busy and in zone 6
      (!update db-config
               "couriers"
               {:connected 1
                :busy 0
                :on_duty true
                :zones "6"}
               {})
      (println (!select db-config "couriers" ["*"] {}))
      ;; only Test Courier1 is assigned to zone 3
      (!update db-config "couriers"
               {:zones (str "6," zone-id)}
               {:id courier-id})
      ;; test that there are two connected couriers
      (is (= 2 (count (couriers/get-all-connected ebdb-test-config))))
      ;; test that only one courier is connected and assigned zone 6
      (is (= 1
             (count (->> (couriers/get-all-connected ebdb-test-config)
                         (remove :busy)
                         (filter
                          #(contains?
                            (:zones %)
                            (order->zone-id order)))))))
      ;; assign courier 2 to zone 3
      (!update db-config "couriers"
               {:zones (str "6," zone-id)}
               {:id courier-id-2})
      ;; test that two couriers are connected and assigned zone 3
      (is (= 2
             (count (->> (couriers/get-all-connected ebdb-test-config)
                         (remove :busy)
                         (filter
                          #(contains?
                            (:zones %)
                            (order->zone-id order)))))))
      ;; set courier 1 as busy
      (!update db-config "couriers" {:busy 1} {:id courier-id})
      ;; test that only one courier is connected, not busy and assigned zone 3
      (is (= 1
             (count (->> (couriers/get-all-connected ebdb-test-config)
                         (remove :busy)
                         (filter
                          #(contains?
                            (:zones %)
                            (order->zone-id order)))))))
      )))
