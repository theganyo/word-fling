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
  getGame: getGame,
  takeTurn: takeTurn,
  skipTurn: skipTurn,
  makeKey: makeKey,
  getLastTurn: getLastTurn,
  getCurrentPlayer: getCurrentPlayer,
  gameOver: gameOver
};


var redis = require('./redis');
var utility = require('./utility');
var tileBag = require('./tile_bag');
var tray = require('./tray');
var dictionary = require('./dictionary');
var async = require('async');
var errors = require('./errors');
var makeError = errors.makeError;
var debug = require('debug')('word-fling:game');
var _ = require('lodash');
var leaderboard = require('./leaderboard');
var publish = require('./publish');

var PREFIX = 'game';
var GAME_ID_COUNTER = 'game_id_counter';

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
      currentPlayerIndex: Math.floor(Math.random() * playerIds.length), // randomly select a player
      active: true
    };

    saveGame(gameId, game, function(err) {
      if (err) { return cb(err); }

      // create the tile bag
      tileBag.createTileBag(gameId, function(err) {
        if (err) { return cb(err); }

        // create the player's trays
        async.each(playerIds, function(playerId, cb) {
          tray.createTray(gameId, playerId, cb);
        }, function done(err) {
          if (err) { return cb(err); }

          publish.newGame(gameId, playerIds, playerIds[game.currentPlayerIndex], function(err) {
            if (err) { return cb(err); }

            cb(null, game);
          });
        });
      });
    });
  });
}

function takeTurn(gameId, playerId, word, cb) {

  getGame(gameId, function(err, game) {
    if (err) { return cb(err); }
    if (!game.active) { return cb(makeError(errors.inactiveGame)); }
    if (game.playerIds[game.currentPlayerIndex] !== playerId) { return cb(makeError(errors.notYourTurn)); }

    playWord(gameId, playerId, word, function(err) {
      if (err) { return cb(err); }

      var score = tileBag.scoreWord(word);
      saveTurn(gameId, playerId, word, score, cb);
    });
  });
}

function skipTurn(gameId, playerId, cb) {

  getGame(gameId, function(err, game) {
    if (err) { return cb(err); }
    if (!game.active) { return cb(makeError(errors.inactiveGame)); }
    if (game.playerIds[game.currentPlayerIndex] !== playerId) { return cb(makeError(errors.notYourTurn)); }

    debug('%s skipped', playerId);
    saveTurn(gameId, playerId, null, 0, cb);
  });
}

// returns new current player id
function advancePlayer(gameId, cb) {

  getGame(gameId, function(err, game) {
    if (err) { return cb(err); }

    var nextPlayerIndex = game.currentPlayerIndex + 1;
    if (nextPlayerIndex === game.playerIds.length) {
      nextPlayerIndex = 0;
    }
    var gameKey = makeKey(game.id);
    redis.hset(gameKey, 'currentPlayerIndex', nextPlayerIndex, function(err) {
      cb(err, game.playerIds[nextPlayerIndex]);
    });
  });
}

function saveGame(gameId, game, cb) {

  var gameKey = makeKey(gameId);
  if (game.scores) { game.scores = JSON.stringify(game.scores); }
  redis.hmset(gameKey, game, cb); // see: https://github.com/mranney/node_redis#friendlier-hash-commands
}

function getGame(gameId, cb) {

  var gameKey = makeKey(gameId);
  redis.hgetall(gameKey, function(err, game) { // see: https://github.com/mranney/node_redis#friendlier-hash-commands
    if (err) { return cb(err); }
    game.playerIds = game.playerIds.split(','); // parse comma-delimited string
    game.currentPlayerIndex = parseInt(game.currentPlayerIndex); // parse string to integer
    
    // TODO: convert game.active to a boolean
    
    if (game.scores) { game.scores = JSON.parse(game.scores); }
    cb(null, game);
  })
}

function playWord(gameId, playerId, word, cb) {

  dictionary.isValidWord(word, function(err, isWord) {
    if (err) { return cb(err); }
    if (!isWord) { return cb(makeError(errors.notAWord, word)); }

    checkAgainstRules(gameId, playerId, word, function(err, lettersToPlay) {
      if (err) { return cb(err); }
      tray.playLetters(gameId, playerId, lettersToPlay, cb);
    });
  });
}

// return letters played from the tray
function checkAgainstRules(gameId, playerId, word, cb) {

  tray.getLetters(gameId, playerId, function(err, trayLetters) {
    if (err) { return cb(err); }

    getLastTurn(gameId, function(err, lastTurn) {
      if (err) { return cb(err); }

      var wordLetters = word.split('');

      if (!lastTurn) {
        if (utility.canMakeWord(trayLetters, wordLetters)) {
          return cb(null, wordLetters);
        } else {
          return cb(makeError(errors.cantPlayLetters));
        }
      }

      var firstLetter = lastTurn.word[0];
      if (utility.canMakeWord(trayLetters, wordLetters, firstLetter)) {
        delete(wordLetters[_.indexOf(wordLetters, firstLetter)]);
        return cb(null, wordLetters);
      }

      var lastLetter = lastTurn.word[lastTurn.word.length - 1];
      if (utility.canMakeWord(trayLetters, wordLetters, lastLetter)) {
        delete(wordLetters[_.indexOf(wordLetters, lastLetter)]);
        return cb(null, wordLetters);
      }

      cb(makeError(errors.notAValidPlay, firstLetter, lastLetter));
    });
  });
}

function makeKey(id) {
  return utility.makeKey(PREFIX, id);
}

function saveTurn(gameId, playerId, word, score, cb) {

  var turn = {
    playerId: playerId,
    word: word,
    score: score
  };

  debug('save turn: ', turn);
  var turnKey = makeTurnKey(gameId);
  var stringTurn = JSON.stringify(turn);
  redis.rpush(turnKey, stringTurn, function(err) {
    if (err) { return cb(err); }

    checkForGameOver(gameId, function(err, isOver) {
      if (err) { return cb(err); }
      if (isOver) { return gameOver(gameId, cb); }

      advancePlayer(gameId, function(err, currentPlayer) {
        if (err) { return cb(err); }

        calculateScores(gameId, function(err, scores) {
          if (err) { return cb(err); }

          publish.endTurn(gameId, turn, scores, currentPlayer, function(err) {
            cb(err, turn);
          });
        })
      });

    });
  });
}

function getLastTurn(gameId, cb) {
  getTurn(gameId, -1, cb);
}

function getTurn(gameId, index, cb) {
  var turnKey = makeTurnKey(gameId);
  redis.lindex(turnKey, index, function(err, reply) {
    if (err) { return cb(err); }
    var turn = JSON.parse(reply);
    debug('getTurn %d:', index, turn);
    cb(null, turn);
  });
}

function checkForGameOver(gameId, cb) {

  didLastPlayerGoOut(gameId, function(err, isOut) {
    if (err || isOut) { return cb(err, isOut); }

    haveAllPlayersSkipped(gameId, cb);
  });
}

function didLastPlayerGoOut(gameId, cb) {

  getLastTurn(gameId, function(err, lastTurn) {
    if (err) { return cb(err); }
    tray.getLetters(gameId, lastTurn.playerId, function(err, letters) {
      if (err) { return cb(err); }
      if (debug.enabled && letters.length === 0) { debug('player %s went out', lastTurn.playerId); }
      cb(null, letters.length === 0);
    });
  });
}

function haveAllPlayersSkipped(gameId, cb) {

  getGame(gameId, function(err, game) {
    if (err) { return cb(err); }

    getTurns(gameId, game.playerIds.length * -1, -1, function(err, turns) {

      if (turns.length < game.playerIds.length) {
        return cb(null, false);
      }

      for (var i = 0; i < turns.length; i++) {
        if (turns[i].word) { return cb(null, false); }
      }

      debug('all players skipped');
      cb(null, true);
    });
  });
}

function gameOver(gameId, cb) {

  // TODO: get game
  // TODO: set game.active to true
  // TODO: save game
}

// { playerId: score }
function calculateScores(gameId, cb) {

  cb();
}

function getTurns(gameId, start, end, cb) {

  var turnKey = makeTurnKey(gameId);
  // TODO: use LRANGE to retrieve the requested turns
  // TODO: use JSON.parse to convert all the turns to objects
  // TODO: return the list of objects
}

function makeTurnKey(gameId) {
  return makeKey(gameId) + ':turns';
}

function generateUniqueId(cb) {
  redis.incr(GAME_ID_COUNTER, cb);
}

function getCurrentPlayer(gameId, cb) {

  getGame(gameId, function(err, game) {
    if (err) { return cb(err); }

    cb(null, game.playerIds[game.currentPlayerIndex]);
  });
}
