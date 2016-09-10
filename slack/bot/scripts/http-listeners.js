//set env
var env = require('node-env-file');
env('.env');

//set NRP and bot

var DB_URL = process.env.DB_URL,
    HEROKU_URL = 'redis://redistogo:486829cad0f57bdaf495d39c8e402744@viperfish.redistogo.com:11475/',
    SLACK_ADMIN_CHANNEL = process.env.SLACK_ADMIN_CHANNEL,
    NRP = require('node-redis-pubsub'),
    config = {
        url: HEROKU_URL
    };
    nrp = new NRP(config); // This is the NRP client 


function bot(robot) {
    robot.respond(/listen/i, function (res) {
        console.log('yaaaaaaaaaahhhh!!!');
        return res.reply('Bobrisky!!!');
    });

    nrp.on('say hello', function(data){
        console.log('Hello ' + data.name);
    });

}
module.exports = bot;