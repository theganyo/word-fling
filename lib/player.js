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
  changePassword: changePassword,
  isValidPassword: isValidPassword,
  getPlayer: getPlayer
};

var redis = require('./redis');
var bcrypt = require('bcryptjs');
var utility = require('./utility');

var PREFIX = 'player';

/* Schema

Key:
  player: {email}

Value:
  email: {email}
  name: {name}
  passwordHash: {passwordHash}
*/

/// Public

function createPlayer(email, name, password, cb) {
  getPlayer(email, function(err, player) {
    if (err) { return cb(err); }
    if (player) { return cb(new Error('email already registered')); }
    player = { email: email, name: name, password: password };
    savePlayer(player, cb);
  });
}

function getPlayer(email, cb) {
  var key = makeKey(email);
  redis.hgetall(key, function(err, result) {
    if (err) { return cb(err); }
    if (result) { delete(result.passwordHash); }
    cb(null, result);
  });
}


function isValidPassword(email, password, cb) {
  var key = makeKey(email);
  redis.hgetall(key, function(err, player) {
    if (err) { return cb(err); }
    if (!(player && player.passwordHash)) { return cb(null, false); }
    compareHash(password, player.passwordHash, cb);
  });
}

function changePassword(email, oldPassword, newPassword, cb) {
  isValidPassword(email, oldPassword, function(err, result) {
    if (err) { return cb(err); }
    if (!result) { return cb(new Error('invalid username or password')); }

    var key = makeKey(email);
    redis.hgetall(key, function(err, player) {
      if (err) { return cb(err); }
      player.password = newPassword;
      savePlayer(player, cb);
    });
  });
}

/// Private

function makeKey(email) {
  return utility.makeKey(PREFIX, email);
}

function savePlayer(player, cb) {
  hashPassword(player, function(err, player) {
    if (err) { return cb(err); }
    redis.hmset(makeKey(player.email), player, function(err) {
      if (err) { return cb(err); }
      cb(null, player);
    });
  });
}

function hashPassword(player, cb) {
  if (!player.password) { return cb(null, player); }
  bcrypt.hash(player.password, 8, function(err, hash) {
    if (err) { return cb(err); }
    delete(player.password);
    player.passwordHash = hash;
    cb(null, player);
  });
}

function compareHash(password, hash, cb) {
  bcrypt.compare(password, hash, cb);
}
