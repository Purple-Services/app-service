(ns purple.test.handler
  (:use cheshire.core)
  (:require [clojure.test :refer :all]
            [purple.handler :refer :all]
            [purple.db :as db]
            [ring.mock.request :as mock]))

;; note: these tests will not work unless the server is properly running.
;; you will need to copy the configuration stub from README.md
;; to src/purple/config.clj

(deftest test-app
  (testing "not-found route"
    (let [response (app (mock/request :get "/i-n-v-a-l-i-d"))]
      (is (= (:status response) 404))))

  (testing "root route"
    (let [response (app (mock/request :get "/"))]
      (is (= (:status response) 200))
      )))

(deftest test-user-interactions
  
  (let [post-data {:type "native"
                   :platform_id "test@test.com"
                   :auth_key "qwerty123"}
        response (app (-> (mock/request :post "/user/login" (generate-string post-data))
                          (mock/content-type "application/json")))
        body (parse-string (:body response) true)
        token (:token body)
        user-id (:id (:user body))
        ]
    (is (= (:status response) 200))

    (testing "A user can update their number with a good 10 digit phone number"
      (let [post-data {:user_id user-id
                       :token token
                       :version "1.0.7"
                       :user {:phone_number "800-555-1212"}}
            response (app (->  (mock/request :post "/user/edit" (generate-string post-data))
                               (mock/content-type "application/json")))
            body (parse-string (:body response) true)]
        (is (:success body))))
    
    (testing "A phone number of user is updated with only 7 digit number"
      (let [post-data {:user_id user-id
                       :token token
                       :version "1.0.7"
                       :user {:phone_number "555-1212"}}
            response (app (->  (mock/request :post "/user/edit" (generate-string post-data))
                               (mock/content-type "application/json")))
            body (parse-string (:body response) true)]
        (is (not (:success body)))))

    (testing "A name of the user can be updated with a valid name"
      (let [post-data {:user_id user-id
                       :token token
                       :version "1.0.7"
                       :user {:name "Test User"}}
            response (app (->  (mock/request :post "/user/edit" (generate-string post-data))
                               (mock/content-type "application/json")))
            body (parse-string (:body response) true)]
        (is (:success body))))

    (testing "A name and number of the user can be updated with a valid name and phone number"
      (let [post-data {:user_id user-id
                       :token token
                       :version "1.0.7"
                       :user {:name "Test User" :phone_number "800-555-1212"}}
            response (app (->  (mock/request :post "/user/edit" (generate-string post-data))
                               (mock/content-type "application/json")))
            body (parse-string (:body response) true)]
        (is (:success body))))

    (testing "A name and number of the user is given with a valid name and invalid phone number"
      (let [post-data {:user_id user-id
                       :token token
                       :version "1.0.7"
                       :user {:name "Test User" :phone_number "555-1212"}}
            response (app (->  (mock/request :post "/user/edit" (generate-string post-data))
                               (mock/content-type "application/json")))
            body (parse-string (:body response) true)]
        (is (not (:success body)))))

    (testing "A name and number of the user can be updated with an invalid name and valid phone number"
      (let [post-data {:user_id user-id
                       :token token
                       :version "1.0.7"
                       :user {:name "TestUser" :phone_number "800-555-1212"}}
            response (app (->  (mock/request :post "/user/edit" (generate-string post-data))
                               (mock/content-type "application/json")))
            body (parse-string (:body response) true)]
        (is (not(:success body)))))

    (testing "A name and number of the user can be updated with an invalid name and valid phone number"
      (let [post-data {:user_id user-id
                       :token token
                       :version "1.0.7"
                       :user {:name "TestUser" :phone_number "800-555-1212"}}
            response (app (->  (mock/request :post "/user/edit" (generate-string post-data))
                               (mock/content-type "application/json")))
            body (parse-string (:body response) true)]
        (is (not (:success body)))))
    
    ))

