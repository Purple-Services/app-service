(ns purple.config)

;; stub for local testing DEV DB
(System/setProperty "DB_HOST" "aaey4vi1u5i4jq.cqxql2suz5ru.us-west-2.rds.amazonaws.com")
(System/setProperty "DB_NAME" "ebdb")
(System/setProperty "DB_PORT" "3306")
(System/setProperty "DB_USER" "purplemaster")
(System/setProperty "DB_PASSWORD" "HHjdnb873HHjsnhhd")
(System/setProperty "DB_ENCRYPTION_KEY_HEX" "55555a43376a4b4a44b76b4653")
(System/setProperty "EMAIL_USER" "purpleservicesfeedback")
(System/setProperty "EMAIL_PASSWORD" "psFeed877877")
(System/setProperty "STRIPE_PRIVATE_KEY" "sk_test_6Nbxf0bpbBod335kK11SFGw3")


;;
;; Database config
;;

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

;; this is a 128-bit key, 256-bit *can* be used with this paramter setting:
;; block_encryption_mode parameter to 'aes-256-cbc'
;; at this time as aws does not offer that parameter easily...
(def db-encryption-key-hex (System/getProperty "DB_ENCRYPTION_KEY_HEX"))

(def base-url "http://purple-dev.elasticbeanstalk.com/")

(def email {:host "smtp.gmail.com"
            :user (System/getProperty "EMAIL_USER") 
            :pass (System/getProperty "EMAIL_PASSWORD")
            :ssl :yes!!!11})

;; Payment
(def stripe-api-url "https://api.stripe.com/v1/")
(def stripe-private-key (System/getProperty "STRIPE_PRIVATE_KEY"))
(def default-currency "usd")

;;
;; Dispatch config
;;
;; how often to get all unassigned orders from the database (millis)
(def process-interval (* 1000 5))
;; maximum displacement a courier should travel for delivery
;; approx, as bird flies, in degrees squared (use dispatch/disp-squared to calc)
;; 0.03130913834099598 is about 12 miles
(def max-service-disp-squared 0.03130913834099598)
;; how long of courier app not responding that we consider
;; them to be disconnected. (seconds)
(def max-courier-abandon-time (* 60 2))


