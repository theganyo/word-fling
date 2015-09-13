'use strict';

var MAX_TILES = 7;

module.exports = {
  createTray: createTray,
  getLetters: getLetters,
  playLetters: playLetters,
  MAX_TILES: 7
};

var _ = require('lodash');
var redis = require('./redis');
var utility = require('./utility');
var tileBag = require('./tile_bag');
var game = require('./game');
var debug = require('debug')('word-fling:tray');
var errors = require('./errors');

var PREFIX = 'tray';


/// Public

function createTray(gameId, playerId, cb) {
  // TODO: just call refillTray
}

// returns score
function playLetters(gameId, playerId, letters, cb) {
  debug('game: %s, player: %s, playing letters: %s', gameId, playerId, letters);

  getLetters(gameId, playerId, function(err, trayLetters) {

    if (err) { return cb(err); }
    if (!canPlayLetters(trayLetters, letters)) {
      return cb(errors.makeError(errors.cantPlayLetters, letters));
    }

    var trayKey = makeKey(gameId, playerId);

    var multi = redis.multi();
    letters.forEach(function(letter) { multi.lrem(trayKey, 1, letter); });
    multi.exec(function (errs, replies) {
      if (errs) { return cb(err[0]); }
      if (_.any(replies, function(reply) { return reply === 0; })) {
        return cb(new Error('Unexpected error!'));
      }
    });

    refillTray(gameId, playerId, cb);
  });
}

function getLetters(gameId, playerId, cb) {
  var trayKey = makeKey(gameId, playerId);
  // TODO: use LRANGE to retrieve the letters in the tray
}

/// Private

function makeKey(gameId, playerId) {

  var gameKey = game.makeKey(gameId);
  return utility.makeKey(gameKey, PREFIX, playerId);
}

function refillTray(gameId, playerId, cb) {

  var trayKey = makeKey(gameId, playerId);

  // TODO: Calculate the number of tiles we need
  // TODO: Draw the appropriate number of tiles
  // TODO: Add the letters drawn to the Tray
}

function canPlayLetters(letters, wordLetters) {

  var testLetters = _.clone(letters);
  for (var i = 0; i < wordLetters.length; i++) {
    var letter = wordLetters[i];
    if (letter) {
      var index = _.indexOf(testLetters, letter);
      if (index < 0) { return false; }
      delete(testLetters[index]);
    }
  }
  return true;
}
