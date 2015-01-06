(ns purple.util
  (:require [purple.config :as config]
            [clojure.string :as s]))

(defn split-on-comma [x] (s/split x #","))

(defn in? 
  "true if seq contains elm"
  [seq elm]  
  (some #(= elm %) seq))

(defn rand-str
  [ascii-codes length]
  (apply str (repeatedly length #(char (rand-nth ascii-codes)))))

(defn rand-str-num
  [length]
  (rand-str (range 48 58)  ;; 0-9
            length))

(defn rand-str-alpha-num
  [length]
  (rand-str (concat (range 48 58)  ;; 0-9
                    (range 65 91)  ;; A-Z
                    (range 97 123) ;; a-z
                    )
            length))

(defn new-session-id []
  (rand-str-alpha-num 64))

(defn new-auth-token []
  (rand-str-alpha-num 128))
