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


;;
;; Utilities
;;

(defn test-array
  [t]
  (let [check (type (t []))]
    (fn [arg] (instance? check arg))))

(def byte-array?
  (test-array byte-array))

(defn byte-arrays-to-strs
  "Takes a map. Gives back a map with any byte-array vals converted to String"
  [m]
  (into {} (for [[k v] m]
             [k (if (byte-array? v)
                  (String. v)
                  v)])))

(defn mysql-escape-str
  [x]
  (s/escape x {\" "\\\""}))

;; Find out if an SQLException is for a duplicate entry for a key
(defn duplicate-entry-exception? [e]
  (not (empty? (re-seq #"Duplicate entry.*for key" (.getMessage e)))))

;; Find out if an SQLException is being caused by the table not existing
(defn table-doesnt-exist-exception? [e]
  (not (empty? (re-seq #"Table.*doesn't exist" (.getMessage e)))))

;; NOTE: table, columns, and where-map keys are not checked for SQL Injection
;; Thus, where-map vals are the only input that is protected from attack.
;; TODO - allow 'all' flag for *. can be used in combination with DECRYPT still
(defn select
  "Select columns from table and decrypt any values whose column name is in the
  set 'decrypt'. All this, according the constraints of simple where-map."
  [db-conn table columns where-map & {:keys [decrypt append custom-where]}]
  (sql/with-connection db-conn
    (sql/with-query-results results
      (apply vector
             (str "SELECT "
                  (->> columns
                       (map #(if (contains? decrypt %)
                               (format "AES_DECRYPT(%s, UNHEX(\"%s\")) AS %s"
                                       (sql/as-identifier %)
                                       "0000" ;; config/db-encryption-key-hex
                                       (sql/as-identifier %))
                               (sql/as-identifier %)))
                       (interpose ",")
                       (apply str))
                  " FROM "
                  table
                  " WHERE "
                  (if custom-where
                      custom-where
                      (if (empty? where-map)
                        "1"
                        (->> (keys where-map)
                             (map #(str (sql/as-identifier %) " = ?"))
                             (interpose " AND ")
                             (apply str))))
                  " "
                  append)
             (vals where-map))
      (doall results))))

;; TODO - test the above function with and without empty where-map / decrypt options

(defn insert-tpl
  "Contructs a values template (?'s) given a seq 'values' and set 'encrypt'."
  [columns encrypt]
  (apply str
         (interpose "," (map #(if (contains? encrypt %)
                                (format "AES_ENCRYPT(?, UNHEX(\"%s\"))"
                                        "0000" ;; config/db-encryption-key-hex
                                        )
                                "?")
                             columns))))

(defn insert-values
  "Inserts rows into a table with values for specified columns only.
  column-names is a vector of strings or keywords identifying columns.
  values is a vector containing values for each column in order."
  [table column-names values encrypt]
  (let [columns (map sql/as-identifier column-names)
        columns-str (apply str (interpose "," columns))
        template-str (insert-tpl column-names encrypt)]
    (apply sql/do-prepared-return-keys
           (format "INSERT INTO %s (%s) VALUES (%s)"
                   (sql/as-identifier table) columns-str template-str)
           [values])))

(defn insert-record
  "Inserts a single record into a table. A record is a map from strings or
  keywords (identifying columns) to values.
  Returns a map of the generated keys."
  [table record encrypt]
  (insert-values table (keys record) (vals record) encrypt))

(defn insert
  "Insert row in 'table' of values 'insertion-map'.
  You can pass a set of keys to encrypt values of."
  [db-conn table insertion-map & {:keys [encrypt]}]
  (try
    (do (sql/with-connection db-conn
          (insert-record table insertion-map encrypt))
        {:success true})
    (catch SQLException e
      (cond
       (duplicate-entry-exception? e)
       {:success false
        :message "That ID is already being used."}
       (table-doesnt-exist-exception? e)
       {:success false
        :message "That table doesn't exist."}
       :else
       {:success false
        :message "SQL Error"
        :unsafeMessage e}))
    (catch Exception e
      {:success false
       :message "Unkown Error"
       :unsafeMessage e})))




;; (defn replace-values
;;   "Replaces rows into a table with values for specified columns only.
;;   column-names is a vector of strings or keywords identifying columns.
;;   values is a vector containing values for each column in order."
;;   [table column-names values encrypt]
;;   (let [columns (map sql/as-identifier column-names)
;;         columns-str (apply str (interpose "," columns))
;;         template-str (insert-tpl column-names encrypt)]
;;     (apply sql/do-prepared-return-keys
;;            (format "REPLACE INTO %s (%s) VALUES (%s)"
;;                    (sql/as-identifier table) columns-str template-str)
;;            [values])))

;; (defn replace-record
;;   "Replaces a single record into a table. A record is a map from strings or
;;   keywords (identifying columns) to values.
;;   Returns a map of the generated keys."
;;   [table record encrypt]
;;   (replace-values table (keys record) (vals record) encrypt))

;; (defn replace
;;   "Replace row in 'table' of values 'insertion-map'.
;;   You can pass a set of keys to encrypt values of."
;;   [db-conn table replacement-map & {:keys [encrypt]}]
;;   (try
;;     (do (sql/with-connection db-conn
;;           (replace-record table replacement-map encrypt))
;;         {:success true})
;;     (catch SQLException e
;;       (cond
;;        (duplicate-entry-exception? e)
;;        {:success false
;;         :message "That ID is already being used."}
;;        (table-doesnt-exist-exception? e)
;;        {:success false
;;         :message "That table doesn't exist."}
;;        :else
;;        {:success false
;;         :message "SQL Error"
;;         :unsafeMessage e}))
;;     (catch Exception e
;;       {:success false
;;        :message "Unkown Error"
;;        :unsafeMessage e})))




(defn update-tpl
  [columns encrypt]
  (apply str
         (interpose
          ", "
          (map #(if (contains? encrypt %)
                  (format (str (sql/as-identifier %)
                               "="
                               "AES_ENCRYPT(?, UNHEX(\"%s\"))")
                          "0000" ;; config/db-encryption-key-hex
                          )
                  (str (sql/as-identifier %) "=?"))
               columns))))

(defn update-values
  [table where-params record encrypt]
  (let [[where & params] where-params
        columns (update-tpl (keys record) encrypt)]
    (sql/do-prepared
      (format "UPDATE %s SET %s WHERE %s"
              (sql/as-identifier table) columns where)
      (concat (vals record) params))))

(defn update
  [db-conn table update-map where-map & {:keys [encrypt]}]
  (try
    (do (sql/with-connection db-conn
          (update-values
           table
           (if (empty? where-map)
             ["1"]
             (apply vector (->> (keys where-map)
                                (map #(str (sql/as-identifier %) " = ?"))
                                (interpose " AND ")
                                (apply str))
                    (vals where-map)))
           update-map
           encrypt))
        {:success true})
    (catch SQLException e
      (cond
       (table-doesnt-exist-exception? e)
       {:success false
        :message "That table doesn't exist."}
       :else
       {:success false
        :message "SQL Error"
        :unsafeMessage e}))
    (catch Exception e
      {:success false
       :message "Unkown Error"
       :unsafeMessage e})))
