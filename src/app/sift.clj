(ns app.sift
  (:require [common.config :as config]
            [common.util :refer [not-nil-vec]]
            [common.zones :refer [order->zone-id]]
            [clj-http.client :as client]
            [clojure.string :as s]))

(defn sift-req
  [method endpoint & [params headers]]
  (try (:body ((resolve (symbol "clj-http.client" method))
               (str config/sift-science-api-url endpoint)
               {:as :json
                :content-type :json
                :coerce :always
                :headers headers
                :form-params (merge {:$api_key config/sift-science-api-key}
                                    params)}))
       (catch Exception e false)))

(defn event
  [event-type fields]
  (sift-req "post" "events" (merge {:$type event-type} fields)))

(defn create-account
  ;; [user {:keys [event-time]}] ;; only needed for backfilling historical data
  [user] ;; only needed for backfilling historical data
  (event "$create_account"
         (conj {:$user_id (:id user)
                :$user_email (:email user)}
               ;; (not-nil-vec :$time event-time)
               (not-nil-vec :$social_sign_on_type (case (:type user)
                                                    "facebook" "$facebook"
                                                    "google" "$google"
                                                    nil)))))

(defn update-account
  ;; [user {:keys [event-time]}] ;; only needed for backfilling historical data
  [user] ;; only needed for backfilling historical data
  (event "$update_account"
         (conj {:$user_id (:id user)}
               ;; (not-nil-vec :$time event-time)
               (not-nil-vec :$user_email (:email user))
               (not-nil-vec :$name (:name user))
               (not-nil-vec :$phone (:phone_number user))
               (not-nil-vec :gender (:gender user)))))

(defn common-order-fields
  [order user]
  (assoc (select-keys order [:gallons :gas_type :lat :lng :vehicle_id
                             :license_plate :coupon_code
                             :target_time_start :target_time_end
                             :referral_gallons_used :special_instructions])
         :$user_id (:user_id order)
         :$order_id (:id order)
         :$user_email (:email user)
         :$amount (* (:total_price order) 10000)
         :$currency_code "USD"
         :$shipping_address {:$address_1 (:address_street order)
                             :$zipcode (:address_zip order)
                             :$name (:name user)
                             :$phone (:phone_number user)}
         :time_limit (:time-limit order)
         :gas_price (* (:gas_price ornder) 10000)
         :service_fee (* (:service_fee order) 10000)))

(defn charge-authorization
  [order user {:keys [event-time ;; only needed for backfilling historical data
                      stripe-charge-id
                      stripe-customer-id
                      successful?
                      card-last4
                      decline-reason-code
                      stripe-cvc-check
                      stripe-funding
                      stripe-brand]}]
  (event "$transaction"
         (conj (common-order-fields order user)
               (not-nil-vec :$time event-time)
               (not-nil-vec :$transaction_id stripe-charge-id)
               [:$transaction_type "$authorize"]
               [:$transaction_status (if successful? "$success" "$failure")]
               [:$payment_method (conj {:$payment_type "$credit_card"
                                        :$payment_gateway "$stripe"}
                                       (not-nil-vec :$card_last4 card-last4)
                                       (not-nil-vec :$decline_reason_code
                                                    decline-reason-code)
                                       (not-nil-vec :$stripe_cvc_check
                                                    stripe-cvc-check)
                                       (not-nil-vec :$stripe_funding
                                                    stripe-funding)
                                       (not-nil-vec :$stripe_brand
                                                    stripe-brand))]
               (not-nil-vec :stripe_customer_id stripe-customer-id))))

;; (defn get-stripe-customer
;;   [customer-id]
;;   (stripe-req "get" (str "customers/" customer-id)))
