'use strict';

var should = require('should');
var game = require('../lib/game');
var player = require('../lib/player');
var tray = require('../lib/tray');
var dictionary = require('../lib/dictionary');
var redis = require('./redis');
var helpers = require('./helpers');
var async = require('async');
var tileBag = require('../lib/tile_bag');

describe('8.3', function() {

  before(function(done) {
    redis.flushdb(done);
  });

  describe('scoring', function() {

    var NUM_PLAYERS = 2;
    var players;
    var playerIds;
    var gameId;
    var currentPlayer;

    beforeEach(function(done) {

      helpers.createGame(NUM_PLAYERS, function(err, gameData) {
        should.not.exist(err);
        gameId = gameData.id;
        playerIds = gameData.playerIds;
        async.map(playerIds, player.getPlayer, function(err, result) {
          should.not.exist(err);
          players = result;
          currentPlayer = players[gameData.currentPlayerIndex];
          done();
        });
      });
    });

    function takeTurn(playerId, cb) {
      helpers.createWordToPlay(gameId, playerId, function(err, word) {
        if (err) { return cb(err); }
        game.takeTurn(gameId, playerId, word, function(err) {
          if (err) { return cb(err); }
          var score = tileBag.scoreWord(word);
          cb(null, score);
        });
      });
    }

    it('should score at the end', function(done) {

      // play a couple of rounds
      var accumScores = {};
      async.timesSeries(NUM_PLAYERS * 2, function(ignore, cb) {
        game.getCurrentPlayer(gameId, function(err, playerId) {
          if (err) { return cb(err); }

          takeTurn(playerId, function(err, score) {
            if (err) { return cb(err); }

            accumScores[playerId] = (accumScores[playerId] || 0) + score;
            cb();
          });
        });
      }, function(err) {
        should.not.exist(err);

        // end the game
        game.gameOver(gameId, function(err) {
          should.not.exist(err);

          game.getGame(gameId, function(err, theGame) {
            should.not.exist(err);

            should.exist(theGame.scores);
            Object.keys(theGame.scores).length.should.equal(NUM_PLAYERS);

            accumScores.should.eql(theGame.scores);

            done();
          });
        });
      });
    });

  });
});
