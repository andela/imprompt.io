//set env
var dotenv = require('node-env-file');
var env = process.env.NODE_ENV || 'development';

if (env !== "production") {
    dotenv('.env');
}

var Hashids = require('hashids');
var moment = require('moment');
var request = require('request');

var mock_data = require('./stubs.js');


//set NRP and bot
var DB_URL = process.env.DB_URL,
    CALENDAR_API_KEY = process.env.CALENDAR_API_KEY,
    CALENDAR_URL = 'https://www.googleapis.com/calendar/v3/freeBusy?fields=calendars%2CtimeMax%2CtimeMin&key=' + CALENDAR_API_KEY,
    HEROKU_URL = process.env.REDIS_URL,
    SLACK_ADMIN_CHANNEL = process.env.SLACK_ADMIN_CHANNEL,
    NRP = require('node-redis-pubsub'),
    config = {
        url: HEROKU_URL
    };
    nrp = new NRP(config); // This is the NRP client

function bot(robot) {
    nrp.on('availability-check', function(data){
        console.log('availability-check request!', data);
        var participants = findParticipants(data.participants);
        var organizer_data = findUser(data.organizer);
        var organizer = {name: organizer_data.name, slack_handle: organizer_data.slack};
        updateAvailability(participants);
        emitAvailability(organizer, participants);
    });

    nrp.on('start-call', function(data) {
        console.log('start-call request!', data);
        var conference_link = createVideoConference();
        var users = data.participants;
        users.push(data.organizer);
        messageSlackUsers(conference_link, users);
    });
}

function messageSlackUsers(link, participants) {
    console.log("Message Slack Users");
    var slackIds = [];
    for (i in participants) {
        slackIds.push(findUserBySlackHandle(participants[i].slack_handle).slack_id);
    }
    console.log(slackIds);
    createMultiParty(slackIds, function (channelId) {
        params = {
            url: "https://slack.com/api/chat.postMessage",
            headers: {
                'Content-Type': 'application/json'
            },
            qs: {
                token: process.env.HUBOT_SLACK_TOKEN,
                channel: channelId,
                text: "Here's your meeting link " + link
            }
        }

        request.get(params, function (err, status, body) {
            if(err) {
                console.log(err, body);
                return;
            }
            nrp.emit('call-started', {});
        });
    });
}


function createMultiParty(slackIds, cb) {
    params = {
        url: "https://slack.com/api/mpim.open",
        headers: {
            'Content-Type': 'application/json'
        },
        qs: {
            users: slackIds.join(","),
            token: process.env.HUBOT_SLACK_TOKEN
        }
    }
    request.get(params, function (err, status, body){
        console.log(err, body);
        console.log("Multi Party Channel");
        body = JSON.parse(body);
        console.log(body.group.id);
        cb(body.group.id);
    })
}

function createVideoConference() {
    var hashids = new Hashids();
    var slug = hashids.encode("12324732324523");
    var url = "http://appear.in/" + slug;
    return url;
}

function emitAvailability(organizer, participants) {
    var data = {organizer: organizer, participants:participants};
    nrp.emit('availability-response', data);
}

function findParticipants(participant_list) {
    var result = [];
    for (participant in participant_list) {
        var user = findUser(participant_list[participant]);
        console.log(user);
        var data = {name: user.name, slack_handle: user.slack};
        result.push(data);
    }
    return result;
}

function findUser(name) {
    for (i in mock_data) {
        if (mock_data[i].name.toLowerCase() ===  name.toLowerCase()) {
            return mock_data[i];
        }
    }
}

function findUserBySlackHandle(slack_handle) {
    for (i in mock_data) {
        if (mock_data[i].slack.toLowerCase() ===  slack_handle.toLowerCase()) {
            return mock_data[i];
        }
    }
}


function getAvailability(user) {
    return {status: true, message: "do not disturb"};
}

function isAvailableOnCalendar(user_name) {
    user = findUser(user_name);
    var date = moment().format();
    var maxDate = moment().add(15, 'm').format();
    var params = {
        url: CALENDAR_URL,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            timeMin: date,
            timeMax: maxDate,
            calendarExpansionMax: 5,
            groupExpansionMax: 5,
            timezone: 'GMT',
            items: [{ id: user.email }]
        })
    }

    console.log('checking calendar...');
    request.post(params, function (err, status, body) {
        var userCal;
        console.log(err, body);
        body = JSON.parse(body);
        userCal = body.calendars[user.email];

        if (userCal.busy.length === 0) {
            console.log('user is available');
            return true;
        }
        if (userCal.busy.length > 0) {
            console.log('user is not available');
            return false;
        }
    });
}

function updateAvailability(participants) {
    for (participant in participants) {
        var av = getAvailability(participants[participant]);
        participant.status = av.status;
        participant.message = av.message;
    }
}





module.exports = bot;