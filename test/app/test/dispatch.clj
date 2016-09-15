(ns app.test.dispatch
  (:require [clojure.test :refer [use-fixtures deftest is test-ns testing]]
            [common.util :refer [time-zone rand-str-alpha-num]]
            [common.db :refer [!select conn !update !insert
                               set-pooled-db!]]
            [common.couriers :refer [get-by-courier]]
            [common.zoning :as zoning]
            [app.orders :as orders]
            [app.users :as users]
            [app.dispatch :as dispatch]
            [app.couriers :as couriers]
            [app.test.db-tools :refer [setup-ebdb-test-for-conn-fixture]]
            [clj-time.core :as time]
            [clj-time.coerce :as time-coerce]))

(use-fixtures :once setup-ebdb-test-for-conn-fixture)

(defmacro isnt
  [test-case & body]
  `(is (not ~test-case) ~@body))

(defmacro mock-time
  [unix-time & body]
  `(with-redefs [common.util/now-unix (constantly ~unix-time)]
     ~@body))

(defn is-available?
  "I.e., are there any time options for any octanes?"
  [availabilities]
  (boolean (seq (reduce (fn [a b] (merge a (:times b))) {} availabilities))))

(defn =submap
  "Is subm is part of m?"
  [m subm]
  (nil? (second (clojure.data/diff m subm))))

(deftest availability-check
  "Test if availability to order is correctly determined."
  []
  (let [db-conn (conn)
        test-user (first (!select db-conn "users" ["*"] {:email "test@test.com"}))
        user-id   (:id test-user)]
    (mock-time
     1472682311 ;; 8/31/2016, 3:25:11 PM Pacific
     (is (is-available?
          (:availabilities (dispatch/availability db-conn "90210" user-id)))
         "90210 should be available at 1472682311.")
     (isnt (is-available?
            (:availabilities (dispatch/availability db-conn "85000" user-id)))
           "85000 should not be available at 1472682311.")
     (is (=
          (:availabilities (dispatch/availability db-conn "90210" user-id))
          [{:octane "87",
            :gallon_choices {:0 7.5, :1 10, :2 15},
            :default_gallon_choice :2,
            :price_per_gallon 309,
            :times
            {300 {:service_fee 299, :text "within 5 hours ($2.99)", :order 2},
             180 {:service_fee 399, :text "within 3 hours ($3.99)", :order 1},
             60 {:service_fee 599, :text "within 1 hour ($5.99)", :order 0}},
            :default_time_choice :2
            :tire_pressure_check_price 700,
            :gallons 15}
           {:octane "91",
            :gallon_choices {:0 7.5, :1 10, :2 15},
            :default_gallon_choice :2,
            :price_per_gallon 329,
            :times
            {300 {:service_fee 299, :text "within 5 hours ($2.99)", :order 2},
             180 {:service_fee 399, :text "within 3 hours ($3.99)", :order 1},
             60 {:service_fee 599, :text "within 1 hour ($5.99)", :order 0}},
            :default_time_choice :2
            :tire_pressure_check_price 700,
            :gallons 15}])
         "Availability map differed from expected 90210.")
     (is (=
          (:availabilities (dispatch/availability db-conn "90025" user-id))
          [{:octane "87",
            :gallon_choices {:0 7.5, :1 10, :2 15},
            :default_gallon_choice :2,
            :price_per_gallon 305,
            :times
            {300 {:service_fee 299, :text "within 5 hours ($2.99)", :order 2},
             180 {:service_fee 399, :text "within 3 hours ($3.99)", :order 1},
             60 {:service_fee 599, :text "within 1 hour ($5.99)", :order 0}},
            :default_time_choice :2
            :tire_pressure_check_price 700,
            :gallons 15}
           {:octane "91",
            :gallon_choices {:0 7.5, :1 10, :2 15},
            :default_gallon_choice :2,
            :price_per_gallon 329,
            :times
            {300 {:service_fee 299, :text "within 5 hours ($2.99)", :order 2},
             180 {:service_fee 399, :text "within 3 hours ($3.99)", :order 1},
             60 {:service_fee 599, :text "within 1 hour ($5.99)", :order 0}},
            :default_time_choice :2
            :tire_pressure_check_price 700,
            :gallons 15}])
         "Availability map differed from expected 90025.")
     (is (=
          (dispatch/availability db-conn "90210" user-id)
          {:success true,
           :user
           {:email "test@test.com",
            :phone_number "12535888742",
            :subscription_expiration_time nil,
            :subscription_period_start_time nil,
            :referral_gallons 0.0,
            :name "Joseph Walker",
            :type "native",
            :subscription_usage nil,
            :subscription_id 0,
            :is_courier false,
            :id "z5kZavElDQPcmlYzxYLr",
            :account_manager_id "",
            :referral_code "7H3VB",
            :subscription_auto_renew false},
           :system
           {:referral_referred_value -500,
            :referral_referrer_gallons 2,
            :subscriptions
            {1
             {:discount_three_hour -149,
              :num_free_tire_pressure_check 0,
              :name "Standard",
              :num_free_three_hour 3,
              :num_free_five_hour 0,
              :active true,
              :id 1,
              :period 2592000,
              :num_free_one_hour 0,
              :discount_one_hour 0,
              :price 799,
              :discount_five_hour 0},
             2
             {:discount_three_hour 0,
              :num_free_tire_pressure_check 0,
              :name "Express",
              :num_free_three_hour 0,
              :num_free_five_hour 0,
              :active true,
              :id 2,
              :period 2592000,
              :num_free_one_hour 4,
              :discount_one_hour -200,
              :price 1599,
              :discount_five_hour 0},
             3
             {:discount_three_hour 0,
              :num_free_tire_pressure_check 0,
              :name "Unlimited",
              :num_free_three_hour 99999,
              :num_free_five_hour 0,
              :active true,
              :id 3,
              :period 2147483647,
              :num_free_one_hour 0,
              :discount_one_hour 0,
              :price -1,
              :discount_five_hour 0},
             4
             {:discount_three_hour -200,
              :num_free_tire_pressure_check 0,
              :name "Mauzy",
              :num_free_three_hour 0,
              :num_free_five_hour 99999,
              :active true,
              :id 4,
              :period 2147483647,
              :num_free_one_hour 0,
              :discount_one_hour 0,
              :price -1,
              :discount_five_hour 0}}},
           :availabilities
           [{:octane "87",
             :gallon_choices {:0 7.5, :1 10, :2 15},
             :default_gallon_choice :2,
             :price_per_gallon 309,
             :times
             {300 {:service_fee 299, :text "within 5 hours ($2.99)", :order 2},
              180 {:service_fee 399, :text "within 3 hours ($3.99)", :order 1},
              60 {:service_fee 599, :text "within 1 hour ($5.99)", :order 0}},
             :default_time_choice :2
             :tire_pressure_check_price 700,
             :gallons 15}
            {:octane "91",
             :gallon_choices {:0 7.5, :1 10, :2 15},
             :default_gallon_choice :2,
             :price_per_gallon 329,
             :times
             {300 {:service_fee 299, :text "within 5 hours ($2.99)", :order 2},
              180 {:service_fee 399, :text "within 3 hours ($3.99)", :order 1},
              60 {:service_fee 599, :text "within 1 hour ($5.99)", :order 0}},
             :default_time_choice :2
             :tire_pressure_check_price 700,
             :gallons 15}],
           :unavailable-reason ""})
         "Availability map with system and user data included differed from expected, 90210."))
    (mock-time
     1472712952 ;; 8/31/2016, 11:55:52 PM Pacific
     (isnt (is-available?
            (:availabilities (dispatch/availability db-conn "90210" user-id)))
           "90210 should not be available at 1472712952.")
     (isnt (is-available?
            (:availabilities (dispatch/availability db-conn "85000" user-id)))
           "85000 should not be available at 1472712952."))))

(deftest hours-check
  "Zip code considered open within certain hours brackets?"
  []
  (mock-time
   1472682311 ;; 8/31/2016, 3:25:11 PM Pacific
   (is (zoning/is-open-now? {:hours [[[450 1350]]
                                       [[450 1350]]
                                       [[450 1350]]
                                       [[450 1350]]
                                       [[450 1350]]
                                       [[450 1350]]
                                       [[450 1350]]]
                               :manually-closed? false})
       "Within first and only hours bracket 1472682311.")
   (is (zoning/is-open-now? {:hours [[[200 410]
                                        [900 1000]]
                                       [[200 410]
                                        [900 1000]]
                                       [[200 410]
                                        [900 1000]]
                                       [[200 410]
                                        [900 1000]]
                                       [[200 410]
                                        [900 1000]]
                                       [[200 410]
                                        [900 1000]]
                                       [[200 410]
                                        [900 1000]]]
                               :manually-closed? false})
       "Within second time bracket 1472682311.")
   (isnt (zoning/is-open-now? {:hours [[[200 410]
                                          [0 5]
                                          [999 1000]
                                          [1240 1380]]
                                         [[200 410]
                                          [0 5]
                                          [999 1000]
                                          [1240 1380]]
                                         [[200 410]
                                          [0 5]
                                          [999 1000]
                                          [1240 1380]]
                                         [[200 410]
                                          [0 5]
                                          [999 1000]
                                          [1240 1380]]
                                         [[200 410]
                                          [0 5]
                                          [999 1000]
                                          [1240 1380]]
                                         [[200 410]
                                          [0 5]
                                          [999 1000]
                                          [1240 1380]]
                                         [[200 410]
                                          [0 5]
                                          [999 1000]
                                          [1240 1380]]]
                                 :manually-closed? false})
         "Not within any of the many time brackets 1472682311.")
   (isnt (zoning/is-open-now? {:hours [[[450 1350]]
                                         [[450 1350]]
                                         [[450 1350]]
                                         [[450 1350]]
                                         [[450 1350]]
                                         [[450 1350]]
                                         [[450 1350]]]
                                 :manually-closed? true})
         "Within hours bracket but manually closed 1472682311."))
  (mock-time
   1472712952 ;; 8/31/2016, 11:55:52 PM Pacific
   (isnt (zoning/is-open-now? {:hours [[[450 1350]]
                                         [[450 1350]]
                                         [[450 1350]]
                                         [[450 1350]]
                                         [[450 1350]]
                                         [[450 1350]]
                                         [[450 1350]]]
                                 :manually-closed? false})
         "Not within any hours bracket 1472712952.")
   (isnt (zoning/is-open-now? {:hours [[[0 1440]]
                                         [[0 1440]]
                                         [[0 1440]]
                                         [[0 1440]]
                                         [[0 1440]]
                                         [[0 1440]]
                                         [[0 1440]]]
                                 :manually-closed? true})
         "Within hours bracket but manually closed 1472712952.")))
