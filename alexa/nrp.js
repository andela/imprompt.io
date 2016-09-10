var NRP = require('node-redis-pubsub');
var url = 'redis://redistogo:486829cad0f57bdaf495d39c8e402744@viperfish.redistogo.com:11475/';
 
var config = {
  url: url
};
 
var nrp = new NRP(config);

module.exports = nrp;