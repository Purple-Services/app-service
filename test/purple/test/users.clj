(ns purple.test.users
  (:require [purple.users :refer [valid-phone-number valid-name add register
                                  get-user edit]]
            [clojure.test :refer [deftest is test-ns use-fixtures
                                  test-ns testing]]
            [clojure.java.jdbc :refer [with-connection do-commands]]
            [purple.util :refer [rand-str-alpha-num]]
            [clojure.string :as string]))

(def ebdb-test-config
  "Configuration file for connecting to the local database"
  (let [db-host "localhost"
        db-port "3306"
        db-name "ebdb_test"
        db-password "localpurpledevelopment2015"
        db-user "purplemaster"
        db-sql "resources/database/ebdb.sql"
        db-config {:classname "com.mysql.jdbc.Driver"
                   :subprotocol "mysql"
                   :subname (str "//" db-host ":" db-port "/" db-name)
                   :user db-user
                   :password db-password
                   :sql db-sql}]
    db-config))

(defn process-sql
  "Process a SQL file into statements that can be applied with do-commands"
  [filename]
  (let [sql-lines (->
                   (slurp filename) ; read in the sql file
                   (clojure.string/replace #"--.*\n" "") ; ignore sql comments
                   (clojure.string/split #";\n") ; sepereate chunks into
                                                 ; statements
                   )]
    (map #(clojure.string/replace % #"\n" "") sql-lines)))

(defn create-tables-and-populate-database
  "Create tables and load test data for a datbase"
  [db-config]
  (let [ebdb-sql (process-sql (:sql db-config))]
    (with-connection db-config
      (apply do-commands ebdb-sql))))

;; THIS FIXTURE REQUIRES A LOCAL MySQL DATABASE THAT HAS GIVEN PROPER
;; PERMISSIONS TO purplemaster FOR ebdb_test, OTHERWISE TESTS WILL FAIL!
;;
;; YOU SHOULD RUN THE FOLLOWING SCRIPT DESCRIBED IN README.md FIRST!
;; $ lein exec -p resources/scripts/setupdb.clj root_password=<mysql_root_pwd>
;;
;; see: resources/database/ebdb_setup.sql for proper permissions
(defn- clean-up
  "Remove all test data from the database"
  [test]
  ;; start with a clean ebdb_test database
  (with-connection ebdb-test-config
    (apply do-commands '("DROP DATABASE IF EXISTS ebdb_test"
                         "CREATE DATABASE IF NOT EXISTS ebdb_test")))
  ;; populate the tables
  (create-tables-and-populate-database ebdb-test-config)
  ;; run the test
  (test)
    ;; clear out all of the changes made to the ebdb_test database
  (with-connection ebdb-test-config
    (apply do-commands '("DROP DATABASE IF EXISTS ebdb_test"
                         "CREATE DATABASE IF NOT EXISTS ebdb_test"))))


(use-fixtures :once clean-up)

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

(defn register-user
  "Register a native user in the database"
  [db-config platform-id password]
  (is (true? (:success (register db-config
                                 platform-id
                                 password
                                 :client-ip "127.0.0.1")))))

(defn edit-user
  "Edit a users information in the database"
  [db-config user-id body]
  (is (true? (:success (edit
                        db-config
                        user-id
                        body)))))

(deftest user-with-extraneous-whitespace-in-email-not-registered
  (testing "A native user with extraneous whitespace in email
is not able to be registerd. Note: Client trims whitespace when accessing
route /user/register.")
  (let [password "secret"]
    ;; email with trailing whitespace can not be registered
    (is (false? (:success (register ebdb-test-config
                                    "foo@bar.com   "
                                    password
                                    :client-ip "127.0.0.1"))))
    ;; email with leading whitespace can not be registered
    (is (false? (:success (register ebdb-test-config
                                    "   foo@bar.com"
                                    password
                                    :client-ip "127.0.0.1"))))
    ;; email with leading and trailing whitespace can not be registered
    (is (false? (:success (register ebdb-test-config
                                    "   foo@bar.com  "
                                    password
                                    :client-ip "127.0.0.1"))))))

(defn test-trim
  "Test that a users name is trimmed"
  [db-config email name]
  (is (true? (edit-user db-config
                        (:id (get-user db-config
                                       "native" email))
                        {:user {:name name
                                :phone_number "888-555-1212"}})))
  (is (= (string/trim name)
         (:name (get-user db-config "native" email)))))

(deftest extraneous-whitespace-in-name-trimmed
  (testing "A users name is edited with extraneous whitespace automatically
removed"
    ;; register a new user
    (let [email   "foo@bar.com"
          password "qwerty123"]
      (register-user ebdb-test-config email password)
      ;; name with trailing whitespace is trimmed
      (test-trim ebdb-test-config email "foo bar    ")
      ;; name with leading whitespace is trimmed
      (test-trim ebdb-test-config email "   foo bar")
      ;; name with leading and trailing whitespace is trimmed
      (test-trim ebdb-test-config email "    foo bar    "))))
