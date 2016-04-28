(ns app.coupons
  (:require [common.config :as config]
            [common.coupons :refer [gen-coupon-code
                                    get-coupon-by-code
                                    get-license-plate-by-vehicle-id
                                    mark-code-as-unused mark-gallons-as-used
                                    mark-gallons-as-unused
                                    apply-referral-bonus]]
            [common.db :refer [!select !insert mysql-escape-str]]
            [common.util :refer [in? rand-str-alpha-num split-on-comma]]
            [clojure.string :as s]))

(defn is-owner?
  "Is user-id the owner of this coupon?"
  [c user-id]
  (= (:owner_user_id c) user-id))

(defn used-by-license-plate?
  "Has this coupon been used by this license plate?"
  [c license-plate]
  (-> (:used_by_license_plates c)
      split-on-comma
      (in? license-plate)))

(defn used-by-user-id?
  "Has this coupon been used by this user ID?"
  [c user-id]
  (-> (:used_by_user_ids c)
      split-on-comma
      (in? user-id)))

(defn num-uses
  "How many times has this coupon been used?"
  [c]
  (-> (:used_by_user_ids c)
      split-on-comma
      (#(filter (complement s/blank?) %))
      count))

(defn under-max-uses?
  "Has this coupon been used less than the maximum number of times?"
  [c]
  (< (num-uses c) (:max_uses c)))

(defn has-ordered?
  "Has this license plate or user-id been used in a past order?"
  [db-conn license-plate user-id]
  (seq (!select db-conn "orders" [:id] {}
                :custom-where
                (str "(license_plate = \""
                     (mysql-escape-str license-plate)
                     "\" OR user_id = \""
                     (mysql-escape-str user-id)
                     "\") AND status != \"cancelled\""))))

(defn valid-zip-code?
  "Can this coupon code be used in this zip-code?"
  [c zip-code]
  (if (s/blank? (:zip_codes c))
    true ;; blank means: any zip code is okay
    (-> (:zip_codes c)
        split-on-comma
        (in? zip-code))))

(defn code->value
  "Get the value for a coupon code contextualized by user and vehicle choice."
  [db-conn code vehicle-id user-id zip-code & {:keys [bypass-zip-code-check]}]
  (let [coupon (get-coupon-by-code db-conn code)
        license-plate (get-license-plate-by-vehicle-id db-conn vehicle-id)]
    (cond
      (not (and coupon license-plate))
      {:success false
       :message "Sorry, that code is invalid."
       :value 0}

      (and (not bypass-zip-code-check)
           (not (valid-zip-code? coupon zip-code)))
      {:success false
       :message "Sorry, that coupon code cannot be used in this zip code."
       :value 0}

      (or (< (:expiration_time coupon) (quot (System/currentTimeMillis) 1000))
          (not (under-max-uses? coupon)))
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

(defn is-code-available?
  [db-conn code]
  (empty? (doall (!select db-conn "coupons" [:id] {:code code}))))

;; this could be faster if just tried the insert and then retried if failing
;; on duplicate unique key: code
(defn create-referral-coupon
  "Creates a new referral coupon and returns its code."
  [db-conn user-id]
  (let [code (->> (repeatedly gen-coupon-code)
                  (filter (partial is-code-available? db-conn))
                  first)]
    (!insert db-conn "coupons" {:id (rand-str-alpha-num 20)
                                :code code
                                :type "referral"
                                :value 0
                                :owner_user_id user-id
                                :expiration_time 1999999999})
    code))
