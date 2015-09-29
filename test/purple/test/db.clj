(ns purple.test.db
  (:require [purple.db :as db]
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
