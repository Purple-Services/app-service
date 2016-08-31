(ns app.test.dispatch
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

(use-fixtures :once database-fixture)

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

(deftest availability-check
  "Create a test order."
  []
  (let [$ ebdb-test-config
        test-user (first (!select $ "users" ["*"] {:email "test@test.com"}))
        user-id   (:id test-user)]
    (isnt (is-available?
           (:availabilities (dispatch/availability $ "85000" user-id)))
          "85000 should not be available at 1472682311.")
    #_(
       (mock-time
        1472682311 ;; 8/31/2016, 3:25:11 PM Pacific
        (is (is-available?
             (:availabilities (dispatch/availability $ "90210" user-id)))
            "90210 should be available at 1472682311.")
        (isnt (is-available?
               (:availabilities (dispatch/availability $ "85000" user-id)))
              "85000 should not be available at 1472682311."))
       (mock-time
        1472712952 ;; 8/31/2016, 11:55:52 PM Pacific
        (isnt (is-available?
               (:availabilities (dispatch/availability $ "90210" user-id)))
              "90210 should not be available at 1472712952.")
        (isnt (is-available?
               (:availabilities (dispatch/availability $ "85000" user-id)))
              "85000 should not be available at 1472712952.")))))
