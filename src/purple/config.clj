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
(def basic-auth-username (System/getProperty "BASIC_AUTH_USERNAME"))
(def basic-auth-password (System/getProperty "BASIC_AUTH_PASSWORD"))

;; Payment
(def stripe-api-url "https://api.stripe.com/v1/")
(def stripe-private-key (System/getProperty "STRIPE_PRIVATE_KEY"))
(def default-currency "usd")

;; Dispatch 
;; how often to process the zone order queues (i.e., dispatch/zq) (millis)
(def process-interval (* 1000 5))
;; how long of courier app not responding that we consider
;; them to be disconnected. (seconds)
(def max-courier-abandon-time (* 60 2))

(def email-from-address (System/getProperty "EMAIL_USER"))
(def email {:host "smtp.gmail.com"
            :user (System/getProperty "EMAIL_USER")
            :pass (System/getProperty "EMAIL_PASSWORD")
            :ssl :yes!!!11})

;; the customer arn is either Sandbox or Live APNS
(def sns-app-arn (System/getProperty "SNS_APP_ARN"))
;; the courier arn is always Sandbox
(def sns-app-arn-courier "arn:aws:sns:us-west-2:336714665684:app/APNS_SANDBOX/Purple")

(def gas-price-87 (atom 0))
(def gas-price-91 (atom 0))

;; hour of day, start and end (in PST/PDT), both are inclusive
;; e.g., [8 19] service available from 8:00:00am to 7:59:59pm
;; the way things are coded, you can't wrap around past midnight
;; We accept orders from 8am (inclusive) - 9pm (exclusive),
;; and can be 1 hour or 3 hour order (or 20 minutes order)
(def service-time-bracket [8 20])

;; key is number of minutes till deadline
(def delivery-times {20  {:service_fee 0
                          :text "within 20 mins (free)"}
                     60  {:service_fee 0
                          :text "within 1 hour (free)"}
                     180 {:service_fee 0
                          :text "within 3 hours (free)"}})
