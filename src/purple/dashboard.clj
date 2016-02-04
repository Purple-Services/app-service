(ns purple.dashboard
  (:require [purple.db :as db]
            [purple.util :as util]
            [purple.users :refer [valid-email? valid-password? auth-native?]]
            [crypto.password.bcrypt :as bcrypt]))

(def safe-authd-user-keys
  "The keys of a user map that are safe to send out to auth'd user."
  [:id :email :permissions])

(defn get-user
  "Gets a user from db. Optionally add WHERE constraints."
  [db-conn & {:keys [where]}]
  (first (db/!select db-conn "dashboard_users" ["*"] (merge {} where))))

(defn get-user-by-email
  "Gets a user from db by email address"
  [db-conn email]
  (get-user db-conn
            :where {:email email}))

(defn email-available?
  "Is there not a native account that is using this email address?"
  [db-conn email]
  (let [user (get-user-by-email db-conn email)]
    (empty? user)))

(defn get-permissions
  "Given a user id, return the permissions as a set"
  [db-conn user-id]
  (let [user (get-user db-conn :where {:id user-id})
        perms (:permissions user)]
    (if (not (nil? perms))
      (-> (:permissions user)
          (util/split-on-comma)
          set)
      (set nil))))

(defn- add
  "Add a new user with password"
  [db-conn user & {:keys [password]}]
  (db/!insert db-conn
           "dashboard_users"
           (assoc user :password_hash (bcrypt/encrypt password))))

(defn init-session
  [db-conn user client-ip]
  (let [token (util/new-auth-token)]
    (db/!insert db-conn
             "sessions"
             {:user_id (:id user)
              :token token
              :ip (or client-ip "")})
    {:success true
     :token token
     :user  (select-keys user safe-authd-user-keys)}))

(defn login
  "Given an email, password and client-ip, create a new session and return it"
  [db-conn email password client-ip]
  (let [user (get-user-by-email db-conn email)]
    (cond (nil? user)
          {:success false
           :message "Incorrect email / password combination."}
          (auth-native? user password)
          (init-session db-conn user client-ip)
          :else {:success false
           :message "Incorrect email / password combination."})))

(defn register
  "Register a new dashboard user"
  [db-conn email password client-ip]
  (cond (not (and (valid-email? email)
                  (email-available? db-conn email)))
        {:success false
         :message (str "Email Address is incorrectly formatted or is already"
                       " associated with an account")}
        (not (valid-password? password))
        {:success false
         :message "Password must be at least 6 characters"}
        (and (valid-email? email)
             (email-available? db-conn email)
             (valid-password? password))
        (do
          (add db-conn
               {:id (util/rand-str-alpha-num 20)
                :email email}
               :password password)
          (login db-conn email password client-ip))
        :else
        {:success false
         :message "An unknown error occurred"}))

(defn accessible-routes
  "Given a vector uri-permissions containing uri-perm maps, generate a set of
  uri / method maps that are accessible with the set user-permissions.

  A uri-perm map is of the form:
  {:uri route
   :permissions perms
   :method method}

  e.g.
  {:uri \"/dashboard/dash-map-couriers\"
   :permissions [\"view-orders\" \"view-couriers\" \"view-zones\"]
   :method \"GET\"
  }
  "
  [uri-permissions user-permissions]
  (let [user-has-permission? (fn [user-perms uri-perm]
                               (let [route-perm (:permissions uri-perm)
                                     perms-contained-list
                                     (map #(contains? user-perms %) route-perm)]
                                 (boolean (and (every? identity
                                                       perms-contained-list)
                                               (seq perms-contained-list)))))]
    (set (filter (comp not nil?)
                 (map #(if (user-has-permission? user-permissions %)
                         (select-keys % [:uri :method]))
                      uri-permissions)))))
