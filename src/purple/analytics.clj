(ns purple.analytics
  (:use purple.util
        [purple.db :only [conn !select !insert !update mysql-escape-str]])
  (:require [purple.config :as config]
            [purple.users :as users]
            [clojure.string :as s]
            [clojure.data.csv :as csv]
            [clojure.java.io :as io]
            [clj-time.core :as time]
            [clj-time.periodic :as periodic]
            [clj-time.coerce :as time-coerce]
            [clj-time.format :as time-format]
            [clojure.math.combinatorics :as combo]))

(def count-filter (comp count filter))

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
  (count-filter pred (map :count (user-order-count-by-day orders date))))

(defn made-first-order-this-day
  "Is this the date that the user made their first order?"
  [user date orders] ;; 'orders' is coll of all orders (by any user)
  (when-let [first-order-by-user (get-first-order-by-user user orders)]
    (= date (unix->ymd (:target_time_start first-order-by-user)))))

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
           users (!select db-conn "users" [:timestamp_created :id] {})
           users-by-day (users-by-day users)
           orders (!select db-conn "orders" [:target_time_start :event_log
                                             :target_time_end :status
                                             :coupon_code :user_id] {})
           completed-orders (filter #(= "complete" (:status %)) orders)
           orders-by-day (orders-by-day orders)
           coupons (!select db-conn "coupons" [:type :code] {})
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
                                                 (users-ordered-to-date completed-orders date (fn [x] (= x 1)))
                                                 ;; cumulatively ordered twice
                                                 (users-ordered-to-date completed-orders date (fn [x] (= x 2)))
                                                 ;; cumulatively ordered three or more times
                                                 (users-ordered-to-date completed-orders date (fn [x] (>= x 3)))
                                                 ])))
                                       dates)
                                  ))))))


(defn hamming
  [[x y]]
  (count (filter true? (map (partial reduce not=) (map vector x y)))))

(defn scan-user-for-referral-abuse
  "Returns the number of suspected 'fake' uses."
  [db-conn user-id]
  (let [user (first (!select db-conn "users" ["*"] {:id user-id}))
        coupon (first (!select db-conn "coupons" ["*"]
                               {:code (:referral_code user)}))
        used-by-users (->> (:used_by_user_ids coupon)
                           split-on-comma
                           (users/get-users-by-ids db-conn))
        used-by-license-plates (->> (:used_by_license_plates coupon)
                                    split-on-comma)]
    (count-filter used-by-license-plates)))

(defn combo-hack
  "To be used in conjunction with combo/combinations to get combo including duplicate elements."
  [x]
  (str x (rand-str-alpha-num 10)))

(defn reverse-combo-hack
  [[x y]]
  [(drop-last 10 x) (drop-last 10 y)])

(count-filter (partial < 1)
              (map (comp hamming reverse-combo-hack (juxt first second))
                   (combo/combinations (map combo-hack testsub)
                                       2)))

(def  testsub (split-on-comma "6FXZ665,CABOKDZ,6YHN60803053X1,6RBR947,6TAJ224TESTVEHICLE,7NJH120,6TFS098,7EVZ756,6YRE223,7HDJ179,7DZL447,7AEU8414ADK7887AKW537,6JSY459,7MSP935,6RXV444,6PWM793,NOTAVAILAVLE,7BZP642X418RR,5CPU960,7HNM057,7HAL3716PM6796YJP659,7LLM850,7JRB527,7BBH864,7LPL864,4VHK371,6FPC183,7FHP585,6ZVM631,6BBE179,1UBJ365,BATMAN,6WUN094,6JEY6856TOE093,6LEW502,4CXV097,6Y0K9447KPA410,HAPPY,7GFT903,3VVD437,6HRS579,6YYT058,6ZBY937,BEVERLYHILLS,7GRS01582545F1,5MYS249,7COL394,NONE,7CYF481,7LVA293,7DCT411,6MFJ303,7BAB893,4CDV023,5XMH817,5AOF867,7GHU271,6RUJ877,6UHV234,7GTF248,CA,7CMU684,KE243,7MZS704,6WFG973,6THE273,6HOU881,6NCS929,7FYT786,7WIM66,NOLICENSEPLATE,A,7AOY404,7AGJ962,7KKB029,8J53470,7DFU150,4DQM428,5MHB087,7LFL374IDKJJI,6RCU202,6TMX903"))

(scan-user-for-referral-abuse (conn) "z5kZavElDQPcmlYzxYLr")

