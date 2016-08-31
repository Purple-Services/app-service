(ns app.test.payment
  (:use cheshire.core)
  (:require [common.payment :refer [stripe-req]]
            [clj-http.client :as client]
            [clojure.test :refer [use-fixtures deftest is test-ns testing]]
            [common.config :as config]
            [app.handler :refer :all]
            [common.users :refer [get-user-by-id get-user]]
            [common.db :refer [conn]]
            [app.test.db-tools :refer [setup-ebdb-test-for-conn-fixture]]
            ))

(use-fixtures :once setup-ebdb-test-for-conn-fixture)

;; note: all of the following tests have been disabled as they no longer work
(deftest test-charge-stripe-customer
  (let [db-conn (conn)]
    (let [__ (println "DEBUG: in here...")
          u (get-user db-conn "native" "test@test.com")
          _ (println u)
          customer-id (:stripe_customer_id u)]
      (testing "The test@test.com user with cc 4242424242424242 will succeed
 as paid"
        (let [stripe-params {:customer customer-id
                             :amount 50
                             :currency config/default-currency
                             :description "A test transaction"
                             :receipt_email (:email u)}
              resp (stripe-req "post"
                               "charges"
                               stripe-params)]
          (is (:paid resp))))
      (let [idempotency-key  (str (java.util.UUID/randomUUID))]
        (testing "The test@test.com user with cc 4242424242424242 will only
 charge once "
          (let [stripe-params {:customer customer-id
                               :amount 55
                               :currency config/default-currency
                               :description "A test transaction"
                               :receipt_email (:email u)}
                ]
            ;; make two identical requests, with one idempotentcy-key
            (stripe-req "post"
                          "charges"
                          stripe-params
                          {:Idempotency-Key idempotency-key})
            (stripe-req "post"
                          "charges"
                          stripe-params
                          {:Idempotency-Key idempotency-key})
            ;; get the last two charges
            (let [request  {:basic-auth config/stripe-private-key
                            :as :json
                            :coerce :always
                            :query-params {:limit 2}}
                  response (client/get (str config/stripe-api-url "charges")
                                       request)
                  data     (:data (:body response))
                  ]
              ;; because the charge for 55 should have ONLY gone through once,
              ;; the last two transctions should be for 50 and 55
              (is (= (:amount (first data)) 55))
              (is (= (:amount (second data)) 50))
              )))))))

