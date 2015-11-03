package purpleOpt;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.*;

// for JSON parsing
import org.json.simple.*;
import org.json.simple.parser.*;

/*
input:
	orders:
		order:
			lat (Double);
			lng (Double);
			gas_type (String);
			gallons (Integer);
			target_time_start (Integer);
			target_end_start (Integer);
			status (Integer);
			status_times (HashMap<String,Long>):
				String: (Long);
	couriers:
		courier:
			lat (Double);
			lng (Double);
			connected (Boolean);
			last_ping (Integer);
			zones (List<String>);
			assigned_orders (List<String>);
*/

public class PurpleOpt {
    
	@SuppressWarnings("unchecked")
	public static HashMap<String, Object> computeDistance(HashMap<String,Object> input) {
		@SuppressWarnings({ "serial" })
		class InCourier extends HashMap<String, Object> { };
		@SuppressWarnings({ "serial", "unused" })
		class InCouriers extends HashMap<String, InCourier> { };
		@SuppressWarnings({ "serial" })
		class InOrder extends HashMap<String, Object> { };
		@SuppressWarnings({ "serial", "unused" })
		class InOrders extends HashMap<String, InOrder> { };
		
		// print switch
		boolean bPrint = false; // CAUTION
		
		// --- read data from input to structures that are easy to use ---
		// read orders hashmap
		HashMap<String, Object> orders = (HashMap<String, Object>) input.get("orders");
		// read couriers hashmap
		HashMap<String, Object> couriers = (HashMap<String, Object>) input.get("couriers");
		
		// create the output hashmap
		HashMap<String, Object> outHashmap = new HashMap<String, Object>();
		// structure:
		// outHashmap(key: order_key; val: outOrder)
		//   outOrder(key: "suggested_courier_id"; null;  // not implemented
		//            key: "etas"; val: outETAs)
		//     outETAs(key: courier_key: val: eta_seconds)
		
		// create the inputs for GoogleDistanceMatrix call
		List<String> listOrigins = new ArrayList<String>();	// store origin lat-lng
		List<String> listOriginKeys = new ArrayList<String>(); // store origin key (courier key)
		List<String> listDests = new ArrayList<String>();	// store destination lat-lng
		List<String> listDestKeys = new ArrayList<String>(); // store destination key (order key)

		// get all connected couriers
		for(String courier_key: couriers.keySet()) {
			// get the order by ID (key)
			HashMap<String, Object> courier = (HashMap<String, Object>) couriers.get(courier_key);
			// get the courier connection status
			Boolean connected = (Boolean) courier.get("connected"); 
			// Boolean connected = true;	// CAUTION
			// get the courier lat and lng
			Double courier_lat = (Double) courier.get("lat");
			Double courier_lng = (Double) courier.get("lng");

			if (bPrint)
				System.out.println("courier: " + courier_key + "; connected: " + connected);

			// check the status
			if (connected.booleanValue() && courier_lat != 0 && courier_lng!=0) {
				// here, the courier is connected and its location is valid
				if (bPrint)
					System.out.println("  connected and have valid latlng");

				// add this courier to listOrigins
				if (!listOriginKeys.contains(courier_key)) {
					listOrigins.add(courier_lat.toString()+","+courier_lng.toString());
					listOriginKeys.add(courier_key);

					if (bPrint)
						System.out.println("  add " + courier_lat.toString()+","+courier_lng.toString() + " to origin list");
				}

				// compute the ETAs in the order way: single origin-dest calls
				// eta_seconds = getGoogleDistance(courier_lat, courier_lng, order_lat, order_lng);
				// put the ETA to the ETAs hashmap
				// outETAs.put(courier_key, eta_seconds);
			}
		}
		
		
		// check all the orders and create an entry for each unassigned order in outHashmap
		for(String order_key: orders.keySet()) {
			// get the order object
			HashMap<String, Object> order = (HashMap<String, Object>) orders.get(order_key);
			// get the order status
			String order_status = (String) order.get("status");
			
			if (bPrint)
				System.out.println("order: " + order_key + "; status: " + order_status);
				
            // create a Hashmap for this order
            HashMap<String, Object> outOrder = new HashMap<String, Object>();
            // put this order in the output hashmap
            outHashmap.put(order_key, outOrder);
				
            // specify the suggested courier for this order, will implement later
            outOrder.put("suggested_courier_id", null);
				
            // create a hashmap for ETAs
            HashMap<String, Integer> outETAs = new HashMap<String, Integer>();
            // put the ETAs to the order object
            outOrder.put("etas", outETAs);

            // get the order lat and lng
            Double order_lat = (Double) order.get("lat");
            Double order_lng = (Double) order.get("lng");
				
            // add this order to listDests
            if (!listDestKeys.contains(order_key)) {
                listDests.add(order_lat.toString()+","+order_lng.toString());
                listDestKeys.add(order_key);
					
                if (bPrint)
                    System.out.println("  add " + order_lat.toString()+","+order_lng.toString() + " to dest list");
            }
		}

		
		if (bPrint) {
			System.out.println(" #couriers: " + listOrigins.size() + "; #orders" + listDests.size());
			System.out.println();
		}
		
		// call getGoogleDistanceMatrix
		if (!listOrigins.isEmpty() && !listDests.isEmpty()) {
			
			if (bPrint) 
				System.out.println("calling google ... ");

			// get ETAs
			List<List<Integer>> listETAs = PurpleOpt.getGoogleDistanceMatrix(listOrigins, listDests);
			
			if (bPrint) 
				System.out.println("google responded!");

			// write ETAs to the hashmap
			List<Integer> listETAelements = null;
			// for each row, and then for each column
			for(int i = 0; i < listETAs.size(); i++) {
				String courier_key = listOriginKeys.get(i); 
				listETAelements = listETAs.get(i);
				
				if (bPrint)
					System.out.print("  courier at " + listOrigins.get(i));
				
				for(int j = 0; j < listETAelements.size(); j++) {
					String order_key = listDestKeys.get(j);
					HashMap<String, Object> outOrder = (HashMap<String, Object>) outHashmap.get(order_key);
					HashMap<String, Integer> outETAs = (HashMap<String, Integer>) outOrder.get("etas");
					outETAs.put(courier_key, listETAelements.get(j));

					if (bPrint) {
						System.out.print(" order at " + listDests.get(j) + " ETA: " + listETAelements.get(j) + " seconds");
						System.out.println();
					}
				}
			}
			
		}
		
		// return hashmap
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
		String server_key = "AIzaSyAFGyFvaKvXQUKzRh9jQaUwQnHnkiHDUCE";

		// generate request URL 
		String reqURL = "https://maps.googleapis.com/maps/api/distancematrix/json?" + strOrgs + "&" + strDests;
		reqURL += "&departure_time=now";
		reqURL += "&key=" + server_key;

		if (bPrint)
			System.out.println(reqURL);
		
		// prepare the request
		URL url;
		HttpURLConnection conn;
		String outputString = "";

		// initialize the outer list
		List<List<Integer>> mtxSeconds = new ArrayList<List<Integer>>(nOrgs);
		List<Integer> rowSeconds = null;
		
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

			// initial JSON parser
			JSONParser parser=new JSONParser();
			JSONArray json_array = (JSONArray)parser.parse("[" + outputString + "]");
			JSONArray rows = (JSONArray)((JSONObject) json_array.get(0)).get("rows");
			
			JSONObject row = null;
			JSONArray elements = null;
			JSONObject element = null;
			String resp_status = null;
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
						rowSeconds.add((Integer)resp_seconds.intValue());
					}
					else {
						rowSeconds.add(0);
					}
				}
				mtxSeconds.add(rowSeconds);
			}
			return mtxSeconds;

		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
			return null;
		}
	}
	
	public static Integer getGoogleDistance(Double courier_lat, Double courier_lng, Double order_lat, Double order_lng) {
		Integer seconds = 0;
		
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
		} catch (Exception e) {
			// TODO Auto-generated catch block
			// e.printStackTrace();
			return seconds; // its value should be 0
		}

		return seconds;
	}
	
	@SuppressWarnings("unchecked")
	static public String printInput(HashMap<String,Object> input) {
		// --- read data from input to structures that are easy to use ---
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
		System.out.println();

		// print orders
		System.out.println(input.get("orders").getClass());
		System.out.println("# orders: " + nOrders);

		// for each order
		for(String order_key: orders.keySet()) {
			// print order ID
			System.out.println("  order: " + order_key);
			// get the order by ID (key)
			HashMap<String, Object> order = (HashMap<String, Object>) orders.get(order_key);
			// list the keys of each order
			System.out.println("  keys in this order: ");
			for(String key: order.keySet()) {
				System.out.print(key + "; ");
			}
			System.out.println();
			// print order content manually
			System.out.println("    lat: " + (Double) order.get("lat"));
			System.out.println("    lng: " + (Double) order.get("lng"));
			System.out.println("    gas_type: " + (String) order.get("gas_type"));
			System.out.println("    gallons: " + (Integer) order.get("gallons"));
			System.out.println("    target_time_start: " + (Integer) order.get("target_time_start"));
			System.out.println("    target_time_end : " + (Integer) order.get("target_time_end "));
			System.out.println("    status: " + (String) order.get("status"));

			// print the status history
			HashMap<String,Long> status_times = (HashMap<String, Long>) order.get("status_times");

			System.out.println("    key:value pairs in this status_times: ");
			for(String timekey: status_times.keySet()) {
				System.out.print(timekey + ": " + (Long) status_times.get(timekey) +"; ");
			}
		}

		// print couriers
		System.out.println("# of couriers: " + nCouriers);

		// for each courier
		for(String courier_key: couriers.keySet()) {
			// print courier ID
			System.out.println("  courier: " + courier_key);
			// get the order by ID (key)
			HashMap<String, Object> courier = (HashMap<String, Object>) couriers.get(courier_key);
			// list the keys of each courier_key
			System.out.println("  keys in this couriers: ");
			for(String key: courier.keySet()) {
				System.out.print(key + "; ");
			}
			System.out.println();
			// print courier content manually
			System.out.println("    lat: " + (Double) courier.get("lat"));
			System.out.println("    lng: " + (Double) courier.get("lng"));
			System.out.println("    connected: " + (Boolean) courier.get("connected"));
			System.out.println("    last_ping: " + (Integer) courier.get("last_ping"));


			// print zones
			System.out.println("    zones:" );
			List<String> zones = (List<String>) courier.get("zones");
			for(String zone: zones) {
				System.out.println(zone + " ");
			}

			// print assiged_orders
			System.out.println("    assigned_orders:" );
			List<String> assigned_orders = (List<String>) courier.get("assigned_orders");
			for(String assigned_order: assigned_orders) {
				System.out.println(assigned_order + " ");
			}
		}
	return("OK");
	}
}
