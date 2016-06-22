;; This is expected to be run in couriers ns

(map #(let [[a b] %]
        [(:id a) (:id b) (get-stations (common.db/conn)
                                       (:lat a)
                                       (:lng a)
                                       (:lat b)
                                       (:lng b))])
     (partition 2 1 (!select (common.db/conn)
                             "orders"
                             ["*"]
                             {}
                             :custom-where (str "status = 'complete' and "
                                                "timestamp_created BETWEEN "
                                                "'2016-06-19 07:00:00.000000' "
                                                "AND '2016-06-20 07:00:00.000000'"))))
