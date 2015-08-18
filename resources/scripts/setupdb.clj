(use '[clojure.java.jdbc :only [with-connection do-commands]])


;;(def root-password (atom "secret"))

(def db-config 
  {:db-user "purplemaster" ; the user name for the ebdb table, in src/purple/config.clj
   :db-password "localpurpledevelopment2015" ; the password for local development, in src/purple/config.clj
                                        ; as well as resources/database/ebdb_setup.sql
   :ebdb-setup-sql "resources/database/ebdb_setup.sql" ; sql for creating ebdb database and allowing access to purplemaster
   :ebdb-create-sql "resources/database/ebdb.sql" ; sql for creating tables and populating them in the ebdb database
   })

(def root-ebdb-config (atom {:classname "com.mysql.jdbc.Driver"
                           :subprotocol "mysql"
                           :subname "//localhost:3306"
                           :user "root"
                           :password "secret" ; use root_password=<your_password> for this script
                           :delimiters "`"
                           }))

(def purplemaster-ebdb-config {:classname "com.mysql.jdbc.Driver"
                       :subprotocol "mysql"
                       :subname "//localhost:3306/ebdb"
                       :user (:db-user db-config)
                       :password (:db-password db-config)
                       :delimiters "`"})

(defn process-sql
  "Process a SQL file into statements that can be applied with do-commands"
  [filename]
  (let [sql-lines (->  (slurp filename) ;; read in the sql file 
                       (clojure.string/replace #"--.*\n" "") ;; ignore sql comments
                       ;;(clojure.string/replace #"\n" "")     ;; remove newlines
                       (clojure.string/split #";\n")           ;; sepereate chunks into statements
                       )
        ]
    (map #(clojure.string/replace % #"\n" "") sql-lines)))

(defn create-ebdb-database
  "Set up the ebdb database and grant access to it for purplemaster"
  []
  (let [setup-sql (process-sql (:ebdb-setup-sql db-config))]
    (with-connection @root-ebdb-config (apply do-commands setup-sql))))


(defn create-tables-and-populate-ebdb-database
  "Create tables and load test data for the ebdb database"
  []
  (let [ebdb-sql (process-sql (:ebdb-create-sql db-config))]
    (with-connection purplemaster-ebdb-config
      (apply do-commands ebdb-sql))))


(defn get-value-of-command-line-option
  "Get the value of a command line option from the list of cmd-args strings. The value should
  be specified on the command line as option=value e.g. password=secret"
  [cmd-args option]
  (->  (->> cmd-args
            (filter #(re-find (re-pattern option) %))
            first)
       (clojure.string/split #"=")
       last))


(do
  (swap! root-ebdb-config assoc :password (get-value-of-command-line-option *command-line-args* "root_password"))
  (println "Creating ebdb database and granting permissions to purplemaster")
  (create-ebdb-database)
  (println "Creatings tables and populating them in ebdb as user purplemaster")
  (create-tables-and-populate-ebdb-database))
