# Purple Web Service

The RESTful web service that the Purple mobile app uses. Also, provides a Dashboard and a few web pages.

## Running Locally

To start a web server for the application, run:

    lein ring server

## Deploying to Development Server

Use lein-beanstalk to deploy to AWS ElasticBeanstalk (you must first set up your ~/.lein/profiles.clj with AWS creds):

    lein beanstalk deploy development

## License

Copyright © 2015 Purple Services Inc
