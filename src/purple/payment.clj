(ns purple.payment
  (:use cheshire.core
        clojure.walk)
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
            [purple.users :as users]
            [purple.orders :as orders]
            [clj-http.client :as client]
            [clojure.string :as s]))

(def common-opts
  {:basic-auth util/stripe-private-key
   :as :json
   :coerce :always})

(defn create-stripe-customer
  [user-id stripe-token]
  (:body (client/post
          (str util/stripe-api-url "customers")
          (merge common-opts
                 {:form-params {:description (str "Purple ID: " user-id)
                                :card stripe-token}}))))

(defn get-stripe-customer
  [customer-id]
  (:body (client/get
          (str util/stripe-api-url "customers/" customer-id)
          common-opts)))

(defn add-stripe-card
  [customer-id stripe-token]
  (:body (client/post
          (str util/stripe-api-url "customers/" customer-id "/cards")
          (merge common-opts
                 {:form-params {:card stripe-token}}))))

(defn delete-stripe-card
  [customer-id card-id]
  (:body (client/delete
          (str util/stripe-api-url "customers/" customer-id "/cards/" card-id)
          common-opts)))

(defn set-default-stripe-card
  [customer-id card-id]
  (:body (client/post
          (str util/stripe-api-url "customers/" customer-id)
          (merge common-opts
                 {:form-params {:default_card card-id}}))))
