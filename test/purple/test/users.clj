(ns purple.test.users
  (:require [purple.users :refer [good-phone-number valid-name]]
            [clojure.test :refer[deftest is test-ns]]))

(deftest phone-number-validator
  "Test that the phone number validator works"

  ;; The following tests should pass
  (is (good-phone-number "888-555-1212"))
  (is (good-phone-number "888 555 1212"))
  (is (good-phone-number "(888) 555-1212"))
  (is (good-phone-number "(888)-555-1212"))

  ;; The following tests should fail
  (is (not (good-phone-number "888 555 12123"))) ;; too many digits
  (is (not (good-phone-number "888 555 1212d"))) ;; number contains a letter
  (is (not (good-phone-number "888 555 121"))) ;; not enough digits
  
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
