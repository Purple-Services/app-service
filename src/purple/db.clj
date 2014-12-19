(ns purple.db
  (:import com.mchange.v2.c3p0.ComboPooledDataSource
           [java.sql SQLException])
  (:require [purple.config :as config]
            [clojure.java.jdbc :as sql]
            [clojure.string :as s]))

;; Database Pooling -----------------
;; A helpful resource for fine-tuning this:
;; http://www.mchange.com/projects/c3p0/ ...
;; index.html#configuring_connection_testing
(defn- pool [config]
  (let [cpds (doto (ComboPooledDataSource.)
               (.setDriverClass (:classname config))
               (.setJdbcUrl (str "jdbc:"
                                 (:subprotocol config)
                                 ":"
                                 (:subname config)))
               (.setUser (:user config))
               (.setPassword (:password config))
               (.setMaxPoolSize 15)
               (.setMinPoolSize 5)
               (.setInitialPoolSize 5)
               (.setPreferredTestQuery "SELECT 1")
               (.setTestConnectionOnCheckout true))]
    {:datasource cpds}))

(def ^:private pooled-db (delay (pool config/db-config)))

(defn conn
  "Get a connection instance from the pool."
  []
  @pooled-db)
