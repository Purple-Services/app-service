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
			"courier_id" (String); // "" (empty string) if no courier is assigned; CAUTION
			"zone" (Integer);
			"gas_type" (String);
			"gallons" (Double);
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
	"human_time_format": (optional) true / false (default);
	"current_time": (optional) SimpleDateFormat (if human_time_format is true) or UnixTime (if human_time_format is false)
	"verbose_output": (optional) true / false (default); if true, output will add the fields:
	                   order->status, sorted_order_list, cluster_list
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
	static int mins15GallonOrder = 25; // 25 minutes for 15 gallons 
	static int minsGenericOrder = 25;  // 25 minutes for other orders 
	/* serving-time discount factor for a nearby order (a courier can directly walk to) */
	static double servicingTimeFactorForNearbyOrder = 3.0/4.0; // ".0" is important
	/* travel time's factor in score computation, minimal is 1 (no penalty) */
	static double travel_time_factor = 3.5;
	/* the factor that converts l1 distance of lat-lng to driving seconds during artificial time computation */
	static double l1ToDistanceTimeFactor = 150*100;
	/* time delay for a currently working but non-connected courier */
	static int not_connected_delay = 15; // minutes 
	/* 1 hour order is urgent */
	static int minsUrgencyThreshold = 60; 
	/* urgency threshold for classifying dangerous orders and urgent orders in sort incomplete orders */
	static double urgencyThreshold = 0.8;
	/* estimated l1 distance threshold for locations equaling in search saved google distance*/
	static double locationEqualingThreshold = 0.0005; // this value roughly equals half a street block
	
	/* verbose output switch */
	static boolean verbose_output = false;
	/* human time format switch (only for input and output) */
	static boolean human_time_format = false; // if true, input and output will use human readable time format

	/*
    INPUT:
      general input (see above)
    OUTPUT: a LinkedHashmap
        [order ID]: {
          "tag": [(String) for "unassigned" orders, there are three tags: tardy, urgent and normal; for others, use null] 
          "courier_id": [(String) suggested courier id],
          "new_assignment": [(boolean) check if the assignment is a new one],
          "courier_pos": [(Integer) the position of the order in the courier's queue (1 based), possibly null if cannot compute]
          "courier_etf": [(Integer) estimated finish time, possibly null if cannot compute],
          "status": (if verbose) [(String) the same as status in input],
        sorted_order_list: (if verbose) the list of orders internally sorted, given by order id's
        cluster_list: (if verbose) the list of order clusters, given by order id's
        unprocessed_list: (if verbose) the list of unprocessed orders
    NOTE: an empty LinkedHashmap will be returned if there is no unassigned order
	}
	 */
	@SuppressWarnings("unchecked")
	public static LinkedHashMap<String, Object> computeSuggestion(HashMap<String,Object> input) {

		// read input
		Object value = input.get("human_time_format");
		if (value == null)
			human_time_format = false;
		else
			human_time_format = (boolean) value;
		// get current time from either the input or, if missing from the input, the system
		Long currTime = getCurrUnixTime(input);

		value = input.get("verbose_output");
		if (value == null)
			verbose_output = false;
		else
			verbose_output = (boolean) value;
		
		
		// initialize output HashMap
		LinkedHashMap<String,Object> outHashMap = new LinkedHashMap<>();

		// obtain orders from the input
		HashMap<String, Object> orders = (HashMap<String, Object>) input.get("orders");

		/* return an empty hashmap if there is no unassigned orders
		 * if there is unassigned order, then remove completed and cancelled ones
		 */
		if (!bExistUnassignedOrder(orders))
			return outHashMap;
		
		// filter only incomplete orders
		filterIncompleteOrders(orders);
		
		// initialize output HashMap
		outputInitialize(outHashMap, orders);

		// obtain couriers from the input
		HashMap<String, Object> couriers = (HashMap<String, Object>) input.get("couriers");

		/* for each courier add a field "valid" (true or false), 
		 *                  add a field "assigned_orders" with his orders in the right precedence
		 */
		courierValidation(couriers, orders);

		// for each order, add a field "cluster" (true or false)
		clusterValidation(couriers, orders);

		/* save Google distance according to origin lat-lng and dest lat-lng */
		HashMap<String, Integer> google_distance_saved = new HashMap<String, Integer>(); // CAUTION, HAVEN'T CHECKED

		/* compute finish status of valid couriers
		 * and set "courier_pos", and "etf" for each "assigned", "accepted", "enroute" or "servicing" order
		 */
		setFinishStatus(couriers, orders, currTime, google_distance_saved);

		// Sort all incomplete orders ("unassigned", "assigned", "accepted", "enroute", "servicing")
		List<HashMap<String, Object>> sorted_orders = sortIncompleteOrders(orders,couriers,google_distance_saved,currTime, outHashMap);

		// save sorted_order_list if verbose
		if (verbose_output){
			// copy sorted_orders to sorted_list for future print
			List<String> sorted_order_list = getOrderIdFromListOfOrders(sorted_orders);
			// save sorted_order_list
			outHashMap.put("sorted_order_list", sorted_order_list);
		}
		
		// initialize output cluster_list
		List<List<String>> cluster_list = new ArrayList<>();
		
		// cluster and assign orders to couriers
		assignOrders(cluster_list, orders, sorted_orders, couriers, google_distance_saved, currTime);
		
		// save cluster_list if verbose
		if (verbose_output)
			outHashMap.put("cluster_list", cluster_list);
		
		// extract information from orders to outHashMap
		outputUpdate(orders, outHashMap);
		
		// collect unprocessed orders
		if (verbose_output)
			outHashMap.put("unprocessed_list", sorted_orders);
		
		return outHashMap;
	}
		
	@SuppressWarnings("unchecked")
	static void outputUpdate(HashMap<String, Object> orders, LinkedHashMap<String, Object> outHashMap){
		for(String order_key: orders.keySet()){
			HashMap<String, Object> output_entry = (HashMap<String, Object>)outHashMap.get(order_key);
			HashMap<String, Object> order = (HashMap<String, Object>)orders.get(order_key);
			output_entry.put("tag", order.get("tag"));
			output_entry.put("new_assignment", order.get("new_assignment"));
			output_entry.put("courier_id", order.get("courier_id"));
			output_entry.put("courier_pos", order.get("courier_pos"));
			if (order.get("etf") == null)
				output_entry.put("etf", null);
			else
				output_entry.put("etf", ReturnTimeInRightFormat((Long) order.get("etf")));
		}
	}
	
	@SuppressWarnings({ "unchecked"})
	static void assignOrders(List<List<String>> cluster_list, HashMap<String, Object> orders, List<HashMap<String, Object>>sorted_orders, HashMap<String, Object>couriers, HashMap<String, Integer> google_distance_saved, long currTime){
		while (!sorted_orders.isEmpty()) {
			// initialize courier_for_base_order
			HashMap<String,Object> courier = null;
			// get an iterator
			Iterator<HashMap<String,Object>> it = sorted_orders.listIterator();
			// move the first order from the list to the cluster, and call it the base order
			HashMap<String,Object> base_order = it.next();
			String courier_id = (String)base_order.get("courier_id");
			
			// if the base order does not have an courier
			if(courier_id.equals("")){
				// find its best courier
				courier_id = courierScore(orders, couriers, base_order, google_distance_saved);
				// if the best courier is found
				if (!courier_id.equals("")){
					// update both the courier and order
					courier = (HashMap<String, Object>) couriers.get(courier_id);
					assignBaseOrder(base_order, courier, google_distance_saved);
				}
			}
			// the base order has an assigned courier, so obtain the courier
			else
				courier = (HashMap<String, Object>) couriers.get(courier_id);
			
			// ensure that the base order has been assigned to a "valid" courier; if not, do nothing
			if((courier!=null) && ((boolean)courier.get("valid"))){
				// do clustering, which will remove the base or other orders from sorted_orders
				List<HashMap<String, Object>> cluster = doClustering(base_order, it, couriers, google_distance_saved, currTime);
				// record the cluster for output
				cluster_list.add(getOrderIdFromListOfOrders(cluster));

				if (cluster.size()>1) {
					// assign the non-base orders in the cluster to the courier
					assignCluster(courier, cluster);
				}
			}
			else {
				// remove the base order
				it.remove();
			}
		}
	}

	@SuppressWarnings({ "unchecked", "unused" })
	static String courierScore(HashMap<String, Object> orders, HashMap<String, Object> couriers, HashMap<String, Object> base_order, HashMap<String, Integer> google_distance_saved){
		// initialize best score, finish time, and the corresponding courier's key
		boolean ontime_achieved = false;
		long best_score = 0;
		Long best_finish_time = 0L;
		String best_courier_key = "";
		// compute scores for all couriers
		for(String courier_key: couriers.keySet()) {
			// get the courier
			HashMap<String,Object> courier = (HashMap<String,Object>) couriers.get(courier_key);
			// consider a courier only if s/he can serve the order
			if (((boolean)courier.get("valid")) && bOrderCanBeServedByCourier(base_order,courier)) { 
				// compute score
				long start_time = ((Long)courier.get("finish_time")); // the time when the courier will finish all the assigned orders;
				long travel_time = timeDistantOrder(base_order, (Double)courier.get("finish_lat"), (Double)courier.get("finish_lng"), google_distance_saved);
				long finish_time = start_time + travel_time; // the total time for the new order
				long score = start_time + Math.round(travel_time_factor * (double)travel_time)
				+ computeCrossZonePenalty(base_order,courier,orders,couriers); // score also include cross-zone penalty
				boolean ontime = bOnTimeFinish(base_order, finish_time);
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
		return best_courier_key;
	}
	
	@SuppressWarnings("unchecked")
	static List<HashMap<String, Object>> doClustering(HashMap<String, Object> base_order, Iterator<HashMap<String,Object>> it, HashMap<String, Object> couriers, HashMap<String, Integer> google_distance_saved, long currTime){
		// do clustering
		List<HashMap<String, Object>> cluster = new ArrayList<>();
		// obtain base_order's courier
		HashMap<String, Object> courier_for_base_order = (HashMap<String, Object>) couriers.get((String) base_order.get("courier_id"));
		// move the first order from the list to the cluster
		cluster.add(base_order);
		// remove the base order
		it.remove();
		// if the base_order can be clustered, then go through the remaining list for nearby orders while the cluster size is not exceeding the limit
		while (it.hasNext() && (boolean)base_order.get("cluster") && cluster.size() < 3) {
			
			HashMap<String,Object> comp_order = it.next();  // get the order to compare with the base_order
			// if the order satisfies conditions, then move it from the list to the cluster
			if (bNearbyOrder(base_order,comp_order) && 
					!bAssignedToDifferentCouriers(base_order,comp_order) && 
					bClusterSizeFitNew(cluster, comp_order, courier_for_base_order, google_distance_saved)
				) 
			{
				cluster.add(comp_order);
				it.remove();
			}
		}
		return cluster;
	}
	
	@SuppressWarnings("unchecked")
	static void assignBaseOrder(HashMap<String, Object> order, HashMap<String, Object> courier, HashMap<String, Integer> google_distance_saved){
		// obtain courier's fields
		String courier_id = (String) courier.get("id");
		List<String> courier_assigned_orders = (List<String>) courier.get("assigned_orders");
		long start_time = (Long)courier.get("finish_time");
		// compute new time
		long finish_time = start_time + timeDistantOrder(order, (Double)courier.get("finish_lat"), (Double)courier.get("finish_lng"), google_distance_saved);
		// obtain order's fields
		String order_id = (String) order.get("id");

		// ensure that the order does not already have a courier
		if((order.get("courier_id")).equals("")){
			// update the courier
			courier_assigned_orders.add(order_id);
			courier.put("finish_time", finish_time);
			courier.put("finish_lat", (Double)order.get("lat"));
			courier.put("finish_lng", (Double)order.get("lng"));
			// update the order
			order.put("new_assignment", true);
			order.put("courier_id", courier_id);
			order.put("courier_pos", courier_assigned_orders.size());
			order.put("etf", finish_time);
		}
		return;
	}
	
	@SuppressWarnings("unchecked")
	static void assignCluster(HashMap<String, Object> courier, List<HashMap<String, Object>>cluster){
		// get courier's fields
		String courier_id = (String) courier.get("id");
		List<String> courier_assigned_orders = (List<String>) courier.get("assigned_orders");
		// initialize the order variable
		HashMap<String, Object> order = null;
		// get cluster iterator
		Iterator<HashMap<String,Object>> it = cluster.iterator();
		// get the base order
		order = it.next();
		// initialize etf to that of the base order
		long etf = (Long) order.get("etf");
		// for each non-base order
		while(it.hasNext()) {
			// get an order from the cluster
			order = it.next();
			// if this order has not been assigned 
			if((order.get("courier_id")).equals("")){
				// add the order to the courier
				courier_assigned_orders.add((String)order.get("id"));
				// update etf
				etf += timeNearbyOrder(order);
				// update this order
				order.put("new_assignment", true);
				order.put("courier_id", courier_id);
				order.put("courier_pos", courier_assigned_orders.size());
				order.put("etf", etf);
			}

			// update the best courier's finish_time/lat/lng
			courier.put("finish_time", etf);
			courier.put("finish_lat", (Double)order.get("lat"));
			courier.put("finish_lng", (Double)order.get("lng"));
		}
	}
	
	// from the org_list of orders, create a list with just the order id's
	static List<String> getOrderIdFromListOfOrders(List<HashMap<String, Object>> org_list) {
		List<String> out_list = new ArrayList<String> ();
		
		Iterator<HashMap<String, Object>> it = org_list.iterator();
		while (it.hasNext()){
			HashMap<String, Object> order = it.next();
			out_list.add((String)(order.get("id")));
		}
		return out_list;
	}

	
	@SuppressWarnings("unchecked")
	static void outputInitialize(LinkedHashMap<String, Object> outHashMap, HashMap<String, Object> orders){
		for(String order_key: orders.keySet()){
			HashMap<String, Object> order = (HashMap<String, Object>)orders.get(order_key);
			// initialize an order_info HashMap
			HashMap<String, Object> order_info = new HashMap<String, Object>();
			// filling tag: tardy, urgent, normal
			order_info.put("tag",null);
			// filling courier_id
			order_info.put("courier_id", order.get("courier_id"));
			// filling new_assignment
			order.put("new_assignment", false);
			order_info.put("new_assignment", false);
			// filling courier_pos and courier_etf
			order_info.put("courier_pos", null);
			order_info.put("etf", null);
			// filling status if verbose
			if (verbose_output)
				order_info.put("status", order.get("status"));
			// add order_info to outHashMap
			outHashMap.put(order_key, order_info);
		}
	}
	
	@SuppressWarnings("unchecked")
	static LinkedHashMap<String, Object> classifyByCourier(HashMap<String, Object> couriers, LinkedHashMap<String, Object> outHashMap){
		LinkedHashMap<String, Object> result = new LinkedHashMap<String, Object>();
		for(String courier_key: couriers.keySet())
		{
			List<HashMap<String, Object>> order_list = new ArrayList<HashMap<String, Object>>();

			for(String order_key: outHashMap.keySet()){
				HashMap<String, Object> order = (HashMap<String, Object>)outHashMap.get(order_key);
				order.put("id", order_key);
				String courier_id = (String)order.get("courier_id");
				if(courier_id.equals(courier_key)){
					order_list.add(order);
				}
			}

			HashMap<String, Object> courier = (HashMap<String, Object>)couriers.get(courier_key);
			// if courier is valid, then each order has a courier_pos. rank them by this pos
			if((boolean)courier.get("valid")){
				Collections.sort(order_list, new Comparator<HashMap<String, Object>>() {
					public int compare(HashMap<String, Object> o1, HashMap<String, Object> o2) {
						Long o1_pos = (Long)o1.get("courier_pos");
						Long o2_pos = (Long)o2.get("courier_pos");
						if(o1_pos > o2_pos)
							return 1;
						else
							return -1;
					}
				});
			}
			result.put(courier_key, order_list);
		}
		return result;
	}

	/* check whether there exists unassigned orders in orders */	
	@SuppressWarnings("unchecked")
	static boolean bExistUnassignedOrder(HashMap<String, Object> orders){
		for(Object order: orders.values()) {
			String order_status = (String) ((HashMap<String, Object>) order).get("status");
			if(order_status.equals("unassigned"))
				return true;
		}
		
		return false;
	}
	
	@SuppressWarnings("unchecked")
	static void filterIncompleteOrders(HashMap<String, Object> orders){
		// remove any order with a status other than "unassigned", "assigned", "accepted", "enroute", or "servicing",
		Iterator<String> it = orders.keySet().iterator();
		while (it.hasNext()) {
			String order_key = it.next(); // get next key
			HashMap<String,Object> order = (HashMap<String, Object>) orders.get(order_key); // get the order
			String order_status = (String) order.get("status"); // get the status string
			if (!(order_status.equals("unassigned") ||
				  order_status.equals("assigned") ||
				  order_status.equals("accepted") ||
				  order_status.equals("enroute")  ||
				  order_status.equals("servicing")) ){
				// remove the order
				it.remove();
			}
		}
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
			if (bCourierValidLocation(courier)) {
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

			// check if the order is neither complete or cancelled
			if (!(order_status.equals("complete")||order_status.equals("cancelled"))) {
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

			// check outer status;
			JSONArray json_array = (JSONArray)parser.parse("[" + outputString + "]");
			if(!((String)((JSONObject)json_array.get(0)).get("status")).equals("OK")){
				if (bPrint)
					System.out.println("Google result error");
				mtxSeconds = getArtificialDistance(org_latlngs, dest_latlngs);
				return mtxSeconds;
			}

			JSONArray rows = (JSONArray)((JSONObject) json_array.get(0)).get("rows"); 
			JSONObject row;	// each row corresponds to an origin (courier)
			JSONArray elements;	// each element corresponds to a destination (order)
			JSONObject element;
			String resp_status;
			Long resp_seconds;

			// check number of origins returned
			if(rows.size() != nOrgs){
				if (bPrint)
					System.out.println("Google result error for all origins");
				mtxSeconds = getArtificialDistance(org_latlngs, dest_latlngs);
				return mtxSeconds;
			}

			// loop through the results
			for (int i = 0; i < rows.size(); i++) {
				// get the row and its elements
				row = (JSONObject) rows.get(i);
				elements = (JSONArray) row.get("elements");

				// create element array for seconds
				rowSeconds = new ArrayList<Integer> (nDests);

				// check the number of destinations returned for this origin
				if(elements.size() != nDests){
					if (bPrint)
						System.out.println("Google result error for the " + i + "-th origin");
					String origin = org_latlngs.get(i);
					for(int j = 0; j< nDests; j++) {
						String dest = dest_latlngs.get(j);
						rowSeconds.add(getArtificialDistance(origin, dest));
					}
				}
				else {
					// loop through the elements
					for (int j = 0; j < nDests; j++) {
						element = (JSONObject) elements.get(j);
						resp_status = (String)element.get("status");
						if (resp_status.equals("OK")) {
							resp_seconds = (Long)((JSONObject)element.get("duration_in_traffic")).get("value");
							rowSeconds.add(resp_seconds.intValue());
						}
						else {
							// go to artificial if the response status is not "OK"
							String origin = org_latlngs.get(i);
							String dest = dest_latlngs.get(j);
							rowSeconds.add(getArtificialDistance(origin, dest));
						}
					}
				}
				// add the row to the output nested list mtxSeconds
				mtxSeconds.add(rowSeconds);
			}
			return mtxSeconds;

		} catch (Exception e) {
			if (bPrint)
				System.out.println("Google connection error");
			mtxSeconds = getArtificialDistance(org_latlngs,dest_latlngs);
			return mtxSeconds;
		}
	}

	// single-origin single-dest artificial distance computing
	static Integer getArtificialDistance(String org_latlngs, String dest_latlngs){
		//get origin position
		String[] strOrg = null;
		strOrg = org_latlngs.split(",");
		Double origin_lat = Double.parseDouble(strOrg[0]);
		Double origin_lng = Double.parseDouble(strOrg[1]);
		//get dest position
		String[] strDest = null;   
		strDest = dest_latlngs.split(",");
		Double dest_lat = Double.parseDouble(strDest[0]);
		Double dest_lng = Double.parseDouble(strDest[1]);
		//calculate distance
		Integer dist = getArtificialDistance(origin_lat, origin_lng, dest_lat, dest_lng);
		return dist;

	}

	// multi-origins multi-dests artificial distance computing
	static List<List<Integer>> getArtificialDistance(List<String> org_latlngs, List<String> dest_latlngs){
		int nOrgs = org_latlngs.size();
		int nDests = dest_latlngs.size();
		List<Integer> rowSeconds;
		List<List<Integer>> mtxSeconds = new ArrayList<List<Integer>>(nOrgs);

		for(int i = 0; i < nOrgs; i++)
		{
			rowSeconds = new ArrayList<Integer> (nDests);
			// abstract origin lat and lng from input string
			String[] strOrg = null;   
			strOrg = (org_latlngs.get(i)).split(",");
			// transform string to double;
			Double origin_lat = Double.parseDouble(strOrg[0]);
			Double origin_lng = Double.parseDouble(strOrg[1]);
			for(int j = 0; j<nDests; j++)
			{
				// abstract origin lat and lng from input string
				String[] strDest = null;   
				strDest = (dest_latlngs.get(j)).split(",");
				// transform string to double;
				Double dest_lat = Double.parseDouble(strDest[0]);
				Double dest_lng = Double.parseDouble(strDest[1]);

				rowSeconds.add(getArtificialDistance(origin_lat, origin_lng, dest_lat, dest_lng));
			}
			mtxSeconds.add(rowSeconds);
		}
		return mtxSeconds;
	}

	static long getCurrUnixTime(HashMap<String, Object>input){
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
	 * Related orders also get courier_id / courier_pos / etf
	 */
	@SuppressWarnings("unchecked")
	static void setFinishStatus(HashMap<String, Object> couriers, HashMap<String, Object> orders, long currTime, HashMap<String, Integer> google_distance_saved){
		for(String courier_key: couriers.keySet()) {
			// get the courier by their key
			HashMap<String, Object> courier = (HashMap<String, Object>) couriers.get(courier_key);
			// get finish time/lat/lng
			HashMap<String, Object> finish = computeFinishTimeLatLng(courier, orders, currTime, google_distance_saved);
			// add entries to the existing couriers hashmap for later use
			courier.put("finish_time", finish.get("finish_time"));
			courier.put("finish_lat", finish.get("finish_lat"));
			courier.put("finish_lng", finish.get("finish_lng"));

		}
	}

	

	/* --- go through the couriers and remove the invalid ones, because they cannot take orders --- */
	@SuppressWarnings("unchecked")
	static void courierValidation(HashMap<String, Object> couriers, HashMap<String, Object> orders){
		for(Object courier: couriers.values()){
			bCourierValid((HashMap<String, Object>) courier, orders);
		}
	}

	/* Compute finish_time, finish_lat, finish_lng for a valid courier 
	 * Related orders also get courier_id / courier_pos / etf
	 */
	@SuppressWarnings("unchecked")
	static HashMap<String,Object> computeFinishTimeLatLng(HashMap<String, Object> courier, HashMap<String, Object> orders, long startTime, HashMap<String, Integer> google_distance_saved) {

		// exception handling for a courier without the field "valid" or is invalid, just in case
		Boolean bValid = (Boolean) courier.get("valid");
		// initialize assigned orders for the courier
		List<String> assigned_orders_keys = new ArrayList<String>();
		// if the courier is invalid but its first order is enroute or servicing, we should still compute this order's etf
		if (bValid == null || (!bValid)) {
			// get the courier's total assigned orders
			List<String> temp_list = (List<String>)courier.get("assigned_orders");
			if (!temp_list.isEmpty()) {
				HashMap<String,Object> firstOrder = (HashMap<String, Object>) orders.get(temp_list.get(0));
				if ((firstOrder.get("status")).equals("enroute") || (firstOrder.get("status")).equals("servicing"))
					assigned_orders_keys.add(temp_list.get(0));
			}
			// obtain get the first order of this courier for computing its etf
			if(!((List<String>)courier.get("assigned_orders")).isEmpty())
				assigned_orders_keys.add(((List<String>)courier.get("assigned_orders")).get(0));
			
		}
		else
			// get the courier's total assigned orders
			assigned_orders_keys = (List<String>)courier.get("assigned_orders");
		
		// initialize lat lng to the courier's current lat lng
		Double finish_lat = (Double)courier.get("lat");
		Double finish_lng = (Double)courier.get("lng");
		// initialize finish_time to the specified startTime
		Long finish_time = startTime;

		// check empty
		if (! assigned_orders_keys.isEmpty()) { // if it has assigned orders
			// get the first order, assumed to be the working order
			HashMap<String, Object> order = (HashMap<String, Object>) orders.get(assigned_orders_keys.get(0));

			// initialize the assigned order lat-lng as the first (working) order lat-lng
			Double order_lat = (Double) order.get("lat");
			Double order_lng = (Double) order.get("lng");
			
			if (bCourierAtOrderSite(order,courier))
				// TODO: when the courier is on-site, we should use the event-log time to determine the remaining servicing time
				finish_time += iOrderServingTime(order) / 2;
			else {
				if(bCourierValidLocation(courier))
					finish_time += getGoogleDistance(finish_lat, finish_lng, order_lat, order_lng, google_distance_saved)
					+ iOrderServingTime(order);
				else
					finish_time += iOrderServingTime(order) + not_connected_delay * 60;
			}

			// update courier first order's etf and position
			order.put("etf", finish_time);
			order.put("courier_pos", new Long(1L));
			
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
					finish_time += timeDistantOrder(order, prev_order_lat, prev_order_lng, google_distance_saved);
				}

				// tag the order with its assigned courier
				// order.put("courier_id", (String)courier.get("id")); // commented out because the courier_id should be already there
				order.put("etf", finish_time); // CAUTION. Has this information been passed to outHashMap?
				order.put("courier_pos", new Long((long)(i+1))); // CAUTION. Has this information been passed to outHashMap?
			}
			// update finish_lat / lng
			finish_lat = order_lat;
			finish_lng = order_lng;
		}
		
		// initialize output hash map
		HashMap<String,Object> outHashMap = new HashMap<>();

		// return for invalid courier
		if (bValid == null || (!bValid)) {
			// put null results into the output hashmap
			outHashMap.put("finish_time", null);
			outHashMap.put("finish_lat", null);
			outHashMap.put("finish_lng", null);
		}
		else{
			// put results into the output hashmap
			outHashMap.put("finish_time", finish_time);
			outHashMap.put("finish_lat", finish_lat);
			outHashMap.put("finish_lng", finish_lng);
		}
		
		// output return
		return outHashMap;
	}

	// determine whether two orders are nearby or not
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
	public static boolean bCourierValidLocation(HashMap<String, Object> courier){
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

	/* get courier's assigned_order_list */
	@SuppressWarnings("unchecked")
	static List<String> getAssignedOrderList(HashMap<String, Object>courier, final HashMap<String, Object>orders){
		String courier_id = (String)courier.get("id");
		List<String> assigned_order_list_of_courier = new ArrayList<String>();
		// get this courier's incomplete assigned orders
		for(String order_id: orders.keySet()){
			HashMap<String, Object> order = (HashMap<String, Object>)orders.get(order_id);
			String status = (String) order.get("status");
			String order_courier_id = (String)order.get("courier_id");
			// if an order belongs to the courier and it is either assigned, accepted, enroute or servicing
			if(order_courier_id.equals(courier_id) && (status.equals("assigned") || status.equals("accepted") || status.equals("enroute") || status.equals("servicing"))){
				// check if the assigned courier is the input one
				assigned_order_list_of_courier.add(order_id);
			}
		}
		
		Collections.sort(assigned_order_list_of_courier, new Comparator<String>() {
			public int compare(String o1, String o2) {
				HashMap<String, Object> order1 = (HashMap<String, Object>) orders.get(o1);
				HashMap<String, Object> order2 = (HashMap<String, Object>) orders.get(o2);
				String o1_status = (String)order1.get("status");
				String o2_status = (String)order2.get("status");
				if ((o1_status.equals("accepted") || o1_status.equals("assigned")) && (o2_status.equals("servicing") || o2_status.equals("enroute")))
					// give priority to working order over others
					return 1;
				else
					return -1;
			}});

		return assigned_order_list_of_courier;
	}

	/* for input courier add a field "valid" (true or false), 
	 *                   add a field "assigned_orders" with his orders in the right precedence
	 */
	@SuppressWarnings("unchecked")
	static void bCourierValid(HashMap<String, Object> courier, HashMap<String, Object> orders){
		// get assigned order list for this courier
		List<String> assigned_order_list = getAssignedOrderList(courier, orders);
		// add the list assigned_orders to each courier
		courier.put("assigned_orders", assigned_order_list);
		
		// has no assigned_orders and a valid location
		if(assigned_order_list.size() == 0 && bCourierValidLocation(courier)){
			courier.put("valid", true);
		}
		// with one assigned order
		else if(assigned_order_list.size() == 1){
			courier.put("valid", true);
		}
		// with two assigned orders
		else if(assigned_order_list.size() == 2){
			HashMap<String, Object> firstOrder = (HashMap<String, Object>)orders.get(assigned_order_list.get(0));
			// get the second assigned order's status
			HashMap<String, Object> secondOrder = (HashMap<String, Object>)orders.get(assigned_order_list.get(1));
			// if the first order is a working order
			if((firstOrder.get("status")).equals("enroute") || (firstOrder.get("status")).equals("servicing")){
				courier.put("valid", true);
			}
			// the second order is a working one
			else if((secondOrder.get("status")).equals("enroute") || (secondOrder.get("status")).equals("servicing")){
				// swap the two orders in the list
				List<String> assigned_orders= new ArrayList<String>();
				assigned_orders.add(assigned_order_list.get(1));
				assigned_orders.add(assigned_order_list.get(0)); 
				// the courier is valid for new assignment
				courier.put("valid", true);
			}
			// neither order has been started
			else{
				// the courier is invalid, but we cannot tell which order will be serviced last
				courier.put("valid", false);
			}
		}
		// either location invalid with no order, or having more than two assigned orders
		else
			// the courier is invalid
			courier.put("valid", false);
	}

	// for each order, add a field "cluster" (true or false)
	@SuppressWarnings("unchecked")
	static void clusterValidation(HashMap<String, Object>couriers, HashMap<String, Object>orders){
		for(String courier_key: couriers.keySet()){
			HashMap<String, Object> courier = (HashMap<String, Object>)couriers.get(courier_key);
			// if the courier is invalid, then all of his assigned orders are invalid
			if(!(boolean)courier.get("valid")){
				for(String order_id: (List<String>)courier.get("assigned_orders")){
					HashMap<String, Object> order = (HashMap<String, Object>) orders.get(order_id);
					order.put("cluster", false);
				}
			}
			// else, the courier is valid
			else{
				List<String> assigned_order_list = (List<String>)courier.get("assigned_orders");
				int listSize = assigned_order_list.size();
				// but if the courier has more than two manager assigned orders, then we don't know which is the last one
				// if the courier has only one order, then it can be clustered
				for (int i = 0; i < (listSize - 1); i++) // those orders before the last cannot be clustered 
					((HashMap<String, Object>) orders.get(assigned_order_list.get(i))).put("cluster", false);
				if (listSize >= 1) // the last order can be clustered
					((HashMap<String, Object>) orders.get(assigned_order_list.get(listSize-1))).put("cluster", true);
			}
		}
		// every unassigned order can be clustered
		for(String order_key: orders.keySet()){
			HashMap<String, Object> order = (HashMap<String, Object>)orders.get(order_key);
			if((order.get("status")).equals("unassigned")){
				order.put("cluster", true);
			}
		}
		// ensure every order has a field "cluster", to avoid future nullPointerException
		clusterFieldCheck(orders);
		
		return;
	}
	
	// ensure every order has a field "cluster"
	@SuppressWarnings("unchecked")
	static void clusterFieldCheck(HashMap<String, Object> orders){
		for(String order_key: orders.keySet()){
			HashMap<String, Object> order = (HashMap<String, Object>)orders.get(order_key);
			if(!order.containsKey("cluster")){
				order.put("cluster", false);
			}
		}
		return;
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
	}

	// average servicing time in second by gallons
	static int iOrderServingTime(HashMap<String,Object> order) {
		Double gallons = (Double) order.get("gallons");
		switch (gallons.intValue()) {
		case 10:
			return 60 * mins10GallonOrder;
		case 15:
			return 60 * mins15GallonOrder;
		default:
			return 60 * minsGenericOrder;
		}

	}

	// search if the distance between two locations has been saved before
	static int searchSavedDistance(Double origin_lat, Double origin_lng, Double dest_lat, Double dest_lng, HashMap<String, Integer>google_distance_saved){
		for(String distance_key : google_distance_saved.keySet()){
			String[] strPos = null;
			strPos = distance_key.split(",");
			Double saved_org_lat = Double.parseDouble(strPos[0]);
			Double saved_org_lng = Double.parseDouble(strPos[1]);
			Double saved_des_lat = Double.parseDouble(strPos[2]);
			Double saved_des_lng = Double.parseDouble(strPos[3]);
			// l2 distance between input origin and saved origin
			double orgl2distance = Math.pow((origin_lat - saved_org_lat), 2) + Math.pow((origin_lng - saved_org_lng), 2);
			// l2 distance between input dest and saved dest
			double destl2distance = Math.pow((dest_lat - saved_des_lat), 2) + Math.pow((dest_lng - saved_des_lng), 2);
			if(orgl2distance <= Math.pow(locationEqualingThreshold, 2) && destl2distance <= Math.pow(locationEqualingThreshold, 2))
				return google_distance_saved.get(distance_key);

			/* note: distance from origin to dest equals to distance from dest to origin
			 * exchange input origin and input dest, then check l2 distance again
			 */
			orgl2distance = Math.pow((dest_lat - saved_org_lat), 2) + Math.pow((dest_lng - saved_org_lng), 2);
			destl2distance = Math.pow((origin_lat - saved_des_lat), 2) + Math.pow((origin_lng - saved_des_lng), 2);
			if(orgl2distance <= Math.pow(locationEqualingThreshold, 2) && destl2distance <= Math.pow(locationEqualingThreshold, 2))
				return google_distance_saved.get(distance_key);
		}
		// if no saved results
		return 0;
	}

	// after calling google API, save the distance
	public static int saveGoogleDistance(int seconds, Double origin_lat, Double origin_lng, Double dest_lat, Double dest_lng, HashMap<String, Integer>google_distance_saved){
		// create key
		String distance_key = Double.toString(origin_lat) + ',' + Double.toString(origin_lng) + ',' + Double.toString(dest_lat) + ',' + Double.toString(dest_lng);
		google_distance_saved.put(distance_key, seconds);
		return 0;
	}

	/* return the google distance for a courier to an order 
	 * TODO: add an option for a user specified time
	 */
	public static int getGoogleDistance(Double origin_lat, Double origin_lng, Double dest_lat, Double dest_lng, HashMap<String, Integer>google_distance_saved) {

		// check if the origin and dest are the same place
		if((origin_lat == dest_lat) && (origin_lng == dest_lng))
			return 0;

		// if not check if the distance has been saved
		int seconds = searchSavedDistance(origin_lat, origin_lng, dest_lat, dest_lng, google_distance_saved);
		if(seconds != 0)
			return seconds;

		// if not saved, compute again
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
				Long resp_seconds = (Long)((JSONObject)row_0_element_0.get("duration_in_traffic")).get("value");
				seconds = resp_seconds.intValue();
				saveGoogleDistance(seconds, origin_lat, origin_lng, dest_lat, dest_lng, google_distance_saved);
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
	static long timeDistantOrder(HashMap<String,Object> order, Double prev_lat, Double prev_lng, HashMap<String, Integer> google_distance_saved) {
		return getGoogleDistance(prev_lat, prev_lng, (Double)order.get("lat"), (Double)order.get("lng"), google_distance_saved) // travel time
				+ iOrderServingTime(order); // servicing time

	}

	// estimate the servicing duration of an order in a cluster
	static long avgSecondsInClusterByType(HashMap<String,Object> order) {
		long type_seconds = GetLongTimeFrom(order,"target_time_end")-GetLongTimeFrom(order,"target_time_start");
		if (type_seconds <= 3600) // 1-hour order
			return iOrderServingTime(order);
		else if (type_seconds <= 7200) // up to 3-hour order
			return iOrderServingTime(order) - 3*60;	// relax 3 minutes
		else // longer order
			return iOrderServingTime(order) - 6*60; // relax 6 minutes
	}

	static boolean bClusterSizeFitNew(List<HashMap<String,Object>> cluster, HashMap<String,Object> candidate_order, HashMap<String, Object> courier, HashMap<String, Integer> google_distance_saved){
		// cluster's iterator
		Iterator<HashMap<String, Object>> it = cluster.iterator();
		// get base order
		HashMap<String, Object> base_order = it.next();
		// initialize the cluster_etf by that of the base order
		Long cluster_etf = (Long)base_order.get("etf");
		// compute total servicing duration and last deadline for the orders in the cluster
		while (it.hasNext()) {
			// get an order from cluster
			HashMap<String, Object> order = it.next();
			// add its servicing time to cluster_etf
			cluster_etf += avgSecondsInClusterByType(order);
		}

		// add the servicing time of the candidate order to cluster_etf
		cluster_etf += avgSecondsInClusterByType(candidate_order);
		
		// obtain the deadline of the candidate order
		long candidate_deadline = GetLongTimeFrom(candidate_order,"target_time_end");

		// check if the candidate order can be added while still meeting the deadline
		if (cluster_etf  <= candidate_deadline)	
			return true;
		else
			return false;
	}

	// determine whether a candidate order can be added to an existing cluster 
	static boolean bClusterSizeFit(List<HashMap<String,Object>> cluster, HashMap<String,Object> candicate_order, Long currTime) {
		long total_servicing_seconds = 0;
		long latest_deadline = currTime;	// in second

		// compute total servicing duration and last deadline for the orders in the cluster
		Iterator<HashMap<String, Object>> it = cluster.iterator();
		while (it.hasNext()) {
			// get an order from cluster
			HashMap<String, Object> order = it.next();
			// compute total servicing duration
			total_servicing_seconds += avgSecondsInClusterByType(order);
			// compute earliest deadline
			long deadline = GetLongTimeFrom(order,"target_time_end");
			latest_deadline = (deadline > latest_deadline)?deadline:latest_deadline;	// this is unnecessary because orders are sorted by deadline, but keep for future proof

		}
		
		// update total servicing duration and last deadline for the candidate order
		total_servicing_seconds += avgSecondsInClusterByType(candicate_order);
		long deadline = GetLongTimeFrom(candicate_order,"target_time_end");
		latest_deadline = (deadline > latest_deadline)?deadline:latest_deadline;	// this is unnecessary because orders are sorted by deadline, but keep for future proof

		// compute remaining seconds from the updated deadline
		long remaining = latest_deadline-currTime;

		// check if the candidate order can be added while still meeting the deadline
		// 10 gives a 10-minute GRACE PERIOD for the courier to arrive (hypothetical)
		if (total_servicing_seconds + 10*60 <= remaining )	
			/* TODO: 10*60 can be too optimistic. In fact, we can assign courier as 
			 * we form clusters. This way, we can decide the courier to assign and replace 10*60 by an accurate number
			 */
			return true;
		else
			return false;
	}

	/* Sort all incomplete orders like: "service" < "enroute" < "unassigned"
	 * In each category, earlier deadlines < later deadlines
	 * Orders with other status are removed.
	 */
	@SuppressWarnings("unchecked")
	static List<HashMap<String,Object>> sortIncompleteOrders(HashMap<String,Object> orders, HashMap<String, Object> couriers, HashMap<String, Integer> google_distance_saved, Long currTime, LinkedHashMap<String, Object> outHashMap) {

		// initialize unassigned_order_list
		List<HashMap<String, Object>> incomplete_order_list = new ArrayList<>();
		for(Object order: orders.values()){
			incomplete_order_list.add((HashMap<String, Object>)order);
		}
		
		// for every unassigned order, add the field "tag" ("tardy", "urgent", "normal")
		for(HashMap<String, Object> order: incomplete_order_list){
			if ((order.get("status")).equals("unassigned"))
				tagUnassignedOrder(order, couriers, google_distance_saved, currTime);
			else
				order.put("tag", null);
		}
		
		// score unassigned orders according to their tags
		for(HashMap<String, Object> order: incomplete_order_list){
			if ((order.get("status")).equals("unassigned"))
				scoreUnassignedOrder(order, couriers, google_distance_saved, currTime);
		}

		// sort orders according to status, tag and urgency/score 
		Collections.sort(incomplete_order_list, new Comparator<HashMap<String, Object>>() {
			public int compare(HashMap<String, Object> o1, HashMap<String, Object> o2) {
				String o1_status = (String)o1.get("status");
				String o2_status = (String)o2.get("status");
				if (!o1_status.equals("servicing") && o2_status.equals("servicing"))
					// give priority to "servicing" over "enroute" ,"accepted", "assigned" and "unassigned"
					return 1;
				else if ((o1_status.equals("unassigned") || o1_status.equals("assigned") || o1_status.equals("accepted")) && o2_status.equals("enroute"))
					// give priority to "enroute" over "unassigned", "assigned" and "accepted"
					return 1;
				else if ((o1_status.equals("unassigned") || o1_status.equals("assigned")) && o2_status.equals("accepted"))
					// give priority to "accepted" over "unassigned" and "assigned"
					return 1;
				else if (o1_status.equals("unassigned") && o2_status.equals("assigned"))
					// give priority to "assigned" over "unassigned"
					return 1;
				else if (o1_status.equals("unassigned") && o2_status.equals("unassigned")){
					// both orders are unassigned, then check tag
					String o1_tag = (String)o1.get("tag");
					String o2_tag = (String)o2.get("tag");
					if(!o1_tag.equals("tardy") && o2_tag.equals("tardy"))
						// give priority to "tardy" over "urgent" and "normal"
						return 1;
					else if(o1_tag.equals("normal") && o2_tag.equals("urgent"))
						// give priority to "urgent" over "normal"
						return 1;
					else if(o1_tag.equals(o2_tag) && (double)o1.get("score") > (double)o2.get("score"))
						// when they have the same tag, give priority to lower score
						return 1;
					else 
						return -1;
				}
				else if (o1_status.equals(o2_status) && !o1_status.equals("unassigned") && o1.containsKey("etf") && o2.containsKey("etf")) {
					// both orders have the same status, either "assigned", "accepted", "enroute", or "servicing", and both have "etf"
					if((Long)o1.get("etf") > (Long)o2.get("etf"))
						// give priority to earlier etf
						return 1;
					else 
						return -1;
				}
				else 
					return -1;
			}
			// returning 0 would merge keys
		});
		// return the sorted incomplete_order_list
		return incomplete_order_list;
	}

	@SuppressWarnings("unchecked")
	static void tagUnassignedOrder(HashMap<String, Object> order, HashMap<String, Object> couriers, HashMap<String, Integer> google_distance_saved, Long currTime){
		// get order's location
		Double order_lat = (Double)order.get("lat");
		Double order_lng = (Double)order.get("lng");
		// initialize min score/ratio
		double min_score = Double.MAX_VALUE; // for normal orders
		double min_urgency_ratio = Double.MAX_VALUE;  // for tardy/urgent orders
		// get service time
		int service_duration = iOrderServingTime(order);
		// get deadline
		long order_deadline = GetLongTimeFrom(order,"target_time_end");
		// go over all couriers to determine the min_urgency_ratio and min_nonurgency_ratio
		for(String courier_key: couriers.keySet()){
			HashMap<String, Object> courier = (HashMap<String, Object>) couriers.get(courier_key);
			// do zone-check and calculate the distance from courier's finish position to order 
			if(bOrderCanBeServedByCourier(order, courier)){
				// get courier's finish position
				Double courier_lat = (Double)courier.get("finish_lat");
				Double courier_lng = (Double)courier.get("finish_lng");
				int travel_duration = getGoogleDistance(courier_lat, courier_lng, order_lat, order_lng, google_distance_saved);
				// get courier's finish time
				long finish_time = (Long)courier.get("finish_time");
				// if this courier's finish time is earlier than the order's deadline 
				if(finish_time < order_deadline){
					double urgency_ratio = ((double)(travel_duration + service_duration)) / ((double)(order_deadline - finish_time));
					double score = travel_time_factor * (double)travel_duration + (double)(order_deadline - currTime);
					// update for minimum values
					if(urgency_ratio < min_urgency_ratio)
						min_urgency_ratio = urgency_ratio;
					if(score < min_score)
						min_score = score;
				}
			}
		}

		/* tag order with "tardy", "urgent" or "normal" */
		if(min_urgency_ratio > 1)
			order.put("tag", "tardy");
		else if(min_urgency_ratio >= urgencyThreshold || order_deadline - currTime <= minsUrgencyThreshold * 60) {
			order.put("tag", "urgent");
			order.put("min_urgency_ratio", min_urgency_ratio);
		}
		else {
			order.put("tag", "normal");
			order.put("min_score", min_score);
		}
	}	

	// for each unassigned order return a score, which is computed separately for tardy, urgent, normal orders
	static void scoreUnassignedOrder(HashMap<String, Object> order, HashMap<String, Object> couriers, HashMap<String, Integer> google_distance_saved, Long currTime){
		double score = 0.;
		// get order's tag
		String tag = (String)order.get("tag");

		// compute scores separately for tardy, urgent, normal orders
		if(tag.equals("tardy"))	// "tardy" order
			score = (double)GetLongTimeFrom(order,"target_time_end");
		else if(tag.equals("urgent")){ 		// "urgent" order
			score = 1/((double)order.get("min_urgency_ratio")); // lower ratio go earlier
		}
		else if(tag.equals("normal")){	// "normal" order
			score = (double)order.get("min_score");
		}

		order.put("score", score);
		return;
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
	static Object ReturnTimeInRightFormat(Long unixTime) {
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
			// if the base_order can be clustered, then go through the remaining list for nearby orders while the cluster size is not exceeding the limit
			while (it.hasNext() && (boolean)base_order.get("cluster")) {
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

	/* test whether two orders are assigned to different couriers 
	 * true if both have but have different couriers
	 * false if (i) both have no courier, or (ii) only one has a courier, or (iii) both have the same courier */
	static boolean bAssignedToDifferentCouriers(HashMap<String,Object> order1, HashMap<String,Object> order2) {
		// get their assigned couriers, possibly null
		String o1courier = (String) order1.get("courier_id"); // CAUTION: important change made
		String o2courier = (String) order2.get("courier_id"); // CAUTION: important change made

		// Perform the test
		if (o1courier != null && o1courier.equals(o2courier))
			return true;
		else
			// case: both==null or they are different or one has assigned the other = null.
			return false;
	}

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

	// check whether an order is found in the list of zones of a valid courier
	@SuppressWarnings("unchecked")
	static boolean bOrderCanBeServedByCourier(HashMap<String,Object> order, HashMap<String,Object> courier) {
		// at first the courier should be valid
		if(!(boolean)courier.get("valid"))
			return false;
		// meanwhile the order should at the courier's zone
		else{
			Integer order_zone = (Integer) order.get("zone");
			List<Integer> courier_zones = (List<Integer>) courier.get("zones");
			if (courier_zones.contains(order_zone))
				return true;
			else
				return false;
		}
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
