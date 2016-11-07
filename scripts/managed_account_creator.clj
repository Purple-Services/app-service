;; in users namespace




;; !!!
;;
;; WARNING: this is outdated and needs to be modified in order to be compatible
;; with the new Accounts system
;;
;; !!!




;; Create Managed Accounts
;; be sure to change code so that managed users can add vehicles
(let [db-conn (common.db/conn)]
  (run! #(add-vehicle
          db-conn
          (register db-conn
                    (:email %)
                    "jtemptemp87ds"
                    :account-manager-id "BmFyfnbcnDaVcGvOrsng"
                    :prepop-reset-key true
                    :subscription {:id 4 ;; Change to subscription ID for account
                                   :period-start-time 1466196364
                                   :expiration-time 2147483647
                                   :auto-renew false})
          {:year (:year %)
           :make (:make %)
           :model (:model %)
           :color (:color %)
           :gas_type (:gas_type %)
           :license_plate (:license_plate %)
           :only_top_tier (:only_top_tier %)})
        [{:year "2016"
          :make "Land Rover"
          :model "Range Rover"
          :license_plate "7THB347"
          :color "Unkown"
          :gas_type "87"
          :only_top_tier true
          :email "jennifer@mauzy.com"}
         {:year "2016"
          :make "Land Rover"
          :model "Range Rover"
          :license_plate "3THB344"
          :color "Unkown"
          :gas_type "87"
          :only_top_tier true
          :email "thomas@mauzy.com"}]))

;; send "set up account" email
(run!
 #(send-template-email
   (:email %)
   "Welcome to Purple" ;; ignored by template
   "test" ;; ignored by template
   :template-id "e93dbfd4-ccca-4577-8de9-025fc67eff14"
   :substitutions
   {:%RESETLINK% (str "Please click the link below to set your password:"
                      "<br />https://purpledelivery.com/user/reset-password/"
                      (:reset_key %))})
 (!select (common.db/conn) "users" ["*"]
          {:account_manager_id "BmFyfnvXfgaVcGvOrsng"}))
