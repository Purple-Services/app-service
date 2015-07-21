(ns purple.coupons
  (:use purple.util)
  (:require [purple.config :as config]
            [purple.db :as db]
            [clojure.java.jdbc :as sql]
            [clojure.string :as s]))

(defn get-coupon-by-code
  [db-conn code]
  (first (db/select db-conn
                    "coupons"
                    ["*"]
                    {:code code})))

(defn get-license-plate-by-vehicle-id
  [db-conn vehicle-id]
  (some-> (db/select db-conn
                     "vehicles"
                     ["license_plate"]
                     {:id vehicle-id})
          first
          :license_plate))

(defn code->value
  "Get the value for a coupon code."
  [db-conn code vehicle-id user-id]
  (let [coupon (get-coupon-by-code db-conn code)
        license-plate (get-license-plate-by-vehicle-id db-conn vehicle-id)

        is-owner?
        (fn [coupon user-id]
          (= (:owner_user_id coupon)
             user-id))
        
        used-by-license-plate?
        (fn [coupon license-plate]
          (-> (:used_by_license_plates coupon)
              split-on-comma
              (in? license-plate)))

        used-by-user-id?
        (fn [coupon user-id]
          (-> (:used_by_user_ids coupon)
              split-on-comma
              (in? user-id)))

        has-ordered? ;; license-plate nor user-id is associated with an order
        (fn [db-conn license-plate user-id]
          (seq (db/select db-conn "orders" [:id] {}
                          :custom-where
                          (str "(license_plate = \""
                               (db/mysql-escape-str license-plate)
                               "\" OR user_id = \""
                               (db/mysql-escape-str user-id)
                               "\") AND status != \"cancelled\""))))]
    (cond
     (not (and coupon license-plate))
     {:success false
      :message "Sorry, that code is invalid."
      :value 0}

     (< (:expiration_time coupon) (quot (System/currentTimeMillis) 1000))
     {:success false
      :message "Sorry, that code is expired."
      :value 0}

     (is-owner? coupon user-id)
     {:success false
      :message "Sorry, you cannot use your own coupon code. Send it to your friends to earn free gallons!"
      :value 0}

     (or (used-by-license-plate? coupon license-plate)
         (used-by-user-id? coupon user-id))
     {:success false
      :message "Sorry, you have already used that code. (Or, your license plate may be invalid.)"
      :value 0}

     (and (:only_for_first_orders coupon)
          (has-ordered? db-conn license-plate user-id))
     {:success false
      :message "Sorry, that code is only for a first-time order. (Or, your license plate may be invalid.)"
      :value 0}

     :else
     (case (:type coupon)
       "standard" {:success true
                   :value (:value coupon)}
       "referral" {:success true
                   :value config/referral-referred-value}))))

(defn mark-code-as-used
  [db-conn code license-plate user-id]
  (sql/with-connection db-conn
    (sql/do-prepared
     (str "UPDATE coupons SET "
          "used_by_license_plates = CONCAT(used_by_license_plates, \""
          (db/mysql-escape-str license-plate) "\", ','), "
          "used_by_user_ids = CONCAT(used_by_user_ids, \""
          (db/mysql-escape-str user-id) "\", ',') "
          " WHERE code = \"" (db/mysql-escape-str code) "\""))))

(defn mark-code-as-unused
  [db-conn code vehicle-id user-id]
  (let [coupon (get-coupon-by-code db-conn code)
        license-plate (get-license-plate-by-vehicle-id db-conn vehicle-id)
        used-by-license-plates (-> (:used_by_license_plates coupon)
                                   split-on-comma
                                   set)
        used-by-user-ids (-> (:used_by_user_ids coupon)
                             split-on-comma
                             set)]
    (sql/with-connection db-conn
      (sql/do-prepared
       (str "UPDATE coupons SET "
            "used_by_license_plates = \""
            (s/join "," (disj used-by-license-plates
                              (db/mysql-escape-str license-plate)))
            "\", used_by_user_ids = \""
            (s/join "," (disj used-by-user-ids
                              (db/mysql-escape-str user-id)))
            "\" WHERE code = \"" (db/mysql-escape-str code) "\"")))))

(defn mark-gallons-as-used
  [db-conn user-id gallons]
  (sql/with-connection db-conn
    (sql/do-prepared
     (str "UPDATE users SET referral_gallons = referral_gallons - "
          (Integer. gallons)
          " WHERE id = \"" (db/mysql-escape-str user-id) "\""))))

(defn mark-gallons-as-unused
  [db-conn user-id gallons]
  (sql/with-connection db-conn
    (sql/do-prepared
     (str "UPDATE users SET referral_gallons = referral_gallons + "
          (Integer. gallons)
          " WHERE id = \"" (db/mysql-escape-str user-id) "\""))))

(defn apply-referral-bonus
  [db-conn code]
  (when (not (s/blank? code))
    (let [user-id (-> (db/select db-conn "users" [:id] {:referral_code code})
                      first
                      :id)]
      (sql/with-connection db-conn
        (sql/do-prepared
         (str "UPDATE users SET referral_gallons = referral_gallons + "
              (Integer. config/referral-referrer-gallons)
              " WHERE id = \"" (db/mysql-escape-str user-id) "\"")))
      ((resolve 'purple.users/send-push) db-conn user-id
       (str "Thanks for sharing Purple with your friend! We've gone ahead and added "
            config/referral-referrer-gallons
            " gallons to your account!")))))

(defn is-code-available?
  [db-conn code]
  (empty? (db/select db-conn "coupons" [:id] {:code code})))

(defn create-standard-coupon
  [db-conn code value expiration-time]
  (if (is-code-available? db-conn (s/upper-case code))
    (db/insert db-conn "coupons" {:id (rand-str-alpha-num 20)
                                  :code (s/upper-case code)
                                  :type "standard"
                                  :value value
                                  :expiration_time expiration-time})
    {:success false
     :message "Sorry, that code is already being used."}))

(defn create-referral-coupon
  "Creates a new referral coupon and returns its code."
  [db-conn user-id]
  (loop []
    (let [code (gen-coupon-code)]
      (if (is-code-available? db-conn code)
        (do (db/insert db-conn "coupons" {:id (rand-str-alpha-num 20)
                                          :code code
                                          :type "referral"
                                          :value 0
                                          :owner_user_id user-id
                                          :expiration_time 1999999999})
            code)
        (recur)))))
