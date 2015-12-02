(ns purple.test.dashboard
  (:require [clojure.test :refer [deftest is run-tests use-fixtures]]
            [purple.dashboard :as dashboard]
            [purple.test.db :refer [database-fixture ebdb-test-config]]))


(use-fixtures :each database-fixture)

(defn register-user
  "Register a native user in the database"
  [db-config email password]
  (is (true? (:success (dashboard/register db-config
                                           email
                                           password
                                           "127.0.0.1")))))

(defn login-user
  "Login a user"
  [db-config email password]
  (is (true? (:success (dashboard/login db-config
                                        email
                                        password
                                        "127.0.0.1")))))

(deftest test-dashboard
  (let [email "foo@bar.com"
        password "password"]
    (register-user ebdb-test-config email password)
    (login-user ebdb-test-config email password)))
