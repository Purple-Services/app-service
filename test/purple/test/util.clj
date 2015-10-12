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

(defn test-unix->minute-of-day
  "Test whether a date-time in time-zone will return the proper minutes since 
  beginning of day"
  [date-time time-zone minutes]
  (is (= minutes
         (-> (date-time-to-time-zone-long
              date-time time-zone)
             unix->minute-of-day))))

(defn test-unix->hmma
  "Test whether a date-time in time-zone will return the proper hmma time"
  [date-time time-zone hmma-time]
  (is (= hmma-time
         (-> (date-time-to-time-zone-long
              date-time time-zone)
             unix->hmma))))

(deftest test-unix-conversion-to-minute-of-day
  (testing "Test that various dates can be given and will return the proper
 minute of the day."
    ;; Test that the minutes of the day is 450 for 7:30AM
    (test-unix->minute-of-day
     (time/date-time 2015 10 5 7 30)
     time-zone
     450)
    ;; Test that the minutes of the day is 1350 for 10:30PM
    (test-unix->minute-of-day
     (time/date-time 2015 10 5 22 30)
     time-zone
     1350)
    ;; dates where standard time would be in effect have valid minute-of-day
    ;; 450 for 7:30AM
    (test-unix->minute-of-day
     (time/date-time 2015 11 1 7 30)
     time-zone
     450)
    ;; 1350 for 10:30PM
    (test-unix->minute-of-day
     (time/date-time 2015 11 1 22 30)
     time-zone
     1350)))

;; Will unix->hmma always return the proper hmma time when the given unix
;; timestamps that fall within both DST and ST?"

(deftest test-unix-conversion-to-hmma
  (testing "Test that various dates can be given and will return the proper
times"
    ;; test that date-times within DST yield correct hmma
    (test-unix->hmma
     (time/date-time 2015 10 5 7 30)
     time-zone
     "7:30 AM")
    (test-unix->hmma
     (time/date-time 2015 10 5 22 30)
     time-zone
     "10:30 PM")
    ;; test that date-times within ST yield correct hmma
    (test-unix->hmma
     (time/date-time 2015 11 1 7 30)
     time-zone
     "7:30 AM")
    (test-unix->hmma
     (time/date-time 2015 11 1 22 30)
     time-zone
     "10:30 PM")))


;; All paremters to the thread-first (->) operator of the minute-of-day->hmma fn
;; are constant, using (time/date-time 1976) as a baseline.
;;
;; The minute-of-day is an alternative format of hmma that is used to define a
;; zone's service_time_bracket.
;; e.g. [450 1350] to hhma is [7:30AM 10:30PM]
;;
;; In order to correctly convert minute-of-day to hmma format, it needs
;; a proper baseline. Therefore, a test for the correct baseline follows.

(defn minute-of-day->hmma-with-baseline
  "Convert number of minutes since the beginning of the day to a unix timestamp
  using baseline. This function is purple.util/minute-of-day->hmma with an
  additional parameter that defines its baseline"
  [minutes baseline]
  (unix->hmma
   (+ (* minutes 60)
      (-> baseline
          (time/from-time-zone time-zone)
          time-coerce/to-long
          (quot 1000)))))

(defn test-minute-of-day->hmma-with-baseline
  "Test that the minute-of-day->hmma-with-date-time returns the proper hmma-time
  given minutes and a baseline date-time"
  [minutes baseline hmma-time]
  (is (= (minute-of-day->hmma-with-baseline minutes baseline)
         hmma-time)))

(deftest test-minute-of-day-conversion-to-hmma-with-various-baselines
  (testing "Test that various minutes of the day will return the proper hmma
timescan be given various baselines"
    ;; test that the baseline used in minute-of-day->hmma is correct
    (test-minute-of-day->hmma-with-baseline
     450
     (time/date-time 1976)
     "7:30 AM")
    (test-minute-of-day->hmma-with-baseline
     1350
     (time/date-time 1976)
     "10:30 PM")
    ;; test that a baseline within DST give correct hmma times
    (test-minute-of-day->hmma-with-baseline
     450
     (time/date-time 2015 10 5)
     "7:30 AM")
    (test-minute-of-day->hmma-with-baseline
     1350
     (time/date-time 2015 10 5)
     "10:30 PM")
    ;; test that a baseline within ST give correct hmma times
    (test-minute-of-day->hmma-with-baseline
     450
     (time/date-time 2015 11 2)
     "7:30 AM")
    (test-minute-of-day->hmma-with-baseline
     1350
     (time/date-time 2015 11 2)
     "10:30 PM")
    ;; You cannot use a baseline that falls on the day
    ;; that the clock is changed to ST because there is
    ;; an extra hour in that day.
    (test-minute-of-day->hmma-with-baseline
     450
     (time/date-time 2015 11 1)
     "6:30 AM") ; 7:30AM - 1hr
    (test-minute-of-day->hmma-with-baseline
     1350
     (time/date-time 2015 11 1)
     "9:30 PM") ; 10:30PM - 1hr
    ;; You cannot use a baseline that falls on the day
    ;; that the clock is changed to DST because there is
    ;; one less hour in that day.
    (test-minute-of-day->hmma-with-baseline
     450
     (time/date-time 2015 3 8)
     "8:30 AM") ; 7:30AM + 1hr
    (test-minute-of-day->hmma-with-baseline
     1350
     (time/date-time 2015 3 8)
     "11:30 PM") ; 10:30PM + 1hr!
    ))
