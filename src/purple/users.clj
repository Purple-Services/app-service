(ns purple.users
  (:use clj-facebook-graph.auth)
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
            [clojure.java.jdbc :as sql]
            [crypto.password.bcrypt :as password]
            [clj-facebook-graph.client :as fb]))

;; (def testt (with-facebook-auth {:access-token "CAAWkZBz0JjIwBAOvfzZB4BOQUcn9ClNWgHUd5zk9UdVL13Lfs4KBMIZAwX7RBLp8MYoi0iNhYRgjOhTCNKDpjks6ZAcp7wfHW5DsH6tDrZAHQ7XNChnpQMM8zNmCHM4YuvDcFB65Vrv6ZBkZApiIo9ChVa3fHwsgoYMWFZB4tKPzX9StIu2zlWtqdtsLf75TiAcUFhxcTMZBtoMCUw9u4ZAXbkxsCKAho3bGIZD"}
;;   (fb/get "https://graph.facebook.com/me")))

;; (:body testt)

(defn get-user
  "Gets a user from db by user-id."
  [db-conn type platform-id]
  (first (db/select db-conn
                    "users"
                    [:id
                     :email
                     :type
                     :password_hash
                     :phone_number]
                    (case type
                      "native" {:email platform-id}
                      "facebook" {:id (str "fb" platform-id)}
                      "google" {:id (str "g" platform-id)}
                      (throw (Exception. "Unknown user type."))))))

(defn auth-native
  [user auth-key]
  (password/check auth-key (:password_hash user)))

(defn auth-facebook
  [user auth-key]
  (let [fb-user (:body (with-facebook-auth {:access-token auth-key}
                         (fb/get "https://graph.facebook.com/me")))]
    (= (:id user)
       (str "fb" (:id fb-user)))))

(defn auth-google
  [user auth-key]
  true)

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

(defn login
  "Logs in user depeding on 'type' of user."
  [db-conn type platform-id auth-key]
  (let [user (get-user db-conn type platform-id)
        valid? (case (:type user)
                 "native" (auth-native user auth-key)
                 "facebook" (auth-facebook user auth-key)
                 "google" (auth-google user auth-key)
                 nil false
                 (throw (Exception. "Unknown user type!")))]
    (if valid?
      (init-session db-conn user)
      {:success false
       :message "Invalid login."})))

(defn add
  "Adds new user. Will fail if user_id is already being used."
  [db-conn user & {:keys [password]}]
  (db/insert db-conn
             "users"
             (if (= "native" (:type user))
               (assoc user :password_hash (password/encrypt password))
               user)))

;; (add (db/conn)
;;      {:id "1234"
;;       :email "elwell.christopher@gmail.com"
;;       :type "native"
;;       :phone_number "484-682-3011"}
;;      :password "yoyo")


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
