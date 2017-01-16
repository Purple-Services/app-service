;; you can run this in pretty much any namespace


;; require
[cheshire.core :refer [generate-string parse-string]]
[clojure.walk :refer [keywordize-keys]]
[clj-http.client :as client]

(defn is-place-id-valid?
  [place-id]
  (try
    (let [body (:body (clj-http.client/get
                       "https://maps.googleapis.com/maps/api/place/details/json"
                       {:as :json
                        :content-type :json
                        :coerce :always
                        :query-params {:placeid place-id
                                       :key config/api-google-server-api-key}}))
          ;; _ (clojure.pprint/pprint body)
          ]
      (not= "NOT_FOUND" (:status body)))
    (catch Exception e
      (println (str e))
      nil)))

(defn run-code []
  (let [invalid-count (atom 0)
        result (->> (!select (common.db/conn) 
                             "users"
                             [:id :saved_locations]
                             {})
                    (filter (comp not s/blank? :saved_locations))
                    (filter (comp (partial not= "{}") :saved_locations))


                    ;; temp
                    ;; (filter #(or (= "fb10210722109948146" (:id %))
                    ;;              (= "fYTOqAiwZBRMtH5uKi94" (:id %))
                    ;;              (= "7psB4y4ArnCq8gR7nxWp" (:id %))))

                    ;; (take 50)

                    (map (fn [item]
                           (update-in item
                                      [:saved_locations]
                                      #(->> %
                                            parse-string
                                            keywordize-keys
                                            (map (fn [x]
                                                   [(key x)
                                                    (if (is-place-id-valid? (:googlePlaceId (val x)))
                                                      (val x)
                                                      (do (swap! invalid-count inc)
                                                          (assoc (val x)
                                                                 :googlePlaceId ""
                                                                 :displayText "")))]))
                                            (into {})
                                            generate-string)))))]
    (println result)
    (println @invalid-count)))
