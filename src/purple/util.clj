(ns purple.util
  (:use [purple.db :only [conn !select !insert !update mysql-escape-str]])
  (:require [purple.config :as config]
            [clojure.string :as s]
            [postal.core :as postal]
            [clj-time.core :as time]
            [clj-time.coerce :as time-coerce]
            [clj-time.format :as time-format]
            [clj-aws.core :as aws]
            [clj-aws.sns :as sns]
            [environ.core :refer [env]]
            [ardoq.analytics-clj :as segment])
  (:import [com.amazonaws.services.sns AmazonSNSClient]
           [com.amazonaws.services.sns.model Topic CreateTopicRequest
            DeleteTopicRequest GetTopicAttributesRequest SubscribeRequest
            PublishRequest CreatePlatformEndpointRequest
            CreatePlatformEndpointResult MessageAttributeValue]
           [com.twilio.sdk TwilioRestClient TwilioRestException]
           [com.twilio.sdk.resource.factory MessageFactory CallFactory]
           [com.twilio.sdk.resource.instance Message Call]
           [org.apache.http NameValuePair]
           [org.apache.http.message BasicNameValuePair]
           [java.util List ArrayList]))

(defmacro !
  "Keeps code from running during compilation."
  [& body]
  `(when-not *compile-files*
     ~@body))

(defmacro only-prod
  "Only run this code when in production mode."
  [& body]
  `(when (= config/db-user "purplemasterprod")
     ~@body))

(defmacro catch-notify
  "A try catch block that emails me exceptions."
  [& body]
  `(try ~@body
        (catch Exception e#
          (only-prod (send-email {:to "chris@purpledelivery.com"
                                  :subject "Purple - Exception Caught"
                                  :body (str e#)})))))

(defmacro unless-p
  "Use x unless the predicate is true for x, then use y instead."
  [pred x y]
  `(if-not (~pred ~x)
     ~x
     ~y))

(defn split-on-comma [x] (s/split x #","))

(defn five-digit-zip-code
  [zip-code]
  (subs zip-code 0 5))

(defn cents->dollars
  "Integer of cents -> Double of dollars."
  [x]
  (if (zero? x)
    0
    (double (/ x 100))))

(defn cents->dollars-str
  "To display an integer of cents as string in dollars with a decimal."
  [x]
  (let [y (str x)]
    (->> (split-at (- (count y) 2) y)
         (interpose ".")
         flatten
         (apply str))))

(def time-zone (time/time-zone-for-id "America/Los_Angeles"))

(defn unix->DateTime
  [x]
  (time-coerce/from-long (* 1000 x)))

(def full-formatter (time-format/formatter "M/d h:mm a"))
(defn unix->full
  "Convert integer unix timestamp to formatted date string."
  [x]
  (time-format/unparse
   (time-format/with-zone full-formatter time-zone)
   (unix->DateTime x)))

(def fuller-formatter (time-format/formatter "M/d/y h:mm a"))
(defn unix->fuller
  "Convert integer unix timestamp to formatted date string."
  [x]
  (time-format/unparse
   (time-format/with-zone fuller-formatter time-zone)
   (unix->DateTime x)))

(def hour-formatter (time-format/formatter "H"))
(defn unix->hour-of-day
  "Convert integer unix timestamp to integer hour of day 0-23."
  [x]
  (Integer.
   (time-format/unparse
    (time-format/with-zone hour-formatter time-zone)
    (unix->DateTime x))))

(def minute-formatter (time-format/formatter "m"))
(defn unix->minute-of-hour
  "Convert integer unix timestamp to integer minute of hour."
  [x]
  (Integer.
   (time-format/unparse
    (time-format/with-zone minute-formatter time-zone)
    (unix->DateTime x))))

(defn unix->minute-of-day
  "How many minutes (int) since beginning of day?"
  [x]
  (+ (* (unix->hour-of-day x) 60)
     (unix->minute-of-hour x)))

(def hmma-formatter (time-format/formatter "h:mm a"))
(defn unix->hmma
  "Convert integer unix timestamp to formatted date string."
  [x]
  (time-format/unparse
   (time-format/with-zone hmma-formatter time-zone)
   (unix->DateTime x)))

(defn minute-of-day->hmma
  "Convert number of minutes since the beginning of today to a unix timestamp."
  [m]
  (unix->hmma
   (+ (* m 60)
      (-> (time/date-time 1976) ;; it'll be wrong day but same hmma
          (time/from-time-zone time-zone)
          time-coerce/to-long
          (quot 1000)))))

(defn in? 
  "true if seq contains elm"
  [seq elm]  
  (some #(= elm %) seq))

(defn rand-str
  [ascii-codes length]
  (apply str (repeatedly length #(char (rand-nth ascii-codes)))))

(defn rand-str-num
  [length]
  (rand-str (range 48 58)  ;; 0-9
            length))

(defn rand-str-alpha-num
  [length]
  (rand-str (concat (range 48 58)  ;; 0-9
                    (range 65 91)  ;; A-Z
                    (range 97 123) ;; a-z
                    )
            length))

(defn gen-coupon-code []
  (rand-str (remove (set [65  ;; A  - removing vowels to avoid offensive words
                          69  ;; E
                          73  ;; I
                          79  ;; O
                          85  ;; U
                          48  ;; 0  - removing nums that look like chars
                          49  ;; 1
                          79  ;; O  - removing chars that look like nums
                          73]);; I
                    (concat (range 48 58)  ;; 0-9
                            (range 65 91)))  ;; A-Z
            5))

(defn format-coupon-code
  "Format coupon code to consistent format. (Keep this idempotent!)"
  [code]
  (s/replace (s/upper-case code) #" " ""))

(defn new-session-id []
  (rand-str-alpha-num 64))

(defn new-auth-token []
  (rand-str-alpha-num 128))

(defn send-email [message-map]
  (try (postal/send-message config/email
                            (assoc message-map
                              :from (str "Purple Services Inc <"
                                         config/email-from-address
                                         ">")))
       {:success true}
       (catch Exception e {:success false
                           :message "Message could not be sent to that address."})))

(defn send-feedback
  [text & {:keys [user_id]}]
  (let [user (when user_id
               ((resolve 'purple.users/get-user-by-id) (conn) user_id))]
    (only-prod
     (send-email {:to "chris@purpledelivery.com"
                  :cc ["joe@purpledelivery.com"
                       "bruno@purpledelivery.com"]
                  :subject "Purple Feedback Form Response"
                  :body (if user
                          (str "From User ID: " user_id "\n\n"
                               "Name: " (:name user) "\n\n"
                               "Email: " (:email user) "\n\n"
                               text)
                          text)}))))

(! (def segment-client (segment/initialize (System/getProperty "SEGMENT_WRITE_KEY"))))

;; Amazon SNS (Push Notifications)
(! (do
     (def aws-creds (aws/credentials (System/getProperty "AWS_ACCESS_KEY_ID")
                                     (System/getProperty "AWS_SECRET_KEY")))
     (def sns-client (sns/client aws-creds))
     (.setEndpoint sns-client "https://sns.us-west-2.amazonaws.com")))

;; todo - recreate/update endpoint_arn with new device_token if a certain exception is thrown

;; if the user doesn't have an endpoint_arn then we need to create one for them
(defn sns-create-endpoint
  [client device-token user-id sns-app-arn]
  (try
    (let [req (CreatePlatformEndpointRequest.)]
      (.setCustomUserData req user-id)
      (.setToken req device-token)
      (.setPlatformApplicationArn req sns-app-arn)
      (.getEndpointArn (.createPlatformEndpoint client req)))
    (catch Exception e
      (only-prod (send-email {:to "chris@purpledelivery.com"
                              :subject "Purple - Error"
                              :body (str "AWS SNS Create Endpoint Exception: "
                                         (.getMessage e)
                                         "\n\n"
                                         "user-id: "
                                         user-id)}))
      "")))

(defn sns-publish
  [client target-arn message]
  (try
    (let [req (PublishRequest.)
          is-gcm? (.contains target-arn "GCM/Purple")]
      (.setMessage req (if is-gcm?
                         (str "{\"GCM\": \"{ "
                              "\\\"data\\\": { \\\"message\\\": \\\""
                              message
                              "\\\" } }\"}")
                         message))
      (when is-gcm? (.setMessageStructure req "json"))
      (.setTargetArn req target-arn)
      (.publish client req))
    (catch Exception e
      (only-prod (send-email {:to "chris@purpledelivery.com"
                              :subject "Purple - Error"
                              :body (str "AWS SNS Publish Exception: "
                                         (.getMessage e)
                                         "\n\n"
                                         "target-arn: "
                                         target-arn
                                         "\nmessage: "
                                         message)})))))


;; Twilio (SMS & Phone Calls)
(! (do
     (def twilio-client (TwilioRestClient. config/twilio-account-sid
                                           config/twilio-auth-token))
     (def twilio-sms-factory (.getMessageFactory (.getAccount twilio-client)))
     (def twilio-call-factory (.getCallFactory (.getAccount twilio-client)))))


(defn send-sms
  [to-number message]
  (catch-notify
   (.create twilio-sms-factory
            (ArrayList. [(BasicNameValuePair. "Body" message)
                         (BasicNameValuePair. "To" to-number)
                         (BasicNameValuePair. "From" config/twilio-from-number)]))))


(defn make-call
  [to-number call-url]
  (catch-notify
   (.create twilio-call-factory
            (ArrayList. [(BasicNameValuePair. "Url" call-url)
                         (BasicNameValuePair. "To" to-number)
                         (BasicNameValuePair. "From" config/twilio-from-number)]))))
