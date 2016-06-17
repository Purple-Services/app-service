(ns app.periodic
  (:require [common.config :as config]
            [common.util :refer [! only-prod unix->hour-of-day now-unix]]
            [common.db :refer [conn !select !insert !update]]
            [common.subscriptions :as subscriptions]
            [app.dispatch :as dispatch]
            [clojure.string :as s]
            [overtone.at-at :as at-at]))

(def job-pool
  (delay (at-at/mk-pool)))

(def subs-job
  (delay
   (at-at/every 3600000 ; every hour
                #(case (unix->hour-of-day (now-unix))
                   ;; 4pm  - do all subscription renewals
                   16 (subscriptions/renew-subs-expiring-tonight (conn))
                   ;; 10pm - set expiring users to sub ID 0
                   22 (subscriptions/expire-all-old-subs (conn))
                   nil)
                @job-pool)))

(defn dispatch-tasks
  "Does a few periodic tasks to maintain dispatch state etc."
  [db-conn]
  ((juxt dispatch/update-courier-state
         dispatch/remind-couriers
         dispatch/auto-assign)
   db-conn))

(def dispatch-job
  (delay (at-at/every config/process-interval
                      ;; todo: ok to use same conn for so long?
                      (partial dispatch-tasks (conn))
                      @job-pool)))

(defn init
  "Start all periodic tasks."
  []
  (run! force [job-pool
               subs-job
               dispatch-job]))

(defn view
  "Helper function for inspection of currently scheduled tasks."
  []
  (at-at/show-schedule @job-pool))
