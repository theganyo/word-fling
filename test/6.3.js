'use strict';

var should = require('should');
var player = require('../lib/player');
var tileBag = require('../lib/tile_bag');
var tray = require('../lib/tray');
var game = require('../lib/game');
var redis = require('./redis');

describe('6.3', function() {

  before(function(done) {
    redis.flushdb(done);
  });

  describe('tile bag', function() {

    var GAME_ID = 'test';
    var tilesRemaining = tileBag.MAX_TILES;

    it('should populate with tiles', function(done) {

      tileBag.createTileBag(GAME_ID, function(err) {
        should.not.exist(err);

        tileBag.tilesRemaining(GAME_ID, function(err, remaining) {
          should.not.exist(err);
          should.exist(remaining);
          remaining.should.eql(tileBag.MAX_TILES);

          done();
        });
      })
    });

    it('should draw a tile', function(done) {

      tileBag.drawTile(GAME_ID, function(err, tile) {
        should.not.exist(err);
        should.exist(tile);
        tile.length.should.eql(1);
        tilesRemaining -= 1;

        tileBag.tilesRemaining(GAME_ID, function(err, remaining) {
          should.not.exist(err);
          remaining.should.eql(tilesRemaining);

          done();
        });
      })
    });

    it('should draw multiple tiles', function(done) {

      tileBag.drawTiles(GAME_ID, 3, function(err, tiles) {
        should.not.exist(err);
        should.exist(tiles);
        tiles.length.should.eql(3);
        should.exist(tiles[0]);
        should.exist(tiles[1]);
        should.exist(tiles[2]);
        tilesRemaining -= 3;

        tileBag.tilesRemaining(GAME_ID, function(err, remaining) {
          should.not.exist(err);
          remaining.should.eql(tilesRemaining);

          done();
        });
      })
    });

    it('should draw to empty', function(done) {

      tileBag.drawTiles(GAME_ID, tilesRemaining + 1, function(err, tiles) {
        should.not.exist(err);
        should.exist(tiles);
        tiles.length.should.eql(tilesRemaining);

        tileBag.tilesRemaining(GAME_ID, function(err, remaining) {
          should.not.exist(err);
          remaining.should.eql(0);

          done();
        });
      })
    });

  });
});
