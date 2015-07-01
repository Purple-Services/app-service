(ns purple.dispatch
  (:use clojure.data.priority-map)
  (:require [purple.config :as config]
            [purple.util :as util]
            [purple.db :as db]
            [purple.orders :as orders]
            [clojure.java.jdbc :as sql]
            [overtone.at-at :as at-at]
            [clojure.string :as s])
  (:import (org.joda.time DateTime DateTimeZone)))

(defn get-all-zones
  "Get all zones from the database."
  [db-conn]
  (db/select db-conn "zones" ["*"] {}))

;; holds all zone definitions in local mem, some parsing in there too
(when (not *compile-files*)
  (def zones (map #(assoc % :zip_codes (util/split-on-comma (:zip_codes %)))
                  (get-all-zones (db/conn)))))

;; When server is booted up, we have to construct 'zones' map; which is a map
;; of priority-maps of orders in each zone.
;; (def zq {ZONE-ID-1 (priority-map orders...)
;;          ZONE-ID-2 (priority-map orders...)})
;; When a new order is created, we have to add it to the queue (priority map)
;; of the zone that the destination resides in.

;; a map of all zones, each with a priority-map to hold their orders
(when (not *compile-files*)
  (def zq (into {} (map #(identity [(:id %) (atom (priority-map))]) zones))))
       
(defn order->zone-id
  "Determine which zone the order is in; gives the zone id."
  [order]
  (let [zip-code (subs (:address_zip order) 0 5)]
    (:id (first (filter #(util/in? (:zip_codes %) zip-code)
                        zones)))))

(defn priority-score
  "Compute the priority score (an int) of the order."
  [order]
  (:target_time_end order))

(defn add-order-to-zq
  "Adds order to its zone's queue."
  [order]
  (swap! (get zq (order->zone-id order))
         conj [(:id order) (priority-score order)]))

(defn remove-order-from-zq
  "Removes and order from its zone's queue. Usually for cancelled orders."
  [order]
  (swap! (get zq (order->zone-id order))
         dissoc (:id order)))

;; on server boot, put any existing unassigned orders into the zq
(when (not *compile-files*)
  (doall (map add-order-to-zq
              (orders/get-all-unassigned (db/conn)))))

(defn available
  [good-zip? good-time? octane]
  (let [good-times (filter #(and good-zip? (good-time? (/ % 60)))
                           (keys config/delivery-times))]
    {:octane octane
     :gallons 15 ;; for now, we always assume 15 is available
     :price_per_gallon (util/octane->gas-price octane)
     :times (into {} (map (juxt identity config/delivery-times) good-times))}))

(defn availability
  "Get courier availability for given constraints."
  [db-conn zip-code user-id]
  (let [good-zip? (not (empty? (filter #(util/in? (:zip_codes %) zip-code)
                                       zones)))
        opening-hour (first config/service-time-bracket)
        closing-hour (last config/service-time-bracket)
        current-hour (.getHourOfDay
                      (DateTime. (DateTimeZone/forID "America/Los_Angeles")))
        good-time? (fn [hours-needed]
                     (<= opening-hour
                         current-hour
                         ;;(- closing-hour hours-needed)
                         ;; removed the check for enough time
                         closing-hour))
        user ((resolve 'purple.users/get-user-by-id) db-conn user-id)]
    {:success true
     :availabilities (map (partial available good-zip? good-time?) ["87" "91"])
     ;; if unavailable, this is the explanation:
     :unavailable-reason
     (if good-zip?
       "Sorry, our service hours are 10am to 9pm every day."
       "Sorry, we are unable to deliver gas to your location. We are rapidly expanding our service area and hope to offer service to your location very soon.")
     :user (select-keys user [:referral_gallons :referral_code])
     
     ;; we're still sending this for old versions of the app
     :availability [{:octane "87"
                     :gallons (if (and good-zip?
                                       (not (empty? (filter good-time? [1 3]))))
                                15 0) ;; just assume 15 gallons
                     :time (filter good-time? [1 3])
                     :price_per_gallon @config/gas-price-87
                     :service_fee [0 0]}
                    {:octane "91"
                     :gallons (if (and good-zip?
                                       (not (empty? (filter good-time? [1 3]))))
                                15 0)
                     :time (filter good-time? [1 3])
                     :price_per_gallon @config/gas-price-91
                     :service_fee [0 0]}]
     }))

(def job-pool (at-at/mk-pool))

(when (not *compile-files*)
  (def process-db-conn (db/conn))) ;; ok to use same conn forever? (have to test..)

(defn available-couriers
  [db-conn]
  (map #(assoc % :zones (map (fn [x] (Integer. x))
                             (util/split-on-comma (:zones %))))
       (db/select db-conn
                  "couriers"
                  ["*"]
                  {:active true
                   :on_duty true
                   :connected true
                   :busy false})))

(defn update-courier-state
  "Marks couriers as disconnected as needed."
  [db-conn]
  (let [expired-courier-ids (map :id
                                 (db/select db-conn
                                            "couriers"
                                            ["*"]
                                            {}
                                            :custom-where
                                            (str "active = 1 AND connected = 1 AND ("
                                                 (quot (System/currentTimeMillis) 1000)
                                                 " - last_ping) > "
                                                 config/max-courier-abandon-time)))
        ;; as user rows
        expired-couriers (db/select db-conn
                                    "users"
                                    [:id :name :phone_number]
                                    {}
                                    :custom-where
                                    (str "id IN (\""
                                         (apply str
                                                (interpose "\",\"" expired-courier-ids))
                                         "\")"))]
    (when (not (empty? expired-couriers))
      (do (doall (map #(util/send-sms (:phone_number %)
                                      "You have just disconnected from the Purple Courier App.")
                      expired-couriers))
          (sql/with-connection db-conn
            (sql/update-values
             "couriers"
             [(str "id IN (\""
                   (apply str
                          (interpose "\",\"" expired-courier-ids))
                   "\")")]
             {:connected 0}))))))

(defn take-order-from-zone
  "Tries to take one order from the chosen zone."
  [zone]
  (let [pm (get zq zone)]
    (when-let [o (peek @pm)]
      (swap! pm pop)
      o)))

(defn match-order
  [pm-entry db-conn courier-id] ;; pm-entry = key order-id, value priority score
  (when pm-entry
    (let [order-id (first pm-entry)]
      (orders/assign-to-courier db-conn order-id courier-id))))

(defn take-order-from-zones
  "Does take-order-from-zone over multiple zones. Stops after first hit."
  [db-conn courier-id zones]
  (doseq [z zones
          :let [o (take-order-from-zone z)]
          :while (nil? (doto o (match-order db-conn courier-id)))]))

(defn match-orders-with-couriers
  [db-conn]
  (doall (map #(take-order-from-zones db-conn (:id %) (:zones %))
              (available-couriers db-conn))))

(defn remind-couriers
  "Notifies couriers if they have not responded to new orders assigned to them."
  [db-conn]
  (let [accepted-orders (db/select db-conn
                                   "orders"
                                   ["*"]
                                   ;; currently, "accepted" is a misnomer,
                                   ;; because it's forced. It does not mean the
                                   ;; courier is aware of the order for sure.
                                   {:status "accepted"})]
    (doall
     (map #(let [time-accepted (-> (:event_log %)
                                   (s/split #"\||\s")
                                   (->> (apply hash-map))
                                   (get "accepted")
                                   (Integer.))
                 ;; this bracket should ensure that the reminder call is only
                 ;; made once.
                 reminder-time-bracket [(+ time-accepted
                                           config/courier-reminder-time)
                                        (+ time-accepted
                                           config/courier-reminder-time
                                           (- (quot config/process-interval 1000)
                                              1))]
                 current-time (quot (System/currentTimeMillis) 1000)]
             (when (<= (first reminder-time-bracket)
                       current-time
                       (last reminder-time-bracket))
               ((resolve 'purple.users/call-user) db-conn (:courier_id %)
                (str config/base-url "twiml/courier-new-order"))))
          accepted-orders))))


(def last-orphan-warning (atom 0))

(defn warn-orphaned-order
  "If there are no couriers connected, but there are orders, then warn all."
  [db-conn]
  (if (and (seq (filter #(seq @(val %)) zq))
           (empty? (available-couriers db-conn))
           (< (* 60 10) ;; only warn every 10 minutes
              (- (quot (System/currentTimeMillis) 1000)
                 @last-orphan-warning)))
    (do (doall (map #(util/send-sms (:phone_number %)
                                    "There are orders, but no couriers online. If you are supposed to be on duty, please log into the app. If you have the app open already, try restarting it.")
                    (db/select db-conn
                               "users"
                               [:id
                                :phone_number]
                               {:is_courier 1})))
        (reset! last-orphan-warning (quot (System/currentTimeMillis) 1000)))))

  
(defn process
  "Does a few periodic tasks."
  []
  (do (update-courier-state process-db-conn)
      (match-orders-with-couriers process-db-conn)
      (remind-couriers process-db-conn)
      (warn-orphaned-order process-db-conn)))

(when (not *compile-files*)
  (def process-job (at-at/every config/process-interval
                                process
                                job-pool)))

;; (let [out *out*]
;;   (def process-temp (at-at/every 3000
;;                                #(binding [*out* out]
;;                                    (println "test"))
;;                                job-pool)))

(defn courier-ping
  [db-conn user-id lat lng gallons]
  (db/update db-conn
             "couriers"
             {:lat lat
              :lng lng
              :gallons_87 (Integer. (:87 gallons))
              :gallons_91 (Integer. (:91 gallons))
              :connected 1
              :last_ping (quot (System/currentTimeMillis) 1000)}
             {:id user-id}))

;; on server boot, set initial gas prices locally from database
(when (not *compile-files*)
  (let [c (first (db/select (db/conn) "config" ["*"] {:id 1}))]
    (reset! config/gas-price-87 (:gas_price_87 c))
    (reset! config/gas-price-91 (:gas_price_91 c))))

(defn change-gas-price
  "Updates gas prices locally and in the database."
  [db-conn gas-price-87 gas-price-91]
  (do (reset! config/gas-price-87 gas-price-87)
      (reset! config/gas-price-91 gas-price-91)
      (db/update db-conn
                 "config"
                 {:gas_price_87 gas-price-87
                  :gas_price_91 gas-price-91}
                 {:id 1})))
