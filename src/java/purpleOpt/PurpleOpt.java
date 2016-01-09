package purpleOpt;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.*;
import java.text.ParseException;	// for SimpleDateFormat to UnixTime
import java.text.SimpleDateFormat;  // for SimpleDateFormat <--> UnixTime conversion
import java.lang.Math;


// for JSON parsing
import org.json.simple.*;
import org.json.simple.parser.*;

//import clojure.lang.Obj;
//import com.amazonaws.services.cloudfront.model.InvalidGeoRestrictionParameterException;
//import javafx.beans.binding.DoubleExpression;

/*
General INPUT (for major functions):
	"orders":
		[order ID]:
			"lat" (Double);
			"lng" (Double);
			"id" (String);
			"gas_type" (String);
			"gallons" (Integer);
			"target_time_start" (Integer);
			"target_end_start" (Integer);
			"status" (String);
			"status_times" (HashMap<String,Long>):
				String: (Long);
	"couriers":
		[courier ID]:
			"lat" (Double);
			"lng" (Double);
			"connected" (Boolean);
			"last_ping" (Integer);
			"zones" (List<String>);
			"assigned_orders" (List<String>);
	"human_time_format": (optional) true / false;
	"current_time": (optional) SimpleDateFormat (if human_time_format is true) or UnixTime (if human_time_format is false)
*/

public class PurpleOpt {


    /*
    INPUT:
      general input (see above)
    OUTPUT: a Hashmap
        [order ID]: {
          "suggested_courier_id": [(String) suggested courier id],
          "suggested_courier_pos": [(Integer) the position of the order in the courier's queue (1 based)]
          "suggested_courier_etf": [(Integer) estimated finish time]
	}
	*/
	@SuppressWarnings("unchecked")
	public static LinkedHashMap<String, Object> computeSuggestion(HashMap<String,Object> input) {

		Object value;	// used to temporarily hold an object and check if it is null

		// print switch
//		boolean bPrint = false; // CAUTION

		/* --- read data from input --- */
		// read the orders hashmap
		HashMap<String, Object> orders = (HashMap<String, Object>) input.get("orders");
		// read the couriers hashmap
		HashMap<String, Object> couriers = (HashMap<String, Object>) input.get("couriers");

//		boolean json_input = (boolean) input.get("json_input");	// this key-value pair is not used
		boolean human_time_format;
		value = input.get("human_time_format");
		if (value == null)
			human_time_format = false;
		else
			human_time_format = (boolean) value;

		/* --- get current time in the Unix time format --- */
		long currTime = 0;
		value = (Object) input.get("current_time");
		if (value == null) {
			// get the system time
			currTime = System.currentTimeMillis() / 1000L;
		} 
		else {
			// get the specified "current time"
			if (human_time_format)
				currTime = SimpleDateFormatToUnixTime((String)value);
			else
				currTime = (Long) value;
		}

		/* --- go through all couriers and remove the invalid ones, because they cannot take orders --- */
		for(Iterator<String> it = couriers.keySet().iterator(); it.hasNext(); ) {
			String courier_key = it.next();
			if (!bCourierValid((HashMap<String, Object>)couriers.get(courier_key))) {
				it.remove();
			}
		}

		/* --- for each courier, compute their finish time (the time by which they will finish all their assigned orders),
		 *     which is set to the current time if they have no assigned order.
		 --- */
		for(String courier_key: couriers.keySet()) {
			// get the courier by their key
			HashMap<String, Object> courier = (HashMap<String, Object>) couriers.get(courier_key);
            // get finish time/lat/lng
            HashMap<String, Object> finish = computeFinishTimeLatLng(courier, orders, currTime);
			// add entries to the existing couriers hashmap for later use
			courier.put("finish_time", finish.get("finish_time"));
            courier.put("finish_lat", finish.get("finish_lat"));
            courier.put("finish_lng", finish.get("finish_lng"));
		}

		/* --- sort the unfinished orders ("servicing", "en route", "unassigned") by status and then deadline. 
		 *     orders of any other types, if any, are removed --- */
		List<HashMap<String,Object>> sorted_orders = sortUnfinishedOrders(orders);

        /* --- create output hashmap --- */
        // initialize the output hashmap
        LinkedHashMap<String,Object> outHashMap = new LinkedHashMap<>();
        
        // add an entry for each unassigned order, with an empty hashmap as its value
        for(Iterator<HashMap<String,Object>> it = sorted_orders.listIterator(); it.hasNext(); ) {
            HashMap<String,Object> order = it.next();
            outHashMap.put((String)order.get("id"), new LinkedHashMap<String,Object>());
        }

		/* --- cluster unassigned orders so that nearby orders are grouped in one list ---
		 *     TODO: consider cluster size determined by deadlines
		 *     TODO: consider cluster criterion by courier distance */
		List<List<HashMap<String,Object>>> clusters_unassigned_orders = clusterOrders(sorted_orders);

		/* --- assign couriers to unassigned orders 
		 *     TODO: if any order in a cluster has an assigned courier already, then assign the cluster
		 *     to the same courier, regardless of scores
		 * --- */
		for (int i = 0; i < clusters_unassigned_orders.size(); i++) {
			// get the i-th order cluster (0 based index)
			List<HashMap<String,Object>> cluster = clusters_unassigned_orders.get(i);
            // if there is only one order in the cluster
			if (cluster.size() == 1) {
                // get the only order in the list, its key, and its assigned courier (if any)
                HashMap<String, Object> order = cluster.get(0);
                String order_key = (String) order.get("id");
                String assigned_courier_key;
                value = order.get("assigned_courier");
                if (value != null) {
                	// the order has been assigned to a courier
                	assigned_courier_key = (String) value;
                	LinkedHashMap<String,Object> out_order_entry = (LinkedHashMap<String,Object>)outHashMap.get(order_key);
                	out_order_entry.put("suggested_courier", assigned_courier_key);
                	out_order_entry.put("new_assignment", false);
                	out_order_entry.put("suggested_courier_pos", (Long)order.get("assigned_courier_pos"));
                	out_order_entry.put("suggested_courier_etf", ReturnTimeInRightFormat((Long)order.get("etf"),human_time_format));
                }
                else {
                	// the order has NOT been assigned to a courier
                	// initialize best score, finish time, and the corresponding courier's key
                	long best_score = 0;
                	Long best_finish_time = 0L;
                	String best_courier_key = "";
                	// compute scores for all couriers
                	for(String courier_key: couriers.keySet()) {
                		// get the courier
                		HashMap<String,Object> courier = (HashMap<String,Object>) couriers.get(courier_key);
                		// compute score
                		long finish_time = ((Long)courier.get("finish_time")) // the time when the courier will finish all the assigned orders
                				+ timeDistantOrder(order, (Double)courier.get("finish_lat"), (Double)courier.get("finish_lng"));   // the total time for the new order
                		long score = finish_time
                				+ computeCrossZonePenalty(order,courier,orders,couriers); // score also include cross-zone penalty
                		// update the best score if the new score is better, or the best score is never recorded
                		if (score<best_score || best_score==0) {
                			best_score = score;
                			best_finish_time = finish_time;
                			best_courier_key = courier_key;
                		}
                	}
                	// get the best courier by the recorded best courier's key
                	HashMap<String,Object> best_courier = (HashMap<String,Object>)couriers.get(best_courier_key);
                	// add the order to the best courier's queue, and update the finish time/lat/lng for the courier
                	((List<String>)best_courier.get("assigned_orders")).add(order_key);
                	best_courier.put("finish_time", best_finish_time);
                	best_courier.put("finish_lat", (Double)order.get("lat"));
                	best_courier.put("finish_lng", (Double)order.get("lng"));
                	// add the assignment information to the output hashmap
                	LinkedHashMap<String,Object> out_order_entry = (LinkedHashMap<String,Object>)outHashMap.get(order_key);
                	out_order_entry.put("suggested_courier", best_courier_key);
                	out_order_entry.put("new_assignment", true);
                	out_order_entry.put("suggested_courier_pos", ((List<String>)best_courier.get("assigned_orders")).size());
                	out_order_entry.put("suggested_courier_etf", ReturnTimeInRightFormat(best_finish_time,human_time_format));
                }
			}
            // there are multiple orders in the cluster
			else {
                // initialize scores, etc.
                long best_score = 0;
                Long best_finish_time = 0L;
                // used to save the finish time for each order in this cluster
                List<Long> etfs = new ArrayList<Long>();
                // used to save the best
                List<Long> best_etfs = null;
                String best_courier_key = "";
                // initialize the order variable as the first order in the cluster, also for later use
                HashMap<String,Object> order = cluster.get(0);
                // get the assigned courier, possibly null, of the first order in the cluster
                String assigned_courier_key;
                value = order.get("assigned_courier");
                // check if the cluster already includes an order with an assigned courier
                Set<String> keySet = null;
                if (value == null) {
                	// no courier assigned yet, let's go through the available couriers
                	keySet = couriers.keySet();
                } else {
                	// a courier has been assigned, use him/her by assign him/her to the keySet
                	assigned_courier_key = (String) value;
                	keySet = new HashSet<String>();
                	keySet.add(assigned_courier_key);
                }
                // compute scores for all couriers
                for(String courier_key: keySet) {
                    // get the courier
                    HashMap<String,Object> courier = (HashMap<String,Object>) couriers.get(courier_key);
                    /* compute score */
                    // initialize the HashMap iterator
                    Iterator<HashMap<String,Object>> hit = cluster.iterator();
                    // set finish_time for the first order in the cluster
                    order = hit.next(); // get the first order
                    long finish_time = ((Long)courier.get("finish_time")) // the time when the courier will finish all the assigned orders
                            + timeDistantOrder(order, (Double)courier.get("finish_lat"), (Double)courier.get("finish_lng")); // the total time travel to and finish the new order
                    etfs.add(finish_time); // save the finish time for this order
                    // update finish_time for the remaining orders in the cluster
                    while (hit.hasNext()) {
                        order = hit.next(); // get the next order
                        finish_time += timeNearbyOrder(order); // the time to finish each subsequent nearby order
                        etfs.add(finish_time);
                    }
                    // compute the score
                    long score = finish_time
                            + computeCrossZonePenalty(order,courier,orders,couriers); // add cross-zone penalty
                    // update the best score if the new score is better
                    if (score<best_score || best_score==0) {
                        best_score = score;
                        best_finish_time = finish_time;
                        best_courier_key = courier_key;
                        best_etfs = new ArrayList<Long>(etfs);
                    }
                    etfs.clear();
                }
                // get the best courier by the recorded best courier's key
                HashMap<String,Object> best_courier = (HashMap<String,Object>)couriers.get(best_courier_key);
                // use the HashMap iterator for going through all the orders in the cluster
                Iterator<Long> lit = best_etfs.iterator();
                // get the list of assigned_orders from the best courier
                List<String> best_courier_assigned_orders = (List<String>) best_courier.get("assigned_orders");
                for (Iterator<HashMap<String,Object>> hit = cluster.iterator(); hit.hasNext(); ) {
                    // get an order in the cluster and its key
                    order = hit.next();
                    String order_key = (String) order.get("id");
                    // add the assignment of courier to the order
                    LinkedHashMap<String, Object> out_order_entry = (LinkedHashMap<String, Object>) outHashMap.get(order_key);
                    // add the order to the best courier's queue
                    out_order_entry.put("suggested_courier", best_courier_key);
                    if (best_courier_assigned_orders.contains(order_key)) {
                    	out_order_entry.put("new_assignment", false);
                    } else {
                    	best_courier_assigned_orders.add(order_key);
                    	out_order_entry.put("new_assignment", true);
                    }
                    out_order_entry.put("suggested_courier_pos", best_courier_assigned_orders.size());
                    out_order_entry.put("suggested_courier_etf", ReturnTimeInRightFormat(lit.next(), human_time_format));
                }
                // update the best courier's finish_time/lat/lng
                best_courier.put("finish_time", best_finish_time);
                best_courier.put("finish_lat", (Double)order.get("lat"));
                best_courier.put("finish_lng", (Double)order.get("lng"));
			}
		}
        // output return
		return outHashMap;
	}

    /* return a list of orders sorted by their deadlines */
    @SuppressWarnings("unchecked")
	static List<HashMap<String,Object>> sortUnassignedOrders(HashMap<String,Object> orders) {
		// clone orders to unassigned_orders
		HashMap<String,HashMap<String,Object>> unassigned_orders = (HashMap<String,HashMap<String,Object>>) orders.clone();
		// remove the orders with their status other than "unassigned"
		Iterator<String> it = unassigned_orders.keySet().iterator();
		while (it.hasNext()) {
			String order_key = it.next(); // get next key
			HashMap<String,Object> order = (HashMap<String, Object>) orders.get(order_key); // get the order
			String order_status = (String) order.get("status"); // get the status string
			if (! order_status.equals("unassigned")) { // remove the order if it is not "unassigned"
				it.remove();
			}
		}
		// initialize unassigned_order_list
		List<HashMap<String,Object>> unassigned_order_list = new ArrayList<HashMap<String, Object>>(unassigned_orders.values());
		// sort unassigned_order_list by order deadline
		Collections.sort(unassigned_order_list, new Comparator<HashMap<String, Object>>() {
			public int compare(HashMap<String, Object> o1, HashMap<String, Object> o2) {
				// if ((Integer)o1.get("target_time_end") >= (Integer)o2.get("target_time_end"))
				if (GetIntegerTimeFrom(o1,"target_time_end") >= GetIntegerTimeFrom(o2,"target_time_end"))
					return 1;
				else
					return -1;
				// returning 0 would merge keys
			}
		});
		// return unassigned_order_list
		return unassigned_order_list;
	}

    @SuppressWarnings("unchecked")
	static List<HashMap<String,Object>> sortUnfinishedOrders(HashMap<String,Object> orders) {
		// initialize unassigned_order_list
		List<HashMap<String,Object>> unfinished_order_list = new ArrayList<>();
		// remove the orders with their status other than "en route", "servicing", and "unassigned"
		Iterator<String> it = orders.keySet().iterator();
		while (it.hasNext()) {
			String order_key = it.next(); // get next key
			HashMap<String,Object> order = (HashMap<String, Object>) orders.get(order_key); // get the order
			String order_status = (String) order.get("status"); // get the status string
			if (order_status.equals("en route") || order_status.equals("servicing") || order_status.equals("unassigned")) {
				// add the order to list
				unfinished_order_list.add(order);
			} else {
				// remove the order
				it.remove();
			}
		}
		// sort the list by order status and deadline
		Collections.sort(unfinished_order_list, new Comparator<HashMap<String, Object>>() {
			public int compare(HashMap<String, Object> o1, HashMap<String, Object> o2) {
				// if ((Integer)o1.get("target_time_end") >= (Integer)o2.get("target_time_end"))
				if ((!((String)o1.get("status")).equals("servicing")) && ((String)o2.get("status")).equals("servicing"))
					// give priority to "servicing" over "en route" and "unassigned"
					return 1;
				else if (((String)o1.get("status")).equals("unassigned") && ((String)o2.get("status")).equals("en route"))
					// give priority to "en route" over "unassigned"
					return 1;
				else if (GetIntegerTimeFrom(o1,"target_time_end") > GetIntegerTimeFrom(o2,"target_time_end"))
					// for orders with the same status, give priority to earlier deadline
					return 1;
				else
					return -1;
				// returning 0 would merge keys
			}
		});
		// return unassigned_order_list
		return unfinished_order_list;
	}

    /* from the specified startTime, compute the time that the specified courier will finish his assigned orders */
    @SuppressWarnings("unchecked")
	static HashMap<String,Object> computeFinishTimeLatLng(HashMap<String, Object> courier, HashMap<String, Object> orders, long startTime) {

		// get the courier's current assigned orders
		List<String> assigned_orders_keys = (List<String>)courier.get("assigned_orders");
        // initialize lat lng to the courier's current lat lng
        Double finish_lat = (Double)courier.get("lat");
        Double finish_lng = (Double)courier.get("lng");
        // initialize finish_time to the specified startTime
		Long finish_time = startTime;

		// check empty
		if (! assigned_orders_keys.isEmpty()) { // if it has assigned orders
            // get courier lat-lng
			Double courier_lat = finish_lat;
			Double courier_lng = finish_lng;

			// initialize assigned order lat and lng
			Double order_lat = 0.0;
			Double order_lng = 0.0;

			// get the first (working) order
			HashMap<String, Object> order = (HashMap<String, Object>) orders.get(assigned_orders_keys.get(0));

            
            // System.out.println("order at 385");
            // System.out.println(assigned_orders_keys);
            // System.out.println(assigned_orders_keys.get(0));
            // System.out.println(orders);
            // System.out.println(orders.get(assigned_orders_keys.get(0)));
            // System.out.println(order);
            
			// check if arrived at the order
			if (bCourierAtOrderSite(order,courier)) {
                // already servicing the order
                finish_time += iOrderServingTime(order) / 2;
            }
			else {
				// still traveling to the order
				// get the assigned order lat and lng
				order_lat = (Double) order.get("lat");
				order_lng = (Double) order.get("lng");
				// add the time
				finish_time += getGoogleDistance(courier_lat, courier_lng, order_lat, order_lng)
						       + iOrderServingTime(order);
			}
			// tag the order with its assigned courier
			order.put("assigned_courier", (String)courier.get("id"));
			order.put("assigned_courier_pos", new Long(1L));
			order.put("etf", finish_time);

			// process the remaining assigned orders
			for (int i=1; i<assigned_orders_keys.size(); i++) { // i=1 means we start from the second order
                // get the order
				order = (HashMap<String, Object>) orders.get(assigned_orders_keys.get(i));

                // we are looking at an assigned order in the courier's queue
				Double prev_order_lat = order_lat;
				Double prev_order_lng = order_lng;
				// get the assigned order's lat and lng
				order_lat = (Double) order.get("lat");
				order_lng = (Double) order.get("lng");

				// check if two orders are nearby
				if (bNearbyOrderLatLng(prev_order_lat,prev_order_lng,order_lat,order_lng)) {
					// add a discounted servicing time, and skip traveling
					finish_time += timeNearbyOrder(order);
				}
				else {
					// add both traveling and servicing times
					finish_time += timeDistantOrder(order, prev_order_lat, prev_order_lng);
				}

				// tag the order with its assigned courier
				order.put("assigned_courier", (String)courier.get("id"));
				order.put("etf", finish_time);
				order.put("assigned_courier_pos", new Long((long)(i+1)));
			}
            // update finish_lat / lng
            finish_lat = order_lat;
            finish_lng = order_lng;
		}
        // initialize output hash map
        HashMap<String,Object> outHashMap = new HashMap<>();
        // put results into the output hashmap
        outHashMap.put("finish_time", finish_time);
        outHashMap.put("finish_lat", finish_lat);
        outHashMap.put("finish_lng", finish_lng);
        // output return
        return outHashMap;
	}

    /* return the total time spent on a nearby order, which requires no travel */
	static long timeNearbyOrder(HashMap<String,Object> order) {
		return iOrderServingTime(order)*2/3;
	}

    /* return the total time spent on an order that is away from the previous lat-lng location */
	static long timeDistantOrder(HashMap<String,Object> order, Double prev_lat, Double prev_lng) {
		return getGoogleDistance(prev_lat, prev_lng, (Double)order.get("lat"), (Double)order.get("lng")) // travel time
                + iOrderServingTime(order); // servicing time
	}

    /* return the max size of a cluster of orders */
	static long maxClusterSize () {
		return 3;
	}

    /* given a list of orders (sorted), return a nested list in which each list is a cluster of nearby orders */
	static List<List<HashMap<String,Object>>> clusterOrders(List<HashMap<String,Object>> listOrders) {
		// initialize the output clusters (nested list)
		List<List<HashMap<String,Object>>> clusters = new ArrayList<>();

		while (!listOrders.isEmpty()) {
			// initialize an empty cluster
			List<HashMap<String, Object>> cluster = new ArrayList<>();
			// get an iterator
			Iterator<HashMap<String,Object>> it = listOrders.listIterator();
			// move the first order from the list to the cluster
			HashMap<String,Object> base_order = it.next();
			cluster.add(base_order);
			it.remove();
			// go through the remaining list for nearby orders while the cluster size is not exceeding the max cluster size
			while (cluster.size() < maxClusterSize() && it.hasNext()) {
				HashMap<String,Object> comp_order = it.next();  // get the order to compare with the base_order
				// if the order is close to the base order, then move it from the list to the cluster
				if (bNearbyOrder(base_order,comp_order) && (!bAssignedToDifferentCouriers(base_order,comp_order))) {
					cluster.add(comp_order);
					it.remove();
				}
			}
            // add the cluster to the clusters (nested list)
			clusters.add(cluster);
		}
		// return the output clusters
		return clusters;
	}

    /* decide whether two lat-lng coordinates are considered nearby */
	static boolean bNearbyOrderLatLng(Double lat1, Double lng1, Double lat2, Double lng2) {
		double radiusThreshold = 0.001; // radius roughly equal to a small street block; NOTE: the actual distance depends on the location of a city
		if ((lat1-lat2)*(lat1-lat2) + (lng1-lng2)*(lng1-lng2) <= radiusThreshold*radiusThreshold)
			return true;
		else
			return false;
	}

    /* decide whether two orders are considered nearby */
	static boolean bNearbyOrder(HashMap<String,Object> order1, HashMap<String,Object> order2) {
		return bNearbyOrderLatLng((Double) order1.get("lat"), (Double) order1.get("lng"),
								  (Double) order2.get("lat"), (Double) order2.get("lng"));
	}

    /* decide whether a courier is valid to take orders */
	static boolean bCourierValid(HashMap<String, Object> courier) {
		// get the courier connection status
		Boolean connected = (Boolean) courier.get("connected");
		// get the courier lat and lng
		Double courier_lat = (Double) courier.get("lat");
		Double courier_lng = (Double) courier.get("lng");

		if (connected.booleanValue() && courier_lat != 0 && courier_lng != 0)
			return true;
		else
			return false;
	}

    /*
    OUTPUT:
	[order ID]: {
	  "etas": {
	     [courier id]: 450, // number of driving seconds away from the current location to the order
	     [courier id 2]: 615,
	     etc
	  }
	}
    The following keys are removed from under each order
	  "suggested_courier_id": [suggested courier id],
	  "expected_deadline_diff": [number of seconds, + for late, - for early]
	*/
	@SuppressWarnings("unchecked")
	public static HashMap<String, Object> computeDistance(HashMap<String,Object> input) {
		
		// print switch
		boolean bPrint = false; // CAUTION
		boolean bPrintInput = false; // CAUTION
		
		// print 
		if (bPrintInput) {
			printInput(input);
			return(null);
		}
		
		// get current time in the Unix time format
		// long currTime = System.currentTimeMillis() / 1000L; // not used any more
		
		// --- read data from input to structures that are easy to use ---
		// read the orders hashmap
		HashMap<String, Object> orders = (HashMap<String, Object>) input.get("orders");
		// read the couriers hashmap
		HashMap<String, Object> couriers = (HashMap<String, Object>) input.get("couriers");
		
		// create the output hashmap
		HashMap<String, Object> outHashmap = new HashMap<String, Object>();
		// structure:
		//   outHashmap(key: order_key; val: outOrder)
		//     outOrder(key: "suggested_courier_id"; null;
		//              key: "etas"; val: outETAs)
		//       outETAs(key: courier_key: val: eta_seconds)
		
		// create the inputs for calling GoogleDistanceMatrix
		List<String> listOrigins = new ArrayList<String>();	// store origin lat-lng
		List<String> listOriginKeys = new ArrayList<String>(); // store origin key (courier key)
		List<String> listDests = new ArrayList<String>();	// store destination lat-lng
		List<String> listDestKeys = new ArrayList<String>(); // store destination key (order key)

		/*-- add all the valid couriers to the list for GoogleDistanceMatrix --*/
		for(String courier_key: couriers.keySet()) {
			// get the order by ID (key)
			HashMap<String, Object> courier = (HashMap<String, Object>) couriers.get(courier_key);
			// check if the courier is valid
			if (bCourierValid(courier)) {
				// get the courier lat and lng
				Double courier_lat = (Double) courier.get("lat");
				Double courier_lng = (Double) courier.get("lng");
				// add this courier to listOrigins, if the courier is not already there
				if (!listOriginKeys.contains(courier_key)) {
					// add the lat-lng of this courier to listOrigins
					listOrigins.add(courier_lat.toString()+","+courier_lng.toString());
					// add the courier key to listOriginKeys
					listOriginKeys.add(courier_key);
				}
			}
		}
		
		
		/*-- create an entry for each unassigned order in outHashmap and add it to listDests --*/
		for(String order_key: orders.keySet()) {
			// get the order object
			HashMap<String, Object> order = (HashMap<String, Object>) orders.get(order_key);
			// get the order status
			String order_status = (String) order.get("status");
			
			// check if the order is unassigned
			if (order_status.equals("unassigned")) {
				// create a Hashmap for this order
				HashMap<String, Object> outOrder = new HashMap<String, Object>();
				// put this order in the output hashmap
				outHashmap.put(order_key, outOrder);
				
				// specify the suggested courier for this order, will implement later
				/* --- I disable the computation for suggested courier from this function 
	                List<HashMap<String,Object>> courierScores = computeCourierScores(orders, couriers, order_key);
	                String suggested_courier_key = (String) courierScores.get(0).get("courier_key");
	 				outOrder.put("suggested_courier_id", suggested_courier_key);
	
	                int time_to_finish = ((Integer)(courierScores.get(0)).get("time_to_finish")).intValue() + (int)currTime; // the absolute time for the suggested courier to finish the order
	                int order_deadline = ((Integer) order.get("target_time_end")).intValue();
	                Integer expected_deadline_diff = new Integer(time_to_finish - order_deadline);
	
	                if (bPrint) {// CAUTION
						System.out.println("courier_eta: " + (Integer) ((courierScores.get(0)).get("time_to_finish")) + "current time: " + currTime + "order_end: " + ((Integer) order.get("target_time_end")).intValue());
						outOrder.put("expected_deadline_diff", expected_deadline_diff);
					}
				---*/
				
				// create a hashmap for ETAs
				HashMap<String, Integer> outETAs = new HashMap<String, Integer>();
				// put the ETAs to the order object
				outOrder.put("etas", outETAs);

				// get the order lat and lng
				Double order_lat = (Double) order.get("lat");
				Double order_lng = (Double) order.get("lng");
				
				// add this order to listDest, if not already there, for googleDistanceMatrix
				if (!listDestKeys.contains(order_key)) {
					// add the lat-lng of this order to listDests
					listDests.add(order_lat.toString()+","+order_lng.toString());
					// add this order's key to listDestKeys
					listDestKeys.add(order_key);
				}
			}
		}

		if (bPrint) {
			System.out.println(" #couriers: " + listOrigins.size() + "; #orders" + listDests.size());
			System.out.println();
		}
		
		// call getGoogleDistanceMatrix, if there are origin(s) and destination(s)
		if (!listOrigins.isEmpty() && !listDests.isEmpty()) {
			
			if (bPrint) 
				System.out.println("calling google ... ");

			// get ETAs by calling the function getGoogleDistanceMatrix
			// The result is a nested list. Each item of the outer list is an origin.
			List<List<Integer>> listETAs = PurpleOpt.getGoogleDistanceMatrix(listOrigins, listDests);
			
			if (bPrint) 
				System.out.println("google responded!");

			// write the ETAs to the hashmap
			// initialize listETAelements
			List<Integer> listETAelements;
			// for each row (origin), and then for each column (destination)
			for(int i = 0; i < listETAs.size(); i++) {
				// get the corresponding courier key from listOriginKeys
				String courier_key1 = listOriginKeys.get(i);
				// get the list of ETAs for this courier
				listETAelements = listETAs.get(i);
				
				if (bPrint)
					System.out.print("  courier at " + listOrigins.get(i));

				// for each column (destination)
				for(int j = 0; j < listETAelements.size(); j++) {
					// get the corresponding order key from listDestKeys
					String order_key = listDestKeys.get(j);
					// from outHashmap, get the field "outOrder" corresponding to this order
					HashMap<String, Object> outOrder = (HashMap<String, Object>) outHashmap.get(order_key);
					// from outOrder, get the field "etas"
					HashMap<String, Integer> outETAs = (HashMap<String, Integer>) outOrder.get("etas");
					// write the order-courier ETA to outETAs
					outETAs.put(courier_key1, listETAelements.get(j));

					if (bPrint) {
						System.out.print(" order at " + listDests.get(j) + " ETA: " + listETAelements.get(j) + " seconds");
						System.out.println();
					}
				}
			}
			
		}
		
		// return outHashmap, if it is non-empty
		if (outHashmap.isEmpty())
			return null;
		else
			return (outHashmap);
	}
	
	public static List<List<Integer>> getGoogleDistanceMatrix(List<String> org_latlngs, List<String> dest_latlngs) {
		int nOrgs = org_latlngs.size();
		int nDests = dest_latlngs.size();
		boolean bPrint = false;

		if (nOrgs < 1 || nDests < 1)
			return null;
		
		// generate the origins string
		String strOrgs = "origins=";
		for (int i = 0; i < nOrgs; i++) {
			if (i > 0)
				strOrgs += "|";
			strOrgs += org_latlngs.get(i);
		}
		
		// generate the destinations string
		String strDests = "destinations=";
		for (int j = 0; j < nDests; j++) {
			if (j > 0)
				strDests += "|";
			strDests += dest_latlngs.get(j);
		}

		// Wotao's key
		// String server_key = "AIzaSyAFGyFvaKvXQUKzRh9jQaUwQnHnkiHDUCE"; // CAUTION
		// Purple's key
		String server_key = "AIzaSyCd_XdJsSsStXf1z8qCWITuAsppr5FoHao";

		// generate request URL 
		String reqURL = "https://maps.googleapis.com/maps/api/distancematrix/json?" + strOrgs + "&" + strDests;
		reqURL += "&departure_time=now";	// this is not really useful
		reqURL += "&key=" + server_key;

		if (bPrint)
			System.out.println(reqURL);
		
		// prepare for the request
		URL url;
		HttpURLConnection conn;
		String outputString = "";

		// initialize the outer list
		List<List<Integer>> mtxSeconds = new ArrayList<List<Integer>>(nOrgs);
		List<Integer> rowSeconds;
		
		try {
			// send the request to Google
			url = new URL(reqURL);
			conn = (HttpURLConnection) url.openConnection();
			conn.setRequestMethod("GET");

			// retrieve the results
			BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
			String line;
			while ((line = reader.readLine()) != null) {
				outputString += line;
			}

			// initialize the JSON parser
			JSONParser parser=new JSONParser();
			JSONArray json_array = (JSONArray)parser.parse("[" + outputString + "]");
			JSONArray rows = (JSONArray)((JSONObject) json_array.get(0)).get("rows");
			
			JSONObject row;	// each row corresponds to an origin (courier)
			JSONArray elements;	// each element corresponds to a destination (order)
			JSONObject element;
			String resp_status;
			Long resp_seconds;

			// loop through the results
			for (int i = 0; i < rows.size(); i++) {
				// get the row and its elements
				row = (JSONObject) rows.get(i);
				elements = (JSONArray) row.get("elements");
				// create element array for seconds
				rowSeconds = new ArrayList<Integer> (elements.size());
				// loop through the elements
				for (int j = 0; j < elements.size(); j++) {
					element = (JSONObject) elements.get(j);
					resp_status = (String)element.get("status");
					if (resp_status.equals("OK")) {
						resp_seconds = (Long)((JSONObject)element.get("duration")).get("value");
						rowSeconds.add(resp_seconds.intValue());
					}
					else {
						// set 0 second if the response status is not "OK"
						rowSeconds.add(0);
					}
				}
				// add the row to the output nested list mtxSeconds
				mtxSeconds.add(rowSeconds);
			}
			return mtxSeconds;

		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
			return null;
		}
	}

	@SuppressWarnings("unchecked")
	public static List<HashMap<String,Object>> computeCourierScores(HashMap<String, Object> orders, HashMap<String, Object> couriers, String order_key) {
		/* This function is called for each order that needs a suggested courier
		   Approach: compute scores for all qualified couriers and returns the scores;
		   for each courier, the score equals
		     time_to_finish (including all assigned orders, if any, and this order) + cross_zone_penalty
		   Servicing time equals 20 minutes for each 10-gallon order, 25 minutes for each 15-gallon order.
		   To compute cross_zone_penalty, we need to take into consideration of both distance between the zones, and the
		   likelihood of new orders appearing in the home zone(s) that the courier would be away from.

		   The input should be all the orders and couriers, as well as the order_key of the investigating order.

		   The output should be a list of hashmaps, each being:
		        ["courier_key": String
		        "time_to_finish": Integer
		        "cross_zone_penalty": Integer
		        "score": Integer
		        ]

		   Steps:
		   	* select qualified couriers (connected, serving the zone, or the same city)
		   	* decide whether cross_zone penalty is applicable (depending on his current position and that of his last
		   	  order); if yes, compute it
		   	* check the status of the courier; if on_duty, compute time_to_complete_his_active_order;
		   	  set his start lat and lng to those of the corresponding order
		   	* check whether the courier has orders in queue and add their time up
		   */

		// create the output hashmap, though this function will return a sorted list, which is generated below
		HashMap<String, HashMap<String,Object>> outHashmap = new HashMap<String, HashMap<String, Object>>();

		// get this order object
		HashMap<String, Object> order = (HashMap<String, Object>) orders.get(order_key);

		// go through qualified couriers and compute their scores.
		for(String courier_key: couriers.keySet()) {
			// get the order by ID (key)
			HashMap<String, Object> courier = (HashMap<String, Object>) couriers.get(courier_key);
			// get the courier connection status
			// Boolean connected = (Boolean) courier.get("connected");
			Boolean connected = true;	// CAUTION
			// get the zone/city check result
			/* output:
				2: order is in courier's zone list, no cross zone penalty
				1: order is not in courier's zone list, but in the same city, so can be served by courier; cross zone penalty applicable
				0: order cannot be served by courier
			*/
			// int iInZoneCity = iOrderInCourierZone(order,courier); // CAUTION
			int iInZoneCity = 2;
			// get the courier lat and lng
			Double courier_lat = (Double) courier.get("lat");
			Double courier_lng = (Double) courier.get("lng");

			// initialize scores
			Integer time_to_finish = 0;
			Integer cross_zone_penalty = 0;

			boolean bPrint = false; // CAUTION

			if (bPrint)
				System.out.println("courier: " + courier_key + "; connected: " + connected);

			// check if the courier is connected and has a valid lat-lng
			if (connected.booleanValue() && courier_lat != 0 && courier_lng != 0 && iInZoneCity>0) {

				// initialize the scores hashmap for this courier
				HashMap<String, Object> outCourierScores = new HashMap<String, Object>();

				// the lat and lng of origin (equals courier if he has no assigned; otherwise, the last order in his list)
				// Double origin_lat, origin_lng;

				// compute cross zone penalty, if in the same city but not serving the zone
				if (iInZoneCity == 1)
					cross_zone_penalty = computeCrossZonePenalty(order,courier,orders,couriers);
				else
					cross_zone_penalty = 0;

				// get list of orders
				List<String> assigned_orders_keys = (List<String>)courier.get("assigned_orders");

				// check if the courier has assigned order
				if (assigned_orders_keys.isEmpty()) {
					// get the assigned order lat and lng
					Double order_lat = (Double) order.get("lat");
					Double order_lng = (Double) order.get("lng");
					// add the time
					time_to_finish += iOrderServingTime(order)
							+ getGoogleDistance(courier_lat, courier_lng, order_lat, order_lng);
				}
				else {
					// append this order to the list of assigned orders at its end
					assigned_orders_keys.add(order_key);

					// go through the assigned orders
					for(String assigned_order_key: assigned_orders_keys) {
						// get the assigned order
						HashMap<String, Object> assigned_order = (HashMap<String, Object>) orders.get(assigned_order_key);

						// initialize assigned order lat and lng
						Double assigned_order_lat = 0.0;
						Double assigned_order_lng = 0.0;

						// check if it is the working order (first in the list)
						if (assigned_order_key.equals(assigned_orders_keys.get(0))) {
							// the order that the courier is working on
							if (bCourierAtOrderSite(assigned_order,courier))
							{
								// already arrived at the order site
								// count half service time
								time_to_finish += iOrderServingTime(assigned_order) / 2;
							}
							else {
								// still traveling to the order
								// get the assigned order lat and lng
								assigned_order_lat = (Double) assigned_order.get("lat");
								assigned_order_lng = (Double) assigned_order.get("lng");
								// add the time
								time_to_finish += iOrderServingTime(assigned_order)
										        + getGoogleDistance(courier_lat, courier_lng, assigned_order_lat, assigned_order_lng);
							}
						}
						else {
							// an assigned order that the courier will serve later
							Double prev_lat = assigned_order_lat;
							Double prev_lng = assigned_order_lng;
							// get the assigned order lat and lng
							assigned_order_lat = (Double) assigned_order.get("lat");
							assigned_order_lng = (Double) assigned_order.get("lng");
							// add the time
							time_to_finish += iOrderServingTime(assigned_order)
									+ getGoogleDistance(prev_lat, prev_lng, assigned_order_lat, assigned_order_lng);
						}
					}
				}

				// add fields to the courier
				outCourierScores.put("courier_key", courier_key);
				outCourierScores.put("time_to_finish", new Integer(time_to_finish));
				outCourierScores.put("cross_zone_penalty", new Integer(cross_zone_penalty));
				outCourierScores.put("score", new Integer(time_to_finish+cross_zone_penalty));

				// add scores to the outHashMap
				outHashmap.put(courier_key, outCourierScores);
			}
		}

		// initialize the sorted list
		List<HashMap<String,Object>> courierByScore = new ArrayList<HashMap<String, Object>>(outHashmap.values());

		// sort the list by score
		Collections.sort(courierByScore, new Comparator<HashMap<String, Object>>() {
			public int compare(HashMap<String, Object> o1, HashMap<String, Object> o2) {
				if ((Integer)o1.get("score") >= (Integer)o2.get("score")) {
					return 1;
				}
				else {
					return -1;
				}  // returning 0 would merge keys
			}
		});

		// return the sorted list
		return courierByScore;
	}

	@SuppressWarnings("unchecked")
	static List<Long> getCourierZones(HashMap<String,Object> courier){
		return ((List<Long>) courier.get("zones"));
	}

	static Integer getOrderZone(HashMap<String,Object> order){
		return ((Integer)order.get("zone_id"));
	}

	static int iOrderInCourierZone(HashMap<String,Object> order, HashMap<String,Object> courier){
		/* output:
			2: order is in courier's zone list, no cross zone penalty
			1: order is not in courier's zone list, but in the same city, so can be served by courier; cross zone penalty applicable
			0: order cannot be served by courier
		 */
		
		boolean bPrint = false; // CAUTION
		
		List<Long> courierZones = getCourierZones(courier);
		Integer orderZone = getOrderZone(order);
		
		if (bPrint) {
			System.out.println("iOrderInCourierZone: courierZone size: " + courierZones.size());
			System.out.println("iOrderInCourierZone: orderZone: " + orderZone);
		}

		if (courierZones.contains(orderZone.intValue())) {
			return 2;
		}
		else if ((courierZones.get(0).intValue()/50) == (orderZone.intValue()/50)) {
			return 1;
		}
		else {
			return 0;
		}
	}

	static int computeCrossZonePenalty(HashMap<String,Object> order, HashMap<String,Object> courier,
									   HashMap<String,Object> orders, HashMap<String,Object> couriers) {
		return 0; // this function is not implemented yet
	}

	@SuppressWarnings("unchecked")
	static boolean bCourierWorkingOnAnOrder(HashMap<String,Object> courier){
		if (((List<String>)courier.get("assigned_orders")).isEmpty())
			return false;
		else
			return true;
	}
    
	static boolean bCourierAtOrderSite(HashMap<String,Object> order, HashMap<String,Object> courier) {
		// true if the courier at the order site; false otherwise.

		String ordStatus = (String) order.get("status");
		if (ordStatus.equals("servicing"))
			return true;
		else
			return false;

		/* // older implementation based on comparing lat-lng's
		Double dRadiusThreshold = 0.01;	// CAUTION

		// get the order lat and lng
		Double order_lat = (Double) order.get("lat");
		Double order_lng = (Double) order.get("lng");

		// get the courier lat and lng
		Double courier_lat = (Double) courier.get("lat");
		Double courier_lng = (Double) courier.get("lng");

		// compute l2 distance squared
		Double distSquared = (order_lat - courier_lat)*(order_lat - courier_lat)
							+(order_lng - courier_lng)*(order_lng - courier_lng);

		// radius test
		if (distSquared < dRadiusThreshold*dRadiusThreshold)
			return true;
		else
			return false;
			*/
	}

	static int iOrderServingTime(HashMap<String,Object> order) {
		Integer gallons = (Integer) order.get("gallons");
		switch (gallons.intValue()) {
			case 10:
				return 20*60;	// 20 minutes for 10 gallons;
			case 15:
				return 25*60;	// 25 minutes for 15 gallons;
			default:
				return 25*60;	// by default, it takes 25 minutes;
		}

	}

	public static int getGoogleDistance(Double courier_lat, Double courier_lng, Double order_lat, Double order_lng) {
		int seconds = 0;
		boolean bPrint = false; // CAUTION
		
		// Wotao's key
		String server_key = "AIzaSyAFGyFvaKvXQUKzRh9jQaUwQnHnkiHDUCE";
		
		// set courier as the origin
		String org = courier_lat.toString() + "," + courier_lng.toString();
		
		// set order as the destination
		String dest = order_lat.toString() + "," + order_lng.toString();
		
		// generate request URL 
		String reqURL = "https://maps.googleapis.com/maps/api/distancematrix/json?origins=" + org + "&destinations=" + dest;
		reqURL += "&departure_time=now";
		reqURL += "&key=" + server_key;
		
		// debug display
		if (bPrint)
			System.out.println(reqURL);
		
		// send the request to google
		URL url;
		HttpURLConnection conn;
		String outputString = "";

		try {
			url = new URL(reqURL);
			conn = (HttpURLConnection) url.openConnection();
			conn.setRequestMethod("GET");

			BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
			String line;
			while ((line = reader.readLine()) != null) {
				outputString += line;
			}

			// initial JSON parser
			JSONParser parser=new JSONParser();
			JSONArray json_array = (JSONArray)parser.parse("[" + outputString + "]");
			JSONObject row_0_element_0 = (JSONObject)((JSONArray)((JSONObject)((JSONArray)((JSONObject) json_array.get(0)).get("rows")).get(0)).get("elements")).get(0);

			// check if "status" is "OK" in the JSON
			String resp_status = (String)row_0_element_0.get("status");
			if (resp_status.equals("OK")) {
				// parse JSON for the seconds
				Long resp_seconds = (Long)((JSONObject)row_0_element_0.get("duration")).get("value");
				seconds = resp_seconds.intValue();
			}
			else {
                
				System.out.println("Google zero result");
				return (int) Math.round((Math.abs(courier_lat - order_lat) + Math.abs(courier_lng - order_lng))*150.0);
			}
		} catch (Exception e) {
			// TODO Auto-generated catch block
			// e.printStackTrace();
			System.out.println("Google connection error");
			return (int) Math.round((Math.abs(courier_lat - order_lat) + Math.abs(courier_lng - order_lng))*150.0);
//			return seconds; // its value should be 0
		}

		return seconds;
	}
	
	@SuppressWarnings("unchecked")
	static public String printInput(HashMap<String,Object> input) {
		// --- read data from input to structures that are easy to use ---
		boolean json_input = (boolean) input.get("json_input");
		boolean human_time_format = (boolean) input.get("human_time_format");
		// read orders hashmap
		HashMap<String, Object> orders = (HashMap<String, Object>) input.get("orders");
		int nOrders = orders.size();
		// read couriers hashmap
		HashMap<String, Object> couriers = (HashMap<String, Object>) input.get("couriers");
		int nCouriers = couriers.size();

		// list keys in input
		System.out.println("Keys in the input: ");
		for(String key: input.keySet()) {
			System.out.print(key + "; ");
		}
		// print an empty line
		System.out.println();

		// print couriers
		System.out.println("# of couriers: " + nCouriers);
		System.out.println();

		// for each courier
		for(String courier_key: couriers.keySet()) {
			// print courier ID
			System.out.println("  courier: " + courier_key);
			// get the order by ID (key)
			HashMap<String, Object> courier = (HashMap<String, Object>) couriers.get(courier_key);
			/*// list the keys of each courier_key
			System.out.println("  keys in this couriers: ");
			for(String key: courier.keySet()) {
				System.out.print(key + "; ");
			}
			System.out.println();*/
			// print courier content manually
			System.out.println("    lat: " + (Double) courier.get("lat"));
			System.out.println("    lng: " + (Double) courier.get("lng"));
			System.out.println("    connected: " + (Boolean) courier.get("connected"));
//			System.out.println("    last_ping: " + (Integer) courier.get("last_ping"));

			// print zones
			System.out.print("    zones: " );
			List<Integer> zones = (List<Integer>) courier.get("zones");
			for(Integer zone: zones) {
				System.out.print(zone + " ");
			}
			System.out.println();

			// print assigned_orders
			System.out.print("    assigned_orders:" );
			List<String> assigned_orders = (List<String>) courier.get("assigned_orders");
			for(String assigned_order: assigned_orders) {
				System.out.print(" " + assigned_order);
			}
			
			// print an empty line
			System.out.println();
			System.out.println();
		}

		// print orders
		System.out.println(input.get("orders").getClass());
		System.out.println("# orders: " + nOrders);

		// print an empty line
		System.out.println();

		// for each order
		for(String order_key: orders.keySet()) {
			// print order ID
			System.out.println("  order: " + order_key);
			// get the order by ID (key)
			HashMap<String, Object> order = (HashMap<String, Object>) orders.get(order_key);
			// list the keys of each order
			/*System.out.println("  keys in this order: ");
			for(String key: order.keySet()) {
				System.out.print(key + "; ");
			}
			System.out.println();*/
			// print order content manually
			System.out.println("    id:  " + (String) order.get("id"));
			System.out.println("    status: " + (String) order.get("status"));
			System.out.println("    gas_type: " + (String) order.get("gas_type"));
			System.out.println("    gallons: " + (Integer) order.get("gallons"));
			System.out.println("    lat: " + (Double) order.get("lat"));
			System.out.println("    lng: " + (Double) order.get("lng"));
			if (human_time_format) {
				System.out.println("    target_time_start: " + (String) order.get("target_time_start"));
				System.out.println("    target_time_end : " + (String) order.get("target_time_end"));
			}
			else {
				System.out.println("    target_time_start: " + UnixTimeToSimpleDateFormat(((Integer) order.get("target_time_start")).longValue()));
				System.out.println("    target_time_end : " + UnixTimeToSimpleDateFormat(((Integer) order.get("target_time_end")).longValue()));
			}
			System.out.println("    zone_id: " + (Integer) order.get("zone_id"));

			// print the status time history
			if (json_input) {
				// use Integer format
				HashMap<String,Object> status_times = (HashMap<String,Object>) order.get("status_times");
				System.out.print("       ");
				for(String timekey: status_times.keySet()) {
					if (human_time_format) {
						System.out.print(timekey + ": " + SimpleDateFormatRemoveDate((String) status_times.get(timekey)) +"; ");
					}
					else {
						System.out.print(timekey + ": " + UnixTimeToSimpleDateFormatNoDate(((Integer)status_times.get(timekey)).longValue()) +"; ");
					}
				}
				if (status_times.isEmpty())
					// print an empty line
					System.out.println();
				else {
					System.out.println();
					System.out.println();
				}
			}
			else { // use Long format
				HashMap<String,Long> status_times = (HashMap<String,Long>) order.get("status_times");
				System.out.print("       ");
				for(String timekey: status_times.keySet()) {
					System.out.print(timekey + ": " + (Long)status_times.get(timekey) +"; ");
				}
				if (status_times.isEmpty())
					// print an empty line
					System.out.println();
				else {
					System.out.println();
					System.out.println();
				}
				
			}
		}

	return("OK");
	}
	
	/* convert a UnixTime to a SimpleDateFormat at PDT */
	static String UnixTimeToSimpleDateFormat(Long unixTime) {
		Date dateTime = new Date(unixTime * 1000L);
		SimpleDateFormat sdfFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss z");
		sdfFormat.setTimeZone(TimeZone.getTimeZone("PST"));
		return sdfFormat.format(dateTime);
	}

	/* convert a UnixTime to a SimpleDateFormat at PDT */
	static String UnixTimeToSimpleDateFormatNoDate(Long unixTime) {
		Date dateTime = new Date(unixTime * 1000L);
		SimpleDateFormat sdfFormat = new SimpleDateFormat("HH:mm:ss z");
		sdfFormat.setTimeZone(TimeZone.getTimeZone("PST"));
		return sdfFormat.format(dateTime);
	}

	/* convert a SimpleDateFormat with time zone info to a UnixTime */
	static Long SimpleDateFormatToUnixTime(String sdfTime) {
		SimpleDateFormat sdfFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss z");
		try {
			Date dateTime = sdfFormat.parse(sdfTime);
			return dateTime.getTime()/1000L;
		}
		catch (ParseException e) {
			e.printStackTrace();
		}
		return null;
	}

	/* strip off the date from a SimpleDateFormat with time zone info */
	static String SimpleDateFormatRemoveDate(String sdfTime) {
		SimpleDateFormat sdfFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss z");
		try {
			Date dateTime = sdfFormat.parse(sdfTime);
			SimpleDateFormat sdfFormatNoDate = new SimpleDateFormat("HH:mm:ss z");			
			sdfFormatNoDate.setTimeZone(TimeZone.getTimeZone("PST"));
			return sdfFormatNoDate.format(dateTime.getTime());
		}
		catch (ParseException e) {
			e.printStackTrace();
		}
		return null;
	}
	
	/* get UnixTime in Integer from either Integer or SimpleDateFormat*/
	static Integer GetIntegerTimeFrom(HashMap<String,Object> hmap, String key) {
		Object val = (Object) hmap.get(key);
		try {
			Integer integerVal = (Integer) val;
			return integerVal;
		}
		catch (Exception e) {
			Long longVal = SimpleDateFormatToUnixTime((String)val);
			return longVal.intValue();
		}
	}
	
	/* */
	static Object ReturnTimeInRightFormat(Long unixTime, boolean human_time_format) {
		if (human_time_format) {
			return ((Object) UnixTimeToSimpleDateFormatNoDate(unixTime));
		}
		else {
			return ((Object) unixTime);
		}
	}
	
	/* check if two orders are already assigned to two different couriers */
	static boolean bAssignedToDifferentCouriers(HashMap<String,Object> order1, HashMap<String,Object> order2) {
		// get their assigned couriers, possibly null
		String o1courier = (String) order1.get("assigned_courier");
		String o2courier = (String) order2.get("assigned_courier");
		
		// Perform the test
		if (o1courier != null && o1courier.equals(o2courier))
			return true;
		else
			// case: both==null or they are different
			return false;
	}
}
/* // Unused comparator for scores
class CourierScoreComparator implements Comparator<String> {

	HashMap<String,HashMap<String, Integer>> base;

	public CourierScoreComparator(HashMap<String,HashMap<String, Integer>> base) {
		this.base = base;
	}

	// Note: this comparator imposes orderings that are inconsistent with
	// equals.
	public int compare(String a, String b) {
		Integer courierAScore = ((HashMap<String, Integer>) base.get(a)).get("score");
		Integer courierBScore = ((HashMap<String, Integer>) base.get(b)).get("score");

		if (courierAScore >= courierBScore) {
			return -1;
		} else {
			return 1;
		} // returning 0 would merge keys
	}
}
*/
