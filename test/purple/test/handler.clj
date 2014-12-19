(ns purple.test.handler
  (:require [clojure.test :refer :all]
            [purple.handler :refer :all]
            [purple.db :as db]
            [ring.mock.request :as mock]))

(deftest test-app
  
  (testing "not-found route"
    (let [response (app (mock/request :get "/invalid"))]
      (is (= (:status response) 404))))
  
  )
