(ns purple.users
  (:use purple.util
        cheshire.core
        gapi.core
        clojure.walk
        [purple.db :only [conn !select !insert !update mysql-escape-str]])
  (:require [purple.config :as config]
            [purple.orders :as orders]
            [purple.coupons :as coupons]
            [purple.payment :as payment]
            [crypto.password.bcrypt :as bcrypt]
            [clj-http.client :as client]
            [clojure.string :as s]))

(def safe-authd-user-keys
  "Keys of a user map that are safe to send out to auth'd user."
  [:id :type :email :name :phone_number :referral_code :referral_gallons :is_courier])

(defn get-user
  "Gets a user from db by type and platform-id. Some fields unsafe for output."
  [db-conn type platform-id]
  (first (!select db-conn
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
  (first (!select db-conn
                  "users"
                  ["*"]
                  {:id user-id})))

(defn get-users-by-ids
  "Gets multiple users by a list of ids."
  [db-conn ids]
  (if (seq ids)
    (!select db-conn
             "users"
             ["*"]
             {}
             :custom-where
             (str "id IN (\""
                  (->> ids
                       (map mysql-escape-str)
                       (interpose "\",\"")
                       (apply str))
                  "\")"))
    []))

(defn get-user-by-reset-key
  "Gets a user from db by reset_key (for password reset)."
  [db-conn key]
  (first (!select db-conn
                  "users"
                  [:id
                   :email
                   :type
                   :password_hash
                   :phone_number
                   :name]
                  {:reset_key key})))

(defn auth-native?
  "Is password correct for this user map?"
  [user auth-key]
  (bcrypt/check auth-key (:password_hash user)))

(defn get-user-from-fb
  "Get the Facebook user data from Facebook's Graph based on given acess token."
  [auth-key]
  (-> (client/get (str "https://graph.facebook.com/me?access_token=" auth-key))
      :body
      parse-string
      keywordize-keys))

(defn auth-facebook?
  "Is this auth-key associated with the Facebook user ID'd in this user map?"
  [user auth-key]
  (= (:id user)
     (str "fb" (:id (get-user-from-fb auth-key)))))

(def google-plus-service
  (build "https://www.googleapis.com/discovery/v1/apis/plus/v1/rest"))

(defn get-user-from-google
  "Get the Google user data from Google Plus based on given token."
  [auth-key]
  (call (atom {:token auth-key})
        google-plus-service
        "plus.people/get"
        {"userId" "me"}))

(defn auth-google?
  "Is this auth-key associated with the Google user ID'd in this user map?"
  [user auth-key]
  (= (:id user)
     (str "g" (:id (get-user-from-google auth-key)))))

(def required-data
  "These keys cannot be empty for an account to be considered complete."
  [:id :type :email :name :phone_number])

(defn get-users-vehicles
  "Gets all of a user's vehicles."
  [db-conn user-id]
  (!select db-conn
           "vehicles"
           [:id :user_id :year :make :model :color :gas_type :license_plate
            :photo :timestamp_created]
           {:user_id user-id
            :active 1}))

(defn get-users-cards
  "We cache the card info as JSON in the stripe_cards column."
  [user]
  (let [default-card (:stripe_default_card user)]
    (map #(assoc % :default (= default-card (:id %)))
         (keywordize-keys (parse-string (:stripe_cards user))))))

(defn init-session
  [db-conn user & {:keys [client-ip]}]
  (let [token (new-auth-token)]
    (!insert db-conn
             "sessions"
             {:user_id (:id user)
              :token token
              :ip (or client-ip "")})
    {:success true
     :token token
     :user (assoc (select-keys user safe-authd-user-keys)
             :has_push_notifications_set_up (not (s/blank? (:arn_endpoint user))))
     :vehicles (into [] (get-users-vehicles db-conn (:id user)))
     :orders (into [] (if (:is_courier user)
                        (orders/get-by-courier db-conn (:id user))
                        (orders/get-by-user db-conn (:id user))))
     :cards (into [] (get-users-cards user))
     :account_complete (not-any? (comp s/blank? str val)
                                 (select-keys user required-data))}))

(defn add
  "Adds new user. Will fail if user_id is already being used."
  [db-conn user & {:keys [password]}]
  (let [result (!insert db-conn
                        "users"
                        (assoc (if (= "native" (:type user))
                                 (assoc user :password_hash (bcrypt/encrypt password))
                                 user)
                               :referral_code (coupons/create-referral-coupon db-conn
                                                                              (:id user))))]
    (future
      (send-email ;; debugging purposes, "why sometimes 100's of calls..."
       {:to "chris@purpledelivery.com"
        :subject "Purple - users/add caleld"
        :body (str user
                   "\nResult:\n"
                   result)}))
    result))

(defn login
  "Logs in user depeding on 'type' of user."
  [db-conn type platform-id auth-key & {:keys [email-override client-ip]}]
  (let [user (get-user db-conn type platform-id)]
    (try
      (if user
        (if (case (:type user)
              "native" (auth-native? user auth-key)
              "facebook" (auth-facebook? user auth-key)
              "google" (auth-google? user auth-key)
              nil false
              (throw (Exception. "Unknown user type!")))
          (init-session db-conn user :client-ip client-ip)
          (throw (Exception. "Invalid login.")))
        (do (add db-conn
                 (case type
                   "facebook" (let [fb-user (get-user-from-fb auth-key)]
                                (if (:email fb-user) 
                                  {:id (str "fb" (:id fb-user))
                                   :email (:email fb-user)
                                   :name (:name fb-user)
                                   :gender (:gender fb-user)
                                   :type "facebook"}
                                  (do (send-email
                                       {:to "chris@purpledelivery.com"
                                        :subject "Purple - Error"
                                        :body (str "Facebook user didn't provide email: "
                                                   (str "fb" (:id fb-user)))})
                                      (throw (Exception. "No email.")))))
                   "google" (let [google-user (get-user-from-google auth-key)
                                  authd-email (-> (:emails google-user)
                                                  first
                                                  :value)
                                  email (or authd-email
                                            email-override)]
                              (if email
                                {:id (str "g" (:id google-user))
                                 :email email
                                 :name (:displayName google-user)
                                 :gender (:gender google-user)
                                 :type "google"}
                                (do (send-email
                                     {:to "chris@purpledelivery.com"
                                      :subject "Purple - Error"
                                      :body (str "Google user didn't provide email: "
                                                 (str "g" (:id google-user)))})
                                    (throw (Exception. "No email.")))))
                   (throw (Exception. "Invalid login."))))
            (login db-conn type platform-id auth-key :client-ip client-ip)))
      (catch Exception e (case (.getMessage e)
                           "Invalid login." {:success false
                                             :message "Incorrect email / password combination."}
                           "No email." {:success false
                                        :message "You must provide access to your email address. Please contact us via the Feedback form, or use a different method to log in."}
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
  (boolean (re-matches #"^.{6,100}$" password)))

(defn register
  "Only for native users."
  [db-conn platform-id auth-key & {:keys [client-ip]}]
  (if (good-email db-conn platform-id)
    (if (good-password auth-key)
      (do (add db-conn
               {:id (rand-str-alpha-num 20)
                :email platform-id
                :type "native"}
               :password auth-key)
          (login db-conn "native" platform-id auth-key :client-ip client-ip))
      {:success false
       :message "Password must be at least 6 characters."})
    {:success false
     :message "Email Address is incorrectly formatted or is already associated with an account."}))

(defn valid-session?
  [db-conn user-id token]
  (let [session (!select db-conn
                         "sessions"
                         [:id
                          :timestamp_created]
                         {:user_id user-id
                          :token token})]
    (if (seq session)
      true
      false)))

(defn update-user-metadata
  [db-conn user-id app-version os]
  (!update db-conn
           "users"
           (filter (comp not nil? val)
                   {:app_version app-version
                    :os os})
           {:id user-id}))

(defn details
  [db-conn user-id & {:keys [user-meta]}]
  (if-let [user (get-user-by-id db-conn user-id)]
    (do (when (and user-meta
                   (or (not= (:app_version user-meta) (:app_version user))
                       (not= (:os user-meta) (:os user))))
          (update-user-metadata db-conn
                                user-id
                                (:app_version user-meta)
                                (:os user-meta)))
        {:success true
         :user (assoc (select-keys user safe-authd-user-keys)
                 :has_push_notifications_set_up (not (s/blank? (:arn_endpoint user))))
         :vehicles (into [] (get-users-vehicles db-conn user-id))
         :orders (into [] (if (:is_courier user)
                            (orders/get-by-courier db-conn (:id user))
                            (orders/get-by-user db-conn (:id user))))
         :cards (into [] (get-users-cards user))
         :system {:referral_referred_value config/referral-referred-value
                  :referral_referrer_gallons config/referral-referrer-gallons}})
    {:success false
     :message "User could not be found."}))

(defn update-user
  "The user-id given is assumed to have been auth'd already."
  [db-conn user-id record-map]
  (if (not-any? (comp s/blank? str val)
                (select-keys record-map required-data))
    (!update db-conn
             "users"
             (select-keys record-map
                          [:name
                           :phone_number
                           :gender])
             {:id user-id})
    {:success false
     :message "Required fields cannot be empty."}))

(def required-vehicle-fields
  [:year :make :model :color :gas_type :license_plate])

(defn valid-license-plate?
  [x]
  (boolean (re-find #"^[a-zA-Z\d\-\s]+$" x)))

(defn clean-up-license-plate
  [x]
  (s/upper-case (s/replace x #"[\-\s]" "")))

(defn add-vehicle
  "The user-id given is assumed to have been auth'd already."
  [db-conn user-id record-map]
  (if (not-any? (comp s/blank? str val)
                (select-keys record-map required-vehicle-fields))
    (if (valid-license-plate? (:license_plate record-map))
      (!insert db-conn
               "vehicles"
               (assoc record-map
                      :id (rand-str-alpha-num 20)
                      :user_id user-id
                      :license_plate (clean-up-license-plate
                                      (:license_plate record-map))
                      :active 1))
      {:success false
       :message "Please enter a valid license plate."})
    {:success false
     :message "Required fields cannot be empty."}))

(defn update-vehicle
  "The user-id given is assumed to have been auth'd already."
  [db-conn user-id record-map]
  (if (not-any? (comp s/blank? str val)
                (select-keys record-map required-vehicle-fields))
    (if (or (nil? (:license_plate record-map))
            (valid-license-plate? (:license_plate record-map)))
      (!update db-conn
               "vehicles"
               (if (nil? (:license_plate record-map))
                 record-map
                 (update-in record-map [:license_plate] clean-up-license-plate))
               {:id (:id record-map)
                :user_id user-id})
      {:success false
       :message "Please enter a valid license plate."})
    {:success false
     :message "Required fields cannot be empty."}))

(def cc-fields-to-keep [:id :last4 :brand])

(defn update-user-stripe-fields
  [db-conn user-id customer-resp]
  (!update db-conn
           "users"
           {:stripe_customer_id (:id customer-resp)
            :stripe_cards (->> customer-resp
                               :cards
                               :data
                               (map #(select-keys % cc-fields-to-keep))
                               generate-string)
            :stripe_default_card (:default_card customer-resp)}
           {:id user-id}))

(defn add-card
  "Add card. If user's first card, create Stripe customer object (+ card) instead."
  [db-conn user-id stripe-token]
  (let [user (get-user-by-id db-conn user-id)
        customer-id (:stripe_customer_id user)
        customer-resp (if (s/blank? customer-id)
                        (payment/create-stripe-customer user-id stripe-token)
                        (do (payment/add-stripe-card customer-id stripe-token)
                            (payment/get-stripe-customer customer-id)))]
    (update-user-stripe-fields db-conn user-id customer-resp)))

(defn delete-card
  [db-conn user-id card-id]
  (let [user (get-user-by-id db-conn user-id)
        customer-id (:stripe_customer_id user)
        customer-resp (do (payment/delete-stripe-card customer-id card-id)
                          (payment/get-stripe-customer customer-id))]
    (update-user-stripe-fields db-conn user-id customer-resp)))

(defn set-default-card
  [db-conn user-id card-id]
  (let [user (get-user-by-id db-conn user-id)
        customer-id (:stripe_customer_id user)
        customer-resp (payment/set-default-stripe-card customer-id card-id)]
    (update-user-stripe-fields db-conn user-id customer-resp)))

(defn edit
  "The user-id given is assumed to have been auth'd already."
  [db-conn user-id body]
  (let [resp (atom {:success true})]
    (when-not (nil? (:user body))
      (swap! resp merge
             (update-user db-conn user-id (:user body))))
    (when-not (nil? (:vehicle body))
      (swap! resp merge
             (if (= "new" (:id (:vehicle body)))
               (add-vehicle db-conn user-id (:vehicle body))
               (update-vehicle db-conn user-id (:vehicle body)))))
    (when-not (nil? (:card body))
      (swap! resp merge
             (case (:action (:card body))
               "delete" (delete-card db-conn user-id (:id (:card body)))
               "makeDefault" (set-default-card db-conn user-id (:id (:card body)))
               nil (add-card db-conn user-id (:stripe_token (:card body))))))
    (if (:success @resp)
      (details db-conn user-id)
      @resp)))


;; This can be simplified to remove the user lookup, once we are using the Live
;; APNS App ARN for both customer and courier accounts. However, currently the
;; courier accounts use the Sandbox App ARN since their app is downloaded through
;; PhoneGap Build, not the App Store.
;; 
;; For customers, this is normally called right after their first order is
;; requested. For couriers, this is called at the first time they log in as a
;; courier. That means, a new courier should create their account, log out,
;; have me mark them as courier in the database (is_courier), then log back in.
(defn add-sns
  "cred for APNS (apple) is the device token, for GCM (android) it is regid"
  [db-conn user-id push-platform cred]
  (let [user (get-user-by-id db-conn user-id)
        arn-endpoint (sns-create-endpoint sns-client
                                          cred
                                          user-id
                                          (case push-platform
                                            "apns" (if (:is_courier user)
                                                     config/sns-app-arn-apns-courier
                                                     config/sns-app-arn-apns)
                                            "gcm" config/sns-app-arn-gcm))]
    (!update db-conn
             "users"
             {:arn_endpoint arn-endpoint}
             {:id user-id})))

(defn forgot-password
  "Only for native accounts; platform-id is email address."
  [db-conn platform-id]
  (let [user (get-user db-conn "native" platform-id)]
    (if user
      (let [reset-key (rand-str-alpha-num 22)]
        (!update db-conn
                 "users"
                 {:reset_key reset-key}
                 {:id (:id user)})
        (send-email {:to platform-id
                     :subject "Purple Account - Reset Password"
                     :body (str "Hello " (:name user) ","
                                "\n\nPlease click the link below to reset "
                                "your password:"
                                "\n\n"
                                config/base-url
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
  (if-not (s/blank? reset-key) ;; <-- very important check, for security
    (if (good-password password)
      (!update db-conn
               "users"
               {:password_hash (bcrypt/encrypt password)
                :reset_key ""}
               {:reset_key reset-key})
      {:success false
       :message "Password must be at least 7 characters and contain a number."})
    {:success false
     :message "Error: Reset Key is blank."}))

(defn send-invite
  [db-conn email-address & {:keys [user_id]}]
  (send-email (merge {:to email-address}
                     (if-not (nil? user_id)
                       (let [user (get-user-by-id db-conn user_id)]
                         {:subject (str (:name user) " invites you to try Purple")
                          :body "Check out the Purple app; a gas delivery service. Simply request gas and we will come to your vehicle and fill it up. https://purpledelivery.com/download"})
                       {:subject "Invitation to Try Purple"
                        :body "Check out the Purple app; a gas delivery service. Simply request gas and we will come to your vehicle and fill it up. https://purpledelivery.com/download"}))))

(defn charge-user
  "Charges user amount (an int in cents) using default payment method."
  [db-conn user-id amount description]
  (let [u (get-user-by-id db-conn user-id)
        customer-id (:stripe_customer_id u)]
    (if (s/blank? customer-id)
      (do (send-email
           {:to "chris@purpledelivery.com"
            :subject "Purple - Error"
            :body (str "Error charging user, no payment method is set up.")})
          {:success true})
      (payment/charge-stripe-customer customer-id
                                      amount
                                      description
                                      (:email u)))))

(defn send-push
  "Sends a push notification to user."
  [db-conn user-id message]
  (let [user (get-user-by-id db-conn user-id)]
    (when-not (s/blank? (:arn_endpoint user))
      (sns-publish sns-client
                   (:arn_endpoint user)
                   message))
    {:success true}))

(defn text-user
  "Sends an SMS message to user."
  [db-conn user-id message]
  (let [user (get-user-by-id db-conn user-id)]
    (send-sms (:phone_number user)
              message)
    {:success true}))

(defn call-user
  "Calls user with automated message."
  [db-conn user-id call-url]
  (let [user (get-user-by-id db-conn user-id)]
    (make-call (:phone_number user)
               call-url)
    {:success true}))
