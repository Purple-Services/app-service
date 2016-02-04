(ns purple.handler
  (:use purple.util
        cheshire.core
        ring.util.response
        clojure.walk
        [purple.db :only [conn !select !insert !update mysql-escape-str]])
  (:require [purple.config :as config]
            [purple.users :as users]
            [purple.couriers :as couriers]
            [purple.orders :as orders]
            [purple.dispatch :as dispatch]
            [purple.coupons :as coupons]
            [purple.pages :as pages]
            [purple.analytics :as analytics]
            [purple.dashboard :as dashboard]
            [purple.zones :as zones]
            [clout.core :as clout]
            [compojure.core :refer :all]
            [compojure.handler :as handler]
            [compojure.route :as route]
            [clojure.string :as s]
            [ring.middleware.cors :refer [wrap-cors]]
            [ring.middleware.ssl :refer [wrap-ssl-redirect]]
            [ring.middleware.json :as middleware]
            [ring.middleware.cookies :refer [wrap-cookies]]
            [buddy.auth.accessrules :refer [wrap-access-rules]]))


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

(defn valid-session-wrapper?
  "Given a request, determine if the user-id has a valid session"
  [request]
  (let [cookies (keywordize-keys
                 ((resolve 'ring.middleware.cookies/parse-cookies) request))
        user-id (get-in cookies [:user-id :value])
        token   (get-in cookies [:token :value])]
    (users/valid-session? (conn) user-id token)))

(def login-rules
  [{:pattern #".*/dashboard/login" ; this route must always be allowed access
    :handler (constantly true)}
   {:pattern #".*/dashboard/logout" ; this route must always be allowed access
    :handler (constantly true)}
   {:pattern #".*/dashboard(/.*|$)"
    :handler valid-session-wrapper?
    :redirect "/dashboard/login"}])

;; if the route is omitted, it is accessible by all dashboard users
;; url AND method must be given, if one is missing, the route will be allowed!
;; login/logout should be unprotected!
;;
;; These routes are organized to match those under /dashboard
;; and follow the same conventions.
;;
;; A user who can access everything would have the following permissions:
;; #{"view-dash","view-couriers","edit-couriers","view-users","send-push",
;;  "view-coupons","edit-coupons","create-coupons","view-zones","edit-zones",
;;  "view-orders","edit-orders","download-stats"}
;;
(def dashboard-uri-permissions
  [
   ;;!! main dash
   {:uri "/dashboard/"
    :method "GET"
    :permissions ["view-dash"]}
   {:uri "/dashboard"
    :method "GET"
    :permissions ["view-dash"]}
   {:uri "/dashboard/dash-app"
    :method "GET"
    :permissions ["view-dash"]}
   {:uri "/dashboard/permissions"
    :method "GET"
    :permissions ["view-dash"]}
   ;;!! dash maps
   {:uri "/dashboard/dash-map-orders"
    :method "GET"
    :permissions ["view-orders" "view-zones"]}
   {:uri "/dashboard/dash-map-couriers"
    :method "GET"
    :permissions ["view-orders" "view-couriers" "view-zones"]}
   ;;!! couriers
   {:uri "/dashboard/courier/:id"
    :method "GET"
    :permissions ["view-couriers"]}
   {:uri "/dashboard/courier"
    :method "POST"
    :permissions ["edit-couriers"]}
   {:uri "/dashboard/couriers"
    :method "POST"
    :permissions ["view-couriers"]}
   ;;!! users
   {:uri "/dashboard/users"
    :method "GET"
    :permissions ["view-users" "view-orders"]}
   {:uri "/dashboard/users-count"
    :method "GET"
    :permissions ["view-users" "view-orders"]}
   {:uri "/dashboard/send-push-to-all-active-users"
    :method "POST"
    :permissions ["view-users" "send-push"]}
   {:uri "/dashboard/send-push-to-users-list"
    :method "POST"
    :permissions ["view-users" "send-push"]}
   ;;!! coupons
   {:uri "/dashboard/coupon/:code"
    :method "GET"
    :permissions ["view-coupons"]}
   {:uri "/dashboard/coupon"
    :method "PUT"
    :permissions ["edit-coupons"]}
   {:uri "/dashboard/coupon"
    :method "POST"
    :permissions ["create-coupons"]}
   {:uri "/dashboard/coupons"
    :method "GET"
    :permissions ["view-coupons"]}
   ;;!! zones
   {:uri "/dashboard/zone/:id"
    :method "GET"
    :permissions ["view-zones"]}
   {:uri "/dashboard/zone"
    :method "PUT"
    :permissions ["edit-zones"]}
   {:uri "/dashboard/zones"
    :method "GET"
    :permissions ["view-zones"]}
   {:uri "/dashboard/zctas"
    :method "POST"
    :permissions ["view-zones"]}
   ;;!! orders
   {:uri "/dashboard/order"
    :method "POST"
    :permissions ["view-orders"]}
   {:uri "/dashboard/cancel-order"
    :method "POST"
    :permissions ["edit-orders"]}
   {:uri "/dashboard/update-status"
    :method "POST"
    :permissions ["edit-orders"]}
   {:uri "/dashboard/assign-order"
    :method "POST"
    :permissions ["edit-orders"]}
   {:uri "/dashboard/orders-since-date"
    :method "POST"
    :permissions ["view-orders"]}
   ;;!! analytics
   {:uri "/dashboard/status-stats-csv"
    :method "GET"
    :permissions ["download-stats"]}
   {:uri "/dashboard/generate-stats-csv"
    :method "GET"
    :permissions ["download-stats"]}
   {:uri "/dashboard/download-stats-csv"
    :method "GET"
    :permissions ["download-stats"]}
   ])

(defn allowed?
  "Given a vector of uri-permission maps and a request map, determine if the
  user has permission to access the response of a request"
  [uri-permissions request]
  (let [cookies   (keywordize-keys
                   ((resolve 'ring.middleware.cookies/parse-cookies) request))
        user-id   (get-in cookies [:user-id :value])
        user-permission (dashboard/get-permissions (conn) user-id)
        uri       (:uri request)
        method    (-> request
                      :request-method
                      name
                      s/upper-case)
        uri-permission  (:permissions (first (filter #(and
                                                       (clout/route-matches
                                                        (:uri %) request)
                                                       (= method (:method %)))
                                                     uri-permissions)))
        user-uri-permission-compare (map #(contains? user-permission %)
                                         uri-permission )
        user-has-permission? (boolean (and (every? identity
                                                   user-uri-permission-compare)
                                           (seq user-uri-permission-compare)))]
    (cond (empty? uri-permission) ; no permission associated with uri, allow
          true
          :else user-has-permission?)))

(defn on-error
  [request value]
  {:status 403
   :header {}
   :body (str "You do not have permission to access " (:uri request))})

(def access-rules
  [{:pattern #".*/dashboard(/.*|$)"
    :handler (partial allowed? dashboard-uri-permissions)
    :on-error on-error}])

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
              ;; Try a coupon code
              (POST "/code" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (demand-user-auth
                        db-conn
                        (:user_id b)
                        (:token b)
                        (coupons/code->value db-conn
                                             (format-coupon-code (:code b))
                                             (:vehicle_id b)
                                             (:user_id b))))))
              ;; Get info about currently auth'd user
              (POST "/details" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (demand-user-auth
                        db-conn
                        (:user_id b)
                        (:token b)
                        (users/details db-conn
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
                                    (:order b))))))
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
                        (orders/cancel db-conn
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
  (context "/courier" []
           (wrap-force-ssl
            (defroutes courier-routes
              ;; Courier app periodically updates web service with their status
              (POST "/ping" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (demand-user-auth
                        db-conn
                        (:user_id b)
                        (:token b)
                        (dispatch/courier-ping db-conn
                                               (:user_id b)
                                               (if (nil? (:lat b))
                                                 0
                                                 (unless-p
                                                  Double/isNaN
                                                  (Double. (:lat b)) 0))
                                               (if (nil? (:lng b))
                                                 0
                                                 (unless-p
                                                  Double/isNaN
                                                  (Double. (:lng b)) 0))
                                               (or (:gallons b) 0)))))))))
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
  (context "/dashboard" []
           ;; the following convention is used for ordering dashboard
           ;; routes
           ;; 1. Routes are organized under groups (e.g. ;;!! group)
           ;;    and mirror the order of the dashboard navigation tabs.
           ;; 2. Requests that result in a single object come before
           ;;    those that potentially result in multiple objects.
           ;; 3. If there are multiple methods for the same route,
           ;;    list them in the order GET, PUT, POST
           ;; 4. Routes that don't fit a particular pattern are listed
           ;;    last
           ;; 5. Try to be logical and use your best judgement when these
           ;;    rules fail
           (wrap-force-ssl
            (defroutes dashboard-routes
              ;;!! main dash
              (GET "/" []
                   (-> (pages/dashboard (conn))
                       response
                       wrap-page))
              (GET "/permissions" {cookies :cookies}
                   (let [user-perms (dashboard/get-permissions
                                     (conn)
                                     (get-in cookies ["user-id" :value]))
                         accessible-routes (dashboard/accessible-routes
                                            dashboard-uri-permissions
                                            user-perms)]
                     (response (into [] accessible-routes))))
              (GET "/dash-app" []
                   (-> (pages/dash-app)
                       response
                       wrap-page))
              ;;!! login / logout
              (GET "/login" []
                   (-> (pages/dash-login)
                       response
                       wrap-page))
              (POST "/login" {body :body
                              headers :headers
                              remote-addr :remote-addr}
                    (response
                     (let [b (keywordize-keys body)]
                       (dashboard/login (conn) (:email b) (:password b)
                                        (or (get headers "x-forwarded-for")
                                            remote-addr)))))
              (GET "/logout" []
                   (-> (redirect "/dashboard/login")
                       (set-cookie "token" "null" {:max-age -1})
                       (set-cookie "user-id" "null" {:max-age -1})))
              ;;!! dash maps
              (GET "/dash-map-orders" []
                   (-> (pages/dash-map :callback-s
                                       "dashboard_cljs.core.init_map_orders")
                       response
                       wrap-page))
              (GET "/dash-map-couriers" []
                   (-> (pages/dash-map :callback-s
                                       "dashboard_cljs.core.init_map_couriers")
                       response
                       wrap-page))
              ;;!! couriers
              ;; return all couriers
              ;; get a courier by id
              (GET "/courier/:id" [id]
                   (let [db-conn (conn)]
                     (response
                      (into []
                            (->> (couriers/get-by-id db-conn id)
                                 list
                                 (users/include-user-data db-conn)
                                 (couriers/include-lateness db-conn))))))
              ;; update a courier
              ;; currently, only the zones can be updated
              (POST "/courier" {body :body}
                    (let [b (keywordize-keys body)
                          db-conn (conn)]
                      (response (users/update-courier-zones!
                                 db-conn
                                 (:id b)
                                 (:zones b)))))
              (POST "/couriers" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       {:couriers (->> (couriers/all-couriers db-conn)
                                       (users/include-user-data db-conn)
                                       (couriers/include-lateness db-conn))})))
              ;;!! users
              (GET "/users" []
                   (response
                    (into []
                          (users/dash-users (conn)))))
              (GET "/users-count" []
                   (response
                    (into []
                          (!select (conn) "users" ["COUNT(*) as total"] {}))))
              (POST "/send-push-to-all-active-users" {body :body}
                    (response
                     (let [b (keywordize-keys body)]
                       (pages/send-push-to-all-active-users (conn)
                                                            (:message b)))))
              (POST "/send-push-to-users-list" {body :body}
                    (response
                     (let [b (keywordize-keys body)]
                       (pages/send-push-to-users-list (conn)
                                                      (:message b)
                                                      (:user-ids b)))))
              ;;!! coupons
              ;; get a coupon by code
              (GET "/coupon/:code" [code]
                   (response
                    (into []
                          (->> (coupons/get-coupon-by-code (conn) code)
                               convert-timestamp
                               list))))
              ;; edit an existing coupon
              (PUT "/coupon" {body :body}
                   (let [b (keywordize-keys body)]
                     (response
                      (coupons/update-standard-coupon! (conn) b))))
              ;; create a new coupon
              (POST "/coupon" {body :body}
                    (let [b (keywordize-keys body)]
                      (response
                       (coupons/create-standard-coupon! (conn) b)
                       )))
              ;; get the current coupon codes
              (GET "/coupons" []
                   (response
                    (into []
                          (-> (coupons/coupons (conn))
                              (convert-timestamps)))))
              ;;!! zones
              ;; get a zone by its id
              (GET "/zone/:id" [id]
                   (response
                    (into []
                          (->> (zones/get-zone-by-id (conn) id)
                               (zones/read-zone-strings)
                               list))))
              ;; update a zone's description. Currently only supports
              ;; updating fuel_prices, service_fees and service_time_bracket
              (PUT "/zone" {body :body}
                   (let [b (keywordize-keys body)
                         db-conn (conn)]
                     (response
                      (zones/validate-and-update-zone! db-conn b))))
              ;; return all zones
              (GET "/zones" []
                   (response
                    ;; needed because cljs.reader/read-string can't handle
                    ;; keywords that begin with numbers
                    (mapv
                     #(assoc %
                             :fuel_prices (stringify-keys
                                           (read-string (:fuel_prices %)))
                             :service_fees (stringify-keys
                                            (read-string (:service_fees %)))
                             :service_time_bracket (read-string
                                                    (:service_time_bracket %)))
                     (into [] (dispatch/get-all-zones-from-db (conn))))))
              ;; return ZCTA defintions for zips
              (POST "/zctas" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       {:zctas
                        (dispatch/get-zctas-for-zips db-conn (:zips b))})))
              ;;!! orders
              ;; given an order id, get the detailed information for that
              ;; order
              (POST "/order"  {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (if (:id b)
                         (into []
                               (->>
                                [(orders/get-by-id db-conn
                                                   (:id b))]
                                (orders/include-user-name-phone-and-courier
                                 db-conn)
                                (orders/include-vehicle db-conn)
                                (orders/include-zone-info)
                                (orders/include-eta db-conn)
                                (orders/include-was-late)))
                         []))))
              ;; cancel the order
              (POST "/cancel-order" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (orders/cancel
                        db-conn
                        (:user_id b)
                        (:order_id b)
                        :origin-was-dashboard true
                        :notify-customer true
                        :suppress-user-details true
                        :override-cancellable-statuses
                        (conj config/cancellable-statuses "servicing")))))
              ;; admin updates status of order (e.g., Enroute -> Servicing)
              (POST "/update-status" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (orders/update-status-by-admin db-conn
                                                      (:order_id b)))))
              ;; admin assigns courier to an order
              (POST "/assign-order" {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (orders/assign-to-courier-by-admin db-conn
                                                          (:order_id b)
                                                          (:courier_id b)))))
              ;; given a date in the format YYYY-MM-DD, return all orders
              ;; that have occurred since then
              (POST "/orders-since-date"  {body :body}
                    (response
                     (let [b (keywordize-keys body)
                           db-conn (conn)]
                       (into [] (->>
                                 (orders/orders-since-date db-conn
                                                           (:date b)
                                                           (:unix-epoch? b))
                                 (orders/include-user-name-phone-and-courier
                                  db-conn)
                                 (orders/include-vehicle db-conn)
                                 (orders/include-zone-info)
                                 ;;(orders/include-eta db-conn)
                                 (orders/include-was-late)
                                 )))))
              ;;!! analytics
              (GET "/status-stats-csv" []
                   (response
                    (let [stats-file (java.io.File. "stats.csv")]
                      (if (> (.length stats-file) 0)
                        {:processing? false
                         :timestamp (quot (.lastModified stats-file)
                                          1000)}
                        {:processing? true}))))
              ;; generate analytics file
              (GET "/generate-stats-csv" []
                   (do (future (analytics/gen-stats-csv))
                       (response {:success true})))
              (GET "/download-stats-csv" []
                   (-> (response (java.io.File. "stats.csv"))
                       (header "Content-Type:"
                               "text/csv; name=\"stats.csv\"")
                       (header "Content-Disposition"
                               "attachment; filename=\"stats.csv\""))))))
  (context "/twiml" []
           (defroutes twiml-routes
             (POST "/courier-new-order" []
                   (-> (pages/twiml-simple config/delayed-assignment-message)
                       response
                       wrap-xml))))
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
      (wrap-access-rules {:rules access-rules})
      (wrap-access-rules {:rules login-rules})
      (wrap-cookies)
      (middleware/wrap-json-body)
      (middleware/wrap-json-response)))
