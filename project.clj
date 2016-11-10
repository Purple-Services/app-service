(defproject app "2.0.1-SNAPSHOT"
  :description "Purple mobile app web service."
  :dependencies [[org.clojure/clojure "1.7.0"]
                 [compojure "1.1.8"]
                 [ring/ring-json "0.1.2"]
                 ;; json and related utilities
                 [cheshire "5.4.0"]
                 [clj-http "1.0.1"]
                 [crypto-password "0.1.3"]
                 ;; email utility
                 [com.draines/postal "1.11.3"]
                 ;; Google API
                 [gapi "1.0.1"]
                 ;; templating
                 [enlive "1.1.5"]
                 ;; scheduled jobs with exception handling
                 [silasdavis/at-at "1.2.0"]
                 ;; date/time utilities
                 [clj-time "0.8.0"]
                 ;; this will be used by clj-aws down below instead of its
                 ;; default aws version
                 [com.amazonaws/aws-java-sdk "1.9.24"] 
                 [clj-aws "0.0.1-SNAPSHOT"]
                 [org.clojure/data.priority-map "0.0.6"]
                 [ring-cors "0.1.7"]
                 [ring/ring-ssl "0.2.1"]
                 ;; SMS and Phone Calls
                 [com.twilio.sdk/twilio-java-sdk "4.2.0"]
                 [analytics-clj "0.3.0"]
                 [org.clojure/algo.generic "0.1.2"]
                 [common "2.0.2-SNAPSHOT"]
                 [opt "1.0.6-SNAPSHOT"]]
  :pedantic? false
  :plugins [[lein-ring "0.8.13"]
            [lein-beanstalk "0.2.7"]
            [lein-exec "0.3.5"]]
  :ring {:handler app.handler/app
         :auto-reload? true
         :auto-refresh? true
         :reload-paths ["src" "resources" "checkouts"]}
  :profiles {:dev [{:dependencies
                    [[javax.servlet/servlet-api "2.5"]
                     [ring/ring-mock "0.3.0"]
                     [org.seleniumhq.selenium/selenium-java "2.47.1"]
                     [clj-webdriver "0.7.2"]
                     [ring "1.5.0"]
                     [pjstadig/humane-test-output "0.6.0"]]
                    :injections
                    [(require 'pjstadig.humane-test-output)
                     (pjstadig.humane-test-output/activate!)]}
                   :profiles/dev
                   ;; :profiles/local
                   ]
             :app-integration-test [:dev
                                    {:db-host "localhost"
                                     :db-name "ebdb_test"
                                     :db-port "3306"
                                     :db-user "root"
                                     :db-password ""}]}
  :test-selectors {:default (complement :integration)
                   :integration :integration}
  :aws {:beanstalk {:app-name "purple"
                    :environments [{:name "prod"}
                                   {:name "purple-dev-env"}]
                    :s3-bucket "leinbeanstalkpurple"
                    :region "us-west-2"}})
