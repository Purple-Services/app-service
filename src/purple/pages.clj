(ns purple.pages
  (:use net.cgrand.enlive-html
        :reload)
  (:require [purple.users :as users]
            [purple.orders :as orders]
            [purple.util :as util]
            [purple.config :as config]
            [purple.db :as db]))

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
  (apply str (home-template {:title "Purple App"})))

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

  [:#couriers :tbody :tr] (clone-for [t (:couriers x)]
                   [:td.connected]
                   (content (if (:connected t) "Yes" "No"))

                   [:td.name]
                   (content (:name t))

                   [:td.busy]
                   (content (if (:busy t) "Yes" "No"))

                   [:td.zones]
                   (content (:zones t))
                   
                   [:td.location :a]
                   (content "View On Map")
                   [:td.location :a]
                   (set-attr :href (str "https://maps.google.com/?q="
                                        (:lat t)
                                        ","
                                        (:lng t))))
  
  [:#orders :tbody :tr] (clone-for [t (:orders x)]
                   [:td.status]
                   (content (:status t))

                   [:td.courier_name]
                   (content (:courier_name t))

                   [:td.target_time_start]
                   (content (util/unix->full (:target_time_start t)))

                   [:td.target_time_end]
                   (content (util/unix->full (:target_time_end t)))
                   
                   [:td.address_street :a]
                   (content (:address_street t))
                   [:td.address_street :a]
                   (set-attr :href (str "https://maps.google.com/?q="
                                        (:lat t)
                                        ","
                                        (:lng t)))
                   
                   [:td.gallons]
                   (content (str (:gallons t)))
                   
                   [:td.total_price]
                   (content (util/cents->dollars (:total_price t))))

  [:#gasPriceDollars87] (set-attr :value (:gas-price-87 x))
  [:#gasPriceDollars91] (set-attr :value (:gas-price-91 x)))

(defn dashboard [db-conn]
  (let [couriers (db/select db-conn "couriers" ["*"] {})
        courier-ids (distinct (map :id couriers))
        ;; "users" rows for all the couriers, keyed by id
        users-by-id (group-by :id
                              (db/select db-conn
                                         "users"
                                         [:id :name :phone_number]
                                         {}
                                         :custom-where
                                         (str "id IN (\""
                                              (apply str
                                                     (interpose "\",\"" courier-ids))
                                              "\")")))
        courier-id->courier-name #(:name (first (get users-by-id %)))]
    (apply str (dashboard-template {:title "Purple - Dashboard"
                                    :couriers (map #(assoc %
                                                      :name
                                                      (courier-id->courier-name
                                                       (:id %)))
                                                   couriers)
                                    :orders (map #(assoc %
                                                    :courier_name
                                                    (courier-id->courier-name
                                                     (:courier_id %)))
                                                 (take 100 (orders/get-all (db/conn))))
                                    :base-url config/base-url
                                    :gas-price-87 @config/gas-price-87
                                    :gas-price-91 @config/gas-price-91}))))
