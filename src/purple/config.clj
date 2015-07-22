(ns purple.config)

(def base-url (System/getProperty "BASE_URL"))

;; Database
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

;; Basic Auth, for Dashboard
;; with edit privileges
(def basic-auth-username (System/getProperty "BASIC_AUTH_USERNAME"))
(def basic-auth-password (System/getProperty "BASIC_AUTH_PASSWORD"))
;; with read-only privileges (the page is /stats instead of /dashboard)
(def basic-auth-read-only-username (System/getProperty "BASIC_AUTH_READ_ONLY_USERNAME"))
(def basic-auth-read-only-password (System/getProperty "BASIC_AUTH_READ_ONLY_PASSWORD"))

;; Payment
(def stripe-api-url "https://api.stripe.com/v1/")
(def stripe-private-key (System/getProperty "STRIPE_PRIVATE_KEY"))
(def default-currency "usd")

;; Dispatch 
;; how often to process the zone order queues (i.e., dispatch/zq) (millis)
;; MUST BE multiple of 1000 (because of dispatch/remind-courier)
(def process-interval (* 1000 5))
;; how long of courier app not responding that we consider
;; them to be disconnected. (seconds)
(def max-courier-abandon-time (* 60 2))
;; how many long after a new order has been accepted to a courier but they
;; have not begun the route; to then send them a reminder (seconds)
(def courier-reminder-time (* 60 5))

(def email-from-address (System/getProperty "EMAIL_USER"))
(def email {:host "smtp.gmail.com"
            :user (System/getProperty "EMAIL_USER")
            :pass (System/getProperty "EMAIL_PASSWORD")
            :ssl :yes!!!11})

;; the customer apns arn is either Sandbox or Live APNS
(def sns-app-arn-apns (System/getProperty "SNS_APP_ARN_APNS"))
;; the courier arn is always Sandbox
(def sns-app-arn-apns-courier "arn:aws:sns:us-west-2:336714665684:app/APNS_SANDBOX/Purple")
(def sns-app-arn-gcm (System/getProperty "SNS_APP_ARN_GCM"))


;; Twilio, for sending SMS and phone calls
(def twilio-account-sid (System/getProperty "TWILIO_ACCOUNT_SID"))
(def twilio-auth-token (System/getProperty "TWILIO_AUTH_TOKEN"))
(def twilio-from-number (System/getProperty "TWILIO_FROM_NUMBER"))


(def gas-price-87 (atom 0))
(def gas-price-91 (atom 0))

;; hour of day, start and end (in PST/PDT), both are inclusive
;; e.g., [8 19] service available from 8:00:00am to 7:59:59pm
;; the way things are coded, you can't wrap around past midnight
(def service-time-bracket [10 20])

;; key is number of minutes till deadline
;; if changing service fee, also change in dispatch.clj where the hardcoded
;; service fee is being used for old versions of the app
(def delivery-times (array-map 180 {:service_fee 0
                                    :text "within 3 hours (free)"}
                               60  {:service_fee 0
                                    :text "within 1 hour (free)"}))

;; Discount value in cents of using a referral code
(def referral-referred-value -1000) ;; should be negative!
;; The # of gallons credited to the Referrer upon usage of their coupon code
(def referral-referrer-gallons 5)

(def status->next-status
  {"unassigned" "assigned"
   "assigned" "accepted"
   "accepted" "enroute"
   "enroute" "servicing"
   "servicing" "complete"
   "complete" "complete"
   "cancelled" "cancelled"})

(def cancellable-statuses ["unassigned" "assigned" "accepted" "enroute"])
