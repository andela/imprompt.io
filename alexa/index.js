/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */

 var nrp = require('./nrp.js');

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.[unique-value-here]") {
             context.fail("Invalid Application ID");
        }
        */

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("WhatsTheAvailability" === intentName) {
      checkAvailability(intent, session, callback);
    } else if ("EndCall" === intentName) {
      endCall(intent, session, callback);
    } else if ("DontBother" === intentName) {
      ignoreCall(intent, session, callback);
    }
    else if ("AMAZON.HelpIntent" === intentName) {
        getWelcomeResponse(callback);
    } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) {
        handleSessionEndRequest(callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
        ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "Welcome to Impromtu. " +
        "Who would you like to meet with?";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "Please tell me who you would like to meet.";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    var cardTitle = "Session Ended";
    var speechOutput = "Thank you for trying Impromtu. Have a nice day!";
    // Setting this to true ends the session and exits the skill.
    var shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

/**
 * Checks someone's availability and prepares the speech to reply to the user.
 */
function checkAvailability(intent, session, callback) {
  var cardTitle         = intent.name;
  var nameOneSlot       = intent.slots.NameOne;
  var nameTwoSlot       = intent.slots.NameTwo;
  var nameThreeSlot     = intent.slots.NameThree;
  var repromptText      = "";
  var sessionAttributes = {};
  var shouldEndSession  = false;
  var speechOutput      = "";

  if (nameOneSlot && nameTwoSlot && nameThreeSlot) {
      var organizer = nameOneSlot.value;
      var participants = [nameTwoSlot.value, nameThreeSlot.value];

      listenForAvailability(intent, session, callback);
      checkName(organizer, participants);
  } else {
      speechOutput = "I'm not sure who they are. Please try again";
      callback(sessionAttributes,
           buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
  }
}

function checkName(organizer, participants) {
  nrp.emit("availability-check", {
    organizer: organizer,
    participants: participants,
    timestamp: new Date()
  });
}

function listenForAvailability(intent, session, callback) {
  nrp.on("availability-response", function(data, channel) {
    nrp.off("availability-response");

    var cardTitle = intent.name;
    var sessionAttributes = {};
    var speechOutput = "";
    var repromptText = "";
    var shouldEndSession = false;
    var participants = data.participants;

    // store organizer and participant data in the session
    sessionAttributes.organizer    = data.organizer;
    sessionAttributes.participants = data.participants;

    // sort by available participants first
    participants.sort(function(x, y) {
      return (x.status === y.status)? 0 : x.status ? -1 : 1;
    });

    if (participants[0].status === true && participants[1].status === true) {
      // start the call
      nrp.emit("start-call", {
        organizer: sessionAttributes.organizer,
        participants: sessionAttributes.participants,
        timestamp: new Date()
      });

      speechOutput = "I’ve started a meeting and ";
      speechOutput = speechOutput + " notified " + participants[0].name + " and " + participants[1].name + ".";
    }

    if (participants[0].status === true && participants[1].status === false) {
      // start the call
      nrp.emit("start-call", {
        organizer: sessionAttributes.organizer,
        participants: sessionAttributes.participants,
        timestamp: new Date()
      });

      speechOutput = "I’ve started a meeting and ";
      speechOutput = speechOutput + " notified " + participants[0].name + ".";
      speechOutput = speechOutput + " It’s after work hours in Lagos, but " +
                      participants[1].name + " might be available. Should I call him?";
    }

    if (participants[0].status === false && participants[1].status === false) {
      speechOutput =  "Both " + participants[0].name + " and " +
                      participants[1].name + " are unavailable right now. " +
                      " Would you like to call someone else?";
    }

    nrp.on("call-started", function(data, channel) {
      nrp.off("call-started");
    });

    callback(sessionAttributes,
             buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
  });
}

/**
 * End the call.
 */
function endCall(intent, session, callback) {
  var cardTitle         = intent.name;
  var repromptText      = "";
  var sessionAttributes = session.attributes;
  var shouldEndSession  = false;
  var speechOutput      = "I’m transcribing the notes now. I’ll put them in your slack channel when they’re ready.";

  nrp.emit("end-call", {
    organizer: sessionAttributes.organizer,
    participants: sessionAttributes.participants,
    timestamp: new Date()
  });

  callback(sessionAttributes,
           buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function ignoreCall(intent, session, callback) {
  var cardTitle         = intent.name;
  var repromptText      = "";
  var sessionAttributes = session.attributes;
  var shouldEndSession  = false;
  var speechOutput      = "Ok, I won't disturb him.";

  callback(sessionAttributes,
           buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}