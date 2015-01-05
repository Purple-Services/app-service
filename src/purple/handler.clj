(ns purple.handler
  (:use cheshire.core
        ring.util.response
        clojure.walk)
  (:require [purple.config :as config]
            [purple.db :as db]
            [purple.util :as util]
            [purple.users :as users]
            [compojure.core :refer :all]
            [compojure.handler :as handler]
            [compojure.route :as route]
            [clojure.string :as s]
            [ring.middleware.json :as middleware]))

(defn wrap-page [resp]
  (-> resp
      (header "Content-Type" "text/html; charset=utf-8")))

(defmacro demand-user-auth
  [db-conn user-id token & body]
  `(if (users/valid-session? ~db-conn ~user-id ~token)
     (do ~@body)
     {:success false
      :message "Bad user auth."}))

(defroutes app-routes
  (context "/user" []
           (defroutes user-routes
             (POST "/login" {body :body}
                   (response
                    (let [b (keywordize-keys body)]
                      (users/login (db/conn)
                                   ;; 'type' is either:
                                   ;; native, facebook, or google
                                   (:type b)
                                   ;; 'platform_id' is either:
                                   ;; native:   email address
                                   ;; facebook: facebook id
                                   ;; google:   google id
                                   (:platform_id b)
                                   ;; 'auth_key' will depend on the type
                                   ;; of user it is. If it is a native user,
                                   ;; this will be their password. For Facebook
                                   ;; and Google users, this will be their
                                   ;; auth token from that platform.
                                   (:auth_key b)))))
             (POST "/register" {body :body} ;; only for native users
                   (response
                    (let [b (keywordize-keys body)]
                      (users/register (db/conn)
                                      ;; 'platform_id' is email address
                                      (:platform_id b)
                                      ;; 'auth_key' is password
                                      (:auth_key b)))))
             (POST "/edit" {body :body}
                   (response
                    (let [b (keywordize-keys body)
                          db-conn (db/conn)]
                      (demand-user-auth
                       db-conn
                       (:user_id b)
                       (:token b)
                       (users/edit db-conn
                                   (:user_id b)
                                   (:user b))))))
             ;; Get info about currently auth'd user
             (POST "/details" {body :body}
                   (response
                    (let [b (keywordize-keys body)
                          db-conn (db/conn)]
                      (demand-user-auth
                       db-conn
                       (:user_id b)
                       (:token b)
                       (users/details db-conn
                                      (:user_id b))))))))
  (GET "/ok" []
        (response {:success true}))
  (route/resources "/")
  (route/not-found (wrap-page (response "Not found."))))

(def app
  (-> (handler/site app-routes)
      (middleware/wrap-json-body)
      (middleware/wrap-json-response)))
