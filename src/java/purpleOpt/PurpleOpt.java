package purpleOpt;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.*;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;

import java.text.ParseException;	// for SimpleDateFormat to UnixTime
import java.text.SimpleDateFormat;  // for SimpleDateFormat <--> UnixTime conversion
import java.lang.Math;

/*
General INPUT (for major functions):
	"orders":
		[order ID]:
			"lat" (Double);
			"lng" (Double);
			"id" (String);
			"zone" (Integer);
			"gas_type" (String);
			"gallons" (Integer);
			"target_time_start" (Integer);
			"target_time_end" (Integer);
			"status" (String);
			"status_times" (HashMap<String,Long>):
				String: (Long);
	"couriers":
		[courier ID]:
			"lat" (Double);
			"lng" (Double);
			"connected" (Boolean);
			"last_ping" (Integer);
			"zones" (List<Integers>);
			"assigned_orders" (List<String>);
	"human_time_format": (optional) true / false;
	"current_time": (optional) SimpleDateFormat (if human_time_format is true) or UnixTime (if human_time_format is false)
*/

public class PurpleOpt {
	
	/*--- global parameters --*/

	/* global printing switch */
	static boolean bPrint = false; // CAUTION, use false for release
	/* Google API key */
	// static  google_api_key = "AIzaSyAFGyFvaKvXQUKzRh9jQaUwQnHnkiHDUCE"; // Wotao's key CAUTION, disable for release
	static String google_api_key = "AIzaSyCd_XdJsSsStXf1z8qCWITuAsppr5FoHao"; // Purple's key
	/* the radius used to test nearby orders */
	static double nearbyOrderRadius = 0.001; // this value roughly equals a street block; NOTE: the actual distance depends on the latitude of the city
	/* average servicing minutes */
	static int mins10GallonOrder = 20; // 20 minutes for 10 gallons
	static int mins15GallonOrder = 20; // 25 minutes for 15 gallons
	static int minsGenericOrder = 20;  // 25 minutes for other orders
	/* serving-time discount factor for a nearby order (a courier can directly walk to) */
	static double servicingTimeFactorForNearbyOrder = 2.0/3.0; // ".0" is important
	/* travel time's factor in score computation, minimal is 1 (no penalty) */
	static double travel_time_factor = 2.5;
	/* the factor that converts l1 distance of lat-lng to driving seconds during artificial time computation */
	static double l1ToDistanceTimeFactor = 150.0;
	
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
		
		// read input
		boolean human_time_format; // if true, input and output will use human readable time format
		Object value = input.get("human_time_format");
		if (value == null)
			human_time_format = false;
		else
			human_time_format = (boolean) value;
		Long currTime = getCurrUnixTime(input, human_time_format);	// get current time from either the input or, if missing from the input, the system

		HashMap<String, Object> orders = (HashMap<String, Object>) input.get("orders");
		HashMap<String, Object> couriers = (HashMap<String, Object>) input.get("couriers");

		// remove invalid couriers
		courierValidation(couriers);
		/* compute finish status of valid couriers
		 * and set "assigned_courier", "assigned_courier_pos", and "etf" for each "enroute" or "servicing" order
		 */
		setFinishStatus(couriers, orders, currTime);

		// Stage One: Get all unfinished orders ("unassigned", "enroute", "servicing") sorted and select all valid couriers.
		List<HashMap<String, Object>> sorted_orders = sortUnfinishedOrders(orders);
		// initialize output HashMap
		LinkedHashMap<String,Object> outHashMap = new LinkedHashMap<>();
       
		// Stage Two: Cluster nearby orders by deadlines. Go to the function for clustering criteria
		List<List<HashMap<String, Object>>> clusters = clusterOrders(sorted_orders, currTime);
        
		/* Stage Three: Score couriers for each clustered orders.
		 * and assign couriers to each cluster
		 */
		// loop through all clusters
		for (int i = 0; i < clusters.size(); i++) {
			// get the i-th order cluster (0 based index)
			List<HashMap<String,Object>> cluster = clusters.get(i);
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
                	LinkedHashMap<String,Object> out_order_entry = new LinkedHashMap<String,Object>();
                	out_order_entry.put("suggested_courier", assigned_courier_key);
                	out_order_entry.put("new_assignment", false);
                	out_order_entry.put("suggested_courier_pos", (Long)order.get("assigned_courier_pos"));
                	out_order_entry.put("suggested_courier_etf", ReturnTimeInRightFormat((Long)order.get("etf"),human_time_format));
                	// put the order in the output
                	outHashMap.put(order_key, out_order_entry);
                }
                else {
                	// the order has NOT been assigned to a courier
                	// initialize best score, finish time, and the corresponding courier's key
                	boolean ontime_achieved = false;
                	long best_score = 0;
                	Long best_finish_time = 0L;
                	String best_courier_key = "";
                	// compute scores for all couriers
                	for(String courier_key: couriers.keySet()) {
                		// get the courier
                		HashMap<String,Object> courier = (HashMap<String,Object>) couriers.get(courier_key);
                		// consider a courier only if s/he cannot serve the order
                        if (bOrderCanBeServedByCourier(order,courier)) { 
	                		// compute score
	                		long start_time = ((Long)courier.get("finish_time")); // the time when the courier will finish all the assigned orders;
	                		long travel_time = timeDistantOrder(order, (Double)courier.get("finish_lat"), (Double)courier.get("finish_lng"));
	                		long finish_time = start_time + travel_time; // the total time for the new order
	                		long score = start_time + Math.round(travel_time_factor * (double)travel_time)
	                				+ computeCrossZonePenalty(order,courier,orders,couriers); // score also include cross-zone penalty
	                		boolean ontime = bOnTimeFinish(order, finish_time);
	                		// the approach below will obtain the best ontime courier and, if not found, then the best delay courier
	                		if (best_score == 0 							// first score
	            		        || (!ontime_achieved && score<best_score) 	// no courier can be ontime so far and this courier is better (whether it is ontime or not)  
	            		        || (ontime && score<best_score)				// this courier is both ontime and better than the best
	                		   )
	                		{
	                			best_score = score;
	                			best_finish_time = finish_time;
	                			best_courier_key = courier_key;
	                			ontime_achieved = (ontime_achieved || ontime); // set to true once a courier is ontime
	                		}
                        }
                	}
                	if (!best_courier_key.equals("")) {
	                	// get the best courier by the recorded best courier's key
	                	HashMap<String,Object> best_courier = (HashMap<String,Object>)couriers.get(best_courier_key);
	                	// add the order to the best courier's queue, and update the finish time/lat/lng for the courier
	                	((List<String>)best_courier.get("assigned_orders")).add(order_key);
	                	best_courier.put("finish_time", best_finish_time);
	                	best_courier.put("finish_lat", (Double)order.get("lat"));
	                	best_courier.put("finish_lng", (Double)order.get("lng"));
	                	// add the assignment information to the output hashmap
	                	LinkedHashMap<String,Object> out_order_entry = new LinkedHashMap<String,Object>();
	                	out_order_entry.put("suggested_courier", best_courier_key);
	                	out_order_entry.put("new_assignment", true);
	                	out_order_entry.put("suggested_courier_pos", ((List<String>)best_courier.get("assigned_orders")).size());
	                	out_order_entry.put("suggested_courier_etf", ReturnTimeInRightFormat(best_finish_time,human_time_format));
	                	// put the order in the output
	                	outHashMap.put(order_key, out_order_entry);
                	}
                }
			}
            // there are multiple orders in the cluster
			else {
                // initialize scores, etc.
				boolean ontime_achieved = false;
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
                    // consider a courier only if s/he can serve the cluster
                    if (bOrderCanBeServedByCourier(order,courier)) {
	                    long start_time = ((Long)courier.get("finish_time")); // the time when the courier will finish all the assigned orders
	                    long travel_time = timeDistantOrder(order, (Double)courier.get("finish_lat"), (Double)courier.get("finish_lng"));
	                    long finish_time = start_time + travel_time;
	                    etfs.add(finish_time); // save the finish time for this order
	                    // update finish_time for the remaining orders in the cluster
	                    while (hit.hasNext()) {
	                        order = hit.next(); // get the next order
	                        finish_time += timeNearbyOrder(order); // the time to finish each subsequent nearby order
	                        etfs.add(finish_time);
	                    }
	                    // compute the score
	                    long score = finish_time + Math.round(travel_time_factor * (double)travel_time)
	                            + computeCrossZonePenalty(order,courier,orders,couriers); // add cross-zone penalty
	                    boolean ontime = bOnTimeFinish(order, finish_time);	// check ontime for the last order in the cluster
	            		// the approach below will obtain the best ontime courier and, if not found, then the best delay courier
	            		if ( best_score == 0 							// first score
	                		 || (!ontime_achieved && score<best_score) 	// no courier can be ontime so far and this courier is better (whether it is ontime or not)  
	                		 || (ontime && score<best_score))			// this courier is both ontime and better than the best
	                	{
	                        best_score = score;
	                        best_finish_time = finish_time;
	                        best_courier_key = courier_key;
	                        best_etfs = new ArrayList<Long>(etfs);
	            			ontime_achieved = (ontime_achieved || ontime); // set to true once a courier is ontime
	                    }
	                    etfs.clear();
                    }
                }
                if (!best_courier_key.equals("")) {
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
                		LinkedHashMap<String, Object> out_order_entry = new LinkedHashMap<String, Object>();
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
                		// put the order in the output
                		outHashMap.put(order_key, out_order_entry);
                	}
                	// update the best courier's finish_time/lat/lng
                	best_courier.put("finish_time", best_finish_time);
                	best_courier.put("finish_lat", (Double)order.get("lat"));
                	best_courier.put("finish_lng", (Double)order.get("lng"));
                }
			}
		}
        // output return
		return outHashMap;		
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
			List<List<Integer>> listETAs = getGoogleDistanceMatrix(listOrigins, listDests);
			
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
	
	/* return the all-pair google distance for a list of origins and destinations 
	 * TODO: add an option to feed user specified time of travel
	 */
	public static List<List<Integer>> getGoogleDistanceMatrix(List<String> org_latlngs, List<String> dest_latlngs) {
		int nOrgs = org_latlngs.size();
		int nDests = dest_latlngs.size();

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

		// generate request URL 
		String reqURL = "https://maps.googleapis.com/maps/api/distancematrix/json?" + strOrgs + "&" + strDests;
		reqURL += "&departure_time=now";	// this is not really useful
		reqURL += "&key=" + google_api_key;

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
			e.printStackTrace();
			return null;
		}
	}
	
	static long getCurrUnixTime(HashMap<String, Object>input, boolean human_time_format){

	/* --- get current time in the Unix time format --- */
		long currTime = 0;
		Object value = (Object) input.get("current_time");
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
		return currTime;
	}
	
	/* For each courier, set their status (lat,lng,time) when they finish their already-assigned orders)
	 * If they have no assigned order, use their current status.
	 */
	@SuppressWarnings("unchecked")
	static void setFinishStatus(HashMap<String, Object> couriers, HashMap<String, Object> orders, long currTime){
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
		
	}
	
	/* --- go through the couriers and remove the invalid ones, because they cannot take orders --- */
	@SuppressWarnings("unchecked")
	static void courierValidation(HashMap<String, Object> couriers){
		for(Iterator<String> it = couriers.keySet().iterator(); it.hasNext(); ) {
			String courier_key = it.next();
			if (!bCourierValid((HashMap<String, Object>)couriers.get(courier_key)))
				it.remove();
		}	
	}
	
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

			// check if arrived at the order
			if (bCourierAtOrderSite(order,courier)) {
                // already servicing the order
                finish_time += iOrderServingTime(order) / 2;
				// get the assigned order lat and lng
				order_lat = (Double) order.get("lat");
				order_lng = (Double) order.get("lng");
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
	
	static boolean bNearbyOrderLatLng(Double lat1, Double lng1, Double lat2, Double lng2) {
		if ((lat1-lat2)*(lat1-lat2) + (lng1-lng2)*(lng1-lng2) <= nearbyOrderRadius*nearbyOrderRadius)
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
	
	public static boolean bCourierValid(HashMap<String, Object> courier) {
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

	// average servicing time in second by gallons
	static int iOrderServingTime(HashMap<String,Object> order) {
		Integer gallons = (Integer) order.get("gallons");
		switch (gallons.intValue()) {
			case 10:
				return 60 * mins10GallonOrder;
			case 15:
				return 60 * mins15GallonOrder;
			default:
				return 60 * minsGenericOrder;
		}

	}

	/* return the google distance for a courier to an order 
	 * TODO: add an option for a user specified time
	 */
	public static int getGoogleDistance(Double origin_lat, Double origin_lng, Double dest_lat, Double dest_lng) {
		int seconds = 0;
		
		// set courier as the origin
		String org = origin_lat.toString() + "," + origin_lng.toString();
		
		// set order as the destination
		String dest = dest_lat.toString() + "," + dest_lng.toString();
		
		// generate request URL 
		String reqURL = "https://maps.googleapis.com/maps/api/distancematrix/json?origins=" + org + "&destinations=" + dest;
		reqURL += "&departure_time=now";
		reqURL += "&key=" + google_api_key;
		
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
				if (bPrint)
					System.out.println("Google zero result");
				return getArtificialDistance(origin_lat, origin_lng, dest_lat, dest_lng); 
			}
		} catch (Exception e) {
			// e.printStackTrace();
			if (bPrint)
				System.out.println("Google connection error");
			return getArtificialDistance(origin_lat, origin_lng, dest_lat, dest_lng);
		}

		return seconds;
	}
	
	/* used for offline and non-google distance computation */
	public static int getArtificialDistance(Double origin_lat, Double origin_lng, Double dest_lat, Double dest_lng) {
		return (int) Math.round(l1ToDistanceTimeFactor * (double)((Math.abs(origin_lat - dest_lat) + Math.abs(origin_lng - dest_lng))));
	}
	
	static long timeNearbyOrder(HashMap<String,Object> order) {
		return Math.round(servicingTimeFactorForNearbyOrder * (double)iOrderServingTime(order));
	}
	

    /* return the total time spent on an order that is away from the previous lat-lng location */
	static long timeDistantOrder(HashMap<String,Object> order, Double prev_lat, Double prev_lng) {
		return getGoogleDistance(prev_lat, prev_lng, (Double)order.get("lat"), (Double)order.get("lng")) // travel time
                + iOrderServingTime(order); // servicing time
	}

	static long avgSecondsInClusterByType(HashMap<String,Object> order) {
		long type_seconds = GetLongTimeFrom(order,"target_time_end")-GetLongTimeFrom(order,"target_time_start");
		if (type_seconds <= 3600)
			return iOrderServingTime(order);
		else if (type_seconds <= 7200) 
			return iOrderServingTime(order) - 3*60;
		else
			return iOrderServingTime(order) - 6*60;
	}
	
	static boolean bClusterSizeFit(List<HashMap<String,Object>> cluster, HashMap<String,Object> candicate_order, Long currTime) {
		long total_seconds = 0;
		long last_deadline = currTime;	// in second
		
		// compute total minutes and last deadline for the orders in the cluster
		Iterator<HashMap<String, Object>> it = cluster.iterator();
		while (it.hasNext()) {
			HashMap<String, Object> order = it.next();
			total_seconds += avgSecondsInClusterByType(order);
			long deadline = GetLongTimeFrom(order,"target_time_end");
			last_deadline = (deadline > last_deadline)?deadline:last_deadline;	// this is unnecessary because orders are sorted by deadline, but keep for future proof
				
		}
		// update total miniutes and last deadline for the candidate order
		total_seconds += avgSecondsInClusterByType(candicate_order);
		long deadline = GetLongTimeFrom(candicate_order,("target_time_end"));
		last_deadline = (deadline > last_deadline)?deadline:last_deadline;	// this is unnecessary because orders are sorted by deadline, but keep for future proof
		
		// compute remaining seconds from the updated deadline
		long remaining = last_deadline-currTime;
		
		// check if the candidate order can be added while still meeting the deadline
		// 5 gives a five-minute grace period for the courier to arrive (hypothetical)
		if (total_seconds+5*60 <= remaining)
			return true;
		else
			return false;
	}
	
	/* Sort all unfinished orders like: "service" < "enroute" < "unassigned"
	 * In each category, earlier deadlines < later deadlines
	 * Orders with other status are removed.
	 */
	@SuppressWarnings("unchecked")
	static List<HashMap<String,Object>> sortUnfinishedOrders(HashMap<String,Object> orders) {
		// initialize unassigned_order_list
		List<HashMap<String,Object>> unfinished_order_list = new ArrayList<>();
		// remove the orders with their status other than "enroute", "servicing", and "unassigned"
		Iterator<String> it = orders.keySet().iterator();
		while (it.hasNext()) {
			String order_key = it.next(); // get next key
			HashMap<String,Object> order = (HashMap<String, Object>) orders.get(order_key); // get the order
			String order_status = (String) order.get("status"); // get the status string
			if (order_status.equals("enroute") || order_status.equals("servicing") || order_status.equals("unassigned")) {
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
					// give priority to "servicing" over "enroute" and "unassigned"
					return 1;
				else if (((String)o1.get("status")).equals("unassigned") && ((String)o2.get("status")).equals("enroute"))
					// give priority to "enroute" over "unassigned"
					return 1;
				else if (GetIntegerTimeFrom(o1,"target_time_end") > GetIntegerTimeFrom(o2,"target_time_end"))
					// for orders with the same status, give priority to earlier deadline
					return 1;
				else
					return -1;
				// returning 0 would merge keys
			}
		});

		return unfinished_order_list;
	}
	
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
	
	static Long GetLongTimeFrom(HashMap<String,Object> hmap, String key) {
		Object val = (Object) hmap.get(key);
		try {
			Long integerVal = ((Integer) val).longValue();
			return integerVal;
		}
		catch (Exception e) {
			Long longVal = SimpleDateFormatToUnixTime((String)val);
			return longVal;
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

	static List<List<HashMap<String,Object>>> clusterOrders(List<HashMap<String,Object>> listOrders, Long currTime) {
		// initialize the output clusters (nested list)
		List<List<HashMap<String,Object>>> clusters = new ArrayList<>();

		while (!listOrders.isEmpty()) {
			// initialize an empty cluster
			List<HashMap<String, Object>> cluster = new ArrayList<>();
			// get an iterator
			Iterator<HashMap<String,Object>> it = listOrders.listIterator();
			// move the first order from the list to the cluster, and call it the base order
			HashMap<String,Object> base_order = it.next();
			cluster.add(base_order);
			it.remove();
			// go through the remaining list for nearby orders while the cluster size is not exceeding the limit
			while (it.hasNext()) {
				HashMap<String,Object> comp_order = it.next();  // get the order to compare with the base_order
				// if the order is close to the base order, then move it from the list to the cluster
				if (bNearbyOrder(base_order,comp_order) && 
					!bAssignedToDifferentCouriers(base_order,comp_order) && 
					bClusterSizeFit(cluster, comp_order, currTime)) 
				{
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
	
	/* test whether two orders are assigned to different couriers */
    static boolean bAssignedToDifferentCouriers(HashMap<String,Object> order1, HashMap<String,Object> order2) {
		// get their assigned couriers, possibly null
		String o1courier = (String) order1.get("assigned_courier");
		String o2courier = (String) order2.get("assigned_courier");
		
		// Perform the test
		if (o1courier != null && o1courier.equals(o2courier))
			return true;
		else
			// case: both==null or they are different or one has assigned the other = null.
			return false;
	}

/*-- not used
    @SuppressWarnings("unchecked")
	public static void scoreCouriersForClusters(List<List<HashMap<String,Object>>>clusters_unassigned_orders, HashMap<String, Object>couriers)
	{
		// for each cluster
		for (int i = 0; i < clusters_unassigned_orders.size(); i++) 
		{
			List<HashMap<String,Object>> cluster = clusters_unassigned_orders.get(i);
			// get the baseOrder and initialize the variable for subsequent orders
			HashMap<String, Object> baseOrder = cluster.get(0);
			HashMap<String, Object> subOrder;
			if (baseOrder.get("assigned_courier")!= null)
				continue; // already has an assigned courier
			else if (cluster.size() == 1) { // the cluster has one order
				
               long best_score = 0;
               long best_finish_time = 0L;
               long best_travel_time = 0L;
               String best_courier_key = "";
               
               // compute a score for each courier and record the best
               for(String courier_key: couriers.keySet()) {
            	   HashMap<String,Object> courier = (HashMap<String,Object>) couriers.get(courier_key);

            	   long travel_time = timeDistantOrder(baseOrder, (Double)courier.get("finish_lat"), (Double)courier.get("finish_lng")); 
            	   long finish_time = (Long)courier.get("finish_time") + travel_time + iOrderServingTime(baseOrder);
            	   long score = travel_time*travel_time
            				   + computeCrossZonePenalty(baseOrder,courier,couriers); // score also include cross-zone penalty
            	   if (score<best_score || best_score==0) 
            	   {
            		   best_score = score;
            		   best_travel_time = travel_time;
            		   best_finish_time = finish_time;
            		   best_courier_key = courier_key;
            	   }
               }
               // write the best to the base order of the cluster
               baseOrder.put("best_score",best_score);
               baseOrder.put("best_finish_time",best_finish_time);
               baseOrder.put("best_courier_key",best_courier_key);
               baseOrder.put("best_travel_time",best_travel_time);
               
              }
			  else { // the cluster has multiple orders
				  
				  long best_score = 0;
				  long best_finish_time = 0L;
				  long best_travel_time = 0L;
				  String best_courier_key = "";

				  for(String courier_key: couriers.keySet()) {
					  HashMap<String,Object> courier = (HashMap<String,Object>) couriers.get(courier_key);
					  Iterator<HashMap<String,Object>> hit = cluster.iterator();

					  long finish_time = 0L;
					  long travel_time = 0L;
					  long score = 0L;

					  // process the base order
					  baseOrder = hit.next(); 
					  travel_time = timeDistantOrder(baseOrder, (Double)courier.get("finish_lat"), (Double)courier.get("finish_lng")); // the total time travel to and finish the new order
					  finish_time = (Long)courier.get("finish_time") + travel_time + iOrderServingTime(baseOrder);
					  if(finish_time > (Long)baseOrder.get("target_time_end"))
						  continue;
					  boolean valid = true;
					  while (hit.hasNext()) {
						  subOrder = hit.next(); 
						  finish_time += timeNearbyOrder(subOrder); 
						  if(finish_time > (Long)subOrder.get("target_time_end"))
						  {
							  valid = false;
							  break;
						  }
					  }
					  if(valid == false)
						  continue;

					  score = travel_time * travel_time + finish_time - travel_time
							  + computeCrossZonePenalty(baseOrder,courier,couriers); // add cross-zone penalty
					  // update the best score if the new score is better
					  if (score<best_score || best_score==0) {
						  best_score = score;
						  best_travel_time = travel_time;
						  best_finish_time = finish_time;
						  best_courier_key = courier_key;
					  }
                }
                  
                 
                baseOrder.put("score",best_score);
                baseOrder.put("best_finish_time",best_finish_time);
                baseOrder.put("best_courier_key",best_courier_key);
                baseOrder.put("best_travel_time",best_travel_time);
	             }
			}
		}
	*/
			
//	static int computeCrossZonePenalty(HashMap<String,Object> order, HashMap<String, Object> courier,HashMap<String,Object> couriers) {
//		return 0; // this function is not implemented yet
//    }		
	
	static int computeCrossZonePenalty(HashMap<String,Object> order, HashMap<String,Object> courier, HashMap<String,Object> orders, HashMap<String,Object> couriers) {
		return 0; // this function is not implemented yet
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
	
	// check whether an order is found in the list of zones of a courier
	@SuppressWarnings("unchecked")
	static boolean bOrderCanBeServedByCourier(HashMap<String,Object> order, HashMap<String,Object> courier) {
		Integer order_zone = (Integer) order.get("zone");
		List<Integer> courier_zones = (List<Integer>) courier.get("zones");
		if (courier_zones.contains(order_zone))
			return true;
		else
			return false;		
	}
	
	// check whether a given finish_time no later than the order deadline 
	static boolean bOnTimeFinish(HashMap<String,Object>order, long finish_time) {
		long deadline = GetLongTimeFrom(order,"target_time_end");
		if (finish_time <= deadline)
			return true;
		else
			return false;
	}
			
}
