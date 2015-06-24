(ns purple.coupons
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
            [clojure.java.jdbc :as sql]
            [clojure.string :as s]))

(defn code->value
  "Get the value for a coupon code."
  [db-conn code vehicle-id user-id]
  (let [coupon (first (db/select db-conn
                                 "coupons"
                                 ["*"]
                                 {:code code}))

        license-plate (some-> (db/select db-conn
                                         "vehicles"
                                         ["license_plate"]
                                         {:id vehicle-id})
                              first
                              :license_plate)

        is-owner?
        (fn [coupon user-id]
          (= (:owner_user_id coupon)
             user-id))
        
        never-used-on-license-plate?
        (fn [coupon license-plate]
          (not (util/in? (util/split-on-comma
                          (:used_by_license_plates coupon))
                         license-plate)))

        never-used-by-user-id?
        (fn [coupon user-id]
          (not (util/in? (util/split-on-comma
                          (:used_by_user_ids coupon))
                         user-id)))

        never-ordered? ;; neither license plate nor user id is associated with an order
        (fn [db-conn license-plate user-id]
          (empty? (db/select db-conn
                             "orders"
                             [:id]
                             {}
                             :custom-where
                             (str "(license_plate = \""
                                  license-plate
                                  "\" OR user_id = \""
                                  user-id
                                  "\") AND status != \"cancelled\""))))]
    (if (and coupon license-plate)
      (if (> (:expiration_time coupon)
             (quot (System/currentTimeMillis) 1000))
        (if (not (is-owner? coupon user-id))
          (if (and (never-used-on-license-plate? coupon license-plate)
                   (never-used-by-user-id? coupon user-id))
            (if (or (not (:only_for_first_orders coupon))
                    (never-ordered? db-conn license-plate user-id))
              (case (:type coupon)
                "standard" {:success true
                            :value (:value coupon)}
                "referral" {:success true
                            :value config/referral-referred-value})
              {:success false
               :message "Sorry, that code is only for a first-time order."
               :value 0})
            {:success false
             :message "Sorry, you have already used that code."
             :value 0})
          {:success false
           :message "Sorry, you cannot use your own coupon code. Send it to your friends to earn free gallons!"
           :value 0})
        {:success false
         :message "Sorry, that code is expired."
         :value 0})
      {:success false
       :message "Sorry, that code is invalid."
       :value 0})))

(defn mark-code-as-used
  [db-conn code license-plate user-id]
    (sql/with-connection db-conn
      (sql/do-prepared
       (str "UPDATE coupons SET "
            "used_by_license_plates = CONCAT(used_by_license_plates, '"
            license-plate "', ','), "
            "used_by_user_ids = CONCAT(used_by_user_ids, '"
            user-id "', ',') "
            " WHERE code = '" code "'"))))

(defn mark-code-as-unused
  [db-conn code vehicle-id user-id]
  (let [license-plate (some-> (db/select db-conn
                                         "vehicles"
                                         ["license_plate"]
                                         {:id vehicle-id})
                              first
                              :license_plate)
        coupon (first (db/select db-conn
                                 "coupons"
                                 ["*"]
                                 {:code code}))
        used-by-license-plates (set (util/split-on-comma
                                     (:used_by_license_plates coupon)))
        used-by-user-ids (set (util/split-on-comma
                               (:used_by_user_ids coupon)))]
    (sql/with-connection db-conn
      (sql/do-prepared
       (str "UPDATE coupons SET "
            "used_by_license_plates = '"
            (s/join "," (disj used-by-license-plates license-plate))
            "', used_by_user_ids = '"
            (s/join "," (disj used-by-user-ids user-id))
            "' WHERE code = '" code "'")))))

(defn mark-gallons-as-used
  [db-conn user-id gallons]
  (sql/with-connection db-conn
    (sql/do-prepared
     (str "UPDATE users SET referral_gallons = referral_gallons - "
          gallons
          " WHERE id = '" user-id "'"))))

(defn mark-gallons-as-unused
  [db-conn user-id gallons]
  (sql/with-connection db-conn
    (sql/do-prepared
     (str "UPDATE users SET referral_gallons = referral_gallons + "
          gallons
          " WHERE id = '" user-id "'"))))

(defn apply-referral-bonus
  [db-conn code]
  (when (not (s/blank? code))
    (let [user (first (db/select db-conn
                                 "users"
                                 [:id]
                                 {:referral_code code}))
          user-id (:id user)]
      (sql/with-connection db-conn
        (sql/do-prepared
         (str "UPDATE users SET referral_gallons = referral_gallons + "
              config/referral-referrer-gallons
              " WHERE id = '" user-id "'")))
      ((resolve 'purple.users/send-push) db-conn user-id
       (str "Thanks for sharing Purple with your friend! We've gone ahead and added "
            config/referral-referrer-gallons
            " gallons to your account!")))))

(defn is-code-available?
  [db-conn code]
  (empty? (db/select db-conn
                     "coupons"
                     ["*"]
                     {:code code})))

(defn create-standard-coupon
  [db-conn code value expiration-time]
  (if (is-code-available? db-conn (s/upper-case code))
    (db/insert db-conn "coupons" {:id (util/rand-str-alpha-num 20)
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
    (let [code (util/gen-coupon-code)]
      (if (is-code-available? db-conn code)
        (do (db/insert db-conn "coupons" {:id (util/rand-str-alpha-num 20)
                                          :code code
                                          :type "referral"
                                          :value 0
                                          :owner_user_id user-id
                                          :expiration_time 1999999999})
            code)
        (recur)))))





;; Run this to set up license plate for all existing orders
(#_(let [orders (db/select (db/conn)
                           "orders"
                           ["*"]
                           {})]
     (doseq [o orders]
       (let [license-plate (:license_plate (first (db/select (db/conn)
                                                             "vehicles"
                                                             ["license_plate"]
                                                             {:id (:vehicle_id o)})))]
         (db/update (db/conn)
                    "orders"
                    {:license_plate license-plate}
                    {:id (:id o)})))))

;; Run this to set up all existing users with a new referral code
(#_(let [users (db/select (db/conn)
                          "users"
                          ["*"]
                          {})]
     (doseq [u users]
       (let [code (create-referral-coupon (db/conn) (:id u))]
         (db/update (db/conn)
                    "users"
                    {:referral_code code}
                    {:id (:id u)})))))

;(create-referral-coupon (db/conn))
