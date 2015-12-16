;; run in util.clj namespace
;; deletes all endpoints that have a CustomUserData other than blank

(let [db-conn (conn)]
  (doall (map #(try
                 (let [req (GetEndpointAttributesRequest.)
                       push-platform "apns"]
                   (.setEndpointArn req (:arn_endpoint %))
                   (when (get (.getAttributes (.getEndpointAttributes sns-client req)) "CustomUserData")
                     ;; delete endpoint then update users table
                     (println
                      (str "delete: "
                           (let [delete-req (DeleteEndpointRequest.)]
                             (.setEndpointArn delete-req (:arn_endpoint %))
                             (.deleteEndpoint sns-client delete-req)
                             "deleted")))
                     (!update db-conn
                              "users"
                              {:arn_endpoint ""}
                              {:id (:id %)})))
                 (catch Exception e
                   (println (str "try to delete "
                                 (:id %) " " (:arn_endpoint %)))
                   (println e)
                   e))
              
              (!select db-conn
                       "users"
                       [:id :arn_endpoint]
                       {}
                       :custom-where "arn_endpoint != '' AND is_courier != 1"))))
