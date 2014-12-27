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

;; (set! *compile-files* true) ;; just to temporarily keep it from running

(defn wrap-page [resp]
  (-> resp
      (header "Content-Type" "text/html; charset=utf-8")))

;; (defn auth-system?
;;   [db-conn session-id auth-token device-id]
;;   (system/valid? (system/get-session db-conn session-id)
;;                    device-id
;;                    auth-token))

;; (defmacro demand-system-auth
;;   [db-conn session-id auth-token device-id & body]
;;   `(if (auth-system? ~db-conn ~session-id ~auth-token ~device-id)
;;      (do ~@body)
;;      {:success false
;;       :message "Bad system auth."}))

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
                                   (:auth_key b)))))))
  ;; (context "/sessions" []
  ;;          (defroutes sessions-routes
  ;;            (POST "/all" {body :body}
  ;;                  (response
  ;;                   (let [b (keywordize-keys body)
  ;;                         db-conn (db/conn)]
  ;;                     (demand-system-auth
  ;;                      db-conn
  ;;                      (:session_id b)
  ;;                      (:auth_token b)
  ;;                      (:device_id b)
  ;;                      (system/all-sessions db-conn)))))))
  (GET "/ok" []
        (response {:success true}))
  (route/resources "/")
  (route/not-found (wrap-page (response "Not found."))))

(def app
  (-> (handler/site app-routes)
      (middleware/wrap-json-body)
      (middleware/wrap-json-response)))
