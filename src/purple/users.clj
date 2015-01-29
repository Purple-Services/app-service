(ns purple.users
  (:use cheshire.core
        gapi.core
        clojure.walk)
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
            [purple.orders :as orders]
            [crypto.password.bcrypt :as bcrypt]
            [clj-http.client :as client]
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
                     :phone_number
                     :name]
                    {:id user-id})))

(defn get-user-by-reset-key
  "Gets a user from db by user-id."
  [db-conn key]
  (first (db/select db-conn
                    "users"
                    [:id
                     :email
                     :type
                     :password_hash
                     :phone_number
                     :name]
                    {:reset_key key})))

(defn auth-native
  [user auth-key]
  (bcrypt/check auth-key (:password_hash user)))

(defn get-user-from-fb
  [auth-key]
  (-> (client/get (str "https://graph.facebook.com/me?access_token=" auth-key))
      :body
      parse-string
      keywordize-keys))

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

(defn get-users-vehicles
  "Gets all of a user's vehicles."
  [db-conn user-id]
  (db/select db-conn
             "vehicles"
             [:id
              :user_id
              :year
              :make
              :model
              :color
              :gas_type
              :license_plate
              :timestamp_created]
             {:user_id user-id
              :active 1}))

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
     :vehicles (into [] (get-users-vehicles db-conn (:id user)))
     :orders (into [] (orders/get-by-user db-conn (:id user)))
     :account_complete (not-any? (comp s/blank? str val)
                                 (select-keys user required-data))}))

(defn add
  "Adds new user. Will fail if user_id is already being used."
  [db-conn user & {:keys [password]}]
  (db/insert db-conn
             "users"
             (if (= "native" (:type user))
               (assoc user :password_hash (bcrypt/encrypt password))
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


(defn good-email
  "Only for native users."
  [db-conn email]
  (and (boolean (re-matches #"^\S+@\S+\.\S+$" email))
       (not (get-user db-conn "native" email))))

(defn good-password
  "Only for native users."
  [password]
  (boolean (re-matches #"^(?=.*\d).{7,30}$" password)))

(defn register
  "Only for native users."
  [db-conn platform-id auth-key]
  (if (good-email db-conn platform-id)
    (if (good-password auth-key)
      (do (add db-conn
               {:id (util/rand-str-alpha-num 20)
                :email platform-id
                :type "native"}
               :password auth-key)
          (login db-conn "native" platform-id auth-key))
      {:success false
       :message "Password must be at least 7 characters and contain a number."})
    {:success false
     :message "Email Address is incorrectly formatted or is already associated with an account."}))

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
     :user (select-keys user safe-authd-user-keys)
     :vehicles (into [] (get-users-vehicles db-conn user-id))
     :orders (into [] (orders/get-by-user db-conn user-id))}
    {:success false
     :message "User could not be found."})))

(defn update-user
  "The user-id given is assumed to have been auth'd already."
  [db-conn user-id record-map]
  (db/update db-conn
             "users"
             (select-keys record-map
                          [:name
                           :phone_number
                           :gender])
             {:id user-id}))

(defn add-vehicle
  "The user-id given is assumed to have been auth'd already."
  [db-conn user-id record-map]
  (db/insert db-conn
             "vehicles"
             (assoc record-map
               :id (util/rand-str-alpha-num 20)
               :user_id user-id)))

(defn update-vehicle
  "The user-id given is assumed to have been auth'd already."
  [db-conn user-id record-map]
  (db/update db-conn
             "vehicles"
             record-map
             {:id (:id record-map)
              :user_id user-id}))

(defn edit
  "The user-id given is assumed to have been auth'd already."
  [db-conn user-id body]
  (do (when (not (nil? (:user body)))
        (update-user db-conn user-id (:user body)))
      (when (not (nil? (:vehicle body)))
        (if (= "new" (:id (:vehicle body)))
          (add-vehicle db-conn user-id (:vehicle body))
          (update-vehicle db-conn user-id (:vehicle body))))
      (details db-conn user-id)))

(defn forgot-password
  "Only for native accounts; platform-id is email address."
  [db-conn platform-id]
  (let [user (get-user db-conn "native" platform-id)]
    (if user
      (let [reset-key (util/rand-str-alpha-num 22)]
        (db/update db-conn
                   "users"
                   {:reset_key reset-key}
                   {:id (:id user)})
        (util/send-email {:from "purpleservicesfeedback@gmail.com" ;; TODO noreply@purple.com
                          :to platform-id
                          :subject "Purple Account - Reset Password"
                          :body (str "Hello " (:name user) ","
                                     "\n\nPlease click the link below to reset "
                                     "your password:"
                                     "\n\n"
                                     "http://purple-dev.elasticbeanstalk.com/"
                                     "user/reset-password/" reset-key
                                     "\n\nThanks,"
                                     "\nPurple")})
        {:success true
         :message (str "An email has been sent to "
                       platform-id
                       ". Please click the link included in "
                       "that message to reset your password.")})
      {:success false
       :message "Sorry, that email address does not have an account on Purple."})))

(defn change-password
  "Only for native accounts."
  [db-conn reset-key password]
  (db/update db-conn
             "users"
             {:password_hash (bcrypt/encrypt password)
              :reset_key ""}
             {:reset_key reset-key}))

(defn send-invite
  [db-conn email-address & {:keys [user_id]}]
  (util/send-email (merge {:from "purpleservicesfeedback@gmail.com"
                           :to email-address}
                          (if (not (nil? user_id))
                            (let [user (get-user-by-id db-conn user_id)]
                              {:subject (str (:name user) " Invited You to Purple")
                               :body "Check out Purple app..."}) ;; TODO
                            {:subject "Invitation to Purple"
                             :body "Check out Purple app..."}))))
