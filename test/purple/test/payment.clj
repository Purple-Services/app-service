(ns purple.test.payment
  (:use cheshire.core)
  (:require [purple.payment :refer [stripe-req]]
            [clj-http.client :as client]
            [clojure.test :refer [deftest is test-ns testing]]
            [purple.config :as config]
            [purple.handler :refer :all]
            [purple.users :refer [get-user-by-id get-user]]
            [purple.db :refer [conn]]))

(deftest confirm-stripe-req-merge-with
  "Confirm the proper form of merge-with merge used in purple.payment/stripe-req"
  (let [common-opts {:as :json :coerce :always}
        opts (->> common-opts
                  (merge-with merge {:form-params {:foo "bar"}})
                  (merge-with merge {:headers {"baz" "qux"}})
                  )]
    ;; confirm that the opts map can be built up
    (is (= opts {:as :json :coerce :always :form-params {:foo "bar"} :headers
                 {"baz" "qux"}}))
    (let [add-opts (->> opts
                        (merge-with merge {:form-params {:quux "corge"}})
                        (merge-with merge {:headers {"grault" "garply"}}))]
      ;; confirm that the add-opts map is merged opts map
      (is (= add-opts {:as :json :coerce :always :form-params {:foo "bar" :quux
                                                               "corge"}
                       :headers {"baz" "qux" "grault" "garply"}})))))

;; note: all of the following tests have been disabled as they no longer work
(deftest test-charge-stripe-customer
  (let [db-conn (conn)]
    (let [u (get-user db-conn "native" "test@test.com")
          customer-id (:stripe_customer_id u)]
      #_ (testing "The test@test.com user with cc 4242424242424242 will succeed
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
        #_ (testing "The test@test.com user with cc 4242424242424242 will only
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

