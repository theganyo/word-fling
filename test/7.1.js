'use strict';

var should = require('should');
var game = require('../lib/game');
var player = require('../lib/player');
var tray = require('../lib/tray');
var dictionary = require('../lib/dictionary');
var tileBag = require('../lib/tile_bag');
var redis = require('./redis');
var helpers = require('./helpers');
var async = require('async');
var errors = require('../lib/errors');

describe('7.1', function() {

  before(function(done) {
    redis.flushdb(done);
  });

  describe('player tray', function() {

    var GAME_ID = 'test';
    var PLAYER_ID = 'test';
    var tilesRemaining = tileBag.MAX_TILES;

    before(function(done) {
      tileBag.createTileBag(GAME_ID, done);
    });

    it('should create correctly', function(done) {

      tray.createTray(GAME_ID, PLAYER_ID, function(err) {
        should.not.exist(err);

        tileBag.tilesRemaining(GAME_ID, function(err, remaining) {
          should.not.exist(err);
          should.exist(remaining);
          tilesRemaining -= tray.MAX_TILES;
          remaining.should.eql(tilesRemaining);

          done();
        });
      })
    });

    it("should fail to play letters it doesn't contain", function(done) {

      var letters = 'abc123'.split('');
      tray.playLetters(GAME_ID, PLAYER_ID, letters, function(err) {
        should.exist(err);
        errors.makeError(errors.cantPlayLetters, letters).should.eql(err);
        done();
      });
    });

    it('should refill after play', function(done) {

      tray.getLetters(GAME_ID, PLAYER_ID, function(err, letters) {
        should.not.exist(err);
        var word = letters.slice(0, 4);
        tray.playLetters(GAME_ID, PLAYER_ID, word, function(err) {
          should.not.exist(err);

          tileBag.tilesRemaining(GAME_ID, function(err, remaining) {
            should.not.exist(err);
            should.exist(remaining);
            tilesRemaining -= word.length;
            remaining.should.eql(tilesRemaining);

            done();
          });
        })
      });
    });

    it('should create trays for each player when creating a game', function(done) {

      helpers.createGame(3, function(err, gameData) {
        should.not.exist(err);

        var getLetters = tray.getLetters.bind(this, gameData.id);

        async.map(gameData.playerIds, getLetters, function(err, results) {
          should.not.exist(err);
          results.forEach(function(letters) {
            letters.length.should.eql(tray.MAX_TILES);
          });
          done();
        });
      });
    });

  });
});
