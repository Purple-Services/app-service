(ns app.pages
  (:require
   [net.cgrand.enlive-html :refer [content deftemplate set-attr]]
   [app.users :as users]
   [common.config :as config]))

(deftemplate index-template "templates/index.html"
  [x]
  [:title] (content (:title x))
  [:#heading] (content (:heading x))
  [:#intro] (content (:intro x)))

(defn not-found-page []
  (apply str (index-template {:heading "Page Not Found"
                              :intro "Sorry, that page could not be found."})))

(deftemplate terms-template "templates/terms.html"
  [x]
  [:title] (content (:title x)))

(defn terms []
  (apply str (terms-template {:title "Terms of Service"})))

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
  [:#key] (set-attr :value (:key x)))

(deftemplate reset-password-invalid-template "templates/reset-password-invalid.html"
  [x]
  [:title] (content (:title x))
  [:#heading] (content (:heading x)))

(defn reset-password [db-conn key]
  (let [user (users/get-user-by-reset-key db-conn key)]
    (if user
      (apply str (reset-password-template {:title "Purple - Reset Password"
                                           :base-url config/base-url
                                           :heading "Reset Password"
                                           :email (:email user)
                                           :key key}))
      (apply str (reset-password-invalid-template {:title "Purple - Reset Password"
                                                   :heading "Reset Password"})))))

(defn twiml-text
  [message]
  (str "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
       "<Response>"
       "<Sms>"
       message
       "</Sms>"
       "</Response>"))

(defn twiml-voice
  [message]
  (str "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
       "<Response>"
       "<Pause length=\"1\"/>"
       "<Say voice=\"woman\" loop=\"1\">"
       message
       "</Say>"
       "</Response>"))
