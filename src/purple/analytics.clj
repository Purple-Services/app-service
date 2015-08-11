(ns purple.analytics
  (:use purple.util
        [purple.db :only [conn !select !insert !update mysql-escape-str]])
  (:require [purple.config :as config]
            [clojure.string :as s]
            [clojure.data.csv :as csv]
            [clojure.java.io :as io]
            [clj-time.core :as time]
            [clj-time.periodic :as periodic]
            [clj-time.coerce :as time-coerce]
            [clj-time.format :as time-format]))

(def day-formatter (time-format/formatter "yyyy-MM-dd"))
(defn unix->day
  "Convert integer unix timestamp to formatted date string."
  [x]
  (time-format/unparse
   (time-format/with-zone
     day-formatter
     (time/time-zone-for-id "America/Los_Angeles"))
   (time-coerce/from-long (* 1000 x))))

(defn joda->day
  "Convert integer unix timestamp to formatted date string."
  [x]
  (time-format/unparse
   (time-format/with-zone
     day-formatter
     (time/time-zone-for-id "America/Los_Angeles"))
   x))

(defn users-by-day
  []
  (let [users (!select (conn)
                       "users"
                       ["*"]
                       {})]
    (into {}
          (sort-by first
                   (group-by (comp unix->day
                                   int
                                   (partial * 1/1000)
                                   #(.getTime %)
                                   :timestamp_created)
                             users)))))

(defn orders-by-day
  [orders]
  (into {}
        (sort-by first
                 (group-by (comp unix->day
                                 :target_time_start)
                           orders))))

(defn made-first-order-this-day
  [user date os] ;; os is coll of all orders
  (when-let [first-order-by-user (first (filter #(and (= "complete"
                                                         (:status %))
                                                      (= (:user_id %)
                                                         (:id user)))
                                                os))]
    (= date
       (unix->day (:target_time_start first-order-by-user)))))

(defn gen-stats-csv
  []
  (with-open [out-file (io/writer "data-out/stats.csv")]
    (csv/write-csv
     out-file
     (let [dates (map joda->day
                      (take-while #(time/before? % (time/now))
                                  (periodic/periodic-seq
                                   (time-coerce/from-long 1428708478000)
                                   (time/hours 24))))
           users-by-day (users-by-day)
           orders (!select (conn)
                           "orders"
                           ["*"]
                           {})
           orders-by-day (orders-by-day orders)
           coupons (!select (conn) "coupons" ["*"] {})
           standard-coupon-codes (map :code
                                      (filter #(= "standard" (:type %))
                                              coupons))]
       (concat [["Date"
                 "New Users"
                 "New Active Users"
                 "Referral Coupons Used"
                 "Standard Coupons Used"
                 "First-Time Orders"
                 "Recurrent Orders"
                 "Cancelled Orders"
                 "Completed Orders"
                 "On-Time Completed Orders"
                 "Late Completed Orders"]]
               (map (fn [date]
                      (let [us (get users-by-day date)
                            os (get orders-by-day date)
                            
                            num-complete
                            (count (filter #(= "complete" (:status %))
                                           os))
                            
                            num-complete-late
                            (count
                             (filter
                              #(let [completion-time
                                     (-> (str "kludgeFixLater 1|"
                                              (:event_log %))
                                         (s/split #"\||\s")
                                         (->> (apply hash-map))
                                         (get "complete"))]
                                 (and completion-time
                                      (> (Integer. completion-time)
                                         (:target_time_end %))))
                              os))

                            new-active-users
                            (count
                             (filter #(made-first-order-this-day %
                                                                 date
                                                                 orders)
                                     us))]
                        (vec [date
                              (count us) ;; new users (all)
                              new-active-users
                              (count ;; referral coupons
                               (filter #(and (not (nil? (:coupon_code %)))
                                             (not (in? standard-coupon-codes
                                                       (:coupon_code %))))
                                       os))
                              (count ;; standard coupons
                               (filter (comp (partial in?
                                                      standard-coupon-codes)
                                             :coupon_code)
                                       os))
                              new-active-users ;; first-time orders
                              (- (count os) new-active-users) ;; recurrent
                              (count (filter #(= "cancelled" (:status %))
                                             os))
                              num-complete
                              (- num-complete num-complete-late)
                              num-complete-late])))
                    dates)
               )))))
