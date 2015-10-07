(ns purple.test.util
  (:use purple.util)
  (:require [clj-time.core :as time]
            [clj-time.coerce :as time-coerce]
            [clj-time.format :as time-format]
            [clojure.test :refer [deftest is test-ns testing]]))

(defn date-time-to-time-zone
  "Given a date-time object, convert it to a time-zone"
  [date-time time-zone]
  (-> date-time
      (time/from-time-zone time-zone)))

(defn date-time-to-long
  "Given a date-time, convert it to milliseconds since unix epoch"
  [date-time]
  (-> date-time
      (time-coerce/to-long)
      (quot 1000)))

(defn date-time-to-time-zone-long
  "Given a date-time, convert it to milliseconds since unix epoch with 
  time-zone"
  [date-time time-zone]
  (-> (date-time-to-time-zone date-time time-zone)
      (date-time-to-long)))

(defn test-minute-of-day
  "Test whether a date-time in time-zone will return the proper minutes since 
  beginning of day"
  [date-time time-zone minutes]
  (is (= minutes
         (-> (date-time-to-time-zone-long
              date-time time-zone)
             unix->minute-of-day))))

(deftest test-unix->minute-of-day
  (testing "Test that various dates can given and will return the proper minute
of the day."
    ;; Test that the minutes of the day is 450 for 7:30AM
    (test-minute-of-day
     (time/date-time 2015 10 5 7 30)
     time-zone
     450)
    ;; Test that the minutes of the day is 1350 for 10:30PM
    (test-minute-of-day
     (time/date-time 2015 10 5 22 30)
     time-zone
     1350)))
