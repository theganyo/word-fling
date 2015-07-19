/* Returns an open, configured connection to our Redis database. */
'use strict';

var redis = require('redis');
var redisConfig = require('../config/redis_config');
var redisClient = redis.createClient(redisConfig.port, redisConfig.host, redisConfig.options);

//redis.debug_mode = true;

redisClient.newConnection = function() {
  return redis.createClient(redisConfig.port, redisConfig.host, redisConfig.options);
};


module.exports = redisClient;



// monkeypatch to make lpush accept an array

var origLpush = redisClient.lpush.bind(redisClient);

redisClient.lpush = function(key, args, callback) {

  if (Array.isArray(args) && args.length > 0 && typeof callback === 'function') {
    args.unshift(key);
    this.send_command('lpush', args, function(err, result) {
      callback(err, result);
    });
  } else {
    origLpush.apply(redisClient, arguments);
  }
};
