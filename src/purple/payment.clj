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
   :coerce :always
   :throw-exceptions false})

(defn stripe-req
  [method endpoint & [params headers]]
  (try (let [opts (merge-with merge 
                              common-opts
                              {:form-params params}
                              {:headers headers})
             resp (:body ((resolve (symbol "clj-http.client" method))
                          (str config/stripe-api-url endpoint)
                          opts))]
         {:success (not (:error resp))
          :resp resp})
       (catch Exception e
         {:success false
          :resp {:error {:message "Unknown error."}}})))

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

;; this should be refactored since it confuses by changing the meaning of :success
(defn auth-charge-stripe-customer
  "Authorize a charge on a Stripe customer object. Amount in cents."
  [customer-id order-id amount description receipt-email]
  (let [idempotency-key order-id
        resp (:resp (stripe-req "post"
                                "charges"
                                {:customer customer-id
                                 :amount amount
                                 :capture false
                                 :currency config/default-currency
                                 :description description
                                 :receipt_email receipt-email
                                 :metadata {:order_id order-id}}
                                {:Idempotency-Key idempotency-key}))]
    {:success (boolean (:paid resp))
     :charge resp}))

(defn capture-stripe-charge
  "Captures an authorized charge."
  [charge-id]
  (let [resp (:resp (stripe-req "post" (str "charges/" charge-id "/capture")))]
    (if (:captured resp)
      {:success true
       :charge resp}
      (do (only-prod (send-email
                      {:to "chris@purpledelivery.com"
                       :subject "Failed Stripe Charge Capture"
                       :body (str "Failed charge capture details:\n\n"
                                  "Charge ID: " charge-id "\n")}))
          {:success false
           :charge resp}))))

(defn refund-stripe-charge
  "Refunds a Stripe charge. Use on auth'd charges whether or not captured."
  [charge-id]
  (let [resp (:resp (stripe-req "post" (str "charges/" charge-id "/refunds")))]
    (if (:id resp)
      {:success true
       :refund resp}
      (do (only-prod (send-email
                      {:to "chris@purpledelivery.com"
                       :subject "Failed Stripe Charge Refund"
                       :body (str "Failed charge refund details:\n\n"
                                  "Refund ID: " charge-id "\n")}))
          {:success false
           :refund resp}))))

(defn get-stripe-charge
  [charge-id]
  (stripe-req "get" (str "charges/" charge-id)))
