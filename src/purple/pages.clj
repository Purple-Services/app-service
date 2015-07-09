(ns purple.pages
  (:use net.cgrand.enlive-html
        :reload)
  (:require [purple.users :as users]
            [purple.orders :as orders]
            [purple.util :as util]
            [purple.config :as config]
            [purple.db :as db]
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

  [:#couriers :tbody :tr]
  (clone-for [t (:couriers x)]
             [:td.connected]
             (content (if (:connected t) "Yes" "No"))

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
                        (if (> total 0)
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
             (content (util/unix->full (:target_time_start t)))

             [:td.target_time_end]
             (content (util/unix->full (:target_time_end t)))

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
             (content (str "$" (util/cents->dollars (:total_price t)))))

  
  [:#users :tbody :tr] (clone-for [t (:users x)]
                   [:td.name]
                   (content (:name t))

                   [:td.email]
                   (content (:email t))

                   [:td.phone_number]
                   (content (:phone_number t))

                   [:td.has_added_card]
                   (content (if (:stripe_default_card t) "Yes" "No"))

                   [:td.timestamp_created]
                   (content (util/unix->full
                             (/ (.getTime (:timestamp_created t))
                                1000))) ;; i think this is wrong timezone, idk
                   )

  [:#emails-list] (content (->> (:users x)
                                (map :email)
                                (interpose "; ")))

  [:#users-count] (content (str "("
                                (:users-count x)
                                ")"))

  [:#coupons :tbody :tr]
  (clone-for [t (:coupons x)]
             
             [:td.code]
             (content (:code t))

             [:td.value]
             (content (str "$" (util/cents->dollars (Math/abs (:value t)))))

             [:td.expiration_time]
             (content (util/unix->fuller (:expiration_time t)))

             [:td.times_used]
             (content (str (count (s/split (:used_by_license_plates t) #","))))

             [:td.only_for_first_orders]
             (content (if (:only_for_first_orders t) "Yes" "No")))

  [:#gasPriceDollars87] (set-attr :value (:gas-price-87 x))
  [:#gasPriceDollars91] (set-attr :value (:gas-price-91 x))
  
  [:#configFormSubmit] (set-attr :style (if (:read-only x)
                                          "display: none;"
                                          "display: block; margin: 0px auto;")))

(defn dashboard [db-conn & {:keys [read-only]}]
  (let [couriers (remove #(util/in? ["9eadx6i2wCCjUI1leBBr" ;; remove JP, Bruno, & Chris
                                     "O5Lgnj2nq16GmDvcYNeO"
                                     "VUtTv9w1NL7Iim3LS7D7"] (:id %))
                         (db/select db-conn "couriers" ["*"] {}))
        courier-ids (distinct (map :id couriers))
        users-by-id (group-by :id
                              (db/select db-conn
                                         "users"
                                         [:id
                                          :name
                                          :email
                                          :phone_number
                                          :stripe_default_card
                                          :timestamp_created]
                                         {}))
        id->name #(:name (first (get users-by-id %)))
        vehicles-by-id (group-by :id
                                 (db/select db-conn
                                            "vehicles"
                                            [:id
                                             :year
                                             :make
                                             :model
                                             :color
                                             :gas_type
                                             :license_plate]
                                            {}))
        id->vehicle #(first (get vehicles-by-id %))
        coupons (db/select db-conn "coupons" ["*"] {:type "standard"})]
    (apply str
           (dashboard-template
            {:title "Purple - Dashboard"
             :couriers (map #(assoc %
                               :name
                               (id->name
                                (:id %)))
                            couriers)
             :orders (map #(assoc %
                             
                             :courier_name
                             (id->name (:courier_id %))
                             
                             :customer_name
                             (id->name (:user_id %))

                             :was-late
                             (let [completion-time (-> (str "kludgeFixLater 1|" (:event_log %))
                                                       (s/split #"\||\s")
                                                       (->> (apply hash-map))
                                                       (get "complete"))]
                               (and completion-time
                                    (> (Integer. completion-time)
                                       (:target_time_end %))))

                             :vehicle
                             (id->vehicle (:vehicle_id %)))
                          (take 500 (orders/get-all (db/conn))))
             :users (sort-by
                     #(.getTime (:timestamp_created %))
                     >
                     (map (comp first val) users-by-id))
             :coupons coupons
             :users-count (count users-by-id)
             :base-url config/base-url
             :gas-price-87 @config/gas-price-87
             :gas-price-91 @config/gas-price-91
             :read-only read-only}))))

(defn twiml-simple
  [message]
  (str "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
         "<Response>"
           "<Pause length=\"1\"/>"
           "<Say voice=\"woman\" loop=\"1\">"
             message
           "</Say>"
         "</Response>"))
