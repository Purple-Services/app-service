(ns purple.test.users
  (:require [purple.users :refer [valid-phone-number valid-name]]
            [clojure.test :refer[deftest is test-ns]]))

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
  (is (not (valid-name "TestUser")))
  )
