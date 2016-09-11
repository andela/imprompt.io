//set env
var dotenv = require('node-env-file');
var env = process.env.NODE_ENV || 'development';

if (env !== "production") {
    dotenv('.env');
}

var Hashids   = require('hashids');
var moment    = require('moment');
var request   = require('request');
var mock_data = require('./stubs.js');
var fs        = require('fs');
var path      = require('path');
var Slack     = require('node-slack-upload');
var NRP       = require('node-redis-pubsub');


//set NRP and bot
var DB_URL = process.env.DB_URL,
    CALENDAR_API_KEY = process.env.CALENDAR_API_KEY,
    CALENDAR_URL = 'https://www.googleapis.com/calendar/v3/freeBusy?fields=calendars&key=' + CALENDAR_API_KEY,
    HEROKU_URL = process.env.REDIS_URL,
    SLACK_ADMIN_CHANNEL = process.env.SLACK_ADMIN_CHANNEL,
    NRP = require('node-redis-pubsub'),
    config = {
        url: HEROKU_URL
    };
    nrp = new NRP(config); // This is the NRP client

var CHANNEL_ID;

function bot(robot) {
    nrp.on('availability-check', function(data){
        console.log('availability-check request!', data);
        var participants = findParticipants(data.participants);
        var organizer_data = findUser(data.organizer);
        var organizer = {name: organizer_data.name, slack_handle: organizer_data.slack};
        updateAvailability(participants, function(err) {
            if(err) {
                console.log("updateAvailability failed", err);
            }
            else {
                emitAvailability(organizer, participants);
            }
        });
    });

    nrp.on('start-call', function(data) {
        console.log('start-call request!', data);
        var conference_link = createVideoConference();
        var users = data.participants;
        users.push(data.organizer);
        messageSlackUsers(conference_link, users);
    });

    nrp.on('end-call', function(data) {
        console.log('end-call request!', data);
        fileUpload(CHANNEL_ID);
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

function fileUpload(groupId) {
  var slack = new Slack(process.env.HUBOT_SLACK_TOKEN);

  slack.uploadFile({
    file: fs.createReadStream(path.join(__dirname, '..', 'meeting_notes.txt')),
    filetype: 'post',
    title: 'meeting notes',
    channels: groupId
  }, function(err) {
    if (err) {
      console.error(err);
    } else {
      console.log('file uploaded');
    }
  });
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


function getAvailability(user, cb) {
    // Calendar && Profile && SlackPresence
    isAvailableOnCalendar(user.email, function(is_available_on_calendar) {
      if(is_available_on_calendar) {
        var participant = findUserbySlackHandle(username);
        //check for availability on Slack
        var is_available_on_slack = isAvailableOnSlack(participant);
        if(is_available_on_slack) {
          switch(participant.status) {
            case "CMIL":
              cb({status: true, message: "available"});
            case "WIWO":
              cb({status: false, message: "currently working on changing the world"});
            case "DAYOP":
              cb({status: false, message: "do not disturb"});
          }
        }
      }
      else {
        cb({status: false, message: "unavailable"});
      }
    });
}

function isAvailableOnCalendar(email, cb) {
    var date = moment().format();
    var maxDate = moment().add(15, 'm').format();
    var params = {
        url: CALENDAR_URL,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + process.env.ACCESS_TOKEN
        },
        body: JSON.stringify({
            timeMin: date,
            timeMax: maxDate,
            calendarExpansionMax: 5,
            groupExpansionMax: 5,
            timezone: 'GMT',
            items: [{ id: email }]
        })
    }

    console.log('checking calendar...');
    request.post(params, function (err, status, body) {
        var userCal;
        body = JSON.parse(body);
        userCal = body.calendars[email];

        if (userCal.busy.length === 0) {
            console.log('user is available');
            cb(true);
        }
        if (userCal.busy.length > 0) {
            console.log('user is not available');
            cb(false);
        }
    });
}

function isAvailableOnSlack(participant) {
  return participant.presence;
}


function messageSlackUsers(link, participants) {
    console.log("Message Slack Users");
    var slackIds = [];
    for (i in participants) {
        slackIds.push(findUserBySlackHandle(participants[i].slack_handle).slack_id);
    }
    console.log(slackIds);
    createMultiParty(slackIds, function (channelId) {
        CHANNEL_ID = channelId
        params = {
            url: "https://slack.com/api/chat.postMessage",
            headers: {
                'Content-Type': 'application/json'
            },
            qs: {
                token: process.env.HUBOT_SLACK_TOKEN,
                channel: channelId,
                text: participants[participants.length-1].name + " has asked you to meet at the watercooler: " + link
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

function updateAvailability(participants, cb) {
    async.each(participants, function(participant, _cb){
      getAvailability(participants[i], function(av) {
            participant.status = av.status;
            participant.message = av.message;
            _cb();
        });
    }, function (err) {
        cb(err);
    });
}

module.exports = bot;