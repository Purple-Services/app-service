(ns purple.test.users
  (:require [purple.users :refer [valid-phone-number valid-name add register get-user edit]]
            [clojure.test :refer [deftest is test-ns use-fixtures test-ns testing]]
            [clojure.java.jdbc :refer [with-connection do-commands]]
            [purple.util :refer [rand-str-alpha-num]]))

(def db-config
  "Configuration file for connecting to the local database"
  (let [db-host "localhost"
        db-port "3306"
        db-name "ebdb_test"
        db-password "localpurpledevelopment2015"
        db-user "purplemaster"
        db-config {:classname "com.mysql.jdbc.Driver"
                   :subprotocol "mysql"
                   :subname (str "//" db-host ":" db-port "/" db-name)
                   :user db-user
                   :password db-password}]
    db-config))

(defn- clean-up
  "Remove all test data from the database"
  [test]
  ;; start with a clean ebdb_test database
  (with-connection db-config
    (apply do-commands '("DROP DATABASE IF EXISTS ebdb_test"
                         "CREATE DATABASE IF NOT EXISTS ebdb_test")))
  ;; run the test
  (test)
    ;; clear out all of the changes made to the ebdb_test database
  (with-connection db-config
    (apply do-commands '("DROP DATABASE IF EXISTS ebdb_test"
                         "CREATE DATABASE IF NOT EXISTS ebdb_test"))))


(use-fixtures :each clean-up)

(deftest phone-number-validator
  "Test that the phone number validator works"
  ;; The following tests should pass
  (is (valid-phone-number "888-555-1212"))
  (is (valid-phone-number "888 555 1212"))
  (is (valid-phone-number "(888) 555-1212"))
  (is (valid-phone-number "(888)-555-1212"))
  (is (valid-phone-number "8885551212"))
  (is (valid-phone-number "(888)555 1212"))
  (is (valid-phone-number "888555 1212"))
  (is (valid-phone-number "+1 (888)-555-1212"))
  (is (valid-phone-number "1 234 234 4444"))

  ;; The following tests should fail
  (is (not (valid-phone-number "888 555 12123"))) ;; too many digits
  (is (not (valid-phone-number "888 555 1212d"))) ;; number contains a letter
  (is (not (valid-phone-number "888 555 121"))) ;; not enough digits
  
  )

(deftest name-validator
  "Test that the name validator works"

  ;; The following tests should pass
  (is (valid-name "Test User"))
  (is (valid-name "Test Middle User"))

  ;; The following tests should fail
  (is (not (valid-name "Test")))
  (is (not (valid-name "TestUser"))))

(deftest add-user
  ;; create the users and coupons tables
  (with-connection  db-config (apply do-commands ["SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO'"
                                                  "CREATE TABLE `users` (
  `id` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL COMMENT 'native, facebook, or google',
  `password_hash` varchar(255) NOT NULL DEFAULT '',
  `reset_key` varchar(255) NOT NULL DEFAULT '',
  `phone_number` varchar(50) NOT NULL DEFAULT '',
  `phone_number_verified` tinyint(1) NOT NULL DEFAULT '0',
  `name` varchar(255) NOT NULL DEFAULT '',
  `gender` varchar(20) NOT NULL DEFAULT '',
  `referral_code` varchar(255) NOT NULL DEFAULT '',
  `referral_gallons` int(11) NOT NULL DEFAULT '0',
  `is_courier` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'if ''true'', there should be an entry with this id in the ''couriers'' table',
  `stripe_customer_id` varchar(255) NOT NULL DEFAULT '',
  `stripe_cards` text NOT NULL DEFAULT '',
  `stripe_default_card` varchar(255) DEFAULT NULL,
  `apns_token` varchar(255) NOT NULL DEFAULT '',
  `arn_endpoint` varchar(255) NOT NULL DEFAULT '',
  `os` varchar(255) NOT NULL DEFAULT '',
  `app_version` varchar(50) NOT NULL DEFAULT '',
  `timestamp_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8"

                                                  "DROP TABLE IF EXISTS `coupons`"
                                                  "CREATE TABLE `coupons` (
  `id` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL COMMENT 'standard or referral',
  `value` int(11) NOT NULL DEFAULT '0' COMMENT 'if type is standard, the value of the discount in cents',
  `owner_user_id` varchar(255) NOT NULL DEFAULT '' COMMENT 'if this is a referral, then the user id of the origin account',
  `used_by_license_plates` mediumtext NOT NULL COMMENT 'comma-separated list of license plates',
  `used_by_user_ids` mediumtext NOT NULL COMMENT 'comma-separated list of user ids',
  `only_for_first_orders` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'All coupons can only be used once, but coupons with this field as TRUE can only be used on vehicles that have never been part of an order',
  `expiration_time` int(11) NOT NULL DEFAULT '1999999999' COMMENT 'coupon can''t be used after this point in time',
  `timestamp_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8"]))
  (testing "A user can be added to the database"
    (add db-config
         {:id (rand-str-alpha-num 20)
          :email "test@test.com"
          :type "native"}
         :password "qwerty123"))
  )
