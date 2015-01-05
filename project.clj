(defproject purple "0.1.0-SNAPSHOT"
  :description "Purple"
  :url "http://www.purpleapp.com"
  :dependencies [[org.clojure/clojure "1.6.0"]
                 [compojure "1.1.8"]
                 [ring/ring-json "0.1.2"]
                 [c3p0/c3p0 "0.9.1.2"] ;; db connection pooling
                 [org.clojure/java.jdbc "0.2.3"]
                 [mysql/mysql-connector-java "5.1.18"]
                 [cheshire "4.0.3"] ;; json and related utilities
                 [clj-http "1.0.0"]
                 [overtone/at-at "1.2.0"] ;; scheduled jobs
                 [clj-pdf "1.11.21"]
                 [clj-time "0.8.0"] ;; date/time utilities
                 [com.draines/postal "1.11.2"] ;; send email (for system alerts)
                 [crypto-password "0.1.3"]
                 [org.clojars.freeagent/clj-facebook-graph "0.4.0"]
                 [gapi "1.0.1"]
                 ]
  :plugins [[lein-ring "0.8.11"]
            [lein-beanstalk "0.2.7"]]
  :ring {:handler purple.handler/app
         :auto-reload? true
         ;; :auto-refresh? true
         :reload-paths ["src"]}
  :profiles {:dev {:dependencies [[javax.servlet/servlet-api "2.5"]
                                  [ring-mock "0.1.5"]]}}
  :aws {:beanstalk {:s3-bucket "leinbeanstalkpurple"
                    :region "us-west-2"}})
