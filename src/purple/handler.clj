(ns purple.handler
  (:use purple.util
        cheshire.core
        ring.util.response
        clojure.walk
        [purple.db :only [conn !select !insert !update mysql-escape-str]])
  (:require [purple.config :as config]
            [purple.users :as users]
            [purple.orders :as orders]
            [purple.dispatch :as dispatch]
            [purple.coupons :as coupons]
            [purple.pages :as pages]
            [purple.analytics :as analytics]
            [compojure.core :refer :all]
            [compojure.handler :as handler]
            [compojure.route :as route]
            [clojure.string :as s]
            [ring.middleware.cors :refer [wrap-cors]]
            [ring.middleware.json :as middleware]
            [ring.middleware.basic-authentication :refer [wrap-basic-authentication]]))

(defn dashboard-auth?
  [username password]
  (and (= (:username config/basic-auth-admin) username)
       (= (:password config/basic-auth-admin) password)))

(defn stats-auth?
  [username password]
  (and (= (:username config/basic-auth-read-only) username)
       (= (:password config/basic-auth-read-only) password)))

(defn wrap-page [resp]
  (header resp "Content-Type" "text/html; charset=utf-8"))

(defn wrap-xml [resp]
  (header resp "Content-Type" "text/xml; charset=utf-8"))

(defmacro demand-user-auth
  [db-conn user-id token & body]
  `(if (users/valid-session? ~db-conn ~user-id ~token)
     (do ~@body)
     {:success false
      :message "Something's wrong. Please log out and log back in."}))

(defn redirect-to-app-download
  [headers]
  (redirect
   (if (.contains (str (get headers "user-agent")) "Android")
     "https://play.google.com/store/apps/details?id=com.purple.app"
     "https://itunes.apple.com/us/app/purple-services/id970824802")))

(def down-resp {:success false
                :message "Sorry, we are currently updating our system. We will resume service within two hours."})

(defroutes app-routes
  (context "/user" []
           (defroutes user-routes
             (POST "/login" {body :body
                             headers :headers
                             remote-addr :remote-addr}
                   (response down-resp))
             ;; Only for native users
             (POST "/register" {body :body
                                headers :headers
                                remote-addr :remote-addr}
                   (response down-resp))
             ;; Only for native users
             (POST "/forgot-password" {body :body}
                   (response down-resp))

             ;; Only for native users
             (GET "/reset-password/:key" [key]
                  (wrap-page (response down-resp)))
             (POST "/reset-password" {body :body}
                   (response down-resp))
             
             ;; You can send in one :user and/or one :vehicle key to edit those
             (POST "/edit" {body :body}
                   (response down-resp))
             ;; Set up push notifications
             (POST "/add-sns" {body :body}
                   (response down-resp))
             ;; Try a coupon code
             (POST "/code" {body :body}
                   (response down-resp))
             ;; Get info about currently auth'd user
             (POST "/details" {body :body}
                   (response down-resp))))
  (context "/orders" []
           (defroutes orders-routes
             (POST "/add" {body :body}
                   (response down-resp))
             (POST "/rate" {body :body}
                   (response down-resp))
             ;; Courier updates status of order (e.g., Enroute -> Servicing)
             (POST "/update-status-by-courier" {body :body}
                   (response down-resp))
             ;; Customer tries to cancel order
             (POST "/cancel" {body :body}
                   (response down-resp))))
  (context "/dispatch" []
           (defroutes dispatch-routes
             ;; Get current gas price
             (POST "/gas-prices" {body :body}
                   (response down-resp))
             ;; Check availability options for given params (location, etc.)
             (POST "/availability" {body :body}
                   (response down-resp))))
  (context "/courier" []
           (defroutes courier-routes
             ;; Courier app periodically updates web service with their status
             (POST "/ping" {body :body}
                   (response down-resp))))
  (context "/feedback" []
           (defroutes feedback-routes
             (POST "/send" {body :body}
                   (response down-resp))))
  (context "/invite" []
           (defroutes invite-routes
             ;; I don't think this is being used anymore.
             ;; But keep it for a while because of old versions of app.
             (POST "/send" {body :body}
                   (response down-resp))))
  (context "/dashboard" []
           (wrap-basic-authentication
            (defroutes dashboard-routes
              (GET "/" []
                   (-> "Down for maintenance."
                       response
                       wrap-page))
              (GET "/all" []
                   (-> "Down for maintenance."
                       response
                       wrap-page))
              (GET "/declined" []
                   (-> "Down for maintenance."
                       response
                       wrap-page))
              (POST "/send-push-to-all-active-users" {body :body}
                    (response down-resp))
              (POST "/send-push-to-users-list" {body :body}
                    (response down-resp))
              ;; Dashboard admin cancels order
              (POST "/cancel-order" {body :body}
                    ;; cancel the order
                    (response down-resp))
              ;; admin updates status of order (e.g., Enroute -> Servicing)
              (POST "/update-status" {body :body}
                    (response down-resp))
              ;; admin assigns courier to an order
              (POST "/assign-order" {body :body}
                    (response down-resp))
              ;; update a zones description. Currently only supports
              ;; updating fuel_prices, service_fees and service_time_bracket
              (POST "/update-zone" {body :body}
                    (response down-resp))
              ;; update a courier's assigned zones
              (POST "/update-courier-zones" {body :body}
                    (response down-resp))
              (GET "/dash-map" []
                   (-> "Down for maintenance." 
                       response
                       wrap-page))
              ;; given a date in the format YYYY-MM-DD, return all orders
              ;; that have occurred since then
              (POST "/orders-since-date"  {body :body}
                    (response down-resp)))
            dashboard-auth?))
  (context "/stats" []
           (wrap-basic-authentication
            (defroutes stats-routes
              (GET "/" []
                   (-> "Down for maintenance."
                       response
                       wrap-page))
              (GET "/all" []
                   (-> "Down for maintenance."
                       response
                       wrap-page))
              (GET "/declined" []
                   (-> "Down for maintenance."
                       response
                       wrap-page))
              (GET "/dash-map" []
                   (-> "Down for maintenance."
                       response
                       wrap-page))
              ;; given a date in the format YYYY-MM-DD, return all orders
              ;; that have occurred since then
              (POST "/orders-since-date"  {body :body}
                    (response down-resp)))
            stats-auth?))
  (GET "/download" {headers :headers}
       (redirect-to-app-download headers))
  (GET "/app" {headers :headers}
       (redirect-to-app-download headers))
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
