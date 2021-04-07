const https = require('https');
const axios = require('axios');
const express = require('express');
const bodyParser = require("body-parser");

const app = express();

const HEARTBEAT = " \n";
const PORT = process.env.PORT || 8080;
const USER_ID = '3bXXXXXXXXXXXXXXXXXXXXXX'; // <-- the user ID (Gitter)
const CHANNEL_ID = 'XXXXXXXXXXX'; // <-- the slack channel ID you want to publish
const GITTER_ROOM_ID = '5f59da9bd73408ce4fee8778'; // <-- the gitter room ID (CrowdSec)
const GITTER_TOKEN = '22dfXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // <-- your gitter token here
const GITTER_ROOM_PATH = `/v1/rooms/${GITTER_ROOM_ID}/chatMessages`;
const SLACK_WEBHOOK = 'https://hooks.slack.com/services/XXXXXXXXX/YYYYYYYYYYY/ZZZZZZZZZZZZZZZZZZZZZZZZ'; // the #gitter-chan webhook URL

const options = {
    port:     443,
    method:   'GET',
    path:     GITTER_ROOM_PATH,
    hostname: 'stream.gitter.im',
    headers:  { 'Authorization': `Bearer ${GITTER_TOKEN}` }
};

const slackToGitter = (payload) => {

    if (payload.event.channel === CHANNEL_ID) {
        if (!('subtype' in payload.event)) {
            const gitterParams = { text: payload.event.text };
            const gitterHeader = {
                headers: {
                    'Authorization': `Bearer ${GITTER_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            };
            axios.post(`https://api.gitter.im${GITTER_ROOM_PATH}`, gitterParams, gitterHeader);
        }
    }
}

const gitterToSlack = () => {

    const formatedSlackMessage = (gitterData) => `*${gitterData.fromUser.displayName}* : ${gitterData.text}`;

    const req = https.request(options, res => {
        res.on('data', chunk => {
            const msg = chunk.toString();

            if (msg !== HEARTBEAT) {
                const gitterData = JSON.parse(msg);
                const userId = gitterData.fromUser.id;

                if (userId !== USER_ID) {
                    axios.post(SLACK_WEBHOOK, { text: formatedSlackMessage( gitterData ) });
                }
            }
        });
    });

    req.on('error', e => {
        axios.post(SLACK_WEBHOOK, { text: 'Something went wrong: ' + e.message });
    });

    req.end();
}


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/toGitter', (req, res) => {
    const { challenge }  = req.body;
    res.send({ challenge });

    slackToGitter(req.body);
});

app.get('/', (req, res) => {
  res.status(200).send("I'm running ...").end();  
});

// Start the server
app.listen(PORT, () => {
  gitterToSlack();
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

module.exports = app;
