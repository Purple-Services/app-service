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
            [purple.coupons :as coupons]
            [purple.pages :as pages]
            [compojure.core :refer :all]
            [compojure.handler :as handler]
            [compojure.route :as route]
            [clojure.string :as s]
            [ring.middleware.cors :refer [wrap-cors]]
            [ring.middleware.json :as middleware]
            [ring.middleware.basic-authentication :refer [wrap-basic-authentication]]))

(defn dashboard-auth?
  [username password]
  (and (= config/basic-auth-username username)
       (= config/basic-auth-password password)))

(defn stats-auth?
  [username password]
  (and (= config/basic-auth-read-only-username username)
       (= config/basic-auth-read-only-password password)))

(defn wrap-page [resp]
  (-> resp
      (header "Content-Type" "text/html; charset=utf-8")))

(defn wrap-xml [resp]
  (-> resp
      (header "Content-Type" "text/xml; charset=utf-8")))

(defmacro demand-user-auth
  [db-conn user-id token & body]
  `(if (users/valid-session? ~db-conn ~user-id ~token)
     (do ~@body)
     {:success false
      :message "Something's wrong. Please log out and log back in."}))

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
                                   (:auth_key b)
                                   ;; email-override isn't checked for
                                   ;; security; could be spoofed.
                                   ;; but, currently, it's the only way we can
                                   ;; get it for Google logins on Android devices
                                   ;; because the plugin we are using doesn't allow
                                   ;; to modify scope of auth_key, but it does
                                   ;; give the email address in the JS object
                                   :email-override (:email_override b)))))
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
             (POST "/code" {body :body}
                   (response
                    (let [b (keywordize-keys body)
                          db-conn (db/conn)]
                      (demand-user-auth
                       db-conn
                       (:user_id b)
                       (:token b)
                       (coupons/code->value db-conn
                                            (s/upper-case (:code b))
                                            (:vehicle_id b)
                                            (:user_id b))))))
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
                       (dispatch/availability db-conn (:zip_code b) (:user_id b))))))))
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
  (context "/stats" []
           (wrap-basic-authentication
            (defroutes stats-routes
              (GET "/" []
                   (wrap-page (response (pages/dashboard (db/conn)
                                                         :read-only true)))))
            stats-auth?))
  (context "/twiml" []
           (defroutes twiml-routes
             (POST "/courier-new-order" []
                   (wrap-xml (response (pages/twiml-simple "Hello, Purple Courier. You have been assigned a new order, but have not begun the route. Please open the app to view the order details and begin the route. Thank you."))))))
  (GET "/download" {headers :headers}
       (redirect
        (if (.contains (str (get headers "user-agent")) "Android")
          "https://play.google.com/store/apps/details?id=com.purple.app"
          "https://itunes.apple.com/us/app/purple-services/id970824802")))
  (GET "/app" {headers :headers}
       (redirect
        (if (.contains (str (get headers "user-agent")) "Android")
          "https://play.google.com/store/apps/details?id=com.purple.app"
          "https://itunes.apple.com/us/app/purple-services/id970824802")))
  (GET "/terms" [] (wrap-page (response (pages/terms))))
  (GET "/ok" [] (response {:success true}))
  (GET "/" [] (wrap-page (response (pages/home))))
  (route/resources "/")
  (route/not-found (wrap-page (response (pages/not-found-page)))))

(def app
  (-> (handler/site app-routes)
      (wrap-cors :access-control-allow-origin [#".*"]
                 :access-control-allow-methods [:get :put :post :delete])
      (middleware/wrap-json-body)
      (middleware/wrap-json-response)))
