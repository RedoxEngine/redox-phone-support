
# redox-phone-support

A simple server that helps integrate Twilio with Pagerduty. It routes calls to a Twilio phone number to an on-call support person by looking up a PagerDuty schedule. If the support person does not answer, the customer is asked to leave a voicemail, which is then linked in a PagerDuty incident created for escalation. 

## Running Locally 
```bash
$ npm install
$ node app.js
```

To enable Twilio to reach your local server, you can use ngrok. Twilio has a great blog post on the tool here: https://www.twilio.com/blog/2013/10/test-your-webhooks-locally-with-ngrok.html

## Setup
Be sure to configure the appropriate environment variables required by this application. 
```
URL - the publically accessible URL for your server (referenced so it can easily replaced when using ngrok)
PAGERDUTY_SCHEDULE_ID - used to look up the on-call support person
PAGERDUTY_SERVICE_ID - used when generating a new PD incident
PAGERDUTY_USER_ID - used when generating a new PD incident
PAGERDUTY_API_TOKEN - token used when calling the PD API
```

## Twilio Setup 
Within your phone number configuration, update the `Voice & Fax` section with the applications webhook: 
`https://yourapplication.com/voice` 

This application will store new recordings to your Twilio account - it is important to delete these recordings in a timely manner to avoid unnecessarily charges from Twilio. 

The application is also configured to use Amazon Polly for Text to Speech. This incurs a small charge through Twilio for each message. You can change the voice options to a basic voice and avoid this charge. 

## PagerDuty Setup
You will need a PagerDuty schedule, service and user created. These are referenced in the following environment variables. 
```
PAGERDUTY_SCHEDULE_ID
PAGERDUTY_SERVICE_ID
PAGERDUTY_USER_ID
```
