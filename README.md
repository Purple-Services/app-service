# Purple Web Service

The RESTful web service that the Purple mobile app uses. Also, provides a Dashboard and a few web pages.

## Running Locally

### Configuration

The file src/purple/config.clj contains all of the information needed for configuration. For local development, <project_root>/profiles.clj is used to define environment variables. However, profiles.clj is included in .gitignore and is not included in the repository. When you first start working on the project, you will have to create profiles.clj in the project root dir using the following template:

```clojure
{:dev { :env {:aws-access-key-id "ANYTHINGWHENLOCAL"
              :aws-secret-key "ANYTHINGWHENLOCAL"
              :db-host "localhost" ; AWS host: "purple-dev-db.cqxql2suz5ru.us-west-2.rds.amazonaws.com"
              :db-name "ebdb"
              :db-port "3306"
              :db-user "purplemaster"
              :db-password "localpurpledevelopment2015" ; AWS pwd: HHjdnb873HHjsnhhd
              :email-user "no-reply@purpledelivery.com"
              :email-password "HJdhj34HJd"
              :stripe-private-key "sk_test_6Nbxf0bpbBod335kK11SFGw3"
              :sns-app-arn-apns "arn:aws:sns:us-west-2:336714665684:app/APNS_SANDBOX/Purple" ;; sandbox is also used for couriers on prod
              :sns-app-arn-gcm  "arn:aws:sns:us-west-2:336714665684:app/GCM/Purple" ;; also used on prod
              :twilio-account-sid "AC0a0954acca9ba8c527f628a3bfaf1329"
              :twilio-auto-token "3da1b036da5fb7716a95008c318ff154"
              :twilio-form-number "+13239243338"
              :base-url "http://localhost:3000/"
              :has-ssl "NO"
              :basic-auth-username "purpleadmin"
              :basic-auth-password "gasdelivery8791"
              :basic-auth-read-only-username "purplestats"
              :basic-auth-read-only-password "gasdelivery8791"
              :basic-auth-courier-manager-username "purplemanager"
              :basic-auth-courier-manager-password "gasdelivery8791"
              :segment-write-key "test"
              :sift-science-api-key "test"
              :dashboard-google-browser-api-key "AIzaSyA0p8k_hdb6m-xvAOosuYQnkDwjsn8NjFg"
              :env "dev"}
       :dependencies [[javax.servlet/servlet-api "2.5"]
                      [ring-mock "0.1.5"]]}}
```

Because profiles.clj will override the entires for :profiles in project.clj, the required :dependencies must be included in profiles.clj

**In order to use lein with this environment, you will need to use the lein-environ plug. Add [lein-environ "1.0.0"] to your {:user {:plugins }} entry of your ~/.lein/profiles.clj file**

**Note**: The value of :db-host is the database host used for development. If you have MySQL configured on your machine, you can use the value "localhost" with a :db-password that you set. Otherwise, you can use the AWS valueshost and pwd values to access the remote development server. You will eventually need to setup a local MySQL server in order to run tests that access the database. See "Using a local MySQL Database for Development" below about how to configure this.

### Request addition of your IP address to RDS

Navigate to https://www.whatismyip.com/ and send your IP address to Chris in order to be added to the AWS RDS. You will have to update your IP address whenever it changes. This step must be completed in order to access the test database so that you will be able to develope locally. This must be done before continuing further!

### Start the local server for development


To start a web server for the application, run:

    lein ring server

from the web-service dir

### Open the Purple home page in a browser

After a succesful launch of the web server, your browser should automatically navigate to http://localhost:3000/ If not, navigate to http://localhost:3000/ and you will see the Purple home page. If you are unable to load the page, there is a problem with your local configuration.

### Confirm /login is working properly

Use the following curl command in a bash shell on Mac OS X to test the /login URL:
```bash
$ curl -X POST -H "Content-Type: application/json" -d '{ "type": "native", "platform_id": "elwssdell.scssshristasfadsfopher@gmail.com", "auth_key": "myPassworsasdd"}' localhost:3000/user/login
```

You should see a response similar to this:

```bash
{"success":true,"token":"pC0BhWGvXBjSqIUmzrzA5tWPXqpR5aSt0IK0NdmiLUAu3YuJUP6MQy6eh0gaL6M1acP6S9RNSg5tDO40dtADJX9KALJC5oL2kHPRzfL0yXq2DBwZ9nj9pYO9I9PjQItI","user":{"id":"LkD7ebDcAaq37CMKPhvD","type":"native","email":"elwssdell.scssshristasfadsfopher@gmail.com","name":"Test User","phone_number":"773-508-0888","referral_code":"V8VMM","referral_gallons":0,"is_courier":false,"has_push_notifications_set_up":false},"vehicles":[],"orders":[],"cards":[],"account_complete":true}
```

## Client

### Errors

You may encounter window.alert() errors which may only provide brief messages. This is due to the fact that the client has mobile-specific error alerts that work in the native iOS and Android app, but not in the Chrome browser. You will have to further investigate errors by navigating to the "Network" tab in Chrome Developer Tools menu and looking at the 'Response' section for the last request you made.


### Initial client setup
The client is a Sencha Touch web application. Obtain a zip file with the latest client from Chris. Unzip the file and go to the working dir with the index.html file. Chrome will need the '--disable-web-security' flag, which is not the default. If you already have a browser open, you will need to use the '--user-data-dir=/tmp/chrome2/' workaround to launch a new, separate Chrome session. This can be done in Mac OS X with the following command:

```bash
$ /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --disable-web-security --user-data-dir=/tmp/chrome2/ index.html
```

You will be presented with a map and a 'Request Gas' button. Chrome will request to use your location information. If you allow it, Chrome will move the map to reflect your current location information. In order to test the app, you will need to change your current location to an address served by Purple. To do this:

1. Click on the current address
2. Type "Beverly Hills"
3. Click on "Beverly Hills CA, United States"
4. Click "Request Gas"
5. You will now be shown a login page. You can create an account by clicking "Create Account".
6. Enter your information in the fields provided and click 'Register'
7. Enter your name and phone number, click 'Register'

### Request Gas


1. Click on the 'Request Gas' button. You will be taken to the 'Add Vehicle' menu.
2. Enter information for the 'Year','Make','Model','Color','Gas' and 'License Plate'. Click and Drag in order to scroll through popup menus. The 'Take Photo' menu item can be left blank. You won't be able to use this feature in Chrome because it requires a native mobile camera. 
3. Click 'Save Changes'. If you have any errors, see the 'Errors' section above.
4. You will be taken to the 'Request Gas' menu. After making your selections, click 'Review Order'. Click 'Confirm Order' to confirm it.
5. You will have to add credit card information. You can use '4242424242424242' as the Card Number and any valid expiration and cvc number (i.e. three digit number). Click 'Save Changes'.
6. After you review the order, 'Confirm Order'. You will be presented with a list of your Orders.

### View Requests on dashboard

Navigate to http://localhost:3000/dashboard 
Use the following credentials

**Username**: purpleadmin

**Password**: gasdelivery8791

You should see your new order with the Status 'Unassigned'

### Login with the Courier Client


Couriers fulfill orders by delivering gas to the client. A courier should have the app logged in and running in the background on their phone whenever they are on duty. The courier app will ping the web service every 10 seconds. When a new order is created, all connected couriers get notified. Unassigned orders are shown in the courier app in a list. They can press the 'Accept Order' button for that order.

To test out how the courier works, first logout of the Customer Client application.

1. Click the "Hamburger" icon in the top left of the client. Select 'Account' in the side-menu.
2. Click the 'Logout' button on the bottom center.
3. Login with the test courier credentials

**email**: testcourier1@test.com

**password**: qwerty123


### Fulfilling an order

After you login as a courier, you will be presented with the 'Orders' page. Test fulfilling the order you just placed.

Note: The courier client will ping the server every ten seconds. The server must have the proper lat lng coordinates. If you do not allow for location tracking when using the browser, lat lng will be null and the server ping will fail.

1. Click on an open order. It will have a dark purple bar on the left.
2. You will not be able to click 'Accept Order'. Instead you will have to go to the console and type
```javascript
	util.ctl('Orders').nextStatus()
```
3. You will be taken back to orders. Notice that the right hand status bar has started to fill for this order.
4. In order to 'Start Route' type 'util.ctl('Orders').nextStatus()' into the console again.
5. Continue this process of opening the order and using 'util.ctl('Orders').nextStatus()' to go through the order status. You must be on the Order's page in order to cycle through the courier process.


The statuses in the Dashboard cycle through as Unassigned -> Assigned -> Accepted -> Enroute -> Servicing -> Complete or Cancelled. Currently we skip Assigned and go straight to Accepted because the courier can choose which ones they want.

### Using a local MySQL Database for Development

The development test server for the MySQL database is used in the stub given above. We have provided SQL files in order to setup a local database for development. This is a preferred method of development, due to the fact that there can be problems with connection pools being occupied when multiple users are developing on the AWS MySQL server. Also, some tests rely on fixtures that use a local database call ebdb_test. Without configuring a local MySQL server, tests which use this fixture will fail.

There are three files provided in the database dir:

**ebdb_setup.sql** will drop and create the ebdb and ebdb_test database locally.

**ebdb.sql** will create the tables in the ebdb and ebdb_test database and populate them with test data.

**ebdb_zcta.sql.gz** will create a table of Zip Code Tabulation Areas (zcta) which define the borders of a zip code

In order to use it, you obviously must have MySQL working on your local machine. It is advisable to also use phpmyadmin.

We have also provided a clojure script that must be run from the command line using the '[lein-exec](https://github.com/kumarshantanu/lein-exec)' plugin. In order to use it, add the following line to your {:user {:plugins }} entry of your ~/.lein/profiles.clj:

{:user {:plugins [[lein-exec "0.3.5"]]}}

You must provide the script with the root password of your MySQL server in order to create the permissions for 'purplemaster' needed by the Purple server application.

Due to the size of ebdb_zcta.sql.gz (34MB), it takes about 2 minutes for the following script to complete on a 2.3GHz Intel Core i7 with 8GB ram and SSD disk:

```bash
web-service $ lein exec -p scripts/setupdb.clj root_password="your_secret_password"
Creating ebdb database and granting permissions to purplemaster
Creatings tables and populating them in ebdb as user purplemaster
(0 0 0 0 0 0 0 1 0 65 0 3 0 43 0 256 226 0 63 0 4 3 6 1 2 1 5 1 7 1 9 7 4 2 6 3 5 1 1 5 7 1 3 1 1 7 1 3 1 1 1 3 4 3 3 4 0 1 1 65 3 43 482 63 118 1 1 482 1 0 0 0)
web-service $
```

**Note:** The password used for puplemaster must be the same across the following files:
```
src/profiles.clj
database/ebdb_setup.sql
```

## Running Selenium functional tests

There are functional tests (test/purple/dashboard.clj) that use [clj-webdriver](https://github.com/semperos/clj-webdriver), a clojure Selenium WebDriver library. These tests automatically control a Chrome web browser and ensure proper app behavior. Before these tests can be run successfully, you need to first install Chrome and its [ChromeDriver](https://code.google.com/p/selenium/wiki/ChromeDriver). You can download the Mac version of ChromeDriver [here](https://sites.google.com/a/chromium.org/chromedriver/downloads). After unzipping the file, move it to a place that is on your PATH. For example, /opt/local/bin/chromedriver.

You will also need to add entries required by the functional tests to {:dev {:dependencies}}. Because we have already created a profiles.clj file, we need to add the selenium dependencies there. We also need to add ring-jetty-adapter because the functional tests run the app server on a test port so that the tests can be run without having a dev server running locally. Modify profiles.clj and add these requirements:

```clojure
:dependencies [[javax.servlet/servlet-api "2.5"]
               [ring-mock "0.1.5"]
               [clj-webdriver "0.7.2"]
               [org.seleniumhq.selenium/selenium-java "2.47.0"]
               [ring/ring-jetty-adapter "1.4.0"]
               ]
```

These modifications should allow the tests to run properly with ChromeDriver 2.19.

There are additional functional tests for the client (test/purple/client.clj). You will need a version of the client and pointer to its index.html file in profiles.clj for env. On my machine, the file is located at

```bash
file:///Users/james/PurpleInc/Purple/index.html
```

so in profiles.clj I made an entry to my {:dev {:env }} map:

```clojure
:client-index-file "file:///Users/james/PurpleInc/Purple/index.html"
```

Because the client was compiled to use port 3000, the server must be running via

```bash
$ lein ring server
```

in order for the client tests to pass.

## Deploying to Development Server

The server is manually configured with the required System properties in the AWS console. Therefore, the top entry of src/purple/config.clj only sets vars when the environment is "test" or "dev".

Use lein-beanstalk to deploy to AWS ElasticBeanstalk (you must first set up your ~/.lein/profiles.clj with AWS creds):

    lein beanstalk deploy development

## License

Copyright © 2015 Purple Services Inc
