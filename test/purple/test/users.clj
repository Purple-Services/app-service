(ns purple.test.users
  (:require [purple.users :refer [valid-phone-number valid-name add register
                                  get-user edit]]
            [clojure.test :refer [deftest is test-ns use-fixtures
                                  test-ns testing]]
            [purple.test.db :refer [database-fixture ebdb-test-config]]
            [purple.util :refer [rand-str-alpha-num]]
            [clojure.string :as string]))

(use-fixtures :once database-fixture)

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
