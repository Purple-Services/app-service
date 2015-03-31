(ns purple.handler
  (:use cheshire.core
        ring.util.response
        clojure.walk)
  (:require [purple.config :as config]
            [purple.db :as db]
            [purple.util :as util]
            [purple.users :as users]
            [purple.orders :as orders]
            [purple.dispatch :as dispatch]
            [purple.pages :as pages]
            [compojure.core :refer :all]
            [compojure.handler :as handler]
            [compojure.route :as route]
            [clojure.string :as s]
            [ring.middleware.json :as middleware]
            [ring.middleware.basic-authentication :refer [wrap-basic-authentication]]))

(defn dashboard-auth?
  [username password]
  (and (= config/basic-auth-username username)
       (= config/basic-auth-password password)))

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
             (POST "/forgot-password" {body :body} ;; only for native users
                   (response
                    (let [b (keywordize-keys body)]
                      (users/forgot-password (db/conn)
                                      ;; 'platform_id' is email address
                                      (:platform_id b)))))

             ;; only for native users
             (GET "/reset-password/:key" [key]
                  (wrap-page (response (pages/reset-password (db/conn) key))))
             (POST "/reset-password" {body :body}
                   (response
                    (let [b (keywordize-keys body)]
                      (users/change-password (db/conn) (:key b) (:password b)))))
             
             ;; you can send in one :user and/or one :vehicle key to edit those
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
                                   b)))))
             (POST "/add-sns" {body :body}
                   (response
                    (let [b (keywordize-keys body)
                          db-conn (db/conn)]
                      (demand-user-auth
                       db-conn
                       (:user_id b)
                       (:token b)
                       (users/add-sns db-conn
                                      (:user_id b)
                                      (:push_platform b)
                                      (:cred b))))))
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
  (context "/orders" []
           (defroutes orders-routes
             (POST "/add" {body :body}
                   (response
                    (let [b (keywordize-keys body)
                          db-conn (db/conn)]
                      (demand-user-auth
                       db-conn
                       (:user_id b)
                       (:token b)
                       (orders/add db-conn
                                   (:user_id b)
                                   (:order b))))))
             (POST "/rate" {body :body}
                   (response
                    (let [b (keywordize-keys body)
                          db-conn (db/conn)]
                      (demand-user-auth
                       db-conn
                       (:user_id b)
                       (:token b)
                       (orders/rate db-conn
                                    (:user_id b)
                                    (:order_id b)
                                    (:rating b))))))
             ;; for status updates by courier
             (POST "/update-status-by-courier" {body :body}
                   (response
                    (let [b (keywordize-keys body)
                          db-conn (db/conn)]
                      (demand-user-auth
                       db-conn
                       (:user_id b)
                       (:token b)
                       (orders/update-status-by-courier db-conn
                                                        (:user_id b)
                                                        (:order_id b)
                                                        (:status b))))))
             ;; for cancels by customer
             (POST "/cancel" {body :body}
                   (response
                    (let [b (keywordize-keys body)
                          db-conn (db/conn)]
                      (demand-user-auth
                       db-conn
                       (:user_id b)
                       (:token b)
                       (orders/cancel db-conn
                                      (:user_id b)
                                      (:order_id b))))))))
  (context "/dispatch" []
           (defroutes dispatch-routes
             (POST "/availability" {body :body}
                   (response
                    (let [b (keywordize-keys body)
                          db-conn (db/conn)]
                      (demand-user-auth
                       db-conn
                       (:user_id b)
                       (:token b)
                       (dispatch/availability (:zip_code b))))))))
  (context "/courier" []
           (defroutes courier-routes
             (POST "/ping" {body :body}
                   (response
                    (let [b (keywordize-keys body)
                          db-conn (db/conn)]
                      (demand-user-auth
                       db-conn
                       (:user_id b)
                       (:token b)
                       (dispatch/courier-ping db-conn
                                              (:user_id b)
                                              (Double. (:lat b))
                                              (Double. (:lng b))
                                              (:gallons b))))))))
  (context "/feedback" []
           (defroutes feedback-routes
             (POST "/send" {body :body}
                   (response
                    (let [b (keywordize-keys body)
                          db-conn (db/conn)]
                      ;; they don't have to send user auth
                      ;; but if they do, it should be correct
                      (if (not (nil? (:user_id b)))
                        (demand-user-auth
                         db-conn
                         (:user_id b)
                         (:token b)
                         (util/send-feedback (:text b)
                                             :user_id (:user_id b)))
                        (util/send-feedback (:text b))))))))
  (context "/invite" []
           (defroutes invite-routes
             (POST "/send" {body :body}
                   (response
                    (let [b (keywordize-keys body)
                          db-conn (db/conn)]
                      ;; they don't have to send user auth
                      ;; but if they do, it should be correct
                      (if (not (nil? (:user_id b)))
                        (demand-user-auth
                         db-conn
                         (:user_id b)
                         (:token b)
                         (users/send-invite db-conn
                                            (:email b)
                                            :user_id (:user_id b)))
                        (users/send-invite db-conn
                                           (:email b))))))))
  (context "/dashboard" []
           (wrap-basic-authentication
            (defroutes dashboard-routes
              (GET "/" []
                   (wrap-page (response (pages/dashboard (db/conn)))))
              (POST "/change-gas-price" {body :body}
                   (response
                    (let [b (keywordize-keys body)]
                      (dispatch/change-gas-price (db/conn)
                                                 (:gas-price-87 b)
                                                 (:gas-price-91 b))))))
            dashboard-auth?))
  (GET "/terms" [] (wrap-page (response (pages/terms))))
  (GET "/ok" [] (response {:success true}))
  (route/resources "/")
  (route/not-found (wrap-page (response (pages/not-found-page)))))

(def app
  (-> (handler/site app-routes)
      (middleware/wrap-json-body)
      (middleware/wrap-json-response)))
