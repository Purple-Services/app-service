(ns purple.users
  (:use purple.util
        cheshire.core
        gapi.core
        clojure.walk
        [clojure.set :only [join]]
        [purple.db :only [conn !select !insert !update mysql-escape-str]])
  (:require [purple.config :as config]
            [purple.orders :as orders]
            [purple.coupons :as coupons]
            [purple.payment :as payment]
            [purple.sift :as sift]
            [ardoq.analytics-clj :as segment]
            [crypto.password.bcrypt :as bcrypt]
            [clj-http.client :as client]
            [clj-time.core :as time]
            [clj-time.coerce :as time-coerce]
            [clojure.string :as s]))

(def safe-authd-user-keys
  "The keys of a user map that are safe to send out to auth'd user."
  [:id :type :email :name :phone_number :referral_code
   :referral_gallons :is_courier])

(defn get-user
  "Gets a user from db. Optional add WHERE constraints."
  [db-conn & {:keys [where]}]
  (first (!select db-conn "users" ["*"] (merge {} where))))

(defn get-user-by-platform-id
  "Gets a user from db by user type and platform-id."
  [db-conn type platform-id]
  (get-user db-conn
            :where (merge {:type type}
                          (case type
                            "native" {:email platform-id}
                            "facebook" {:id (str "fb" platform-id)}
                            "google" {:id (str "g" platform-id)}
                            (throw (Exception. "Unknown user type."))))))

(defn get-user-by-id
  "Gets a user from db by user-id."
  [db-conn user-id]
  (get-user db-conn :where {:id user-id}))

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
  (get-user db-conn :where {:reset_key key}))

;; add some tests for this. I'm not convinced it will hold for every edge case
(defn id->type
  "Given a user id, get the type (native, facebook, google...)."
  [id]
  (cond (= (count id) 20) "native"
        (= "fb" (subs id 0 2)) "facebook"
        (= "g" (subs id 0 1)) "google"))

(defn include-user-data
  "Enrich a coll of maps that have :id's of users (e.g., couriers), with user
  data."
  [db-conn m]
  (join m
        (map #(select-keys % safe-authd-user-keys)
             (get-users-by-ids db-conn (map :id m)))
        {:id :id}))

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
    (segment/track segment-client (:id user) "Login")
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
  [db-conn user & {:keys [password client-ip]}]
  (let [referral-code (coupons/create-referral-coupon db-conn (:id user))
        result (!insert db-conn
                        "users"
                        (assoc (if (= "native" (:type user))
                                 (assoc user
                                        :password_hash
                                        (bcrypt/encrypt password))
                                 user)
                               :referral_code referral-code))]
    (when (:success result)
      (future
        (sift/create-account (select-keys user [:id :email :type]))
        ;; (.put segment/context "ip" (or "209.60.99.254" client-ip ""))
        (segment/identify segment-client (:id user)
                          {:email (:email user)
                           :referral_code referral-code

                           ;; todo fix this
                           ;; :createdAt (time-coerce/from-sql-time
                           ;;             (:timestamp_created %))

                           })
        (segment/track segment-client (:id user) "Sign Up")))
    result))

(defn login
  "Logs in user depending on 'type' of user."
  [db-conn type platform-id auth-key & {:keys [email-override client-ip]}]
  (let [user (get-user-by-platform-id db-conn type platform-id)]
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
                                  (do (only-prod
                                       (send-email
                                        {:to "chris@purpledelivery.com"
                                         :subject "Purple - Error"
                                         :body (str "Facebook user didn't provide email: "
                                                    (str "fb" (:id fb-user)))}))
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
                                (do (only-prod
                                     (send-email
                                      {:to "chris@purpledelivery.com"
                                       :subject "Purple - Error"
                                       :body (str "Google user didn't provide email: "
                                                  (str "g" (:id google-user)))}))
                                    (throw (Exception. "No email.")))))
                   (throw (Exception. "Invalid login.")))
                 :client-ip client-ip)
            (login db-conn type platform-id auth-key :client-ip client-ip)))
      (catch Exception e (case (.getMessage e)
                           "Invalid login." {:success false
                                             :message "Incorrect email / password combination."}
                           "No email." {:success false
                                        :message "You must provide access to your email address. Please contact us via the Feedback form, or use a different method to log in."}
                           {:success false
                            :message "Unknown error."})))))

(defn email-available?
  "Is there not a native account that is using this email address?"
  [db-conn email & {:keys [ignore-user-id]}]
  (let [user (get-user-by-platform-id db-conn "native" email)]
    (or (not user)
        (and ignore-user-id
             (= ignore-user-id (:id user))))))

(defn valid-email?
  "Syntactically valid email address?"
  [email]
  (boolean (re-matches #"^\S+@\S+\.\S+$" email)))

(defn valid-password?
  "Only for native users."
  [password]
  (boolean (re-matches #"^.{6,100}$" password)))

(defn valid-phone-number?
  "Given a phone-number string, check whether or not it is a valid phone number
  with a 10 digit code. Returns true if it is valid, false otherwise.
  See: http://stackoverflow.com/questions/16699007/regular-expression-to-match-standard-10-digit-phone-number/16699507#16699507
  for more information about the regex used"
  [phone-number]
  (boolean (re-matches #"^\+?[01]?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$"
                       phone-number)))

(defn valid-name?
  "Given a name, make sure that it has a space in it"
  [name]
  (boolean (re-find #"\s" name)))

(defn register
  "Only for native users."
  [db-conn platform-id auth-key & {:keys [client-ip]}]
  (if (and (valid-email? platform-id)
           (email-available? db-conn platform-id))
    (if (valid-password? auth-key)
      (do (add db-conn
               {:id (rand-str-alpha-num 20) ;; keep it 20!
                :email platform-id
                :type "native"}
               :password auth-key
               :client-ip client-ip)
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
  (do (segment/identify segment-client user-id
                        {:app_version app-version}) ;; TODO this is happening a lot
      (!update db-conn
               "users"
               (filter (comp not nil? val)
                       {:app_version app-version
                        :os os})
               {:id user-id})))

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
    (do (doto (select-keys record-map [:name :phone_number :gender :email])
          (#(!update db-conn "users" % {:id user-id}))
          (#(sift/update-account (assoc % :id user-id)))
          (#(segment/identify segment-client user-id
                              (conj {:name (:name %)
                                     :phone (:phone_number %)
                                     :gender (:gender %)}
                                    (when (:email %)
                                      [:email (:email %)])))))
        {:success true})
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
  (let [required-fields-present? (every? identity (map #(contains? record-map %)
                                                       required-vehicle-fields))
        required-fields-blank? (not
                                (and
                                 ;; all required fields must be present
                                 required-fields-present?
                                 ;; and none of the required fields are blank
                                 (every? identity
                                         (map (comp not s/blank?)
                                              (vals
                                               (select-keys
                                                record-map
                                                required-vehicle-fields))))))
        license-plate-blank? (s/blank? (:license_plate record-map))
        only-license-plate-blank? (and
                                   ;; are all fields other than license plate
                                   ;; present?
                                   (every? identity
                                           (map
                                            #(contains? record-map %)
                                            (remove
                                             #(= % :license_plate)
                                             required-vehicle-fields)))
                                   ;; are all fields besides license plate not
                                   ;; blank ?
                                   (every? identity
                                           (map
                                            (comp not s/blank?)
                                            (vals
                                             (-> record-map
                                                 (select-keys
                                                  required-vehicle-fields)
                                                 (dissoc :license_plate)))))
                                   ;; and the license plate is blank or missing
                                   license-plate-blank?)]
    (cond
      ;; the only required field that is missing is
      ;; the license pate
      only-license-plate-blank?
      {:success false
       :message (str "License Plate is a required field. If this is a new"
                     " vehicle without plates, write: NOPLATES. Vehicles"
                     " without license plates are ineligible for coupon"
                     " codes.")}
      required-fields-blank?
      {:success false
       :message "Required fields cannot be empty."}
      ;; license_plate is valid
      (valid-license-plate? (:license_plate record-map))
      (do (doto (assoc record-map
                       :id (rand-str-alpha-num 20)
                       :user_id user-id
                       :license_plate (clean-up-license-plate
                                       (:license_plate record-map))
                       :active 1)
            (#(!insert db-conn "vehicles" %))
            (#(segment/track segment-client user-id "Add Vehicle"
                             (assoc (select-keys % [:year :make :model
                                                    :color :gas_type
                                                    :license_plate])
                                    :vehicle_id (:id %)))))
          {:success true})
      ;; license_plate is invalid
      (not (valid-license-plate? (:license_plate record-map)))
      {:success false
       :message "Please enter a valid license plate."}
      ;; unknown error
      :else {:success false :message "Unknown error"})))

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
                        (when (payment/add-stripe-card customer-id stripe-token)
                          (payment/get-stripe-customer customer-id)))]
    (if customer-resp
      (do (segment/track segment-client user-id "Add Credit Card")
          (update-user-stripe-fields db-conn user-id customer-resp))
      {:success false
       :message "Sorry, we weren't able to get that card to work."})))

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
  (let [merge-unless-failed (fn [x y] (merge x (when (:success x) y)))]
    (unless-p :success
              (cond-> {:success true}
                (:user body)
                (merge-unless-failed
                 (let [user (update (:user body) :name s/trim)
                       phone-number (:phone_number user)
                       name (:name user)
                       email (:email user)]
                   (cond
                     (and name (not (valid-name? name)))
                     {:success false
                      :message "Please enter your full name."}
                     
                     (and phone-number (not (valid-phone-number? phone-number)))
                     {:success false
                      :message "Please enter a valid phone number."}

                     (and email
                          (or (not (valid-email? email))
                              (and (= (id->type user-id) "native")
                                   (not (email-available? db-conn
                                                          email
                                                          :ignore-user-id
                                                          user-id)))))
                     {:success false
                      :message "Email Address is incorrectly formatted or is already associated with an account."}

                     :else (update-user db-conn user-id user))))
                
                (:vehicle body)
                (merge-unless-failed
                 (let [vehicle (:vehicle body)]
                   (if (= "new" (:id vehicle))
                     (add-vehicle db-conn user-id vehicle)
                     (update-vehicle db-conn user-id vehicle))))
                
                (:card body)
                (merge-unless-failed
                 (let [card (:card body)]
                   (case (:action card)
                     "delete" (delete-card db-conn user-id (:id card))
                     "makeDefault" (set-default-card db-conn user-id (:id card))
                     nil (add-card db-conn user-id (:stripe_token card))))))
              (details db-conn user-id))))

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
  (let [user (get-user-by-platform-id db-conn "native" platform-id)]
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
    (if (valid-password? password)
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

(defn auth-charge-user
  "Charges user amount (an int in cents) using default payment method."
  [db-conn user-id order-id amount description]
  (let [u (get-user-by-id db-conn user-id)
        customer-id (:stripe_customer_id u)]
    (if (s/blank? customer-id)
      (do (only-prod
           (send-email
            {:to "chris@purpledelivery.com"
             :subject "Purple - Error"
             :body (str "Error authing charge on user, no payment method is set up.")}))
          {:success false})
      (payment/auth-charge-stripe-customer customer-id
                                           order-id
                                           amount
                                           description
                                           (:email u)))))

(defn unpaid-balance
  [db-conn user-id]
  (reduce +
          (map :total_price
               (!select db-conn
                        "orders"
                        [:total_price]
                        {:user_id user-id
                         :status "complete"
                         :paid 0}
                        :append "AND total_price > 0")))) ; $0 order = no charge

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
    (only-prod (send-sms (:phone_number user)
                         message))
    {:success true}))

(defn call-user
  "Calls user with automated message."
  [db-conn user-id call-url]
  (let [user (get-user-by-id db-conn user-id)]
    (make-call (:phone_number user)
               call-url)
    {:success true}))

(defn update-courier-zones!
  "Update the zones for courier with user-id"
  [db-conn user-id zones]
  (let [zones-assignment-set (try
                               ;; wrap in doall, otherwise Exception might not
                               ;; be caught
                               (doall (->> zones
                                           split-on-comma
                                           (map (comp #(Integer. %) s/trim))
                                           set))
                               (catch Exception e (str "Error")))
        existant-zones-set (set (map :id @@(resolve 'purple.dispatch/zones)))
        all-zones-exist? (every? identity
                                 (map #(contains? existant-zones-set %)
                                      zones-assignment-set))]
    (cond
      (s/blank? zones)
      (!update db-conn
               "couriers"
               {:zones zones}
               {:id user-id})
      (= zones-assignment-set "Error")
      {:success false
       :message "Incorrectly formatted zone assignment"}
      (not all-zones-exist?)
      {:success false
       :message "All zones in assignment must exist"}
      all-zones-exist?
      (!update db-conn
               "couriers"
               {:zones (s/join "," zones-assignment-set)}
               {:id user-id})
      :else {:success false
             :message "Unknown error"})))
