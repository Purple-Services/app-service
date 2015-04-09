(ns purple.util
  (:require [purple.config :as config]
            [purple.db :as db]
            [clojure.string :as s]
            [postal.core :as postal]
            [clj-time.core :as time]
            [clj-time.coerce :as time-coerce]
            [clj-time.format :as time-format]
            [clj-aws.core :as aws]
            [clj-aws.sns :as sns])
  (:import [com.amazonaws.services.sns AmazonSNSClient]
           [com.amazonaws.services.sns.model Topic CreateTopicRequest
            DeleteTopicRequest GetTopicAttributesRequest SubscribeRequest
            PublishRequest CreatePlatformEndpointRequest
            CreatePlatformEndpointResult MessageAttributeValue]))

(defn split-on-comma [x] (s/split x #","))

(defn cents->dollars
  "To display an integer of cents as string in dollars with a decimal."
  [x]
  (let [y (str x)]
    (->> (split-at (- (count y) 2) y)
         (interpose ".")
         flatten
         (apply str))))

(def full-formatter (time-format/formatter "M/d K:mm a"))

(defn unix->full
  "Convert integer unix timestamp to formatted date string."
  [x]
  (time-format/unparse
   (time-format/with-zone
     full-formatter
     (time/time-zone-for-id "America/Los_Angeles"))
   (time-coerce/from-long (* 1000 x))))

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

(defn new-session-id []
  (rand-str-alpha-num 64))

(defn new-auth-token []
  (rand-str-alpha-num 128))

(defn send-email [message-map]
  (try (postal/send-message config/email
                            message-map)
       {:success true}
       (catch Exception e {:success false
                           :message "Message could not be sent to that address."})))

(defn send-feedback
  [text & {:keys [user_id]}]
  (send-email {:from "purpleservicesfeedback@gmail.com"
               :to "elwell.christopher@gmail.com"
               :subject "Purple Feedback Form Response"
               :body (if (not (nil? user_id))
                       (str "From User ID: "
                            user_id
                            "\n\n"
                            text)
                       text)}))


;; Amazon SNS (Push Notifications)
(when (not *compile-files*)
  (do
    (def aws-creds (aws/credentials (System/getProperty "AWS_ACCESS_KEY_ID")
                                    (System/getProperty "AWS_SECRET_KEY")))
    (def sns-client (sns/client aws-creds))
    (.setEndpoint sns-client "https://sns.us-west-2.amazonaws.com")))

;; todo - recreate/update endpoint_arn with new device_token a certain exception is thrown

;; if the user doesn't have an endpoint_arn then we need to create one for them
(defn sns-create-endpoint
  [client device-token user-id sns-app-arn]
  (let [req (CreatePlatformEndpointRequest.)]
    (.setCustomUserData req user-id)
    (.setToken req device-token)
    (.setPlatformApplicationArn req sns-app-arn)
    (.getEndpointArn (.createPlatformEndpoint client req))))

(defn sns-publish
  [client target-arn message]
  (let [req (PublishRequest.)]
    (.setMessage req message)
    (.setTargetArn req target-arn)
    (.publish client req)))

