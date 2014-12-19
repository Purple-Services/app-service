(ns purple.users
  (:use clojure.walk)
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
            [clojure.java.jdbc :as sql]))

(defn get-user
  "Gets a user from db by user-id."
  [db-conn id]
  (->> (db/select db-conn
                  "users"
                  [:id
                   :first_name
                   :last_name
                   :date_of_birth
                   :gender]
                  {:id id}
                  :decrypt #{:first_name
                             :last_name
                             :date_of_birth
                             :gender})
       first
       db/byte-arrays-to-strs))

(defn insert-user
  "Inserts user record."
  [db-conn user]
  (let [record (assoc user
                 :timestamp_created (quot (System/currentTimeMillis) 1000))]
    (db/insert db-conn
               "users"
               record
               :encrypt (disj (set (keys record)) :id))))

(defn user-exists?
  "Does this user id exist in our db?"
  [db-conn id]
  (not (empty? (get-user db-conn id))))
