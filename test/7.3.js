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

describe('7.3', function() {

  before(function(done) {
    redis.flushdb(done);
  });

  describe('game turn', function() {

    var NUM_PLAYERS = 2;
    var players;
    var playerIds;
    var gameId;

    before(function(done) {

      helpers.createGame(NUM_PLAYERS, function(err, gameData) {
        should.not.exist(err);
        gameId = gameData.id;
        playerIds = gameData.playerIds;
        async.map(playerIds, player.getPlayer, function(err, result) {
          should.not.exist(err);
          players = result;
          done();
        });
      });
    });

    function takeTurn(playerId, cb) {
      helpers.createWordToPlay(gameId, playerId, function(err, word) {
        if (err) { return cb(err); }
        game.takeTurn(gameId, playerId, word, function(err) {
          cb(err, word);
        });
      });
    }

    it('should not allow the non-current player to play', function(done) {

      game.getCurrentPlayer(gameId, function(err, startingPlayerId) {
        should.not.exist(err);

        var otherPlayer = _.find(players, function(player) { return player.email !== startingPlayerId; });

        takeTurn(otherPlayer.email, function(err) {
          should.exist(err);

          errors.notYourTurn.should.eql(err.message);
          done();
        });
      });
    });

    it('should allow the current player to play a valid word', function(done) {

      game.getCurrentPlayer(gameId, function(err, startingPlayerId) {
        should.not.exist(err);

        takeTurn(startingPlayerId, function(err, word) {
          should.not.exist(err);

          game.getLastTurn(gameId, function(err, turn) {
            should.not.exist(err);

            turn.playerId.should.eql(startingPlayerId);
            turn.word.should.eql(word);
            turn.score.should.eql(tileBag.scoreWord(word));
            done();
          });
        });
      });
    });

    it('should change current player after a play', function(done) {

      game.getCurrentPlayer(gameId, function(err, startingPlayerId) {
        should.not.exist(err);

        takeTurn(startingPlayerId, function(err) {
          should.not.exist(err);

          game.getGame(gameId, function(err) {
            should.not.exist(err);

            game.getCurrentPlayer(gameId, function(err, playerId) {
              should.not.exist(err);

              startingPlayerId.should.not.equal(playerId);
              done();
            });
          });
        });
      });
    });

    it('should change current player after skipping turn', function(done) {

      game.getCurrentPlayer(gameId, function(err, startingPlayerId) {
        should.not.exist(err);

        game.skipTurn(gameId, startingPlayerId, function(err) {
          should.not.exist(err);
          game.getGame(gameId, function(err) {
            should.not.exist(err);

            game.getCurrentPlayer(gameId, function(err, playerId) {
              should.not.exist(err);

              startingPlayerId.should.not.equal(playerId);
              done();
            });
          });
        });
      });
    });
  });
});
