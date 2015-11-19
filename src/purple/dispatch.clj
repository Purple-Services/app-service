(ns purple.dispatch
  (:use purple.util
        clojure.data.priority-map
        [purple.db :only [conn !select !insert !update mysql-escape-str]])
  (:require [purple.config :as config]
            [purple.orders :as orders]
            [purple.users :as users]
            [ardoq.analytics-clj :as segment]
            [clojure.java.jdbc :as sql]
            [overtone.at-at :as at-at]
            [clojure.string :as s]
            [purple.couriers :as couriers])
  (:import [org.joda.time DateTime DateTimeZone]))

(def job-pool (at-at/mk-pool))

(defn get-all-zones-from-db
  "Get all zones from the database."
  [db-conn]
  (!select db-conn "zones" ["*"] {}))

;; holds all zone definitions in local memory, some parsing in there too
(! (def zones (atom (map #(update-in % [:zip_codes] split-on-comma)
                         (get-all-zones-from-db (conn))))))

(defn update-zones!
  "Update the zones var held in memory with that in the database"
  [db-conn]
  (reset! zones (map #(update-in % [:zip_codes] split-on-comma)
                     (get-all-zones-from-db db-conn))))

(defn get-zones-by-ids
  "Given a string of comma-seperated zones, return all zones in
  string"
  [zones-str]
  (let [zone-matches-id?
        (fn [zone]
          (some
           identity
           (map #(= (:id zone) %)
                (map read-string (split-on-comma zones-str)))))]
    (filter zone-matches-id? @zones)))

;; When server is booted up, we have to construct 'zones' map; which is a map
;; of priority-maps of orders in each zone.
;; (def zq {ZONE-ID-1 (priority-map orders...) ;; as an atom
;;          ZONE-ID-2 (priority-map orders...)})
;; When a new order is created, we have to add it to the queue (priority map)
;; of the zone that the destination resides in.

;; a map of all zones, each with a priority-map to hold their orders
(! (def zq (into {} (map #(identity [(:id %) (atom (priority-map))]) @zones))))

(defn order->zone-id
  "Determine which zone the order is in; gives the zone id."
  [order]
  (let [zip-code (five-digit-zip-code (:address_zip order))]
    (:id (first (filter #(in? (:zip_codes %) zip-code)
                        @zones)))))

(defn get-map-by-zone-id
  [zone-id]
  (get zq zone-id))

(defn zip-in-zones?
  "Determine whether or not zip-code can be found in zones"
  [zip-code]
  (->> @zones
       (filter #(in? (:zip_codes %) (five-digit-zip-code zip-code)))
       seq
       boolean))

(defn get-zone-by-zip-code
  "Given a zip code, return the corresponding zone"
  [zip-code]
  (-> (filter #(= (:id %) (order->zone-id {:address_zip zip-code})) @zones)
      first))

(defn get-fuel-prices
  "Given a zip code, return the fuel prices for that zone"
  [zip-code]
  (-> zip-code
      (get-zone-by-zip-code)
      :fuel_prices
      (read-string)))

(defn get-service-fees
  "Given a zip-code, return the service fees for that zone"
  [zip-code]
  (-> zip-code
      (get-zone-by-zip-code)
      :service_fees
      (read-string)))

(defn get-service-time-bracket
  "Given a zip-code, return the service time bracket for that zone"
  [zip-code]
  (-> zip-code
      (get-zone-by-zip-code)
      :service_time_bracket
      (read-string)))

(defn get-one-hour-orders-allowed
  "Given a zip-code, return the time in minutes that one hour orders are
  allowed."
  [zip-code]
  (-> zip-code
      (get-service-time-bracket)
      first
      (+ (* 60 3))))

(defn get-gas-prices
  "Given a zip-code, return the gas prices"
  [zip-code]
  (if (zip-in-zones? zip-code)
    {:success true
     :gas_prices (get-fuel-prices zip-code)}
    {:success true
     :gas_prices (get-fuel-prices "90210")}))

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
(! (run! add-order-to-zq
         (orders/get-all-unassigned (conn))))

(defn delivery-times-map
  "Given a service fee, create the delivery-times map"
  [service-fees]
  (let [fee #(if (= % 0)
               "free"
               (str "$" (cents->dollars-str %)))]
    {180 {:service_fee (:180 service-fees)
          :text (str "within 3 hours ("
                     (fee (:180 service-fees))
                     ")")
          :order 0}
     60 {:service_fee (:60 service-fees)
         :text (str "within 1 hour ("
                    (fee (:60 service-fees)) ")")
         :order 1
         }}))

(defn available
  [good-time?-fn zip-code octane]
  (let [service-fees (get-service-fees zip-code)
        delivery-times (delivery-times-map service-fees)
        good-times (filter #(and (zip-in-zones? zip-code) (good-time?-fn %))
                           (keys delivery-times))]
    {:octane octane
     :gallons 15 ;; for now, we always assume 15 is available
     :price_per_gallon ((keyword octane) (get-fuel-prices zip-code))
     :times (into {} (map (juxt identity delivery-times) good-times))}))

(defn availability
  "Get courier availability for given constraints."
  [db-conn zip-code user-id]
  (let [user (users/get-user-by-id db-conn user-id)]
    (segment/track segment-client user-id "Availability Check"
                   {:address_zip (five-digit-zip-code zip-code)})
    (if (zip-in-zones? zip-code)
      (let [opening-minute (first (get-service-time-bracket zip-code))
            closing-minute (last  (get-service-time-bracket zip-code))
            current-minute (unix->minute-of-day (quot (System/currentTimeMillis)
                                                      1000))
            good-time?-fn (fn [minutes-needed]
                            (<= opening-minute
                                current-minute
                                ;;(- closing-minute minutes-needed)
                                ;; removed the check for enough time
                                ;; because our end time just means we accept orders
                                ;; until then (regardless of deadline)
                                closing-minute))]
        {:success true
         :availabilities (map (partial available good-time?-fn zip-code)
                              ["87" "91"])
         ;; if unavailable, this is the explanation:
         :unavailable-reason
         (str "Sorry, the service hours for this ZIP code are "
              (minute-of-day->hmma opening-minute)
              " to "
              (minute-of-day->hmma closing-minute)
              " every day.")
         :user (select-keys user [:referral_gallons :referral_code])
         ;; we're still sending this for old versions of the app
         :availability [{:octane "87"
                         :gallons (if (zip-in-zones? zip-code)
                                    15 0) ;; just assume 15 gallons
                         :time [1 3]
                         :price_per_gallon (:87 (get-fuel-prices zip-code))
                         :service_fee [100 0]}
                        {:octane "91"
                         :gallons (if (zip-in-zones? zip-code)
                                    15 0)
                         :time [1 3]
                         :price_per_gallon (:91 (get-fuel-prices zip-code))
                         :service_fee [100 0]}]})
      {:success true
       :user (select-keys user [:referral_gallons :referral_code])
       :availabilities [{:octane "87"
                         :gallons 15
                         :times {}
                         :price_per_gallon 0}
                        {:octane "91"
                         :gallons 15
                         :times {}
                         :price_per_gallon 0}]
       :availability [{:octane "87"
                       :gallons 0
                       :time [1 3]
                       :price_per_gallon 0
                       :service_fee [100 0]}
                      {:octane "91"
                       :gallons 0
                       :time [1 3]
                       :price_per_gallon 0
                       :service_fee [100 0]}]
       :unavailable-reason (str "Sorry, we are unable to deliver gas to your "
                                "location. We are rapidly expanding our service "
                                "area and hope to offer service to your "
                                "location very soon.")})))

(! (def process-db-conn (conn))) ;; ok to use same conn forever? have to test..

(defn update-courier-state
  "Marks couriers as disconnected as needed."
  [db-conn]
  (let [expired-courier-ids (map :id
                                 (!select db-conn
                                          "couriers"
                                          ["*"]
                                          {}
                                          :custom-where
                                          (str "active = 1 AND connected = 1 AND ("
                                               (quot (System/currentTimeMillis) 1000)
                                               " - last_ping) > "
                                               config/max-courier-abandon-time)))
        ;; as user rows
        expired-couriers (users/get-users-by-ids db-conn expired-courier-ids)]
    (when-not (empty? expired-couriers)
      (only-prod (run!
                  #(send-sms
                    (:phone_number %)
                    "You have just disconnected from the Purple Courier App.")
                  expired-couriers))
      (sql/with-connection db-conn
        (sql/update-values
         "couriers"
         [(str "id IN (\""
               (s/join "\",\"" expired-courier-ids)
               "\")")]
         {:connected 0})))))

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
      (orders/assign-to-courier db-conn order-id courier-id)
      (users/send-push db-conn courier-id
                       "You have been assigned a new order."))))

(defn take-order-from-zones
  "Does take-order-from-zone over multiple zones. Stops after first hit."
  [db-conn courier-id zones]
  (doseq [z zones
          :let [o (take-order-from-zone z)]
          :while (nil? (doto o (match-order db-conn courier-id)))]))

(defn match-orders-with-couriers
  [db-conn]
  (run! #(take-order-from-zones db-conn (:id %) (:zones %))
        (couriers/available-couriers db-conn)))

(defn remind-couriers
  "Notifies couriers if they have not responded to new orders assigned to them."
  [db-conn]
  (let [accepted-orders (!select db-conn
                                 "orders"
                                 ["*"]
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
               (users/call-user db-conn (:courier_id %)
                                (str config/base-url "twiml/courier-new-order"))))
          accepted-orders))))


(def last-orphan-warning (atom 0))

(defn warn-orphaned-order
  "If there are no couriers connected, but there are orders, then warn us."
  [db-conn]
  (when (and (seq (filter #(seq @(val %)) zq))
             (empty? (couriers/available-couriers db-conn))
             (< (* 60 20) ;; only warn every 20 minutes
                (- (quot (System/currentTimeMillis) 1000)
                   @last-orphan-warning)))
    (only-prod (run!
                #(send-sms % "There are orders, but no available couriers.")
                (concat [] ;; put your number in here when dev'ing
                        (only-prod ["3235782263"     ;; Bruno
                                    ;; "3106919061"  ;; JP
                                    ;; "8589228571"  ;; Lee
                                    "3103109961"     ;; Joe
                                    "3235782263"     ;; Gustavo
                                    ]))))
    (reset! last-orphan-warning (quot (System/currentTimeMillis) 1000))))

(defn process
  "Does a few periodic tasks."
  []
  (do (update-courier-state process-db-conn)
      ;; Temporarily turning off auto-assign of orders to couriers
      ;; Currently, couriers can Accept any order in the queue.
      ;; (match-orders-with-couriers process-db-conn)
      (remind-couriers process-db-conn)
      (warn-orphaned-order process-db-conn)))

(! (def process-job (at-at/every config/process-interval
                                 process
                                 job-pool)))

(defn courier-ping
  "The courier app periodically pings us with courier status details."
  [db-conn user-id lat lng gallons]
  (!update db-conn
           "couriers"
           {:lat lat
            :lng lng
            :gallons_87 (Integer. (:87 gallons))
            :gallons_91 (Integer. (:91 gallons))
            :connected 1
            :last_ping (quot (System/currentTimeMillis) 1000)}
           {:id user-id}))

(defn update-zone!
  "Update fuel_prices, service_fees and service_time_bracket for the zone with
  id.

  fuel-prices is an edn string map of the format
  '{:87 <integer cents> :91 <integer cents>}'.

  service-fees is an edn string map of the format
  '{:60 <integer cents> :180 <integer cents>}'.

  service-time-bracket is an edn string vector of the format
  '[<service-start> <service-end>]' where <service-start> and <service-end>
  are integer values of the total minutes elapsed in a day at a particular
  time.

  ex:
  The vector [450 1350] represents the time bracket 7:30am-10:30pm where
  7:30am is represented as 450 which is (+ (* 60 7) 30)
  10:30pm is represened as 1350 which is (+ (* 60 22) 30)"
  [db-conn id fuel-prices service-fees service-time-bracket]
  (!update db-conn "zones"
           {:fuel_prices fuel-prices
            :service_fees service-fees
            :service_time_bracket service-time-bracket}
           {:id id})
  ;; update the zones as well
  (update-zones! db-conn))

(defn courier-assigned-zones
  "Given a courier-id, return a set of all zones they are assigned to"
  [db-conn courier-id]
  (let [zones (:zones (first
                       (!select db-conn
                                "couriers"
                                [:zones]
                                {:id courier-id})))]
    (if (nil? (seq zones))
      (set zones) ; the empty set
      (set
       (map read-string
            (split-on-comma zones))))))

(defn get-courier-zips
  "Given a courier-id, get all of the zip-codes that a courier is assigned to"
  [db-conn courier-id]
  (let [courier-zones (filter #(contains?
                                (courier-assigned-zones db-conn courier-id)
                                (:id %))
                              @zones)
        zip-codes (apply concat (map :zip_codes courier-zones))]
    (set zip-codes)))

(defn get-zctas-for-zips
  "Given a string of comma-seperated zips and db-conn, return a list of
  zone/coordinates maps."
  [db-conn zips]
  (let [in-clause (str "("
                       (s/join ","
                               (map #(str "'" % "'")
                                    (split-on-comma zips)))
                       ")")]
    (!select db-conn "zctas" ["*"] {}
             :custom-where (str "zip in " in-clause))))
