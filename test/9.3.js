'use strict';

var should = require('should');
var game = require('../lib/game');
var player = require('../lib/player');
var redis = require('./redis');
var helpers = require('./helpers');
var async = require('async');
var tileBag = require('../lib/tile_bag');
var publish = require('../lib/publish');

describe('9.3', function() {

  describe('pub/sub should notify when', function() {

    var NUM_PLAYERS = 2;
    var players;
    var playerIds;
    var gameId;
    var currentPlayer;
    var accumScores = {};
    var events = [];
    var pubsubChannel;

    before(function(done) {
      redis.flushdb(done);
    });

    before(function(done) {

      var redisSubscription = redis.newConnection();
      redisSubscription.on('pmessage', function (pattern, channel, message) {
        var msg = JSON.parse(message);
        events.push({ channel: channel, message: msg});
      });
      redisSubscription.psubscribe('game:*');

      helpers.createGame(NUM_PLAYERS, function(err, gameData) {
        should.not.exist(err);
        gameId = gameData.id;
        playerIds = gameData.playerIds;
        pubsubChannel = publish.gameChannel(gameId);
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
          cb(null, word, score);
        });
      });
    }

    it('a game is starting', function(done) {

      events.length.should.eql(1);
      var event = events[events.length - 1];

      event.channel.should.eql(pubsubChannel);
      var msg = event.message;

      msg.should.have.properties('playerScores', 'currentPlayer');

      var testScores = {};
      playerIds.forEach(function(playerId) {
        testScores[playerId] = 0;
      });
      msg.playerScores.should.eql(testScores);

      done();
    });

    it('a turn has been taken', function(done) {

      game.getCurrentPlayer(gameId, function(err, lastPlayerId) {
        if (err) { return cb(err); }

        takeTurn(lastPlayerId, function(err, word, score) {
          if (err) { return cb(err); }

          accumScores[lastPlayerId] = (accumScores[lastPlayerId] || 0) + score;

          game.getCurrentPlayer(gameId, function(err, playerId) {

            events.length.should.eql(2);
            var event = events[events.length - 1];

            event.channel.should.eql(pubsubChannel);
            var msg = event.message;

            msg.should.have.properties('playerScores', 'lastTurn', 'currentPlayer');

            var testScores = {};
            Object.keys(accumScores).forEach(function(playerId) {
              testScores[playerId] = accumScores[playerId];
            });
            msg.playerScores.should.eql(testScores);

            msg.currentPlayer.should.eql(playerId);

            var lastTurn = msg.lastTurn;
            lastTurn.playerId.should.eql(lastPlayerId);
            lastTurn.word.should.eql(word);
            lastTurn.score.should.eql(score);

            done();
          });
        });
      });
    });

    it('a game has ended', function(done) {

      // play a couple of rounds
      async.timesSeries(NUM_PLAYERS * 2, function(ignore, cb) {
        game.getCurrentPlayer(gameId, function(err, playerId) {
          if (err) { return cb(err); }

          takeTurn(playerId, function(err, word, score) {
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

          events.length.should.eql(7);
          var event = events[events.length - 1];

          event.channel.should.eql(pubsubChannel);
          var msg = event.message;

          msg.should.have.properties('playerScores', 'lastTurn');

          var testScores = {};
          Object.keys(accumScores).forEach(function(playerId) {
            testScores[playerId] = accumScores[playerId];
          });
          msg.playerScores.should.eql(testScores);

          game.getLastTurn(gameId, function(err, lastTurn) {
            should.not.exist(err);

            lastTurn.should.eql(msg.lastTurn);

            done();
          });
        });
      });
    });

  });
});
