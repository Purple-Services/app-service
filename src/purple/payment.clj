(ns purple.payment
  (:use cheshire.core
        clojure.walk)
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
            [clj-http.client :as client]
            [clojure.string :as s]))

(def common-opts
  {:basic-auth config/stripe-private-key
   :as :json
   :coerce :always})

(defn create-stripe-customer
  [user-id stripe-token]
  (:body (client/post
          (str config/stripe-api-url "customers")
          (merge common-opts
                 {:form-params {:description (str "Purple ID: " user-id)
                                :card stripe-token}}))))

(defn get-stripe-customer
  [customer-id]
  (:body (client/get
          (str config/stripe-api-url "customers/" customer-id)
          common-opts)))

(defn add-stripe-card
  [customer-id stripe-token]
  (:body (client/post
          (str config/stripe-api-url "customers/" customer-id "/cards")
          (merge common-opts
                 {:form-params {:card stripe-token}}))))

(defn delete-stripe-card
  [customer-id card-id]
  (:body (client/delete
          (str config/stripe-api-url "customers/" customer-id "/cards/" card-id)
          common-opts)))

(defn set-default-stripe-card
  [customer-id card-id]
  (:body (client/post
          (str config/stripe-api-url "customers/" customer-id)
          (merge common-opts
                 {:form-params {:default_card card-id}}))))

(defn update-stripe-charge-description
  [charge-id description]
  (:body (client/post
          (str config/stripe-api-url "charges/" charge-id)
          (merge common-opts
                 {:form-params {:description description}}))))

;; warning - using this function cause receipt email to be sent as well
(defn update-stripe-charge-receipt-email
  [charge-id receipt-email]
  (:body (client/post
          (str config/stripe-api-url "charges/" charge-id)
          (merge common-opts
                 {:form-params {:receipt_email receipt-email}}))))

(defn charge-stripe-customer
  "Amount is an integer of cents to charge. Semi-sensitive info returned!"
  [customer-id amount description receipt-email]
  (try (let [resp (:body (client/post
                          (str config/stripe-api-url "charges")
                          (merge common-opts
                                 {:form-params {:customer customer-id
                                                :amount amount
                                                :currency config/default-currency
                                                :description description
                                                :receipt_email receipt-email}})))]
         (if (:paid resp)
           {:success true
            :charge resp}
           {:success false
            :message (:failure_message resp)}))
       (catch Exception e ;; not ideal, it assumes any bad status code is this
         (util/send-email
          {:to "chris@purpledelivery.com"
           :subject "Purple - Error"
           :body (str "Stripe Exception: " (.getMessage e))})
         {:success true})))
