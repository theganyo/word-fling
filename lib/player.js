/*
  Provides access to Players.
  Redis Key:
    players:{email}
  Redis Schema:
    Hash: {
      email: 'email'
      passwordHash: 'hash'
    }
 */
'use strict';

module.exports = {
  createPlayer: createPlayer,
  getPlayer: getPlayer
};

var redis = require('./redis');
var utility = require('./utility');

var PREFIX = 'player';

/* Schema

Key:
  player: {email}

Value:
  email: {email}
  name: {name}
  password: {password}
*/

/// Public

function createPlayer(email, name, password, cb) {
  // call getPlayer to see if email already exists
  // if id exists, return error
  // create a player object
  // make a key
  // save the player (HMSET)
}

function getPlayer(email, cb) {
  // make a key
  // return the Redis hash (HGETALL)
}

/// Private

function makeKey(email) {
  return utility.makeKey(PREFIX, email);
}
