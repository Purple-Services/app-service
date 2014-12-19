(ns purple.handler
  (:use cheshire.core
        ring.util.response
        clojure.walk)
  (:require [purple.config :as config]
            [purple.db :as db]
            [purple.forms :as forms]
            [purple.patients :as patients]
            [purple.physicians :as physicians]
            [purple.content :as content]
            [purple.monitoring :as monitoring]
            [purple.system :as system]
            [purple.util :as util]
            [compojure.core :refer :all]
            [compojure.handler :as handler]
            [compojure.route :as route]
            [clojure.string :as s]
            [ring.middleware.json :as middleware]))

;; (set! *compile-files* true) ;; just to temporarily keep it from running

(defn wrap-page [resp]
  (-> resp
      (header "Content-Type" "text/html; charset=utf-8")))

(defn auth-system?
  [db-conn session-id auth-token device-id]
  (system/valid? (system/get-session db-conn session-id)
                   device-id
                   auth-token))

(defmacro demand-system-auth
  [db-conn session-id auth-token device-id & body]
  `(if (auth-system? ~db-conn ~session-id ~auth-token ~device-id)
     (do ~@body)
     {:success false
      :message "Bad system auth."}))

(defroutes app-routes
  (context "/system" []
           (defroutes system-routes
             (POST "/start-session" {body :body}
                   (response
                    (let [b (keywordize-keys body)]
                      (system/start-session (db/conn)
                                            (:device_id b)))))
             (POST "/authorize-session" {body :body}
                   (response
                    (let [b (keywordize-keys body)]
                      (system/attempt-to-authorize-session
                       (db/conn)
                       (:password b)
                       (:session_id b)))))))
  (context "/sessions" []
           (defroutes sessions-routes
             (POST "/all" {body :body}
                   (response
                    (let [b (keywordize-keys body)
                          db-conn (db/conn)]
                      (demand-system-auth
                       db-conn
                       (:session_id b)
                       (:auth_token b)
                       (:device_id b)
                       (system/all-sessions db-conn)))))))
  (GET "/ok" []
        (response {:success true}))
  (route/resources "/")
  (route/not-found (wrap-page (response "Not found."))))

(def app
  (-> (handler/site app-routes)
      (middleware/wrap-json-body)
      (middleware/wrap-json-response)))
