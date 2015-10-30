(ns purple.config
  (:require [environ.core :refer [env]]))

(defn test-or-dev-env? [env]
  "Given env, return true if we are in test or dev"
  (if (or (= (env :env) "test") (= (env :env) "dev")) true false))

(if (test-or-dev-env? env)
  (do
    (System/setProperty "AWS_ACCESS_KEY_ID" (env :aws-access-key-id))
    (System/setProperty "AWS_SECRET_KEY" (env :aws-secret-key))
    (System/setProperty "DB_HOST" (env :db-host))
    (System/setProperty "DB_NAME" (env :db-name))
    (System/setProperty "DB_PORT" (env :db-port))
    (System/setProperty "DB_USER" (env :db-user))
    (System/setProperty "DB_PASSWORD" (env :db-password))
    (System/setProperty "EMAIL_USER" (env :email-user))
    (System/setProperty "EMAIL_PASSWORD" (env :email-password))
    (System/setProperty "STRIPE_PRIVATE_KEY" (env :stripe-private-key))
    (System/setProperty "SIFT_SCIENCE_API_KEY" (env :sift-science-api-key))
    (System/setProperty "SNS_APP_ARN_APNS" (env :sns-app-arn-apns))
    (System/setProperty "SNS_APP_ARN_GCM" (env :sns-app-arn-gcm))
    (System/setProperty "TWILIO_ACCOUNT_SID" (env :twilio-account-sid))
    (System/setProperty "TWILIO_AUTH_TOKEN" (env :twilio-auto-token))
    (System/setProperty "TWILIO_FROM_NUMBER" (env :twilio-form-number))
    (System/setProperty "SEGMENT_WRITE_KEY" (env :segment-write-key))
    (System/setProperty "BASE_URL" (env :base-url))
    (System/setProperty "BASIC_AUTH_USERNAME" (env :basic-auth-username))
    (System/setProperty "BASIC_AUTH_PASSWORD" (env :basic-auth-password))))

;;;; Base Url of the web service
;; Should include trailing forward-slash (e.g., "http://domain.com/")
(def base-url (System/getProperty "BASE_URL"))

;;;; Database
(def db-host (System/getProperty "DB_HOST"))
(def db-port (System/getProperty "DB_PORT"))
(def db-name (System/getProperty "DB_NAME"))
(def db-user (System/getProperty "DB_USER"))
(def db-password (System/getProperty "DB_PASSWORD"))
(def db-config
  {:classname "com.mysql.jdbc.Driver"
   :subprotocol "mysql"
   :subname (str "//" db-host ":" db-port "/" db-name)
   :user db-user
   :password db-password})

;;;; Basic Auth, for Dashboard
;; ...with edit privileges
(def basic-auth-admin
  {:username (System/getProperty "BASIC_AUTH_USERNAME")
   :password (System/getProperty "BASIC_AUTH_PASSWORD")})
;; ...with read-only privileges (the page is /stats instead of /dashboard)
(def basic-auth-read-only
  {:username (System/getProperty "BASIC_AUTH_READ_ONLY_USERNAME")
   :password (System/getProperty "BASIC_AUTH_READ_ONLY_PASSWORD")})

;;;; Payment
(def stripe-api-url "https://api.stripe.com/v1/")
(def stripe-private-key (System/getProperty "STRIPE_PRIVATE_KEY"))
(def default-currency "usd")
(def sift-science-api-url "https://api.siftscience.com/v203/")
(def sift-science-api-key (System/getProperty "SIFT_SCIENCE_API_KEY"))

;;;; Dispatch 
;; How often to process the zone order queues (i.e., dispatch/zq) (millis)
;; MUST BE multiple of 1000 (because of dispatch/remind-courier)
(def process-interval (* 1000 5))
;; How long of courier app not responding that we consider them to be
;; disconnected. (seconds)
(def max-courier-abandon-time (* 60 2))
;; How many long after a new order has been accepted to a courier but they
;; have not begun the route; to then send them a reminder (seconds)
(def courier-reminder-time (* 60 5))

;;;; Email
(def email-from-address (System/getProperty "EMAIL_USER"))
(def email {:host "smtp.gmail.com"
            :user (System/getProperty "EMAIL_USER")
            :pass (System/getProperty "EMAIL_PASSWORD")
            :ssl :yes!!!11})

;;;; Push Notifications (using AWS SNS)
;; the customer apns arn is either Sandbox or Live APNS
(def sns-app-arn-apns (System/getProperty "SNS_APP_ARN_APNS"))
;; the courier arn is always Sandbox
(def sns-app-arn-apns-courier "arn:aws:sns:us-west-2:336714665684:app/APNS_SANDBOX/Purple")
(def sns-app-arn-gcm (System/getProperty "SNS_APP_ARN_GCM"))

;;;; SMS and Phone Calls (using Twilio)
(def twilio-account-sid (System/getProperty "TWILIO_ACCOUNT_SID"))
(def twilio-auth-token (System/getProperty "TWILIO_AUTH_TOKEN"))
(def twilio-from-number (System/getProperty "TWILIO_FROM_NUMBER"))

;;;; Referral Program
;; Discount value in cents of using a referral code
(def referral-referred-value -1500) ;; should be negative!
;; The # of gallons credited to the Referrer upon usage of their coupon code
(def referral-referrer-gallons 5)

;; The flow of order status; nil means status can't be changed
(def status->next-status
  {"unassigned"  "assigned"
   "assigned"    "accepted"
   "accepted"    "enroute"
   "enroute"     "servicing"
   "servicing"   "complete"
   "complete"    nil
   "cancelled"   nil})
;; An order can be cancelled only if its status is one of these
(def cancellable-statuses ["unassigned" "assigned" "accepted" "enroute"])

;; Messages
(def delayed-assignment-message "Hello, Purple Courier. You have been assigned a new order, but have not begun the route. Please open the app to view the order details and begin the route. Thank you.")
