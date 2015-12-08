;; to be run from the repl with cider, in coupons.clj

;; this was used to create 1000 coupons with GR prefix for groupon
(let [db-conn (conn)]
  (dotimes [n 1000]
    (let [code (->> (repeatedly (comp (partial str "GR") gen-coupon-code))
                    (filter (partial is-code-available? db-conn))
                    first)]
      (println
       (!insert db-conn "coupons" {:id (rand-str-alpha-num 20)
                                   :code code
                                   :type "standard"
                                   :value -1500
                                   :only_for_first_orders 1
                                   :expiration_time 1999999999}))
      (println code))))
