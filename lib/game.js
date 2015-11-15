/*
 Provides access to Game functions.
 Game:
   Redis Key:
     game:{id}
   Redis Schema: (hash)
     players (list)
     tile_bag
     turns (list)
     active
 Turns:
   Redis Key:
     game:{game_id}:turns
   Redis Schema: (hash)
     playerId
     word
     score
 */
'use strict';

module.exports = {
  newGame: newGame,
  getGame: getGame
};


var redis = require('./redis');
var async = require('async');

var PREFIX = 'game';
var GAME_ID_COUNTER = 'game_id_counter';

function makeKey(gameId) {
  return "game:" + gameId;
}

/* Schema

Key:
  game: {integer, unique id}

Value:
  id: {integer}
  playerIds: {Comma-delimited String of uuids}
  currentPlayerIndex: {integer}
*/

// Public

function newGame(playerIds, cb) {

  generateUniqueId(function(err, gameId) {
    var game = {
      id: gameId,
      playerIds: playerIds,
      currentPlayerIndex: Math.floor(Math.random() * playerIds.length) // randomly select a player
    };

    saveGame(gameId, game, function(err, result) { cb(err, game); });
  });
}

function saveGame(gameId, game, cb) {
  // TODO: make a key using the gameId and save the game as a Hash in Redis
  // see: https://github.com/mranney/node_redis#friendlier-hash-commands
  // note: Redis can only store strings, but the library will automatically "stringify" each field for you
}

function getGame(gameId, cb) {
  // TODO: make a key using the gameId and retrieve the Hash
  // see: https://github.com/mranney/node_redis#friendlier-hash-commands
  // Remember that all fields will be returned as Strings, so you'll need to parse playerIds and currentPlayerIndex!
}

function generateUniqueId(cb) {
  // TODO: use INCR to create a unique ID
}
