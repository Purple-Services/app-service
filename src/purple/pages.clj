(ns purple.pages
  (:use purple.util
        [purple.db :only [conn !select !insert !update mysql-escape-str]]
        clojure.walk
        [clojure.algo.generic.functor :only [fmap]]
        net.cgrand.enlive-html
        :reload)
  (:require [purple.users :as users]
            [purple.orders :as orders]
            [purple.config :as config]
            [clojure.string :as s])
  (:import [purpleOpt PurpleOpt]))

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

  [:#config] (set-attr :data-base-url (:base-url x)
                       :data-uri-segment (:uri-segment x))

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
             (do->
              (set-attr :data-courier-id (:id t))
              (content (:name t)))

             [:td.courier_phone_number]
             (content (:phone_number t))

             [:td.busy]
             (content (if (:busy t) "Yes" "No"))

             [:td.last_seen]
             (content (unix->full (:last_ping t)))

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

             [:td.location]
             (do->
              (set-attr :data-lat (:lat t))
              (set-attr :data-lng (:lng t))
              (if (and (= 0.0 (:lat t))
                       (= 0.0 (:lng t)))
                (add-class "no-gps")
                (add-class)))

             [:td.location :a]
             (content "View On Map")
             [:td.location :a]
             (set-attr :href (str "https://maps.google.com/?q="
                                  (:lat t)
                                  ","
                                  (:lng t))))
  [:#dash-map-orders-link]
  (set-attr :href (str (:uri-segment x) "dash-map-orders"))

  [:#dash-map-couriers-link]
  (set-attr :href (str (:uri-segment x) "dash-map-couriers"))

  [:#orders :tbody :tr]
  (clone-for [t (:orders x)]
             [:td.cancel]
             (if (not (or (= (:status t)
                             "complete")
                          (= (:status t)
                             "cancelled")
                          ))
               (content (html [:input {:type "submit" :class "cancel-order"
                                       :value "Cancel Order"
                                       :data-id (:id t)
                                       :data-user-id (:user_id t)}]))
               (content)
               )
             ;;(content (str (:id t)))
             [:td.status]
             (do-> (if (:was-late t)
                     (add-class "late")
                     (add-class "not-late"))
                   (if-not (contains? #{"complete" "cancelled" "unassigned"}
                                      (:status t))
                     (content (:status t)
                              (html [:input
                                     {:type "submit"
                                      :class "advance-status"
                                      :value ({"accepted" "Start Route"
                                               "enroute" "Begin Servicing"
                                               "servicing" "Complete Order"}
                                              (:status t))
                                      :data-order-id (:id t)}]))
                     (content (:status t))))
             [:td.courier_name]
             (content (html [:div
                             {:class "assign-courier-interface"}
                             [:select {:class "assign-courier"}
                              [:option
                               (if (= (:status t)
                                      "unassigned")
                                 {:selected ""})
                               "Assign to Courier"]
                              (map
                               #(html
                                 [:option
                                  (if (= (:courier_id t)
                                         (:id %))
                                    {:value (:id %)
                                     :selected ""}
                                    {:value (:id %)})
                                  (:name %) ])
                               ;; filter out the couriers to only those assigned
                               ;; to the zone
                               (filter #(contains? (:assigned_zones %) (:zone t))
                                       (:couriers x)))]
                             [:input {:type "submit"
                                      :class "assign-courier"
                                      :value "Save"
                                      :data-order-id (:id t)
                                      :zone (:zone t)
                                      :disabled true
                                      }]]
                            [:div {:class "assigned-courier"}
                             (:name
                              (first
                               (filter #(= (:id %) (:courier_id t))
                                       (:couriers x))))]))

             [:td.etas]
             (html-content (apply str
                                  (map #(str (:name %)
                                             " - <strong class='"
                                             (when (:busy %) "late")
                                             "'>"
                                             (:minutes %)
                                             "</strong><br />")
                                       (sort-by :minutes (:etas t)))))

             [:td.target_time_start]
             (content (unix->full (:target_time_start t)))

             [:td.target_time_end]
             (content (unix->full (:target_time_end t)))

             [:td.customer_name]
             (content (str ;; "(" (:customer_sift_score t) ") "
                       (:customer_name t)))
             
             [:td.customer_phone_number]
             (content (:customer_phone_number t))

             [:td.address_street]
             (add-class (:zone-color t))
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

             [:td.color_make_model]
             (content (str (:color (:vehicle t))
                           " "
                           (:make (:vehicle t))
                           " "
                           (:model (:vehicle t))))
             
             [:td.license_plate]
             (content (str (:license_plate (:vehicle t))))

             [:td.coupon_code]
             (content (str (:coupon_code t)))
             
             [:td.total_price]
             (do-> (if (and (or (s/blank? (:stripe_charge_id t))
                                (and (not (:paid t))
                                     (= (:status t) "complete")))
                            (not= 0 (:total_price t)))
                     (add-class "late") ;; Payment failed!
                     (add-class "not-late"))
                   (content (str "$" (cents->dollars-str (:total_price t))))))

  
  [:#users :tbody :tr]
  (when (not (:courier-manager x))
    (clone-for [t (:users x)]
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
                            1000)))))

  [:#users-count]
  (when (not (:courier-manager x))
    (content
     (str "(" (:users-count x) ")")))

  [:#coupons :tbody :tr]
  (when (not (:courier-manager x))
    (clone-for [t (filter #(> (:expiration_time %)
                              (quot (System/currentTimeMillis) 1000))
                          (:coupons x))]

               [:td.code]
               (content (:code t))

               [:td.value]
               (content (str "$" (cents->dollars-str (Math/abs (:value t)))))

               [:td.expiration_time]
               (content (unix->fuller (:expiration_time t)))

               [:td.times_used]
               (content (str (:times-used t)))

               [:td.only_for_first_orders]
               (content (if (:only_for_first_orders t) "Yes" "No"))))

  [:div#zone-ids]
  (set-attr :style "display:none;"
            :data-zone-ids (s/join "," (map :id (:zones x))))

  [:#zones :tbody :tr]
  (clone-for [zone (:zones x)]

             [:td.zips]
             (content (str (s/replace (:zip_codes zone)
                                      #","
                                      ", ")))

             [:td.color]
             (do-> (content (str (:color zone)))
                   (add-class (:color zone)))

             [:td.87-price]
             (content  (html [:input
                              {:type "text"
                               :disabled true
                               :value (:87 (:fuel_prices zone))
                               :maxlength 4
                               :data-id (:id zone)
                               :size 4}]))

             [:td.91-price]
             (content (html [:input
                             {:type "text"
                              :disabled true
                              :value (:91 (:fuel_prices zone))
                              :maxlength 4
                              :data-id (:id zone)
                              :size 4}]))

             [:td.1-hr-fee]
             (content (html [:input
                             {:type "text"
                              :disabled true
                              :value (:60 (:service_fees zone))
                              :maxlength 4
                              :data-id (:id zone)
                              :size 4}]))
             [:td.3-hr-fee]
             (content (html
                       [:input
                        {:type "text"
                         :disabled true
                         :value (:180 (:service_fees zone))
                         :maxlength 4
                         :data-id (:id zone)
                         :size 4}]))

             [:td.service-start]
             (content (html
                       [:input
                        {:type "text"
                         :disabled true
                         :value (first (:service_time_bracket zone))
                         :maxlength 4
                         :data-id (:id zone)
                         :size 4}]))

             [:td.service-end]
             (content (html
                       [:input
                        {:type "text"
                         :disabled true
                         :value (last (:service_time_bracket zone))
                         :maxlength 4
                         :data-id (:id zone)
                         :size 4}])))

  [:#mainStyleSheet] (set-attr :href (str (:base-url x)
                                          "css/main.css"))

  [:#dashboardJS] (set-attr :src (str (:base-url x)
                                      "js/dashboard.js"))

  [:#download-stats-csv]
  (when (not (:courier-manager x))
    (let [stats-file (java.io.File. "stats.csv")]
      (if (> (.length stats-file) 0)
        (content (str "[download "
                      (unix->full (quot (.lastModified stats-file)
                                        1000))
                      "]"))
        (do-> (remove-class "fake-link")
              (remove-attr :id)
              (content (str "[Processing... refresh page to check status."
                            " It may take an hour.]"))))))

  [:#configFormSubmit] (set-attr :style (if (:read-only x)
                                          "display: none;"
                                          "display: block; margin: 0px auto;"))

  [:body] (cond
            (:courier-manager x) (add-class "manager")
            (:only-show-orders x) (add-class "only-show-orders")
            :else (add-class "standard"))
  [:#orders] (if (:only-show-orders x)
               (remove-class "hide-extra")
               (add-class "hide-extra"))
  [:#orders-heading] (if (:only-show-orders x)
                       (content "Declined Payments")
                       (add-class "standard"))

  [:#debug] (content (:debug x))
  )


;; If it's 'all' then we get 'all' the data from db
;; When 'all' is false, then we only get the first 100 orders and then we get
;; only the users and vehicles that are being referenced in those orders,
;; and the user accounts that are references by the couriers

(defn dashboard [db-conn & {:keys [all read-only courier-manager]}]
  (let [all-couriers (->> (!select db-conn "couriers" ["*"] {})
                          ;; remove chriscourier@test.com
                          (remove #(in? ["9eadx6i2wCCjUI1leBBr"] (:id %))))

        couriers-by-id (into {} (map (juxt (comp keyword :id) identity) all-couriers))
        
        courier-ids (distinct (map :id all-couriers))
        all-orders (!select db-conn
                            "orders"
                            ["*"]
                            {}
                            :append
                            (str (when courier-manager
                                   (str "AND status IN ('unassigned', "
                                        "'assigned', 'accepted', 'enroute', "
                                        "'servicing')"))
                                 "ORDER BY target_time_start DESC"
                                 (when (not all) " LIMIT 100")))
        
        users-by-id
        (->> (!select db-conn "users"
                      [:id :name :email :phone_number :os
                       :app_version :stripe_default_card
                       :sift_score
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
        id->phone_number #(:phone_number (first (get users-by-id %)))
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
        zones       (!select db-conn "zones" ["*"] {})
        dist-map (into
                  {}
                  (PurpleOpt/computeDistance
                   (map->java-hash-map
                    {"orders" (->> all-orders
                                   (filter #(in? ["unassigned"
                                                  "assigned"
                                                  "accepted"
                                                  "enroute"]
                                                 (:status %)))
                                   (map #(assoc %
                                                :status_times
                                                (-> (:event_log %)
                                                    (s/split #"\||\s")
                                                    (->> (remove s/blank?)
                                                         (apply hash-map)
                                                         (fmap read-string)))))
                                   (map (juxt :id stringify-keys))
                                   (into {}))
                     "couriers" (->> (!select (conn)
                                              "couriers"
                                              [:id :lat :lng :last_ping
                                               :connected :zones]
                                              {:active true
                                               :on_duty true})
                                     (map #(update-in % [:zones] split-on-comma))
                                     (map #(assoc % :assigned_orders []))
                                     (map (juxt :id stringify-keys))
                                     (into {}))})))
        ]
    (apply str
           (dashboard-template
            {:title "Purple - Dashboard"
             :couriers (map #(assoc %
                                    :name (id->name (:id %))
                                    :phone_number (id->phone_number (:id %))
                                    :assigned_zones (zones-str->set (:zones %)))
                            all-couriers)
             :orders (map #(assoc %
                                  :courier_name (id->name (:courier_id %))
                                  :customer_name (id->name (:user_id %))
                                  
                                  :customer_phone_number
                                  (:phone_number
                                   (first (get users-by-id (:user_id %))))
                                  
                                  :customer_sift_score
                                  (:sift_score
                                   (first (get users-by-id (:user_id %))))

                                  :etas (if-let [this-dist-map (get dist-map (:id %))]
                                          (map (fn [x]
                                                 {:name (id->name (key x))
                                                  :busy (:busy
                                                         ((keyword (key x))
                                                          couriers-by-id))
                                                  :minutes (quot (val x) 60)})
                                               (into {} (get this-dist-map "etas"))))
                                  
                                  :zone-color
                                  (:color
                                   ((resolve
                                     'purple.dispatch/get-zone-by-zip-code)
                                    (:address_zip %)))

                                  :zone
                                  (:id
                                   ((resolve
                                     'purple.dispatch/get-zone-by-zip-code)
                                    (:address_zip %)))
                                  
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
             :coupons (sort-by (juxt :times-used :code)
                               (comp - compare)
                               (map #(assoc % :times-used
                                            (-> (:used_by_license_plates %)
                                                (s/split #",")
                                                (->> (remove s/blank?))
                                                count))
                                    all-coupons))
             :users-count (if all
                            (count users-by-id) ;; we already have correct total
                            (-> (!select db-conn "users" ;; need to get total
                                         ["COUNT(*) as total"]
                                         {})
                                first
                                :total))
             :zones (->> zones
                         (sort-by :id)
                         (map
                          #(assoc % :fuel_prices
                                  (try
                                    (read-string (:fuel_prices %))
                                    (catch Exception e
                                      (str "read-string :fuel_prices failed: "
                                           (.getMessage e))))))
                         (map
                          #(assoc % :service_fees
                                  (try
                                    (read-string (:service_fees %))
                                    (catch Exception e
                                      (str "read-string :service_fees failed: "
                                           (.getMessage e))))))
                         (map
                          #(assoc % :service_time_bracket
                                  (try
                                    (read-string (:service_time_bracket %))
                                    (catch Exception e
                                      (str "read-string :service_time_bracket"
                                           " failed: "
                                           (.getMessage e)))))))
             :base-url config/base-url
             :uri-segment (cond
                            courier-manager "manager/"
                            read-only "stats/"
                            :else "dashboard/")
             :debug nil
             :read-only read-only
             :courier-manager courier-manager
             :all all}))))

(defn declined [db-conn]
  (let [all-couriers (->> (!select db-conn "couriers" ["*"] {})
                          ;; remove chriscourier@test.com
                          (remove #(in? ["9eadx6i2wCCjUI1leBBr"] (:id %))))
        courier-ids (distinct (map :id all-couriers))
        all-orders (!select db-conn
                            "orders"
                            ["*"]
                            {:paid 0
                             :status "complete"}
                            :append
                            "AND total_price > 0 ORDER BY target_time_start DESC")
        
        users-by-id
        (->> (!select db-conn "users"
                      [:id :name :email :phone_number :os
                       :app_version :stripe_default_card
                       :arn_endpoint :timestamp_created]
                      {}
                      :custom-where
                      (let [customer-ids (distinct (map :user_id all-orders))]
                        (str "id IN (\""
                             (s/join "\",\"" (distinct
                                              (concat customer-ids
                                                      courier-ids)))
                             "\")")))
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
        ]
    (apply str
           (dashboard-template
            {:title "Purple - Declined Payments"
             :orders (map #(assoc %
                                  :courier_name (id->name (:courier_id %))
                                  :customer_name (id->name (:user_id %))
                                  
                                  :customer_phone_number
                                  (:phone_number
                                   (first (get users-by-id (:user_id %))))
                                  
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
             :base-url config/base-url
             :only-show-orders true}))))

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

(deftemplate dash-map-template "templates/dashmap.html"
  [x]
  [:#main-css] (set-attr :href (str (:base-url x)
                                    "css/dashmap.css"))
  [:#pikaday-css] (set-attr :href (str (:base-url x)
                                       "css/pikaday.css"))
  [:#dashboard-cljs] (set-attr :src (str (:base-url x)
                                         "js/dashboard_cljs.js"))
  [:#base-url] (set-attr :value (str (:base-url x)
                                     (:uri-segment x)))
  [:#map-init]
  (set-attr :src
            (str "https://maps.googleapis.com/maps/api/js?"
                 "key="
                 config/dashboard-google-browser-api-key
                 "&callback="
                 (:callback-s x))))

(defn dash-map
  [& {:keys [read-only courier-manager callback-s]}]
  (apply str (dash-map-template {:base-url config/base-url
                                 :uri-segment (cond
                                                courier-manager "manager/"
                                                read-only "stats/"
                                                :else "dashboard/")
                                 :read-only read-only
                                 :callback-s callback-s })))
