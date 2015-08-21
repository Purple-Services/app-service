(ns purple.payment
  (:use purple.util
        cheshire.core
        clojure.walk
        [purple.db :only [conn !select !insert !update mysql-escape-str]])
  (:require [purple.config :as config]
            [clj-http.client :as client]
            [clojure.string :as s]))

(def common-opts
  {:basic-auth config/stripe-private-key
   :as :json
   :coerce :always})

(defn stripe-req
  [method endpoint & [params headers]]
  (let [opts (merge-with merge 
                         common-opts
                         {:form-params params}
                         {:headers headers})
        resp ((resolve (symbol "clj-http.client" method))
              (str config/stripe-api-url endpoint)
              opts)]
    (:body resp)))

(defn create-stripe-customer
  [user-id stripe-token]
  (stripe-req "post"
              "customers"
              {:description (str "Purple ID: " user-id)
               :card stripe-token}))

(defn get-stripe-customer
  [customer-id]
  (stripe-req "get" (str "customers/" customer-id)))

(defn add-stripe-card
  [customer-id stripe-token]
  (stripe-req "post"
              (str "customers/" customer-id "/cards")
              {:card stripe-token}))

(defn delete-stripe-card
  [customer-id card-id]
  (stripe-req "delete"
              (str "customers/" customer-id "/cards/" card-id)))

(defn set-default-stripe-card
  [customer-id card-id]
  (stripe-req "post"
              (str "customers/" customer-id)
              {:default_card card-id}))

;; Amount is an integer of cents to charge. Semi-sensitive info returned!
(defn charge-stripe-customer
  [customer-id order-id amount description receipt-email]
  (try (let [idempotency-key order-id
             resp (stripe-req "post"
                              "charges"
                              {:customer customer-id
                               :amount amount
                               :currency config/default-currency
                               :description description
                               :receipt_email receipt-email}
                              {:Idempotency-Key idempotency-key})]
         (if (:paid resp)
           {:success true
            :charge resp}
           {:success false
            :message (:failure_message resp)}))
       (catch Exception e ;; not ideal, it assumes any bad status code is this
         (send-email
          {:to "chris@purpledelivery.com"
           :subject "Purple - Error"
           :body (str "Stripe Exception: " (.getMessage e))})
         {:success true})))
