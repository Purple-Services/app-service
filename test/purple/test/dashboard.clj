(ns purple.test.dashboard
  (:require [ring.adapter.jetty :refer [run-jetty]]
            [purple.handler :refer [app]]
            [purple.db :refer [!select]]
            [purple.dispatch :as dispatch]
            [purple.test.db :refer [ebdb-test-config
                                    setup-ebdb-test-pool!
                                    clear-test-database]]
            [purple.test.orders :as orders]
            [clojure.test :refer [use-fixtures deftest is test-ns testing]]
            [clj-webdriver.taxi :refer :all]
            [purple.util :refer [split-on-comma]]))

;; normally, the test server runs on port 3000. If you would like to manually
;; run tests, you can set this to (def test-port 3000) in the repl
;; just reload this file (C-c C-l in cider) when running
;; (test-ns 'purple.test.dashboard)
(def test-port 5744)
(def test-host "localhost")
(def user "purpleadmin")
(def password "gasdelivery8791")
(def test-base-url (str "http://" test-host ":" test-port "/"))

;; the fixtures setup are based off of
;; https://semaphoreci.com/community/tutorials/testing-clojure-web-applications-with-selenium
(defn start-server [port]
  (do
    ;; setup the app to use the ebdb_test database
    (setup-ebdb-test-pool!)
    (loop [server (run-jetty app {:port port, :join? false})]
      (if (.isStarted server)
        server
        (recur server)))))

(defn stop-server [server]
  (do
    (clear-test-database)
    (.stop server)))

(defn with-server [t]
  (let [server (start-server test-port)]
    (t)
    (stop-server server)))

(defn start-browser []
  (set-driver! {:browser :chrome}))

(defn stop-browser []
  (quit))

(defn with-browser [t]
  (start-browser)
  (t)
  (stop-browser))

(use-fixtures :once with-browser with-server)

;; this function is used to slow down clojure so the browser has time to catch
;; up. If you are having problems with tests passing, particuarly if they appear
;; to randomly fail, try increasing the amount of sleep time before the call
;; that is failing
(defn sleep
  "Sleep for ms."
  [& [ms]]
  (let [default-ms 700
        time (or ms default-ms)]
    (Thread/sleep time)))

(defn go-to-dashboard
  "Navigate to the dashboard"
  []
  (to (str
       "http://" user ":" password "@" test-host ":" test-port "/dashboard")))

(defn wait-until-alert-text
  "Wait until there is an alert with text"
  [text]
  (wait-until #(= (alert-text) text)))

(defn cancel-order
  "Cancel the most recently added order"
  []
  (click ".cancel-order")
  (wait-until #(= (alert-text) (str "Are you sure you want to cancel this order?"
                                    " (this cannot be undone) (customer will be"
                                    " notified via push notification)")))
  (accept)
  (wait-until #(= (alert-text) "Order cancelled!"))
  (accept))

(defn fully-cycle-order
  "Cycle through the first order with an unassigned status from accepted
  to completed. This assumes the courier has already been assigned the order
  and the order has a status of 'acccepted'."
  []
  (let [order-id     (attribute {:css "input.advance-status"} :data-order-id)
        order-status #(text (find-element
                             {:xpath (str "//input[@data-order-id='"
                                          order-id
                                          "']//..")}))]
    (is (= (order-status) "accepted"))
    ;; accepted -> enroute
    (click "input.advance-status")
    (wait-until-alert-text
     (str "Are you sure you want to mark this order as"
          " Enroute? (this cannot be undone) "
          "(customer will be notified via push notification)"))
    (accept)
    (wait-until #(= (order-status) "enroute"))
    ;; enroute -> servicing
    (click "input.advance-status")
    (wait-until-alert-text
     (str "Are you sure you want to mark this order as"
          " Servicing? (this cannot be undone) "
          "(customer will be notified via push notification)"))
    (accept)
    (wait-until #(= (order-status) "servicing"))
    ;; servicing -> complete
    (click "input.advance-status")
    (wait-until-alert-text
     (str "Are you sure you want to mark this order as"
          " Complete? (this cannot be undone)"
          " (customer will be notified via push notification)"))
    (accept)
    (wait-until-alert-text
     (str "The order has been marked as Complete. Refreshing page."))
    (accept)
    ;; the order status of 'complete' is not checked because there is
    ;; currently no way to determine which tr corresponds to an order-id
    ;;(is (= (order-status) "complete"))
    ))

(defn assign-courier
  "Assign courier-name to the first route open in the dashboard. Returns the
  courier's id value"
  [courier-name]
  (let [courier-id (value (select-option
                           {:xpath
                            (str "//td[text()='unassigned']/..//"
                                 "select[@class='assign-courier']")}
                           {:text courier-name}))]
    (click {:xpath "//td[text()='unassigned']/..//"
            "input[@class='assign-courier']"})
    (wait-until-alert-text (str "Are you sure you want to assign this order to "
                                courier-name
                                "? (this cannot be undone) "
                                " (courier(s) will be notified via push"
                                " notification)"))
    (accept)
    (wait-until-alert-text
     (str "This order has been assigned to Test Courier1"))
    (accept)
    courier-id))

(defn is-courier-busy?
  "Is the text inside of the td.busy element in table#couriers for courier
  'Yes'?"
  [courier]
  (boolean
   (= "Yes" (text (find-element {:xpath (str "//table[@id='couriers']"
                                             "//td[text()='"
                                             courier
                                             "']"
                                             "/../td[@class='busy']")})))))

(defn get-zone-text-input
  [zone-id class]
  "Given a zone-id number, get the related text input"
  (find-element {:xpath (str
                         "//td[@class='"
                         class
                         "']/input[@data-id='"
                         zone-id
                         "']")}))

(defn get-zip-with-zone-id
  [zone-id]
  (first (split-on-comma (text (find-element-under
                                (get-zone-text-input zone-id "87-price")
                                {:xpath "../../td[@class='zips']"})))))

(defn test-zone-modification
  "Test that the input with class for zone-id can be modified
and the new value is equal to comp-fn"
  [zone-id class comp-fn]
  (go-to-dashboard)
  (click "input.edit-zones")
  (let [input      (get-zone-text-input zone-id class)
        number     (read-string (value input))
        number-new (inc number)
        ]
    (clear input)
    (input-text input (str number-new))
    (click "input.save-zones")
    (accept)
    (is (= number-new
           (comp-fn)))))



;; main test functions
(defn dashboard-greeting
  []
  (testing "make sure that the dashboard is accessible"
    (go-to-dashboard)
    (is (exists? "#last-updated"))))

;; tests below assume all orders in the dashboard have a status of
;; complete or cancelled
(defn add-order-and-cancel-it
  []
  (testing "Add an order an cancel it in the dashboard"
    (orders/add-order (orders/test-order ebdb-test-config) ebdb-test-config)
    (go-to-dashboard)
    (cancel-order)))

(defn add-order-assign-and-cancel
  []
  (testing "Add an order, assign it a courier and then cancel it"
    (orders/add-order (orders/test-order ebdb-test-config) ebdb-test-config)
    (go-to-dashboard)
    (assign-courier "Test Courier1")
    (is (true? (is-courier-busy? "Test Courier1")))
    (cancel-order)
    (is (false? (is-courier-busy? "Test Courier1")))))

(defn order-is-added-assigned-and-cycled
  []
  (testing "An order is added, assigned to 'Test Courier1' and
the status cycled through. Courier is checked for proper busy status"
    (orders/add-order (orders/test-order ebdb-test-config) ebdb-test-config)
    (go-to-dashboard)
    ;; assign the courier
    (assign-courier "Test Courier1")
    ;; give the browser time to catch up
    ;; check to see that the courier is busy
    (is (true? (is-courier-busy? "Test Courier1")))
    ;; cycle through the first order
    (fully-cycle-order)
    ;; check to see that courier is NOT busy
    (is (false? (is-courier-busy? "Test Courier1")))
    ;; the server will be brought down by the fixture before
    ;; the browser responds, so let it sleep a bit
    ))

(defn two-orders-are-added-to-courier-and-cycled
  []
  (testing "Two orders are added, two are assigned to 'Test Courier1',
both are cycled and the busy status of the courier is checked"
    ;; add two orders
    (orders/add-order (orders/test-order ebdb-test-config) ebdb-test-config)
    (orders/add-order (orders/test-order ebdb-test-config) ebdb-test-config)
    (go-to-dashboard)
    (assign-courier "Test Courier1")
    (is (true? (is-courier-busy? "Test Courier1")))
    (assign-courier "Test Courier1")
    ;; cycle through the first order
    (fully-cycle-order)
    (is (true? (is-courier-busy? "Test Courier1")))
    ;; cycle through the second order
    (fully-cycle-order)
    ;; all orders are cleared, the courier should
    ;; no longer be busy
    (is (false? (is-courier-busy? "Test Courier1")))))


(defn modify-zone-price
  []
  (testing "Make sure that the zone price can be modifed and saved."
    (let [zone-id 1]
      (test-zone-modification
       zone-id "87-price" #(:87
                            (dispatch/get-fuel-prices
                             (get-zip-with-zone-id zone-id)))))))

(defn modify-zone-service-fee
  []
  (testing "Make sure that the zone service fee can be modified and saved."
    (let [zone-id 2]
      (test-zone-modification
       zone-id "1-hr-fee" #(:60 (dispatch/get-service-fees
                                 (get-zip-with-zone-id zone-id)))))))

(defn modify-zone-time-bracket
  []
  (testing "Make sure that the zone time bracket can be modified and saved."
    (let [zone-id 3]
      (test-zone-modification
       zone-id "service-start" #(first (dispatch/get-service-time-bracket
                                        (get-zip-with-zone-id zone-id)))))))

(defn courier-phone-number-present
  []
  (testing "A courier's correct phone number is displayed in the dashboard"
    (let [courier-name "Test Courier1"
          phone-number (-> (!select ebdb-test-config "users" [:phone_number]
                                    {:name courier-name})
                           first
                           :phone_number)]
      (is (= phone-number
             (text
              (find-element
               {:xpath (str "//table[@id='couriers']//"
                            "td[text()='"
                            courier-name
                            "']/../"
                            "td[@class='courier_phone_number']")})))))))

(deftest test-dashboard
  (dashboard-greeting)
  (add-order-and-cancel-it)
  (add-order-assign-and-cancel)
  (order-is-added-assigned-and-cycled)
  (two-orders-are-added-to-courier-and-cycled)
  (modify-zone-price)
  (modify-zone-service-fee)
  (modify-zone-time-bracket)
  (courier-phone-number-present))
