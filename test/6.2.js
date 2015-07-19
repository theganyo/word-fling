'use strict';

var should = require('should');
var player = require('../lib/player');
var tray = require('../lib/tray');
var game = require('../lib/game');
var redis = require('./redis');
var helpers = require('./helpers');

describe('6.2', function() {

  before(function(done) {
    redis.flushdb(done);
  });

  describe('creating a game', function() {

    var gameId;
    var NUM_PLAYERS = 3;
    var playerIds;

    before(function(done) {

      helpers.createPlayers(NUM_PLAYERS, function(err, ids) {
        should.not.exist(err);

        playerIds = ids;

        game.newGame(playerIds, function(err, gameData) {
          gameData.should.have.properties('id', 'playerIds', 'currentPlayerIndex');
          gameData.playerIds.length.should.eql(NUM_PLAYERS);
          gameData.currentPlayerIndex.should.be.within(0, NUM_PLAYERS - 1);

          gameId = gameData.id;
          done();
        });
      });
    });

    it('should generate unique ids', function(done) {

      helpers.createGame(NUM_PLAYERS, function(err, gameData) {
        should.not.exist(err);
        gameData.id.should.not.equal(gameId);
        done();
      });
    });

    it('should assign players', function(done) {

      game.getGame(gameId, function(err, gameData) {
        should.exist(gameData.playerIds);
        gameData.playerIds.length.should.eql(NUM_PLAYERS);
        gameData.playerIds.should.eql(playerIds);
        done();
      });
    });

    it('should assign a current player', function(done) {

      game.getGame(gameId, function(err, gameData) {
        should.exist(gameData.currentPlayerIndex);
        gameData.currentPlayerIndex.should.be.within(0, NUM_PLAYERS - 1);
        done();
      });
    });

  });
});
