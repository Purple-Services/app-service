(ns app.test.dispatch
  (:require [clojure.test :refer [use-fixtures deftest is test-ns testing]]
            [common.util :refer [time-zone rand-str-alpha-num]]
            [common.db :refer [!select conn !update !insert
                               set-pooled-db!]]
            [common.couriers :refer [get-by-courier]]
            [common.orders :refer [cancel]]
            [common.zones :refer [get-service-fees get-zones
                                  get-zone-by-zip-code
                                  order->zone-id]]
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
  "Create a test order."
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
            :tire_pressure_check_price 700,
            :gallons 15}])
         "Availability map differed from expected.")
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
            :tire_pressure_check_price 700,
            :gallons 15}])
         "Availability map differed from expected."))
    (mock-time
     1472712952 ;; 8/31/2016, 11:55:52 PM Pacific
     (isnt (is-available?
            (:availabilities (dispatch/availability db-conn "90210" user-id)))
           "90210 should not be available at 1472712952.")
     (isnt (is-available?
            (:availabilities (dispatch/availability db-conn "85000" user-id)))
           "85000 should not be available at 1472712952."))))
