(ns purple.test.handler
  (:use cheshire.core)
  (:require [clojure.test :refer :all]
            [purple.handler :refer :all]
            [purple.db :as db]
            [ring.mock.request :as mock]))

(deftest test-app
  
  (testing "not-found route"
    (let [response (app (mock/request :get "/i-n-v-a-l-i-d"))]
      (is (= (:status response) 404))))
  
  (testing "native login"
    (let [post-data {:type "native"
                     :platform_id "test@test.com"
                     :auth_key "qwerty123"}
          response (-> (mock/request :post "/login" (generate-string post-data))
                       (mock/content-type "application/json"))]
      (println (slurp (:body response)))
      (is (= (:status response) 200))))
  
  )
