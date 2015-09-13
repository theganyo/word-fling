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

  // TODO: get the game
  // TODO: ensure the correct player is playing
  // TODO: call playWord
  // TODO: score the word (using tilebag)
  // TODO: call saveTurn
}

function skipTurn(gameId, playerId, cb) {

  // TODO: get the game
  // TODO: ensure the correct player is playing
  // TODO: save the turn with no word and no score
}

// returns new current player id
function advancePlayer(gameId, cb) {

  // TODO: retrieve the game
  // TODO: increment the currentPlayerIndex (or wrap to the next player)
  // TODO: set the currentPlayerIndex on the game
  // TODO: return the current player id to cb
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
    game.active = (game.active === 'true');
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

  // TODO: add the stringTurn to the end of the list
  // TODO: call advancePlayer to move to the next player
  // TODO: return the turn to the cb
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

  debug('game %s over', gameId);

  getGame(gameId, function(err, game) {
    game.active = false;

    calculateScores(gameId, function(err, scores) {
      if (err) { return cb(err); }

      debug('final scores:', scores);

      game.scores = scores;

      saveGame(gameId, game, function(err) {
        if (err) { return cb(err); }

        leaderboard.addScores(scores, function(err) {
          if (err) { return cb(err); }

          getLastTurn(gameId, function(err, turn) {
            publish.endGame(gameId, turn, scores, cb);
          });
        });
      });
    });
  });
}

// { playerId: score }
function calculateScores(gameId, cb) {

  getTurns(gameId, 0, -1, function(err, turns) {
    if (err) { return cb(err); }

    var playerTurns = _.groupBy(turns, 'playerId'); // { playerId: [turns] }

    var finalScores = {};
    _.each(playerTurns, function(turns, player) {
      finalScores[player] = _.reduce(turns, function(total, turn) { return total + turn.score; }, 0);
    });

    cb(null, finalScores);
  });
}

function getTurns(gameId, start, end, cb) {

  var turnKey = makeTurnKey(gameId);
  redis.lrange(turnKey, start, end, function(err, stringTurns) { // entire list (0, -1)
    if (err) { return cb(err); }

    var turns = _.map(stringTurns, JSON.parse); // convert string to javascript object

    cb(null, turns);
  });
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
