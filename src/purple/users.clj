(ns purple.users
  (:use purple.fb.auth
        gapi.core)
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
            [clojure.java.jdbc :as sql]
            [crypto.password.bcrypt :as password]
            [purple.fb.client :as fb]
            [clojure.string :as s]))

(def safe-authd-user-keys
  "Keys of a user map that are safe to send out to auth'd user."
  [:id :type :email :name :phone_number])

(defn get-user
  "Gets a user from db by type and platform-id. Some fields unsafe for output."
  [db-conn type platform-id]
  (first (db/select db-conn
                    "users"
                    ["*"]
                    (merge {:type type}
                           (case type
                             "native" {:email platform-id}
                             "facebook" {:id (str "fb" platform-id)}
                             "google" {:id (str "g" platform-id)}
                             (throw (Exception. "Unknown user type.")))))))

(defn get-user-by-id
  "Gets a user from db by user-id."
  [db-conn user-id]
  (first (db/select db-conn
                    "users"
                    [:id
                     :email
                     :type
                     :password_hash
                     :phone_number]
                    {:id user-id})))

(defn auth-native
  [user auth-key]
  (password/check auth-key (:password_hash user)))

(defn get-user-from-fb
  [auth-key]
  true
  ;; (:body (with-facebook-auth {:access-token auth-key}
  ;;          (fb/gett "https://graph.facebook.com/me")))
  )

(defn yo-yo 
  []
  (with-facebook-auth {:access-token "CAAWkZBz0JjIwBAFZAxicTZBEsY8V91hdkrsrqZBWXJUjlLYVqngZByWIzT3ldPP9ZAmsqgDHcEj65KQZApepjUPcmLdpQbhjAzPIFZAt00ITXLwo5fXsFdoKN4DzlVCQYfgnn21WMfjawiIUsMTZBdhsh5bXCZB1Yl0MpyYxXXYptloRMERHNqGcm0RhnZAu6dzEFnp8YlINN787EKYv2EN1H0Qn51yzIrU9ZB8ZD"}
              (fb/gett "https://graph.facebook.com/me")))

(defn auth-facebook
  [user auth-key]
  (= (:id user)
     (str "fb" (:id (get-user-from-fb auth-key)))))

(def google-plus-service
  (build "https://www.googleapis.com/discovery/v1/apis/plus/v1/rest"))

(defn get-user-from-google
  [auth-key]
  (call (atom {:token auth-key})
        google-plus-service
        "plus.people/get"
        {"userId" "me"}))

(defn auth-google
  [user auth-key]
  (= (:id user)
     (str "g" (:id (get-user-from-google auth-key)))))

(def required-data
  "These keys cannot be empty for an account to be considered complete."
  [:id :type :email :name :phone_number])

(defn init-session
  [db-conn user]
  (let [token (util/new-auth-token)]
    (db/insert db-conn
               "sessions"
               {:user_id (:id user)
                :token token
                :ip "1.1.1.1"})
    {:success true
     :token token
     :user (select-keys user safe-authd-user-keys)
     :account_complete (not-any? (comp s/blank? str val)
                                 (select-keys user required-data))}))

(defn add
  "Adds new user. Will fail if user_id is already being used."
  [db-conn user & {:keys [password]}]
  (db/insert db-conn
             "users"
             (if (= "native" (:type user))
               (assoc user :password_hash (password/encrypt password))
               user)))

(defn login
  "Logs in user depeding on 'type' of user."
  [db-conn type platform-id auth-key]
  (let [user (get-user db-conn type platform-id)]
    (try
      (if user
        (if (case (:type user)
              "native" (auth-native user auth-key)
              "facebook" (auth-facebook user auth-key)
              "google" (auth-google user auth-key)
              nil false
              (throw (Exception. "Unknown user type!")))
          (init-session db-conn user)
          (throw (Exception. "Invalid login.")))
        (do (add db-conn
                 (case type
                   "facebook" (let [fb-user (get-user-from-fb auth-key)]
                                (println fb-user)
                                {:id (str "fb" (:id fb-user))
                                 :email (:email fb-user)
                                 :name (:name fb-user)
                                 :gender (:gender fb-user)
                                 :type "facebook"})
                   "google" (let [google-user (get-user-from-google auth-key)]
                              {:id (str "g" (:id google-user))
                               :email (-> (:emails google-user)
                                          first
                                          :value)
                               :name (:displayName google-user)
                               :gender (:gender google-user)
                               :type "google"})
                   (throw (Exception. "Invalid login."))))
            (login db-conn type platform-id auth-key)))
      (catch Exception e (case (.getMessage e)
                           "Invalid login." {:success false
                                             :message "Invalid login."}
                           {:success false
                            :message "Unknown error."})))))

;; TODO currently allows duplicate email addresses!
(defn register
  "Only for native users."
  [db-conn platform-id auth-key]
  (do (add db-conn
           {:id (util/rand-str-alpha-num 20)
            :email platform-id
            :type "native"}
           :password auth-key))
  (login db-conn "native" platform-id auth-key))


(defn valid-session?
  [db-conn user-id token]
  (let [session (db/select db-conn
                           "sessions"
                           [:id
                            :timestamp_created]
                           {:user_id user-id
                            :token token})]
    (if (seq session)
      true
      false)))

(defn details
  [db-conn user-id]
  (let [user (get-user-by-id db-conn user-id)]
  (if (seq user)
    {:success true
     :user (select-keys user safe-authd-user-keys)}
    {:success false
     :message "User could not be found."})))

(defn edit
  [db-conn user-id record-map]
  (db/update db-conn
             "users"
             (select-keys record-map
                          [:name
                           :phone_number
                           :gender])
             {:id user-id}))
