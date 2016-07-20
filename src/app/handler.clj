(ns app.handler
  (:require [common.util :refer [! unless-p ver< coerce-double]]
            [common.db :refer [conn]]
            [common.config :as config]
            [common.coupons :refer [format-coupon-code]]
            [common.orders :refer [cancel]]
            [common.users :refer [details send-feedback valid-session?]]
            [app.users :as users]
            [app.couriers :as couriers]
            [app.orders :as orders]
            [app.dispatch :as dispatch]
            [app.fleet :as fleet]
            [app.periodic :as periodic]
            [app.coupons :as coupons]
            [app.pages :as pages]
            [clojure.walk :refer [keywordize-keys]]
            [compojure.core :refer :all]
            [compojure.handler :as handler]
            [compojure.route :as route]
            [ring.middleware.cors :refer [wrap-cors]]
            [ring.middleware.json :as middleware]
            [ring.util.response :refer [header response redirect]]
            [ring.middleware.ssl :refer [wrap-ssl-redirect]]))

(defn wrap-page [resp]
  (header resp "Content-Type" "text/html; charset=utf-8"))

(defn wrap-xml [resp]
  (header resp "Content-Type" "text/xml; charset=utf-8"))

(defn wrap-force-ssl [resp]
  (if config/has-ssl?
    (wrap-ssl-redirect resp)
    resp))

(defmacro demand-user-auth
  [db-conn user-id token & body]
  `(if (valid-session? ~db-conn ~user-id ~token)
     (do ~@body)
     {:success false
      :message "Something's wrong. Please log out and log back in."}))

(defn redirect-to-app-download
  [headers]
  (redirect
   (if (.contains (str (get headers "user-agent")) "Android")
     "https://play.google.com/store/apps/details?id=com.purple.app"
     "https://itunes.apple.com/us/app/purple-services/id970824802")))

(defroutes app-routes
  (context "/user" []
           (wrap-force-ssl
            (defroutes user-routes
              (POST "/login" {body :body
                              headers :headers
                              remote-addr :remote-addr}
                    (response
                     (let [b (keywordize-keys body)]
                       (users/login (conn)
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
                                    :email-override (:email_override b)
                                    :client-ip (or (get headers "x-forwarded-for")
                                                   remote-addr)))))
              ;; Only for native users
              (POST "/register" {body :body
                                 headers :headers
                                 remote-addr :remote-addr}
                    (response
                     (let [b (keywordize-keys body)]
                       (users/register (conn)
                                       ;; 'platform_id' is email address
                                       (:platform_id b)
                                       ;; 'auth_key' is password
                                       (:auth_key b)
                                       :client-ip (or (get headers "x-forwarded-for")
                                                      remote-addr)))))
              ;; Only for native users
              (POST "/forgot-password" {body :body}
                    (response
                     (let [b (keywordize-keys body)]
                       (users/forgot-password (conn)
                                              ;; 'platform_id' is email address
                                              (:platform_id b)))))

              ;; Only for native users
              (GET "/reset-password/:key" [key]
                   (wrap-page (response (pages/reset-password (conn) key))))
              (POST "/reset-password" {body :body}
                    (response
                     (let [b (keywordize-keys body)]
                       (users/change-password (conn) (:key b) (:password b)))))
              (POST "/edit" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (demand-user-auth
                        db-conn
                        (:user_id b)
                        (:token b)
                        (users/edit db-conn
                                    (:user_id b)
                                    b)))))
              ;; Set up push notifications
              (POST "/add-sns" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (demand-user-auth
                        db-conn
                        (:user_id b)
                        (:token b)
                        (users/add-sns db-conn
                                       (:user_id b)
                                       (:push_platform b)
                                       (:cred b))))))
              (context "/subscriptions" []
                       (defroutes subscriptions-routes
                         ;; Subscribe to a membership plan
                         (POST "/subscribe" {body :body}
                               (response
                                (let [b (keywordize-keys body)
                                      db-conn (conn)]
                                  (demand-user-auth
                                   db-conn
                                   (:user_id b)
                                   (:token b)
                                   (users/subscribe db-conn
                                                    (:user_id b)
                                                    (:subscription_id b))))))
                         ;; update auto-renew setting
                         (POST "/set-auto-renew" {body :body}
                               (response
                                (let [b (keywordize-keys body)
                                      db-conn (conn)]
                                  (demand-user-auth
                                   db-conn
                                   (:user_id b)
                                   (:token b)
                                   (users/set-auto-renew
                                    db-conn
                                    (:user_id b)
                                    (:subscription_auto_renew b))))))))
              ;; Try a coupon code
              (POST "/code" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (demand-user-auth
                        db-conn
                        (:user_id b)
                        (:token b)
                        (coupons/code->value
                         db-conn
                         (format-coupon-code (:code b))
                         (:vehicle_id b)
                         (:user_id b)
                         (:address_zip b)
                         :bypass-zip-code-check
                         (ver< (or (:version b) "0")
                               "1.2.2"))))))
              ;; Get info about currently auth'd user
              (POST "/details" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (demand-user-auth
                        db-conn
                        (:user_id b)
                        (:token b)
                        (details db-conn
                                 (:user_id b)
                                 :user-meta {:app_version (:version b)
                                             :os (:os b)}))))))))
  (context "/orders" []
           (wrap-force-ssl
            (defroutes orders-routes
              (POST "/add" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (demand-user-auth
                        db-conn
                        (:user_id b)
                        (:token b)
                        (orders/add db-conn
                                    (:user_id b)
                                    (:order b)
                                    :bypass-zip-code-check
                                    (ver< (or (:version b) "0")
                                          "1.2.2"))))))
              (POST "/rate" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (demand-user-auth
                        db-conn
                        (:user_id b)
                        (:token b)
                        (orders/rate db-conn
                                     (:user_id b)
                                     (:order_id b)
                                     (:rating b))))))
              ;; Courier updates status of order (e.g., Enroute -> Servicing)
              (POST "/update-status-by-courier" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (demand-user-auth
                        db-conn
                        (:user_id b)
                        (:token b)
                        (orders/update-status-by-courier db-conn
                                                         (:user_id b)
                                                         (:order_id b)
                                                         (:status b))))))
              ;; Customer tries to cancel order
              (POST "/cancel" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (demand-user-auth
                        db-conn
                        (:user_id b)
                        (:token b)
                        (cancel db-conn
                                (:user_id b)
                                (:order_id b)))))))))
  (context "/dispatch" []
           (wrap-force-ssl
            (defroutes dispatch-routes
              ;; Get current gas price
              (POST "/gas-prices" {body :body}
                    (response
                     (let [b (keywordize-keys body)]
                       (dispatch/get-gas-prices (:zip_code b)))))
              ;; Check availability options for given params (location, etc.)
              (POST "/availability" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (demand-user-auth
                        db-conn
                        (:user_id b)
                        (:token b)
                        (dispatch/availability db-conn
                                               (:zip_code b)
                                               (:user_id b)))))))))
  (context "/fleet" [] ; B2B orders
           (wrap-force-ssl
            (defroutes fleet-routes
              (POST "/get-accounts" {body :body}
                    (response
                     (let [b (keywordize-keys body) db-conn (conn)]
                       (demand-user-auth
                        db-conn (:user_id b) (:token b)
                        (fleet/get-accounts
                         db-conn
                         (:user_id b)
                         (coerce-double (:lat b))
                         (coerce-double (:lng b)))))))
              (POST "/add-delivery" {body :body}
                    (response
                     (let [b (keywordize-keys body) db-conn (conn)]
                       (demand-user-auth
                        db-conn (:user_id b) (:token b)
                        (fleet/add-delivery db-conn
                                            (:account_id b)
                                            (:user_id b)
                                            (:vin b)
                                            (:license_plate b)
                                            (coerce-double (:gallons b))
                                            (:gas_type b)
                                            (:is_top_tier b)))))))))
  (context "/courier" []
           (wrap-force-ssl
            (defroutes courier-routes
              ;; Courier app periodically updates web service with their status
              (POST "/ping" {body :body}
                    (response
                     (let [b (keywordize-keys body) db-conn (conn)]
                       (demand-user-auth
                        db-conn (:user_id b) (:token b)
                        (couriers/ping db-conn
                                       (:user_id b)
                                       (:version b)
                                       (coerce-double (:lat b))
                                       (coerce-double (:lng b))
                                       (coerce-double (:87 (:gallons b)))
                                       (coerce-double (:91 (:gallons b)))
                                       (:set_on_duty b))))))
              (context "/gas-stations" []
                       (defroutes gas-stations-routes
                         (POST "/find" {body :body}
                               (response
                                (let [b (keywordize-keys body) db-conn (conn)]
                                  (demand-user-auth
                                   db-conn (:user_id b) (:token b)
                                   (couriers/get-stations
                                    db-conn
                                    (coerce-double (:lat b))
                                    (coerce-double (:lng b))
                                    (if (nil? (:dest_lat b))
                                      nil
                                      (coerce-double (:dest_lat b)))
                                    (if (nil? (:dest_lng b))
                                      nil
                                      (coerce-double (:dest_lng b))))))))
                         (POST "/blacklist" {body :body}
                               (response
                                (let [b (keywordize-keys body) db-conn (conn)]
                                  (demand-user-auth
                                   db-conn (:user_id b) (:token b)
                                   (couriers/blacklist-station db-conn
                                                               (:user_id b)
                                                               (:station_id b)
                                                               (:reason b)))))))))))
  (context "/feedback" []
           (wrap-force-ssl
            (defroutes feedback-routes
              (POST "/send" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       ;; they don't have to send user auth
                       ;; but if they do, it should be correct
                       (if-not (nil? (:user_id b))
                         (demand-user-auth
                          db-conn
                          (:user_id b)
                          (:token b)
                          (send-feedback (:text b)
                                         :user_id (:user_id b)))
                         (send-feedback (:text b)))))))))
  (context "/invite" []
           (wrap-force-ssl
            (defroutes invite-routes
              ;; I don't think this is being used anymore.
              ;; But keep it for a while because of old versions of app.
              (POST "/send" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       ;; they don't have to send user auth
                       ;; but if they do, it should be correct
                       (if-not (nil? (:user_id b))
                         (demand-user-auth
                          db-conn
                          (:user_id b)
                          (:token b)
                          (users/send-invite db-conn
                                             (:email b)
                                             :user_id (:user_id b)))
                         (users/send-invite db-conn
                                            (:email b)))))))))
  (context "/twiml" []
           (defroutes twiml-routes
             (POST "/courier-new-order" []
                   (-> (pages/twiml-voice config/delayed-assignment-message)
                       response
                       wrap-xml))
             (POST "/default-text-response" []
                   (-> (pages/twiml-text "Sorry, messages sent to this number are not seen by Purple staff.")
                       response
                       wrap-xml))))
  (GET "/download" {headers :headers}
       (redirect-to-app-download headers))
  (GET "/app" {headers :headers}
       (redirect-to-app-download headers))
  (GET "/app-link" {headers :headers}
       (if (re-find #"Android|iPhone|iPad|iPod"
                    (str (get headers "user-agent")))
         (redirect "purpleapp://")
         (redirect "http://purpleapp.com")))
  (GET "/app-link/:path" [path :as {headers :headers}]
       (if (re-find #"Android|iPhone|iPad|iPod"
                    (str (get headers "user-agent")))
         (redirect (str "purpleapp://" path))
         (redirect "http://purpleapp.com")))
  (GET "/courierapp" []
       (redirect "https://build.phonegap.com/apps/1205677/install/kP_AVprocspwUdewxfht"))
  (GET "/terms" [] (wrap-page (response (pages/terms))))
  (GET "/ok" [] (response {:success true}))
  (GET "/" [] (redirect "http://purpleapp.com"))
  (route/resources "/")
  (route/not-found (wrap-page (response (pages/not-found-page)))))

(def app
  (-> (handler/site app-routes)
      (wrap-cors :access-control-allow-origin [#".*"]
                 :access-control-allow-methods [:get :put :post :delete])
      (middleware/wrap-json-body)
      (middleware/wrap-json-response)))

(! (periodic/init))
