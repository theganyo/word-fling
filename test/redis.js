/* Returns an open, configured connection to our Redis database. */
'use strict';

var redisClient = require('../lib/redis');
redisClient.select(2); // use this as the "test" database

module.exports = redisClient;
