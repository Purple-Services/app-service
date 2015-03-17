(ns purple.pages
  (:use net.cgrand.enlive-html
        :reload)
  (:require [purple.users :as users]
            [purple.orders :as orders]
            [purple.util :as util]
            [purple.db :as db]))

(deftemplate index-template "templates/index.html"
  [x]
  [:title] (content (:title x))
  [:#heading] (content (:heading x))
  [:#intro] (content (:intro x)))

(defn not-found-page []
  (apply str (index-template {:heading "Page Not Found"
                              :intro "Sorry, that page could not be found."})))

(deftemplate reset-password-template "templates/reset-password.html"
  [x]
  [:title] (content (:title x))
  [:#heading] (content (:heading x))
  [:#email] (content (:email x))
  [:#key] (set-attr :value (:key x))
  )

(defn reset-password [db-conn key]
  (let [user (users/get-user-by-reset-key db-conn key)]
    (if user
      (apply str (reset-password-template {:title "Purple - Reset Password"
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
  [:#heading] (content (:heading x))
  
  ;; [:#table] (content (:table x))
  [:tbody :tr] (clone-for [t (:table x)]
                   [:td.status]
                   (content (:status t))

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
                   (content (util/cents->dollars (:total_price t)))
                   
                   ))

(defn dashboard []
  (apply str (dashboard-template {:title "Purple - Dashboard"
                                  :heading "Dashboard"
                                  :table (orders/get-all (db/conn))})))
