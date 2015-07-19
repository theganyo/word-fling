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
var leaderboard = require('../lib/leaderboard');

var KEY = 'leaderboard:Top Scorers';

describe('8.4', function() {

  var scores;

  before(function(done) {
    redis.flushdb(function(err) {
      if (err) { done(err); }

      scores = {};
      for (var i = 0; i < 20; i++) {
        var playerId = 'player_' + i;
        scores[playerId] = i;
      }

      leaderboard.addScores(scores, done);
    });
  });

  describe(KEY, function() {

    it('should maintain a size of 10', function(done) {

      redis.zcard(KEY, function(err, card) {
        should.not.exist(err);
        card.should.equal(10);
        done();
      })
    });

    it('should have top 10 players', function(done) {

      redis.zrevrange(KEY, 0, 9, 'WITHSCORES', function(err, playersAndScores) {
        should.not.exist(err);

        var playerNum = 19;
        for (var i = 0; i < playersAndScores.length; i += 2) {
          var playerId = 'player_' + playerNum--;
          playersAndScores[i].should.eql(playerId);
          parseInt(playersAndScores[i + 1]).should.eql(scores[playerId]);
        }

        done();
      });
    });

    it('should return top 10 scores', function(done) {

      var testScores = [];
      for (var i = 10; i < 20; i++) {
        var playerId = 'player_' + i;
        testScores.unshift({ playerId: playerId, score: i });
      }

      leaderboard.getTopPlayers(10, function(err, playersAndScores) {
        should.not.exist(err);

        playersAndScores.length.should.equal(10);
        playersAndScores.should.eql(testScores);

        done();
      })
    });
  });

  describe('game', function() {

    var NUM_PLAYERS = 2;
    var players;
    var playerIds;
    var gameId;
    var currentPlayer;

    beforeEach(function(done) {
      redis.flushdb(done);
    });

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

    it('should add scores to leaderboard at the end', function(done) {

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

          leaderboard.getTopPlayers(10, function(err, playersAndScores) {

            playersAndScores.length.should.equal(NUM_PLAYERS);

            var testScores = [];
            Object.keys(accumScores).forEach(function(playerId) {
              var score = accumScores[playerId];
              testScores.push({ playerId: playerId, score: score});
            });

            testScores.sort(function(a, b) { return b.score - a.score; });

            testScores.should.eql(playersAndScores);

            done();

          });
        });
      });
    });

  });
});
