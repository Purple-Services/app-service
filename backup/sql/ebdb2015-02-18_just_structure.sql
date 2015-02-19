-- phpMyAdmin SQL Dump
-- version 3.5.1
-- http://www.phpmyadmin.net
--
-- Host: aaey4vi1u5i4jq.cqxql2suz5ru.us-west-2.rds.amazonaws.com:3306
-- Generation Time: Feb 19, 2015 at 12:55 AM
-- Server version: 5.5.40-log
-- PHP Version: 5.3.13

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `ebdb`
--

-- --------------------------------------------------------

--
-- Table structure for table `couriers`
--

CREATE TABLE IF NOT EXISTS `couriers` (
  `id` varchar(255) NOT NULL COMMENT 'should match id of ''user'' this corresponds to',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `on_duty` tinyint(1) NOT NULL DEFAULT '0',
  `connected` tinyint(1) NOT NULL DEFAULT '0',
  `gallons_87` int(11) NOT NULL,
  `gallons_91` int(11) NOT NULL,
  `lat` double NOT NULL,
  `lng` double NOT NULL,
  `last_ping` int(11) NOT NULL DEFAULT '0' COMMENT 'unix time of last ping',
  `queue` varchar(5000) NOT NULL DEFAULT '|' COMMENT 'pipe "|" separated list of order ids',
  `timestamp_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE IF NOT EXISTS `orders` (
  `id` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT '',
  `user_id` varchar(255) NOT NULL DEFAULT '',
  `courier_id` varchar(255) NOT NULL DEFAULT '',
  `vehicle_id` varchar(255) NOT NULL DEFAULT '',
  `target_time_start` int(11) NOT NULL DEFAULT '0',
  `target_time_end` int(11) NOT NULL DEFAULT '0',
  `gallons` int(11) NOT NULL DEFAULT '0',
  `special_instructions` text NOT NULL,
  `lat` double NOT NULL DEFAULT '0',
  `lng` double NOT NULL DEFAULT '0',
  `address_street` varchar(255) NOT NULL DEFAULT '',
  `address_city` varchar(255) NOT NULL DEFAULT '',
  `address_state` varchar(255) NOT NULL DEFAULT '',
  `address_zip` varchar(50) NOT NULL DEFAULT '',
  `gas_price` int(11) NOT NULL DEFAULT '0' COMMENT 'cents',
  `service_fee` int(11) NOT NULL DEFAULT '0' COMMENT 'cents',
  `total_price` int(11) NOT NULL DEFAULT '0' COMMENT 'cents',
  `paid` tinyint(1) NOT NULL DEFAULT '0',
  `stripe_charge_id` varchar(255) NOT NULL DEFAULT '',
  `stripe_customer_id_charged` varchar(255) NOT NULL DEFAULT '',
  `stripe_balance_transaction_id` varchar(255) NOT NULL DEFAULT '',
  `time_paid` int(11) NOT NULL DEFAULT '0',
  `number_rating` int(11) DEFAULT NULL COMMENT '0-5 stars',
  `text_rating` text NOT NULL,
  `timestamp_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `user_id_2` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `ip` varchar(100) NOT NULL,
  `timestamp_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=175 ;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL COMMENT 'native, facebook, or google',
  `password_hash` varchar(255) NOT NULL DEFAULT '',
  `reset_key` varchar(255) NOT NULL DEFAULT '',
  `phone_number` varchar(50) NOT NULL DEFAULT '',
  `name` varchar(255) NOT NULL DEFAULT '',
  `gender` varchar(20) NOT NULL DEFAULT '',
  `is_courier` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'if ''true'', there should be an entry with this id in the ''couriers'' table',
  `stripe_customer_id` varchar(255) NOT NULL DEFAULT '',
  `stripe_cards` text NOT NULL,
  `stripe_default_card` varchar(255) DEFAULT NULL,
  `timestamp_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `vehicles`
--

CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` varchar(255) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `user_id` varchar(255) NOT NULL,
  `year` varchar(50) NOT NULL,
  `make` varchar(255) NOT NULL,
  `model` varchar(255) NOT NULL,
  `color` varchar(255) NOT NULL,
  `gas_type` varchar(255) NOT NULL,
  `license_plate` varchar(255) NOT NULL,
  `photo` mediumtext NOT NULL,
  `timestamp_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `user_id_2` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
