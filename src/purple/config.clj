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

(def email {:host "smtp.gmail.com"
            :user (System/getProperty "EMAIL_USER") 
            :pass (System/getProperty "EMAIL_PASSWORD")
            :ssl :yes!!!11})

(def sns-app-arn (System/getProperty "SNS_APP_ARN"))

(def gas-price-87 (atom 0))
(def gas-price-91 (atom 0))

;; hour of day, start and end (in PST/PDT)
(def service-time-bracket [8 20])
