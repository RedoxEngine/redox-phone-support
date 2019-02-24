const express = require('express');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const pdClient = require('node-pagerduty');
const moment = require('moment');
const bodyParser = require('body-parser');

const pdApiKey = process.env.PAGERDUTY_API_TOKEN; 
const pd = new pdClient(pdApiKey);

const pdScheduleId = process.env.PAGERDUTY_SCHEDULE_ID; 
const pdServiceId = process.env.PAGERDUTY_SERVICE_ID; 
const pdUserId = process.env.PAGERDUTY_USER_ID; 
const URL = process.env.URL; 

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

// ref:
// https://www.twilio.com/docs/voice/tutorials/how-to-respond-to-incoming-phone-calls-node-js
app.post('/voice', (request, response) => {
    response.type('text/xml');
    const twiml = new VoiceResponse();

    // check on-call schedule
    let qs = {
        time_zone: 'UTC',
        since: moment().format(),
        until: moment().add(1, 'second').format()
    };
    
    pd.schedules.getSchedule(pdScheduleId, qs).then(res => {

        let body = JSON.parse(res.body);
        let user = body.schedule.final_schedule.rendered_schedule_entries[0].user;
        let userID = user.id;
        let userName = user.summary;

        // check phone number of the on-call user
        pd.users.getUser(userID, { 'include[]': 'contact_methods' }).then(res => {
            let body = JSON.parse(res.body);
            let userItem = body.user.contact_methods.filter(x => (x.type == 'phone_contact_method'))

            let phoneNumber = "+" + userItem[0].country_code + userItem[0].address;

            // call whisper
            twiml.say({ voice: 'Polly.Matthew' }, 'You have reached Redox support, contacting the on call Engineer.');

            const dial = twiml.dial({
                action: `${URL}/call_complete`,
                timeout: 30
            }, '');

            dial.number({
                url: `${URL}/whisper`
            }, phoneNumber);

            response.send(twiml.toString());
        })
    }).catch(e => {
        twiml.say({ voice: 'Polly.Matthew' }, 'We encountered an error, call routing failed. Please email support@redoxengine.com');
    })
});

// call the on-call engineer
app.post('/whisper', (request, response) => {
    response.type('text/xml');
    const twiml = new VoiceResponse();

    twiml.gather({
        numDigits: 1,
        timeout: 10,
        action: `${URL}/gather_result`
    }).say({
        voice: 'Polly.Matthew'
    }, 'You are receiving a call for Redox support, press any key to accept');
    twiml.hangup();
    response.send(twiml.toString());
});

// end call if the on-call person did not answer
app.post('/gather_result', (request, response) => {
    response.type('text/xml');
    const twiml = new VoiceResponse();

    if (request.body.Digits && request.body.Digits.length < 1) {
        twiml.hangup();
    }
    response.send(twiml.toString());
});

// ask the customer to leave a message if we could not reach the on-call person
app.post('/call_complete', (request, response) => {
    response.type('text/xml');
    const twiml = new VoiceResponse();

    if (request.body.DialCallStatus === 'completed' || request.body.DialCallStatus === 'answered') {
        twiml.hangup();
    } else {
        twiml.say({ voice: 'Polly.Matthew' }, 'The call could not be answered this time, please leave a message and our support team will be in contact shortly.');
        twiml.record({ action: `${URL}/record_complete` });
    }
    response.send(twiml.toString());
});

// create a PD incident with a link to the recording
app.post('/record_complete', (request, response) => {
    response.type('text/xml');
    const twiml = new VoiceResponse();

    const recordingUrl = request.body.RecordingUrl;

    pd.incidents.createIncident(pdUserId, {
        "incident": {
            "type": "incident",
            "title": "Call to Redox Support Phone Number",
            "service": {
                "id": pdServiceId,
                "type": "service_reference"
            },
            "body": {
                "type": 'incident_body',
                'details': `A call to our support number was not answered by the on-call support person. The call was from ${request.body.From}. You can listen to the recorded message here: ${recordingUrl}`
            }
        }
    }).catch(e => {
        console.log(e);
    });

    twiml.hangup();
    response.send(twiml.toString());
});

// health check
app.get('/_healthz', (request, response) => {
    response.send('OK');
});

// Create an HTTP server and listen for requests on port 3000
app.listen(process.env.PORT || 3000);