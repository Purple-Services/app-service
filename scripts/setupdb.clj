(use '[clojure.java.jdbc :only [with-connection do-commands]]
     '[clojure.java.io :as io])
(import java.util.zip.GZIPInputStream)

(def db-config 
  {;; the user name for the ebdb table, in src/purple/config.clj
   :db-user "root"
   ;; the password for local development, in src/purple/config.clj
   ;; also in resources/database/ebdb_setup.sql
   :db-password ""
   ;; sql for creating ebdb database and allowing access to purplemaster
   :ebdb-setup-sql "database/ebdb_setup.sql"
   ;; sql for creating tables and populating them in the ebdb database
   :ebdb-create-sql "database/ebdb.sql"
   ;; sql for zcta data, gzipped
   :ebdb-zcta-sql   "database/ebdb_zctas.sql.gz"})

(def root-ebdb-config (atom {:classname "com.mysql.jdbc.Driver"
                             :subprotocol "mysql"
                             :subname "//localhost:3306"
                             :user "root"
                             ;; use root_password=<your_password> with script
                             :password ""
                             :delimiters "`"}))

(def purplemaster-ebdb-config {:classname "com.mysql.jdbc.Driver"
                               :subprotocol "mysql"
                               :subname "//localhost:3306/ebdb"
                               :user (:db-user db-config)
                               :password (:db-password db-config)
                               :delimiters "`"})

(defn process-sql
  "Process a SQL file into statements that can be applied with do-commands"
  [filename]
  (let [sql-lines (-> (slurp filename)
                      ;; ignore sql comments
                      (clojure.string/replace #"--.*\n" "")
                      (clojure.string/split #";\n"))]
    (->> sql-lines
         (map #(clojure.string/replace % #"\n" ""))
         (filter #(not (clojure.string/blank? %))))))

(defn create-ebdb-database
  "Set up the ebdb database and grant access to it for purplemaster"
  []
  (let [setup-sql (process-sql (:ebdb-setup-sql db-config))]
    (with-connection @root-ebdb-config (apply do-commands setup-sql))))


(defn create-tables-and-populate-ebdb-database
  "Create tables and load test data for the ebdb database"
  []
  (let [ebdb-sql (process-sql (:ebdb-create-sql db-config))
        ;; temp removing zcta-sql because it's too big for travis ci (i'm sure there's a fix for that though)
        ;; zcta-sql (process-sql (-> (:ebdb-zcta-sql db-config)
        ;;                           io/input-stream
        ;;                           GZIPInputStream.))
        ]
    (do
      (with-connection @root-ebdb-config
        (apply do-commands ebdb-sql))
      ;; (with-connection purplemaster-ebdb-config
      ;;   (apply do-commands zcta-sql))
      )))


(defn get-value-of-command-line-option
  "Get the value of a command line option from the list of cmd-args strings.
  The value should be specified on the command line as option=value
  e.g. password=secret"
  [cmd-args option]
  (->  (->> cmd-args
            (filter #(re-find (re-pattern option) %))
            first)
       (clojure.string/split #"=")
       last))


(do
  (swap! root-ebdb-config
         assoc
         :password ""
         ;; (get-value-of-command-line-option *command-line-args* "root_password")
         )
  (println "Creating ebdb database and granting permissions to purplemaster")
  (create-ebdb-database)
  (println "Creatings tables and populating them in ebdb as user root")
  (create-tables-and-populate-ebdb-database))
