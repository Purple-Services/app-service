(ns purple.payment
  (:use purple.util
        cheshire.core
        clojure.walk
        [purple.db :only [conn !select !insert !update mysql-escape-str]])
  (:require [purple.config :as config]
            [clj-http.client :as client]
            [clojure.string :as s]))

;; We are using Stripe API version 2015-01-26

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

(defn auth-charge-stripe-customer
  "Authorize a charge on a Stripe customer object. Amount in cents."
  [customer-id order-id amount description receipt-email]
  (try (let [idempotency-key order-id
             resp (stripe-req "post"
                              "charges"
                              {:customer customer-id
                               :amount amount
                               :capture false
                               :currency config/default-currency
                               :description description
                               :receipt_email receipt-email
                               :metadata {:order_id order-id}}
                              {:Idempotency-Key idempotency-key})]
         (if (:paid resp)
           {:success true
            :charge resp}
           {:success false
            :message (:failure_message resp)}))
       (catch Exception e ;; not ideal, it assumes any bad status code is this
         (only-prod (send-email
                     {:to "chris@purpledelivery.com"
                      :subject "Failed Stripe Charge Authorization"
                      :body (str "Failed charge auth details:\n\n"
                                 "Description: \n"
                                 description "\n"
                                 "Order ID: " order-id "\n"
                                 "Stripe Customer ID: " customer-id "\n"
                                 "Customer Email Address: " receipt-email "\n"
                                 "Additional details: " (.getMessage e))}))
         {:success false})))

(defn capture-stripe-charge
  "Captures an authorized charge."
  [charge-id]
  (try (let [resp (stripe-req "post" (str "charges/" charge-id "/capture"))]
         (if (:captured resp)
           {:success true
            :charge resp}
           {:success false}))
       (catch Exception e ;; not ideal, it assumes any bad status code is this
         (only-prod (send-email
                     {:to "chris@purpledelivery.com"
                      :subject "Failed Stripe Charge Capture"
                      :body (str "Failed charge capture details:\n\n"
                                 "Charge ID: " charge-id "\n"
                                 "Additional details: " (.getMessage e))}))
         {:success false})))

(defn refund-stripe-charge
  "Refunds a Stripe charge. Use on auth'd charges whether or not captured."
  [charge-id]
  (try (let [resp (stripe-req "post" (str "charges/" charge-id "/refunds"))]
         (if (:id resp)
           {:success true
            :refund resp}
           {:success false}))
       (catch Exception e ;; not ideal, it assumes any bad status code is this
         (only-prod (send-email
                     {:to "chris@purpledelivery.com"
                      :subject "Failed Stripe Charge Refund"
                      :body (str "Failed charge refund details:\n\n"
                                 "Refund ID: " charge-id "\n"
                                 "Additional details: " (.getMessage e))}))
         {:success false})))
