'use strict';

var should = require('should');
var game = require('../lib/game');
var player = require('../lib/player');
var tray = require('../lib/tray');
var dictionary = require('../lib/dictionary');
var redis = require('./redis');
var tileBag = require('../lib/tile_bag');
var helpers = require('./helpers');
var async = require('async');
var _ = require('lodash');
var errors = require('../lib/errors');

describe('8.2', function() {

  before(function(done) {
    redis.flushdb(done);
  });

  describe('end game', function() {

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

    it('should start in an active state', function(done) {

      game.getGame(gameId, function(err, gameData) {
        should.not.exist(err);

        gameData.active.should.be.true;
        done();
      });
    });

    it('should not allow play if not active', function(done) {

      var gameKey = game.makeKey(gameId);
      redis.hset(gameKey, 'active', false, function(err) {
        should.not.exist(err);

        game.getGame(gameId, function(err, gameData) {
          should.not.exist(err);
          gameData.active.should.be.false;

          game.skipTurn(gameId, currentPlayer.email, function(err) {
            should.exist(err);
            errors.inactiveGame.should.eql(err.message);

            done();
          });
        });
      });
    });

    it('should stop play when a player runs out of tiles and cannot draw', function(done) {

      tileBag.tilesRemaining(gameId, function(err, numTiles) {
        should.not.exist(err);

        tileBag.drawTiles(gameId, numTiles, function(err) { // empty the tile bag
          should.not.exist(err);

          helpers.formWordFromTray(gameId, currentPlayer.email, tray.MAX_TILES, function(err, word) {
            should.not.exist(err);
            should.exist(word);
            word.length.should.eql(tray.MAX_TILES);

            // add to dictionary to fake it being a real word
            dictionary.addWord(word, function(err) {
              should.not.exist(err);

              game.takeTurn(gameId, currentPlayer.email, word, function(err) {
                should.not.exist(err);

                game.getGame(gameId, function(err, gameData) {
                  should.not.exist(err);

                  gameData.active.should.be.false;
                  done();
                });
              });
            });
          });
        });
      });
    });

    it('should stop play when all players skip their turn', function(done) {

      async.timesSeries(NUM_PLAYERS, function(ignore, cb) {
          game.getCurrentPlayer(gameId, function(err, playerId) {
            if (err) { return cb(err); }

            game.skipTurn(gameId, playerId, cb);
          });
        },
        function(err) {
          should.not.exist(err);

          game.getGame(gameId, function(err, gameData) {
            should.not.exist(err);

            gameData.active.should.be.false;
            done();
          });
        });
    });
  });
});
