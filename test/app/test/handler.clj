(ns app.test.handler
  (:use cheshire.core)
  (:require [clojure.test :refer :all]
            [app.handler :refer :all]
            [app.test.users :refer [register-user]]
            [app.test.db-tools :refer [setup-ebdb-test-for-conn-fixture
                                       ebdb-test-config]]
            [ring.mock.request :as mock]))


;; note: these tests will not work unless the server is properly running.
;; you will need to copy the configuration stub from README.md
;; to src/purple/config.clj
(use-fixtures :once setup-ebdb-test-for-conn-fixture)

(deftest test-app
  (testing "not-found route"
    (let [response (app (mock/request :get "/i-n-v-a-l-i-d"))]
      (is (= (:status response) 404))))

  (testing "root route redirects to marketing homepage"
    (let [response (app (mock/request :get "/"))]
      (is (= (:status response) 302))
      )))

(deftest test-user-interactions
  
  (let [_ (register-user ebdb-test-config "fooaaa@bar.com" "qwerty123")
        post-data {:type "native"
                   :platform_id "fooaaa@bar.com"
                   :auth_key "qwerty123"}
        ;; NOTE this depends on the 
        response (app (-> (mock/request :post "/user/login"
                                        (generate-string post-data))
                          (mock/content-type "application/json")))
        body (parse-string (:body response) true)
        token (:token body)
        user-id (:id (:user body))
        ]
    (testing "A user can log in."
      (is (= (:status response) 200)
          (str "Failed to login. response body: "
               body)))

    (testing "A user can update their number with a good 10 digit phone number"
      (let [post-data {:user_id user-id
                       :token token
                       :version "1.0.7"
                       :user {:phone_number "800-555-1212"
                              :name "Test User"}}
            response (app (->  (mock/request :post "/user/edit"
                                             (generate-string post-data))
                               (mock/content-type "application/json")))
            body (parse-string (:body response) true)]
        (is (:success body))))
    
    (testing "A phone number of user is updated with only 7 digit number"
      (let [post-data {:user_id user-id
                       :token token
                       :version "1.0.7"
                       :user {:phone_number "555-1212"
                              :name "Test User"}}
            response (app (->  (mock/request :post "/user/edit"
                                             (generate-string post-data))
                               (mock/content-type "application/json")))
            body (parse-string (:body response) true)]
        (is (not (:success body)))))

    (testing "A name of the user can be updated with a valid name"
      (let [post-data {:user_id user-id
                       :token token
                       :version "1.0.7"
                       :user {:name "Test User"}}
            response (app (->  (mock/request :post "/user/edit"
                                             (generate-string post-data))
                               (mock/content-type "application/json")))
            body (parse-string (:body response) true)]
        (is (:success body))))

    (testing "A name and number of the user can be updated with a valid name and phone number"
      (let [post-data {:user_id user-id
                       :token token
                       :version "1.0.7"
                       :user {:name "Test User" :phone_number "800-555-1212"}}
            response (app (->  (mock/request :post "/user/edit"
                                             (generate-string post-data))
                               (mock/content-type "application/json")))
            body (parse-string (:body response) true)]
        (is (:success body))))

    (testing "A name and number of the user is given with a valid name and invalid phone number"
      (let [post-data {:user_id user-id
                       :token token
                       :version "1.0.7"
                       :user {:name "Test User" :phone_number "555-1212"}}
            response (app (->  (mock/request :post "/user/edit"
                                             (generate-string post-data))
                               (mock/content-type "application/json")))
            body (parse-string (:body response) true)]
        (is (not (:success body)))))

    (testing "A name and number of the user can be updated with an invalid name and valid phone number"
      (let [post-data {:user_id user-id
                       :token token
                       :version "1.0.7"
                       :user {:name "TestUser" :phone_number "800-555-1212"}}
            response (app (->  (mock/request :post "/user/edit"
                                             (generate-string post-data))
                               (mock/content-type "application/json")))
            body (parse-string (:body response) true)]
        (is (not(:success body)))))

    (testing "A name and number of the user can be updated with an invalid name and valid phone number"
      (let [post-data {:user_id user-id
                       :token token
                       :version "1.0.7"
                       :user {:name "TestUser" :phone_number "800-555-1212"}}
            response (app (->  (mock/request :post "/user/edit"
                                             (generate-string post-data))
                               (mock/content-type "application/json")))
            body (parse-string (:body response) true)]
        (is (not (:success body)))))))

