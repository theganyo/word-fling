'use strict';

var should = require('should');
var game = require('../lib/game');
var player = require('../lib/player');
var tray = require('../lib/tray');
var dictionary = require('../lib/dictionary');
var tileBag = require('../lib/tile_bag');
var redis = require('./redis');
var async = require('async');
var _ = require('lodash');
var errors = require('../lib/errors');
var helpers = require('./helpers');

describe('7.2', function() {

  before(function(done) {
    redis.flushdb(done);
  });

  describe('game turn', function() {

    var NUM_PLAYERS = 2;
    var players;
    var playerIds;
    var gameId;
    var currentPlayer, otherPlayer;

    function setCurrentPlayer(gameData) {
      currentPlayer = players[gameData.currentPlayerIndex];
      otherPlayer = _.find(players, function(player) { return player !== currentPlayer; });
    }

    before(function(done) {

      // create players
      async.times(NUM_PLAYERS, function(n, next) {
          player.createPlayer('email' + n, 'name' + n, 'password', next);
        },
        function(err, createdPlayers) {
          should.not.exist(err);

          players = createdPlayers;
          playerIds = players.map(function(player) { return player.email; });

          // create game
          game.newGame(playerIds, function(err, gameData) {
            should.not.exist(err);
            gameId = gameData.id;
            setCurrentPlayer(gameData);

            done();
          });
        });
    });

    it('should allow valid words on the first play', function(done) {

      helpers.createWordToPlay(gameId, currentPlayer.email, function(err, word) {
        should.not.exist(err);

        game.takeTurn(gameId, currentPlayer.email, word, function(err) {
          should.not.exist(err);

          game.getLastTurn(gameId, function(err, turn) {
            should.not.exist(err);

            turn.playerId.should.eql(currentPlayer.email);
            turn.word.should.eql(word);
            turn.score.should.eql(tileBag.scoreWord(word));

            game.getGame(gameId, function(err, gameData) {
              should.not.exist(err);
              setCurrentPlayer(gameData);
              done();
            });
          });
        });
      });
    });

    it("should reject 'words' that aren't in the dictionary", function(done) {

      helpers.createNonDictionaryWord(gameId, currentPlayer.email, function(err, word) {
        should.not.exist(err);
        game.takeTurn(gameId, currentPlayer.email, word, function(err) {
          should.exist(err);
          errors.makeError(errors.notAWord, word).should.eql(err);
          done();
        });
      });
    });

    it("should reject words that don't include the previous play", function(done) {

      saveTurn(gameId, otherPlayer.email, 'zandraq', function(err, turn) {
        should.not.exist(err);

        var first = turn.word[0];
        var last = turn.word[turn.word.length - 1];

        tray.getLetters(gameId, currentPlayer.email, function(err, letters) {
          should.not.exist(err);

          // create a fake word that doesn't include the necessary letters from the previous play
          letters = _.reject(letters, function(letter) { return letter === first || letter === last; });
          var word = letters.join('');

          dictionary.addWord(word, function(err) {
            should.not.exist(err);

            game.takeTurn(gameId, currentPlayer.email, word, function(err) {
              should.exist(err);
              errors.makeError(errors.notAValidPlay, first, last).should.eql(err);
              done();
            });
          });
        });
      });
    });
  });
});

// our little cheat until 7.3...
function saveTurn(gameId, playerId, word, cb) {

  var turn = {
    playerId: playerId,
    word: word
  };

  var turnKey = game.makeKey(gameId) + ':turns';
  var stringTurn = JSON.stringify(turn);
  redis.rpush(turnKey, stringTurn, function(err) {
    cb(err, turn);
  });
}
