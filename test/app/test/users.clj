(ns app.test.users
  (:require [app.users :refer [valid-phone-number? valid-name? add register
                               edit add-vehicle]]
            [common.users :refer [get-user]]
            [clojure.test :refer [deftest is test-ns use-fixtures
                                  test-ns testing]]
            [app.test.db-tools :refer [database-fixture ebdb-test-config]]
            [common.util :refer [rand-str-alpha-num]]
            [clojure.string :as string]))

(use-fixtures :each database-fixture)

(deftest phone-number-validator
  "Test that the phone number validator works"
  ;; The following tests should pass
  (is (valid-phone-number? "888-555-1212"))
  (is (valid-phone-number? "888 555 1212"))
  (is (valid-phone-number? "(888) 555-1212"))
  (is (valid-phone-number? "(888)-555-1212"))
  (is (valid-phone-number? "8885551212"))
  (is (valid-phone-number? "(888)555 1212"))
  (is (valid-phone-number? "888555 1212"))
  (is (valid-phone-number? "+1 (888)-555-1212"))
  (is (valid-phone-number? "1 234 234 4444"))

  ;; The following tests should fail
  (is (not (valid-phone-number? "888 555 1212d"))) ;; number contains a letter
  
  )

(deftest name-validator
  "Test that the name validator works"

  ;; The following tests should pass
  (is (valid-name? "Test User"))
  (is (valid-name? "Test Middle User"))

  ;; The following tests should fail
  (is (not (valid-name? "Test")))
  (is (not (valid-name? "TestUser"))))

(defn register-user
  "Register a native user in the database"
  [db-config platform-id password]
  (with-redefs [ardoq.analytics-clj/identify (constantly nil)
                ardoq.analytics-clj/track (constantly nil)]
    (let [result (register db-config
                           platform-id
                           password
                           :client-ip "127.0.0.1")]
      (is (true? (:success result))))))

(defn edit-user
  "Edit a users information in the database"
  [db-config user-id body]
  (with-redefs [ardoq.analytics-clj/identify (constantly nil)
                ardoq.analytics-clj/track (constantly nil)]
    (is (true? (:success (edit
                          db-config
                          user-id
                          body))))))

(deftest user-with-extraneous-whitespace-in-email-not-registered
  (testing "A native user with extraneous whitespace in email
is not able to be registerd. Note: Client trims whitespace when accessing
route /user/register.")
  (let [password "secret"]
    ;; email with trailing whitespace can not be registered
    (is (false? (:success (register ebdb-test-config
                                    "blah@bar.com   "
                                    password
                                    :client-ip "127.0.0.1"))))
    ;; email with leading whitespace can not be registered
    (is (false? (:success (register ebdb-test-config
                                    "   bbdn@bar.com"
                                    password
                                    :client-ip "127.0.0.1"))))
    ;; email with leading and trailing whitespace can not be registered
    (is (false? (:success (register ebdb-test-config
                                    "   fojjshso@bar.com  "
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
    (let [email   "bdjshcnjeudb@test.com"
          password "qwerty123"]
      (register-user ebdb-test-config email password)
      ;; name with trailing whitespace is trimmed
      (test-trim ebdb-test-config email "foo bar    ")
      ;; name with leading whitespace is trimmed
      (test-trim ebdb-test-config email "   foo bar")
      ;; name with leading and trailing whitespace is trimmed
      (test-trim ebdb-test-config email "    foo bar    "))))

(deftest add-vehicle-test
  (with-redefs [ardoq.analytics-clj/identify (constantly nil)
                ardoq.analytics-clj/track (constantly nil)]
    (let [email "fojshnvjdo@test.com"
          password "qwerty123"
          year "2015"
          make "honda"
          model "accord"
          color "blue"
          gas-type "87"
          record-map {:year year
                      :make make
                      :model model
                      :color color
                      :gas_type gas-type
                      :photo ""
                      :id "new"}]
      (register-user ebdb-test-config email password)
      (let [user-id (:id (get-user ebdb-test-config
                                   "native" email))]
        ;; some of the required fields are missing from record-map
        (is (= "Required fields cannot be empty."
               (:message (add-vehicle ebdb-test-config user-id
                                      (dissoc record-map
                                              :year
                                              :make
                                              :model
                                              :color)))))
        ;; remove all of the fields
        (is (= "Required fields cannot be empty."
               (:message (add-vehicle ebdb-test-config user-id
                                      (dissoc record-map
                                              :year
                                              :make
                                              :model
                                              :color
                                              :gas_type)))))
        ;; Try to add a vehicle with a nil record map
        (is (= "Required fields cannot be empty."
               (:message (add-vehicle ebdb-test-config user-id nil))))
        ;; Try to add a vehicle that has the equivalent json request
        ;; of all blank fields on the server
        (is (= "Required fields cannot be empty."
               (:message (add-vehicle ebdb-test-config user-id
                                      (assoc record-map
                                             :year nil
                                             :make nil
                                             :model nil
                                             :color nil
                                             :gas_type "87"
                                             :license_plate ""
                                             :id "new"
                                             :photo "")))))
        ;; Try to add a vehicle without a :license_plate key
        (is (= (str "License Plate is a required field. If this is a new vehicle"
                    " without plates, write: NOPLATES. Vehicles without license"
                    " plates are ineligible for coupon codes.")
               (:message (add-vehicle ebdb-test-config user-id record-map))))
        ;; Try to add a vehicle with a blank :license_plate key
        (is (= (str "License Plate is a required field. If this is a new vehicle"
                    " without plates, write: NOPLATES. Vehicles without license"
                    " plates are ineligible for coupon codes.")
               (:message (add-vehicle ebdb-test-config user-id
                                      (assoc record-map
                                             :photo ""
                                             :license_plate "")))))
        ;; Try to add a vechile with a NOPLATES designation
        (is (true?
             (:success (add-vehicle ebdb-test-config user-id
                                    (assoc record-map
                                           :license_plate "NOPLATES")))))
        ;; add an invalid license plate and receive an error message
        (is (= "Please enter a valid license plate."
               (:message (add-vehicle ebdb-test-config user-id
                                      (assoc record-map
                                             :license_plate "FA$T")))))))))
