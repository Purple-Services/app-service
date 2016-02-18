(defproject app "1.5.0-SNAPSHOT"
  :description "Purple mobile app web service."
  :dependencies [[org.clojure/clojure "1.7.0"]
                 [compojure "1.1.8"]
                 [ring/ring-json "0.1.2"]
                 [cheshire "5.4.0"] ;; json and related utilities
                 [clj-http "1.0.1"]
                 [crypto-password "0.1.3"]
                 [com.draines/postal "1.11.3"] ;; email utility
                 [gapi "1.0.1"]  ;; Google API
                 [enlive "1.1.5"] ;; templating
                 [silasdavis/at-at "1.2.0"] ;; scheduled jobs with exception handling
                 [clj-time "0.8.0"] ;; date/time utilities
                 [com.amazonaws/aws-java-sdk "1.9.24"] ;; this will be used by clj-aws below instead of its default aws version
                 [clj-aws "0.0.1-SNAPSHOT"]
                 [org.clojure/data.priority-map "0.0.6"]
                 [ring-cors "0.1.7"]
                 [ring/ring-ssl "0.2.1"]
                 [com.twilio.sdk/twilio-java-sdk "4.2.0"] ;; SMS and Phone Calls
                 [analytics-clj "0.3.0"]
                 [org.clojure/algo.generic "0.1.2"]
                 [common "1.0.0-SNAPSHOT"]
                 [opt "0.1.0-SNAPSHOT"]]
  ;; :pedantic? :warn
  :plugins [[lein-ring "0.8.13"]
            [lein-beanstalk "0.2.7"]]
  :ring {:handler app.handler/app
         :auto-reload? true
         :auto-refresh? true
         :reload-paths ["src" "resources" "checkouts"]}
  :aws {:beanstalk {:environments [{:name "prod"}
                                   {:name "purple-dev-env"}]
                    :s3-bucket "leinbeanstalkpurple"
                    :region "us-west-2"}})
