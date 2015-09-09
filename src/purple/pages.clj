(ns purple.pages
  (:use purple.util
        [purple.db :only [conn !select !insert !update mysql-escape-str]]
        net.cgrand.enlive-html
        :reload)
  (:require [purple.users :as users]
            [purple.orders :as orders]
            [purple.config :as config]
            [clojure.string :as s]))

(deftemplate index-template "templates/index.html"
  [x]
  [:title] (content (:title x))
  [:#heading] (content (:heading x))
  [:#intro] (content (:intro x)))

(defn not-found-page []
  (apply str (index-template {:heading "Page Not Found"
                              :intro "Sorry, that page could not be found."})))

(deftemplate home-template "templates/home.html"
  [x]
  [:title] (content (:title x)))

(defn home []
  (apply str (home-template {:title "Purple App - On-Demand Gas Delivery"})))

(deftemplate reset-password-template "templates/reset-password.html"
  [x]
  [:title] (content (:title x))
  [:#config] (set-attr :data-base-url (:base-url x))
  [:#heading] (content (:heading x))
  [:#email] (content (:email x))
  [:#key] (set-attr :value (:key x))
  )

(defn reset-password [db-conn key]
  (let [user (users/get-user-by-reset-key db-conn key)]
    (if user
      (apply str (reset-password-template {:title "Purple - Reset Password"
                                           :base-url config/base-url
                                           :heading "Reset Password"
                                           :email (:email user)
                                           :key key}))
      (not-found-page))))

(deftemplate terms-template "templates/terms.html"
  [x]
  [:title] (content (:title x)))

(defn terms []
  (apply str (terms-template {:title "Terms of Service"})))


(deftemplate dashboard-template "templates/dashboard.html"
  [x]
  [:title] (content (:title x))

  [:#config] (set-attr :data-base-url (:base-url x))

  [:#last-updated] (content (str "Last Updated: "
                                 (unix->full (quot (System/currentTimeMillis)
                                                   1000))))

  [:#couriers :tbody :tr]
  (clone-for [t (:couriers x)]
             [:td.connected]
             (do-> (if (:connected t)
                     (add-class "currently-connected")
                     (add-class "currently-not-connected"))
                   (content (if (:connected t) "Yes" "No")))

             [:td.name]
             (content (:name t))

             [:td.busy]
             (content (if (:busy t) "Yes" "No"))

             [:td.lateness]
             (content (let [orders (filter #(and (= (:courier_id %)
                                                    (:id t))
                                                 (= (:status %)
                                                    "complete"))
                                           (:orders x))
                            total (count orders)
                            late (count (filter :was-late orders))]
                        (if (pos? total)
                          (str (format "%.0f"
                                       (float (- 100
                                                 (* (/ late
                                                       total)
                                                    100))))
                               "%")
                          "No orders.")))
             
             [:td.zones]
             (content (:zones t))
             
             [:td.location :a]
             (content "View On Map")
             [:td.location :a]
             (set-attr :href (str "https://maps.google.com/?q="
                                  (:lat t)
                                  ","
                                  (:lng t))))
  
  [:#orders :tbody :tr]
  (clone-for [t (:orders x)]
             [:td.status]
             (do-> (if (:was-late t)
                     (add-class "late")
                     (add-class "not-late"))
                   (content (:status t)))

             [:td.courier_name]
             (content (:courier_name t))

             [:td.target_time_start]
             (content (unix->full (:target_time_start t)))

             [:td.target_time_end]
             (content (unix->full (:target_time_end t)))

             [:td.customer_name]
             (content (:customer_name t))
             
             [:td.address_street :a]
             (content (:address_street t))
             [:td.address_street :a]
             (set-attr :href (str "https://maps.google.com/?q="
                                  (:lat t)
                                  ","
                                  (:lng t)))
             
             [:td.gallons]
             (content (str (:gallons t)))

             [:td.octane]
             (content (str (:gas_type (:vehicle t))))

             [:td.license_plate]
             (content (str (:license_plate (:vehicle t))))

             [:td.coupon_code]
             (content (str (:coupon_code t)))
             
             [:td.total_price]
             (do-> (if (and (not (:paid t))
                            (= (:status t) "complete")
                            (not= 0 (:total_price t)))
                     (add-class "late") ;; Payment failed!
                     (add-class "not-late"))
                   (content (str "$" (cents->dollars (:total_price t))))))

  
  [:#users :tbody :tr] (clone-for [t (:users x)]
                                  [:td.name]
                                  (content (:name t))

                                  [:td.email]
                                  (content (:email t))

                                  [:td.phone_number]
                                  (content (:phone_number t))

                                  [:td.has_added_card]
                                  (content
                                   (if (s/blank? (:stripe_default_card t))
                                     "No"
                                     "Yes"))

                                  [:td.push_set_up]
                                  (html-content
                                   (if (s/blank? (:arn_endpoint t))
                                     "No"
                                     (str "Yes "
                                          "<input type='checkbox' "
                                          "value='" (:id t) "' "
                                          "class='send-push-to' "
                                          "/>")))

                                  [:td.os]
                                  (content (:os t))

                                  [:td.app_version]
                                  (content (:app_version t))

                                  [:td.timestamp_created]
                                  (content (unix->full
                                            (/ (.getTime (:timestamp_created t))
                                               1000)))
                                  )

  [:#users-count] (content (str "("
                                (if (:all x)
                                  (:users-count x)
                                  "?")
                                ")"))

  [:#coupons :tbody :tr]
  (clone-for [t (:coupons x)]
             
             [:td.code]
             (content (:code t))

             [:td.value]
             (content (str "$" (cents->dollars (Math/abs (:value t)))))

             [:td.expiration_time]
             (content (unix->fuller (:expiration_time t)))

             [:td.times_used]
             (content (str (:times-used t)))

             [:td.only_for_first_orders]
             (content (if (:only_for_first_orders t) "Yes" "No")))

  [:#gasPriceDollars87] (set-attr :value (:gas-price-87 x))
  [:#gasPriceDollars91] (set-attr :value (:gas-price-91 x))

  [:#mainStyleSheet] (set-attr :href (str (:base-url x)
                                          "css/main.css"))
  
  [:#configFormSubmit] (set-attr :style (if (:read-only x)
                                          "display: none;"
                                          "display: block; margin: 0px auto;")))


;; If it's 'all' then we get 'all' the data from db
;; When 'all' is false, then we only get the first 50 orders and then we get
;; only the users and vehicles that are being referenced in those orders,
;; and the user accounts that are references by the couriers

(defn dashboard [db-conn & {:keys [read-only all]}]
  (let [all-couriers (->> (!select db-conn "couriers" ["*"] {})
                          ;; remove chriscourier@test.com
                          (remove #(in? ["9eadx6i2wCCjUI1leBBr"] (:id %))))
        courier-ids (distinct (map :id all-couriers))
        all-orders (!select db-conn
                            "orders"
                            ["*"]
                            {}
                            :append
                            (str "ORDER BY target_time_start DESC"
                                 (when (not all) " LIMIT 50")))
        
        users-by-id
        (->> (!select db-conn "users"
                      [:id :name :email :phone_number :os
                       :app_version :stripe_default_card
                       :arn_endpoint :timestamp_created]
                      {}
                      :custom-where
                      (when (not all)
                        (let [customer-ids (distinct (map :user_id all-orders))]
                          (str "id IN (\""
                               (s/join "\",\"" (distinct
                                                (concat customer-ids
                                                        courier-ids)))
                               "\")"))))
             (group-by :id))
        
        id->name #(:name (first (get users-by-id %)))

        vehicles-by-id
        (->> (!select db-conn "vehicles"
                      [:id :year :make :model :color :gas_type
                       :license_plate]
                      {}
                      :custom-where
                      (let [vehicle-ids (distinct (map :vehicle_id all-orders))]
                        (str "id IN (\""
                             (s/join "\",\"" vehicle-ids)
                             "\")")))
             (group-by :id))
        
        id->vehicle #(first (get vehicles-by-id %))
        all-coupons (!select db-conn "coupons" ["*"] {:type "standard"})
        ]
    (apply str
           (dashboard-template
            {:title "Purple - Dashboard"
             :couriers (map #(assoc % :name (id->name (:id %))) all-couriers)
             :orders (map #(assoc %
                                  :courier_name (id->name (:courier_id %))
                                  :customer_name (id->name (:user_id %))
                                  :was-late
                                  (let [completion-time
                                        (-> (str "kludgeFix 1|" (:event_log %))
                                            (s/split #"\||\s")
                                            (->> (apply hash-map))
                                            (get "complete"))]
                                    (and completion-time
                                         (> (Integer. completion-time)
                                            (:target_time_end %))))
                                  :vehicle (id->vehicle (:vehicle_id %)))
                          all-orders)
             :users (sort-by #(.getTime (:timestamp_created %))
                             >
                             (map (comp first val) users-by-id))
             :coupons (sort-by :times-used
                               >
                               (map #(assoc % :times-used
                                            (-> (:used_by_license_plates %)
                                                (s/split #",")
                                                (->> (remove s/blank?))
                                                count))
                                    all-coupons))
             :users-count (count users-by-id)
             :base-url config/base-url
             :gas-price-87 @config/gas-price-87
             :gas-price-91 @config/gas-price-91
             :read-only read-only
             :all all}))))

(defn twiml-simple
  [message]
  (str "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
       "<Response>"
       "<Pause length=\"1\"/>"
       "<Say voice=\"woman\" loop=\"1\">"
       message
       "</Say>"
       "</Response>"))

(defn send-push-to-all-active-users
  [db-conn message]
  (do (future (run! #(users/send-push db-conn (:id %) message)
                    (!select db-conn "ActiveUsers" [:id :name] {})))
      {:success true}))

(defn send-push-to-users-list
  [db-conn message user-ids]
  (do (future (run! #(users/send-push db-conn (:id %) message)
                    (!select db-conn
                             "users"
                             [:id :name]
                             {}
                             :custom-where
                             (str "id IN (\""
                                  (->> user-ids
                                       (map mysql-escape-str)
                                       (interpose "\",\"")
                                       (apply str))
                                  "\")"))))
      {:success true}))
