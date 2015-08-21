(ns purple.test.payment
  (:use cheshire.core)
  (:require [purple.payment :refer [stripe-req charge-stripe-customer]]
            [clj-http.client :as client]
            [clojure.test :refer [deftest is test-ns testing]]
            [purple.config :as config]
            [purple.handler :refer :all]
            [purple.users :refer [get-user-by-id get-user]]
            [purple.db :refer [conn]]))

(deftest test-charge-stripe-customer

  (let [db-conn (conn)]
    (let [u (get-user db-conn "native" "test@test.com")
          customer-id (:stripe_customer_id u)]
      (testing "The test@test.com user with cc 4242424242424242 will succeed as paid"
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
        (testing "The test@test.com user with cc 4242424242424242 will only charge once "
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
                  response (client/get (str config/stripe-api-url "charges") request)
                  data     (:data (:body response))
                  ]
              ;; because the charge for 55 should have ONLY gone through once, the last two transctions should
              ;; be for 50 and 55
              (is (= (:amount (first data)) 55))
              (is (= (:amount (second data)) 50))
              )))))))

