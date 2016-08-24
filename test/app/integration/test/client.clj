(_

 (ns app.integration.test.client
  (:require [clj-webdriver.taxi :refer :all]
            [clj-webdriver.driver :refer [init-driver]]
            [app.integration.test.dashboard :refer
             [sleep wait-until-alert-text
              start-server stop-server]]
            [common.users :refer [get-user-by-id get-user]]
            [app.test.db :refer [db-config]]
            [clojure.java.jdbc :as jdbc]
            [clojure.test :refer [use-fixtures deftest is test-ns testing
                                  run-tests]]
            [environ.core :refer [env]])
  (:import [org.openqa.selenium.chrome ChromeOptions ChromeDriver]
           [org.openqa.selenium.remote DesiredCapabilities]
           [org.openqa.selenium.support.ui ExpectedConditions]
           [org.openqa.selenium.support.ui WebDriverWait]))

(defn start-browser
  "Start the browser the web security disabled for local development"
  []
  (let [options      (ChromeOptions. )
        capabilities (DesiredCapabilities. )]
    (.addArguments options (into-array ["--disable-web-security"]))
    (.setCapability capabilities "locationContextEnabled" true)
    (.setCapability capabilities ChromeOptions/CAPABILITY options)
    (set-driver! (init-driver (ChromeDriver. capabilities)))))

(defn stop-browser
  []
  (quit))

(defn with-browser
  [t]
  (start-browser)
  (t)
  (stop-browser))

;; the client app is currently configured to use port 3000
(def test-port 4000)

(defn with-server [t]
  (let [server (start-server test-port)]
    (t)
    (stop-server server)))


(use-fixtures :once with-browser with-server)
;; keeping this in place as proof it doesn't work
;; should work, in "theory", the science,however, is that it does not
;; see: http://goo.gl/mNEGZ7
(defn wait-until-clickable
  [q]
  (let [wait      (WebDriverWait. (:webdriver *driver*) 2)
        el        (:webelement (find-element q))
        condition (ExpectedConditions/elementToBeClickable el)
        ]
    (.until wait condition)))

(defn go-to-client
  "Go to the client"
  []
  (to "file:///Users/james/PurpleInc/app/index.html"))

(defn login-page
  []
  "Go to login screen, optionally logging out a current user "
  (go-to-client)
  (click ".menuButton")
  (sleep 500) ; hopefully this can be replaced
  (let [login-button   {:xpath "//div[text()='Login']"}
        account-button {:xpath "//div[text()='Account']"}]
    (cond
      ;; if it is a login button, just go the login screen
      (displayed? login-button)
      (click login-button)
      ;; if a user is already logged in, log them out
      (displayed? account-button)
      (do (click account-button)
          (sleep 500)
          (click {:xpath "//span[text()='Logout']"})))
    ;; make sure the email field is displayed
    (wait-until #(exists? {:xpath "//input[@type='email']"}))))

(defn account-name-and-number-check
  [name number]
  (go-to-client)
  (click ".menuButton")
  (sleep 500)
  (click {:xpath "//div[text()='Account']"})
  (is (= name (value {:xpath "//input[@name='name']"})))
  (is (= number (value {:xpath "//input[@name='phone_number']"}))))


(defn login-client
  "Logout and login with the client using email and password as credentials"
  [email password]
  (login-page)
  (let [email-input    (find-element {:xpath "//input[@type='email']"})
        password-input (find-element {:xpath "//input[@type='password']"})]
    (input-text email-input email)
    (input-text password-input password)
    (click (find-element {:xpath "//span[text()='Log in']"}))))

(defn go-to-location
  "Change to location"
  [location]
  (go-to-client)
  (click ".menuButton")
  (sleep 200) ; not optimal
  ;;(click {:xpath "//div[text()='Request Gas']"})
  (click {:xpath "//div[@id='ext-input-1']"})
  (input-text {:xpath "//input[@name='request_address']"} location)
  (sleep 200)
  (click {:xpath (str "//div[text()='" location "']")}))


(defn request-gas
  []
  (let [request-gas   {:xpath "//span[text()='Request Gas']"}
        review-order  {:xpath "//span[text()='Review Order']"}
        confirm-order {:xpath "//span[text()='Confirm Order']"}]
    ;; wait until the request-gas button is visible
    (wait-until #(visible? request-gas))
    ;; still need to sleep here
    (sleep 300)
    (click request-gas)
    ;;(accept)
    (wait-until #(exists? review-order))
    (click review-order)
    (wait-until #(exists? confirm-order))
    (click confirm-order)
    (wait-until-alert-text (str "Uncaught TypeError: Cannot read property"
                                " 'alert' of undefined 1"))
    (accept)))

(defn request-gas-in-location
  "Set the location and request gas"
  [location]
  (go-to-client)
  (go-to-location location)
  (request-gas))


(defn cancel-first-unassigned-order
  "Cancel the first order in a customer's que that is unassigned"
  []
  (go-to-client)
  (click ".menuButton")
  (sleep 300)
  (click {:xpath "//div[text()='Orders']"})
  (sleep 300)
  (let [order-id (->> (-> {:xpath "//div[contains(@class,'status-unassigned')]"}
                          (find-elements)
                          first
                          (attribute :id))
                      (re-find  #"oid_(\w+$)")
                      second)]
    (execute-script (str "util.ctl('Orders').cancelOrder('" order-id "');"))))

(defn find-visible
  "Given a query, return the first visible webelement. This is used to get
around Sencha's dom mirroring"
  [q]
  (->> q
       find-elements
       (filter visible?)
       first))

(defn create-account
  "Create a native account"
  [email password full-name phone-number]
  (login-page)
  (let [create-account     {:xpath "//span[text()='Create Account']"}
        email-field        {:xpath "//input[@name='email_address']"}
        password-field     {:xpath "//input[@name='password']"}
        full-name-field    {:xpath "//input[@name='name']"}
        phone-number-field {:xpath "//input[@name='phone_number']"}
        register           {:xpath "//span[text()='Register']"}
        create-account     {:xpath "//span[text()='Create Account']"}]
    (wait-until #(exists? create-account))
    (click create-account)
    (wait-until #(exists? email-field))
    (input-text email-field email)
    (input-text password-field password)
    (click (find-visible register))
    (wait-until #(not (nil? (find-visible full-name-field))))
    (wait-until #(empty? (value (find-visible full-name-field))))
    (input-text (find-visible full-name-field) full-name)
    (input-text (find-visible phone-number-field) phone-number)
    (wait-until #(= (value (find-visible phone-number-field)) phone-number ))
    (click (find-visible create-account))
    ;; make sure the new user was logged in before continuing
    (wait-until
     #(not (nil?(find-visible {:xpath "//span[text()='Request Gas']"}))))))

(defn delete-user-with-email
  "delete the user with email"
  [db-conn email]
  (jdbc/with-connection db-config
    (jdbc/delete-rows :users ["email = ?" email])))

(defn add-vehicle
  [year make model color license-plate]
  (go-to-client)
  (click ".menuButton")
  ;; because the menu takes a bit to slide over, sleep for a bit
  (sleep 300)
  (click {:xpath "//div[text()='Vehicles']"})
  (click {:xpath "//span[text()='Add Vehicle']"})
  ;; click the year selection
  (click (find-element {:xpath "//input[@name='year']/.."}))
  ;; select the year
  (drag-and-drop-by
   (find-element {:xpath (str "//span[text()='" year "']")}) {:x 0 :y 1 })
  (sleep 300)
  ;; click the make selection
  (click (find-element {:xpath "//input[@name='make']/.."}))
  ;; select the make
  (drag-and-drop-by
   (find-element {:xpath (str "//span[text()='" make "']")}) {:x 0 :y 1 })
  ;; select the model
  (sleep 300)
  (click (find-element {:xpath "//input[@name='model']/.."}))
  (sleep 300)
  (drag-and-drop-by
   (find-element {:xpath (str "//span[text()='" model "']")}) {:x 0 :y 1 })
  ;; select the color
  (sleep 300)
  (click (find-element {:xpath "//input[@name='color']/.."}))
  (sleep 300)
  (drag-and-drop-by
   (find-element {:xpath (str "//span[text()='" color "']")}) {:x 0 :y 1 })
  ;; add the license plate
  (sleep 300)
  (input-text {:xpath "//input[@name='license_plate']"} license-plate)
  ;; save the changes
  (click {:xpath "//span[text()='Save Changes']"}))

(defn delete-vehicle-with-license-plate
  [db-conn license-plate]
  (jdbc/with-connection db-config
    (jdbc/delete-rows :vehicles ["license_plate = ?" license-plate])))


(defn add-card
  "Add a payment method. exp-month-name is of the form January, February, ...,
  December"
  [card-number exp-month-name exp-year cvc]
  ;; go the the main page
  (go-to-client)
  (click ".menuButton")
  ;; Go to account
  (sleep 300)
  (click {:xpath "//div[text()='Account']"})
  ;; Add the payment method
  (click {:xpath "//div[@id='accountPaymentMethodField']"})
  (click {:xpath "//span[text()='Add Card']"})
  ;; enter card number e.g. 4242424242424242
  (input-text {:xpath "//input[@name='card_number']"} card-number)
  ;;enter exp. month name
  (click {:xpath "//span[text()='Exp. Month']/../.."})
  (drag-and-drop-by
   {:xpath (str "//span[contains(text(),'" exp-month-name "')]")} {:x 0 :y 1})
  ;;enter exp. year
  (sleep 300)
  (click {:xpath "//span[text()='Exp. Year']/../.."})
  (drag-and-drop-by
   {:xpath (str "//span[contains(text(),'" exp-year "')]")} {:x 0 :y 1})
  ;; enter cvc
  (input-text {:xpath "//input[@name='card_cvc']"} "123")
  (sleep 300)
  ;; save the card
  (click {:xpath "//span[text()='Save Changes']"})
  ;; wait until we are back at payment methods, this could take awhile
  (wait-until #(visible? {:xpath "//div[text()='Payment Methods']"}) 20000))

(defn delete-card-by-last-four-digits
  [last-four]
  ;; go the the main page
  (go-to-client)
  (click ".menuButton")
  ;; Go to account
  (sleep 300)
  (click {:xpath "//div[text()='Account']"})
  (click {:xpath "//span[text()='Payment']/../.."})
  ;; check that the card exists
  (wait-until
   (exists? {:xpath (str "//span[contains(text(),'" last-four "')]")}))
  (is (exists? {:xpath (str "//span[contains(text(),'" last-four "')]")}))
  ;; get the card id
  (wait-until
   (exists? {:xpath (str "//span[contains(text(),'" last-four "')]/../..")}))
  (let [card-id
        (re-find
         #"card_\w+$"
         (attribute
          {:xpath (str "//span[contains(text(),'" last-four "')]/../..")} :id))]
    (execute-script
     (str "util.ctl('PaymentMethods').deleteCard('" card-id "');")))
  ;; wait until the card is removed
  (wait-until
   #(not
     (exists? {:xpath (str "//span[contains(text(),'" last-four "')]")})) 10000)
  ;; check that the card has been deleted
  (is (not
       (exists? {:xpath (str "//span[contains(text(),'" last-four "')]")}))))

;; test that a user can be created, a vehicle added, a card added and an order
;; placed in beverly hills, ca
(deftest ^:integration client-user-test
  (let [email          "foo@bar.com"
        password       "password"
        full-name      "Foo Bar"
        phone-number   "800-555-1212"
        year           "2015"
        make           "Honda"
        model          "Civic"
        color          "White"
        license-plate  "FOOBAR"
        card-number    "4242424242424242"
        exp-month-name "January"
        exp-year       "2017"
        cvc            "123"
        gas-location   "Beverly Hills"]
    ;; add the user foobar
    (create-account email password full-name phone-number)
    ;; make sure the account name and number are correct
    (account-name-and-number-check full-name phone-number)
    ;; add a vehicle
    (add-vehicle year make model color license-plate)
    ;; add a credit card
    (add-card card-number exp-month-name exp-year cvc)
    ;; request gas in Beverly Hills
    (request-gas-in-location gas-location)
    ;; cancel the order
    (cancel-first-unassigned-order)
    ;; delete the credit card
    (delete-card-by-last-four-digits "4242")
    ;; delete the vehicle
    (delete-vehicle-with-license-plate db-config license-plate)
    ;; delete the user
    (delete-user-with-email db-config email)))

(defn quick-delete
  []
  (delete-card-by-last-four-digits "4242")
  (delete-vehicle-with-license-plate db-config "FOOBAR")
  (delete-user-with-email db-config "foo@bar.com"))

)
