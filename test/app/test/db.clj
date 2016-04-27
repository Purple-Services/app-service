(ns app.test.db
  (:require [common.db :as db]
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
        db-sql "database/ebdb.sql"
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
                   (clojure.string/split #";\n") ; separeate into statements
                   )]
    (->> sql-lines
         (map #(clojure.string/replace % #"\n" ""))
         (filter #(not (clojure.string/blank? %))))))

(defn create-tables-and-populate-database
  "Create tables and load test data for a datbase"
  [db-config]
  (let [ebdb-sql (process-sql (:sql db-config))]
    (with-connection db-config
      (apply do-commands ebdb-sql))))

(defn clear-test-database
  []
  ;; clear out all of the changes made to the ebdb_test database
  (with-connection ebdb-test-config
    (apply do-commands '("DROP DATABASE IF EXISTS ebdb_test"
                         "CREATE DATABASE IF NOT EXISTS ebdb_test"))))

(defn clear-and-populate-test-database
  []
  ;; start with a clean ebdb_test database
  (clear-test-database)
  ;; populate the tables
  (create-tables-and-populate-database ebdb-test-config))

(defn setup-ebdb-test-pool!
  []
  (db/set-pooled-db! ebdb-test-config)
  (clear-and-populate-test-database))

;; THIS FIXTURE REQUIRES A LOCAL MySQL DATABASE THAT HAS BEEN GIVEN PROPER
;; PERMISSIONS TO purplemaster FOR ebdb_test, OTHERWISE TESTS WILL FAIL!
;;
;; see: database/ebdb_setup.sql for proper permissions
;;
;;
;; IF YOU DO NOT HAVE A LOCAL DATABASE SETUP,
;; YOU SHOULD RUN THE FOLLOWING SCRIPT DESCRIBED IN README.md FIRST!
;;
;; $ lein exec -p scripts/setupdb.clj root_password=<mysql_root_pwd>
;;
;; NOTE: THIS WILL drop all tables, if you have an existing local database,
;; see database/eddb_setup.sql for creating the proper permissions for
;; ebdb_test.*
;;
;; You will also need to populate the local database with data, see
;; scripts/retrieve_db


(defn database-fixture
  "Remove all test data from the database"
  [test]
  (clear-and-populate-test-database)
  ;; run the test
  (test)
  (clear-test-database))

(defn setup-ebdb-test-for-conn-fixture
  [test]
  (setup-ebdb-test-pool!)
  (test)
  (clear-test-database))
