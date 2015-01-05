(ns purple.users
  (:use clj-facebook-graph.auth
        gapi.core)
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
            [clojure.java.jdbc :as sql]
            [crypto.password.bcrypt :as password]
            [clj-facebook-graph.client :as fb]))

(defn get-user
  "Gets a user from db by type and platform-id."
  [db-conn type platform-id]
  (first (db/select db-conn
                    "users"
                    [:id
                     :email
                     :type
                     :password_hash
                     :phone_number]
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
  (:body (with-facebook-auth {:access-token auth-key}
           (fb/get "https://graph.facebook.com/me"))))

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

(defn init-session
  [db-conn user]
  (let [token (util/new-auth-token)]
    (db/insert db-conn
               "sessions"
               {:user_id (:id user)
                :token token
                :ip "1.1.1.1"})
    {:success true
     :user_type (:type user)
     :user_id (:id user)
     :token token}))

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
     :user (select-keys user
                        [:id
                         :email
                         :phone_number
                         :type])}
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
