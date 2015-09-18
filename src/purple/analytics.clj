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

(def ymd-formatter (time-format/formatter "yyyy-MM-dd"))

(defn joda->ymd
  "Convert Joda Timestamp object to formatted date string."
  [x]
  (-> ymd-formatter
      (time-format/with-zone (time/time-zone-for-id "America/Los_Angeles"))
      (time-format/unparse x)))

(defn unix->ymd
  "Convert integer unix timestamp to formatted date string."
  [x]
  (joda->ymd (time-coerce/from-long (* 1000 x))))

(defn users-by-day
  "Get map of all users, in seqs, keyed by date, sorted past -> present."
  [users]
  (into {} (sort-by first (group-by (comp unix->ymd
                                          int
                                          (partial * 1/1000)
                                          #(.getTime %)
                                          :timestamp_created)
                                    users))))

(defn orders-by-day
  "Get map of all orders, in seqs, keyed by date, sorted past -> present."
  [orders]
  (into {} (sort-by first (group-by (comp unix->ymd :target_time_start)
                                    orders))))

(defn orders-up-to-day
  "Get all orders up to date where date is in YYYY-MM-dd format."
  [orders ^String date]
  (filter #(<= (time-coerce/to-long (time-coerce/from-string (first %)))
               (time-coerce/to-long (time-coerce/from-string date)))
          (orders-by-day orders)))

(defn user-count
  "Given a vector of orders, get the amount of orders each user made"
  [orders]
  (map #(hash-map :user_id (first %) :count (count (second %)))
       (group-by :user_id orders)))

(defn user-order-count-by-day
  "Get a map of {:user_id <id> :count <order_count>} given orders and date in YYYY-MM-dd format."
  [orders ^String date]
  (user-count (flatten (map second (orders-up-to-day orders date)))))

(defn get-first-order-by-user
  "Get the first order made by user. If they never ordered, then nil."
  [user orders] ;; 'orders' is coll of all orders (by any user)
  (first (sort-by :target_time_start
                  <
                  (filter #(and (= "complete" (:status %))
                                (= (:user_id %) (:id user)))
                          orders))))

(defn users-ordered-to-date
  "Given a list of orders and a date, run a filter predicate to determine cumulative orders.
  Example predicate to get all users who have ordered exactly once: (fn [x] (= x 1))"
  [orders date pred]
  (count (filter pred (map :count (user-order-count-by-day orders date))))  )

(defn made-first-order-this-day
  "Is this the date that the user made their first order?"
  [user date orders] ;; 'orders' is coll of all orders (by any user)
  (when-let [first-order-by-user (get-first-order-by-user user orders)]
    (= date (unix->ymd (:target_time_start first-order-by-user)))))

(def count-filter (comp count filter))

(defn gen-stats-csv
  "Generates and saves a CSV file with some statistics."
  []
  (with-open [out-file (io/writer "stats.csv")]
    (csv/write-csv
     out-file
     (let [db-conn (conn)
           dates (map joda->ymd
                      (take-while #(time/before? % (time/now))
                                  (periodic/periodic-seq  ;; Apr 10th
                                   (time-coerce/from-long 1428708478000)
                                   (time/hours 24))))
           users (!select db-conn "users" ["*"] {})
           users-by-day (users-by-day users)
           orders (!select db-conn "orders" ["*"] {})
           orders-by-day (orders-by-day orders)
           coupons (!select db-conn "coupons" ["*"] {})
           standard-coupon-codes (->> (filter #(= "standard" (:type %)) coupons)
                                      (map :code))]
       (apply mapv vector (concat [["Date"
                                    "New Users"
                                    "New Active Users"
                                    "Referral Coupons Used"
                                    "Standard Coupons Used"
                                    "First-Time Orders"
                                    "Recurrent Orders"
                                    "Cancelled Orders"
                                    "Completed Orders"
                                    "On-Time Completed Orders"
                                    "Late Completed Orders"
                                    "Cumulative Single Order Users"
                                    "Cumulative Double Order Users"
                                    "Cumulative 3 or More Orders Users"]]
                                  (map (fn [date]
                                         (let [us (get users-by-day date)
                                               os (get orders-by-day date)
                                               
                                               num-complete ;; Number of complete orders that day
                                               (count-filter #(= "complete" (:status %)) os)
                                               
                                               num-complete-late ;; Completed, but late
                                               (count-filter #(let [completion-time
                                                                    (-> (str "kludgeFixLater 1|"
                                                                             (:event_log %))
                                                                        (s/split #"\||\s")
                                                                        (->> (apply hash-map))
                                                                        (get "complete"))]
                                                                (and completion-time
                                                                     (> (Integer. completion-time)
                                                                        (:target_time_end %))))
                                                             os)

                                               new-active-users ;; Made first order that day
                                               (count-filter #(made-first-order-this-day %
                                                                                         date
                                                                                         orders)
                                                             users)]
                                           (vec [;; date in "1989-08-01" format
                                                 date

                                                 ;; new users (all)
                                                 (count us)
                                                 
                                                 ;; made first order that day
                                                 new-active-users
                                                 
                                                 ;; referral coupons
                                                 (count-filter
                                                  #(and (not (s/blank? (:coupon_code %)))
                                                        (not (in? standard-coupon-codes
                                                                  (:coupon_code %))))
                                                  os)

                                                 ;; standard coupons
                                                 (count-filter
                                                  (comp (partial in? standard-coupon-codes)
                                                        :coupon_code)
                                                  os)
                                                 
                                                 ;; first-time orders
                                                 new-active-users

                                                 ;; recurrent
                                                 (- (count os) new-active-users)

                                                 ;; cancelled
                                                 (count-filter #(= "cancelled" (:status %)) os)

                                                 ;; completed
                                                 num-complete

                                                 ;; completed on-time
                                                 (- num-complete num-complete-late)

                                                 ;; completed late
                                                 num-complete-late

                                                 ;; cumulatively ordered once
                                                 (users-ordered-to-date orders date (fn [x] (= x 1)))
                                                 ;; cumulatively ordered twice
                                                 (users-ordered-to-date orders date (fn [x] (= x 2)))
                                                 ;; cumulatively ordered three or more times
                                                 (users-ordered-to-date orders date (fn [x] (>= x 3)))
                                                 ])))
                                       dates)
                                  ))))))
