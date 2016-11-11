(ns app.test.fleet
  (:require [clojure.test :refer [use-fixtures deftest is test-ns testing]]
            [common.util :refer [time-zone rand-str-alpha-num]]
            [common.db :refer [!select conn !update !insert]]
            [common.couriers :refer [get-by-courier]]
            [common.orders :refer [cancel]]
            [app.orders :as orders]
            [app.users :as users]
            [app.dispatch :as dispatch]
            [app.couriers :as couriers]
            [app.fleet :as fleet]
            [app.test.db-tools :refer [setup-ebdb-test-for-conn-fixture]]
            [clj-time.core :as time]
            [clj-time.coerce :as time-coerce]))

(use-fixtures :once setup-ebdb-test-for-conn-fixture)

(deftest add-fleet-delivery
  (let [db-conn     (conn)]
    (is (:success
         (fleet/add-delivery db-conn
                             "FxE0goGbIOqQ3cQkSVG3"
                             "zA0WXhPpcS3fpYpCbhBa"
                             "58ABK1GG7HU039401"
                             "170689"
                             18.1
                             "91"
                             false))
        "Can add single fleet delivery.")))

(deftest add-fleet-deliveries
  (let [db-conn     (conn)]
    (fleet/add-deliveries db-conn
                          "zA0WXhPpcS3fpYpCbhBa"
                          [{:user_id "zA0WXhPpcS3fpYpCbhBa",
                            :account_id "FxE0goGbIOqQ3cQkSVG3",
                            :vin "58ABK1GG7HU039401",
                            :license_plate "170682",
                            :gallons "12.1",
                            :gas_type "87",
                            :is_top_tier true}
                           {:user_id "zA0WXhPpcS3fpYpCbhBa",
                            :account_id "FxE0goGbIOqQ3cQkSVG3",
                            :vin "58ABK1GG6HU039177",
                            :license_plate "170691",
                            :gallons "12.5",
                            :gas_type "87",
                            :is_top_tier true}
                           {:user_id "zA0WXhPpcS3fpYpCbhBa",
                            :account_id "FxE0goGbIOqQ3cQkSVG3",
                            :vin "58ABK1GG4HU039565",
                            :license_plate "170720",
                            :gallons "11.9",
                            :gas_type "87",
                            :is_top_tier true}
                           {:user_id "zA0WXhPpcS3fpYpCbhBa",
                            :account_id "FxE0goGbIOqQ3cQkSVG3",
                            :vin "58ABK1GGXHU039358",
                            :license_plate "170719",
                            :gallons "12.3",
                            :gas_type "87",
                            :is_top_tier true}
                           {:user_id "zA0WXhPpcS3fpYpCbhBa",
                            :account_id "FxE0goGbIOqQ3cQkSVG3",
                            :vin "58ABK1GG5HU039364",
                            :license_plate "170686",
                            :gallons "12.8",
                            :gas_type "87",
                            :is_top_tier true}
                           {:user_id "zA0WXhPpcS3fpYpCbhBa",
                            :account_id "FxE0goGbIOqQ3cQkSVG3",
                            :vin "58ABK1GG2HU039483",
                            :license_plate "170718",
                            :gallons "12.4",
                            :gas_type "87",
                            :is_top_tier true}])))
