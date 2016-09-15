(ns app.test.orders
  (:require [clojure.test :refer [use-fixtures deftest is test-ns testing]]
            [common.util :refer [time-zone rand-str-alpha-num]]
            [common.db :refer [!select conn !update !insert]]
            [common.couriers :refer [get-by-courier]]
            [common.orders :refer [cancel]]
            [app.orders :as orders]
            [app.users :as users]
            [app.dispatch :as dispatch]
            [app.couriers :as couriers]
            [app.test.db-tools :refer [setup-ebdb-test-for-conn-fixture]]
            [clj-time.core :as time]
            [clj-time.coerce :as time-coerce]))

(def test-courier-id (atom ""))
(def test-courier-id-2 (atom ""))

(defn add-test-courier
  [courier-id-atom]
  (let [db-conn (conn)
        courier-user (users/register db-conn
                                     (str "testcourier"
                                          (rand-str-alpha-num 10)
                                          "@test.com")
                                     "qwerty123"
                                     :client-ip "127.0.0.1")
        courier-id (:id (:user courier-user))]
    (!insert db-conn
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
  setup-ebdb-test-for-conn-fixture
  #(do (run! add-test-courier [test-courier-id test-courier-id-2]) (%)))

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
        service-fee 399
        gas-price 309
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

(deftest test-dispatch
  (let [db-config   (conn)
        order       (test-order db-config)
        courier-id  @test-courier-id]
    ;; change Test Courier 1's zones to just 6
    (!update db-config "couriers" {:zones "6"} {:id courier-id})
    ;; add an order to zone 3
    ;; Test Courier 1 should not be able to see the unassigned order
    ;; this assumes there are no unassigned orders in the couriers zone!
    (is (= 0 (count (get-by-courier
                     db-config
                     courier-id)))
        "Test Courier 1 should not be able to see the unassigned order")
    (let [order (first (!select db-config
                                "orders"
                                [:id :user_id]
                                {:status "unassigned"}))]
      (cancel db-config (:user_id order) (:id order)
              :notify-customer false
              :suppress-user-details true))))

#_(deftest get-connected-couriers-zone
  (testing "Only the couriers within a zone that are not busy are selected"
    (let [db-conn (conn)
          zone-id 3
          zone-zip (-> (filter #(= (:id %) zone-id) (get-zones db-conn))
                       first
                       :zip_codes
                       first)
          order     (assoc (test-order db-conn) :address_zip zone-zip)
          courier-id @test-courier-id 
          courier-id-2 @test-courier-id-2
          ]
      ;; set all couriers as connected, not busy and in zone 6
      (!update db-conn
               "couriers"
               {:connected 1
                :busy 0
                :on_duty true
                :zones "6"}
               {})
      ;; only Test Courier1 is assigned to zone 3
      (!update db-conn "couriers"
               {:zones (str "6," zone-id)}
               {:id courier-id})
      ;; test that there are two connected couriers
      (is (= 2 (count (couriers/get-all-connected db-conn))))
      ;; test that only one courier is connected and assigned zone 6
      (is (= 1
             (count (->> (couriers/get-all-connected db-conn)
                         (remove :busy)
                         (filter
                          #(contains?
                            (:zones %)
                            (order->zone-id order)))))))
      ;; assign courier 2 to zone 3
      (!update db-conn "couriers"
               {:zones (str "6," zone-id)}
               {:id courier-id-2})
      ;; test that two couriers are connected and assigned zone 3
      (is (= 2
             (count (->> (couriers/get-all-connected db-conn)
                         (remove :busy)
                         (filter
                          #(contains?
                            (:zones %)
                            (order->zone-id order)))))))
      ;; set courier 1 as busy
      (!update db-conn "couriers" {:busy 1} {:id courier-id})
      ;; test that only one courier is connected, not busy and assigned zone 3
      (is (= 1
             (count (->> (couriers/get-all-connected db-conn)
                         (remove :busy)
                         (filter
                          #(contains?
                            (:zones %)
                            (order->zone-id order)))))))
      )))
