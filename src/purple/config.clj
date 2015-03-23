(ns purple.config)

;; stub for local testing DEV DB
(System/setProperty "AWS_ACCESS_KEY_ID" "AKIAJLB35GOFQUJZCX5A")
(System/setProperty "AWS_SECRET_KEY" "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")
(System/setProperty "DB_HOST" "aaey4vi1u5i4jq.cqxql2suz5ru.us-west-2.rds.amazonaws.com")
(System/setProperty "DB_NAME" "ebdb")
(System/setProperty "DB_PORT" "3306")
(System/setProperty "DB_USER" "purplemaster")
(System/setProperty "DB_PASSWORD" "HHjdnb873HHjsnhhd")
(System/setProperty "EMAIL_USER" "purpleservicesfeedback")
(System/setProperty "EMAIL_PASSWORD" "psFeed877877")
(System/setProperty "STRIPE_PRIVATE_KEY" "sk_test_6Nbxf0bpbBod335kK11SFGw3")
(System/setProperty "SNS_APP_ARN" "arn:aws:sns:us-west-2:336714665684:app/APNS_SANDBOX/Purple")
(System/setProperty "BASE_URL" "http://purple-dev.elasticbeanstalk.com/")
;(System/setProperty "BASE_URL" "http://localhost:3000/")


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
