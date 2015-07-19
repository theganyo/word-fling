'use strict';

module.exports = {
  createPlayers: createPlayers,
  createGame: createGame,
  createWordToPlay: createWordToPlay,
  formWordFromTray: formWordFromTray,
  createNonDictionaryWord: createNonDictionaryWord
};

var count = 0;
var game = require('../lib/game');
var dictionary = require('../lib/dictionary');
var tray = require('../lib/tray');
var player = require('../lib/player');
var async = require('async');

function createPlayers(numPlayers, cb) {

  async.times(numPlayers, function(n, next) {
      n = ++count;
      player.createPlayer('email_' + n, 'name_' + n, 'password' + n, next);
    },
    function(err, players) {
      if (err) { return cb(err); }

      players.length.should.eql(numPlayers);
      var playerIds = players.map(function(player) { return player.email; });

      cb(null, playerIds);
    }
  );
}

function createGame(numPlayers, cb) {

  createPlayers(numPlayers, function(err, playerIds) {
    if (err) { return cb(err); }

    game.newGame(playerIds, function(err, gameData) {
      if (err) { return cb(err); }
      cb(null, gameData);
    });
  });
}

function createWordToPlay(gameId, playerId, cb) {

  formWordFromTray(gameId, playerId, 4, function(err, word) {

    // add to dictionary to fake it being a real word
    dictionary.addWord(word, function(err) {
      if (err) { return cb(err); }

      cb(null, word);
    });
  });
}

function formWordFromTray(gameId, playerId, numLetters, cb) {

  game.getLastTurn(gameId, function(err, turn) {
    if (err) { return cb(err); }

    var firstLetter = turn ? turn.word.charAt(0) : '';

    tray.getLetters(gameId, playerId, function(err, letters) {
      if (err) { return cb(err); }

      var word = letters.slice(0, numLetters).join('') + firstLetter;

      cb(null, word);
    });
  });
}

function createNonDictionaryWord(gameId, playerId, cb) {

  formWordFromTray(gameId, playerId, 7, function(err, word) {

    dictionary.isValidWord(word, function(err, isWord) {
      if (err) { return cb(err); }
      if (isWord) { return cb(new Error('Inconceivable! Just rerun the test.')); }
      cb(null, word);
    });
  });
}
