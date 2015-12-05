(ns purple.couriers
  (:use purple.util
        [purple.db :only [conn !select !insert !update mysql-escape-str]])
  (:require [purple.config :as config]
            [clojure.string :as s]))

;; Note that this converts couriers' "zones" from string to a set of Integer's
(defn get-couriers
  "Gets couriers from db. Optionally add WHERE constraints."
  [db-conn & {:keys [where]}]
  (map #(assoc % :zones (set (map (fn [x] (Integer. x))
                                  (split-on-comma (:zones %)))))
       (!select db-conn "couriers" ["*"] (merge {} where))))

(defn all-couriers
  "All couriers."
  [db-conn]
  (get-couriers db-conn))

(defn get-all-on-duty
  "All the couriers that are currently connected."
  [db-conn]
  (get-couriers db-conn :where {:active true
                                :on_duty true}))

(defn get-all-connected
  "All the couriers that are currently connected."
  [db-conn]
  (get-couriers db-conn :where {:active true
                                :on_duty true
                                :connected true}))

(defn get-all-available
  "All the connected couriers that aren't busy."
  [db-conn]
  (get-couriers db-conn :where {:active true
                                :on_duty true
                                :connected true
                                :busy false}))

(defn on-duty?
  "Is this courier on duty?"
  [db-conn id]
  (in? (map :id (get-all-on-duty db-conn)) id))

(defn filter-by-zone
  "Only couriers that work in this zone."
  [zone-id couriers]
  (filter #(in? (:zones %) zone-id) couriers))

(defn include-lateness
  "Given a courier map m, return a map with :lateness included using
  the past 100 orders"
  [db-conn m]
  (let [db-orders (->>
                   (!select
                    db-conn "orders" ["*"] {}
                    :append (str "ORDER BY target_time_start DESC LIMIT 100"))
                   (map #(assoc %
                                :was-late
                                (let [completion-time
                                      (-> (str "kludgeFix 1|" (:event_log %))
                                          (s/split #"\||\s")
                                          (->> (apply hash-map))
                                          (get "complete"))]
                                  (and completion-time
                                       (> (Integer. completion-time)
                                          (:target_time_end %)))))))]
    (map (fn [courier]
           (assoc courier
                  :lateness
                  (let [orders (filter #(and (= (:courier_id %)
                                                (:id courier))
                                             (= (:status %)
                                                "complete"))
                                       db-orders)
                        total (count orders)
                        late (count (filter :was-late orders))]
                    (if (pos? total)
                      (str (format "%.0f"
                                   (float (- 100
                                             (* (/ late
                                                   total)
                                                100))))
                           "%")
                      "No orders.")))) m)))
