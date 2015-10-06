(ns purple.test.db
  (:require [purple.db :as db]
            [clojure.java.jdbc :refer [with-connection do-commands]]
            [clojure.test :refer [use-fixtures deftest is test-ns testing]]))

(def db-config
  "Configuration file for connecting to the local database"
  (let [db-host "localhost"
        db-port "3306"
        db-name "ebdb"
        db-password "localpurpledevelopment2015"
        db-user "purplemaster"
        db-config {:classname "com.mysql.jdbc.Driver"
                   :subprotocol "mysql"
                   :subname (str "//" db-host ":" db-port "/" db-name
                                 "?useLegacyDatetimeCode=false"
                                 "&serverTimezone=UTC")
                   :user db-user
                   :password db-password}]
    db-config))

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
(defn database-fixture
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
