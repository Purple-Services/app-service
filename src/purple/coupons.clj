(ns purple.coupons
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
            [clojure.java.jdbc :as sql]
            [clojure.string :as s]))

;; To determine the value of a coupon code, first we check to see if it is a
;; standard coupon code (as opposed to a referral code). If it is not listed
;; as a standard coupon code, then we see if it matches any user's referral
;; code.
;; After we determine what standard coupon or referring user this code is for,
;; we then determine if this code has been used on the specificied license plate
;; before. If it hasn't been used for that license plate, then it's good.

(defn code->value
  "Get the value for a coupon code."
  [db-conn code vehicle-id]
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
        
        never-used-on-license-plate?
        (fn [coupon license-plate]
          (not (util/in? (util/split-on-comma
                          (:used_by_license_plates coupon))
                         license-plate)))

        license-plate-never-ordered?
        (fn [db-conn license-plate]
          (empty? (db/select db-conn
                             "orders"
                             [:id]
                             {}
                             :custom-where
                             (str "license_plate = \""
                                  license-plate
                                  "\" AND status != \"cancelled\""))))]
    (if (and coupon license-plate)
      (if (> (:expiration_time coupon)
             (quot (System/currentTimeMillis) 1000))
        (if (never-used-on-license-plate? coupon license-plate)
          (if (or (not (:only_for_first_orders coupon))
                  (license-plate-never-ordered? db-conn license-plate))
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
         :message "Sorry, that code is expired."
         :value 0})
      {:success false
       :message "Sorry, that code is invalid."
       :value 0})))

(defn mark-code-as-used
  [db-conn code vehicle-id]
  (let [license-plate (some-> (db/select db-conn
                                         "vehicles"
                                         ["license_plate"]
                                         {:id vehicle-id})
                              first
                              :license_plate)]
    (sql/with-connection db-conn
      (sql/do-prepared
       (str "UPDATE coupons SET "
            "used_by_license_plates = CONCAT(used_by_license_plates, '"
            license-plate "', ',') WHERE code = '" code "'")))))

(defn mark-code-as-unused
  [db-conn code vehicle-id]
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
                                     (:used_by_license_plates coupon)))]
    (sql/with-connection db-conn
      (sql/do-prepared
       (str "UPDATE coupons SET "
            "used_by_license_plates = '"
            (s/join "," (disj used-by-license-plates license-plate))
            "' WHERE code = '" code "'")))))

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
  [db-conn]
  (loop []
    (let [code (util/rand-str-alpha-num-only-upper 5)]
      (if (is-code-available? db-conn code)
        (do (db/insert db-conn "coupons" {:id (util/rand-str-alpha-num 20)
                                          :code code
                                          :type "referral"
                                          :value 0
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
       (let [code (create-referral-coupon (db/conn))]
         (db/update (db/conn)
                    "users"
                    {:referral_code code}
                    {:id (:id u)})))))

;(create-referral-coupon (db/conn))
