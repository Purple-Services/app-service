(ns app.test.payment
  (:use cheshire.core)
  (:require [clojure.test :refer [use-fixtures deftest is test-ns testing]]
            [common.config :as config]
            [common.util :refer [rand-str-alpha-num]]
            [common.db :refer [conn]]
            [common.users :refer [get-user-by-id get-user]]
            [common.payment :refer [stripe-req]]
            [app.users :as users]
            [app.handler :refer :all]
            [app.test.db-tools :refer [database-fixture ebdb-test-config]]))

(def test-user-id (atom ""))

(defn add-test-user
  [user-id-atom]
  (let [user (users/register ebdb-test-config
                             (str "paytest"
                                  (rand-str-alpha-num 10)
                                  "@test.com")
                             "qwerty123"
                             :client-ip "127.0.0.1")
        user-id (:id (:user user))]
    (reset! user-id-atom user-id)))

(use-fixtures :once
  database-fixture
  #(do (run! add-test-user [test-user-id]) (%)))

;; TODO - test:
;; add card
;; charge user (use function in app.users)
;; add card
;; set default card to first card
;; delete card
;; test failed variations
