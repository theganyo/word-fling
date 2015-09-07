/*
 Calculates the score of a word.

 Tray:
   Redis Key:
     game:{game_id}:{tray_id}
   Redis Schema: (hash)
     Set of tileBag
 */
'use strict';

module.exports = {
  createTileBag: createTileBag,
  drawTile: drawTile,
  drawTiles: drawTiles,
  scoreWord: scoreWord,
  tilesRemaining: tilesRemaining,
  MAX_TILES: 98
};


var redis = require('./redis');
var utility = require('./utility');
var game = require('./game');
var debug = require('debug')('word-fling:tile_bag');
var _ = require('lodash');

var POSTFIX = 'tile_bag';

/// Public

function createTileBag(gameId, cb) {
  var bagKey = makeKey(gameId);
  debug('created: %s', bagKey);
  // TODO: create an array of tiles (use LETTER_FREQUENCIES: each letter x frequency)
  // hint: each tile must be unique to maintain frequencies... not just a letter
  // TODO: store the tiles in Redis at the key location
}

var async = require('async');

function drawTiles(gameId, count, cb) {
  function drawOne(ignore, cb) {
    drawTile(gameId, cb);
  }
  async.times(count, drawOne, function(err, tiles) {
    if (err) { return cb(err); }
    tiles = _.compact(tiles); // remove the empty tiles
    debug('game: %s, drew tiles: %s', gameId, tiles);
    return cb(err, tiles);
  });
}

function drawTile(gameId, cb) {
  var bagKey = makeKey(gameId);
  // TODO: retrieve a tile from the bag, return just the letter to cb
}

function tilesRemaining(gameId, cb) {
  var bagKey = makeKey(gameId);
  // TODO: return the cardinality of the set to cb
}

function scoreWord(word) {
  var score = 0;
  for (var i = 0; i < word.length; i++) {
    var letter = word.charAt(i);
    score += LETTER_SCORES[letter];
  }
  return score;
}

/// Private

function makeKey(gameId) {
  var gameKey = game.makeKey(gameId);
  return utility.makeKey(gameKey, POSTFIX);
}


// 2 blank tiles ignored
var LETTER_FREQUENCIES = {};
    LETTER_FREQUENCIES['a'] = 9;
    LETTER_FREQUENCIES['b'] = 2;
    LETTER_FREQUENCIES['c'] = 2;
    LETTER_FREQUENCIES['d'] = 4;
    LETTER_FREQUENCIES['e'] = 12;
    LETTER_FREQUENCIES['f'] = 2;
    LETTER_FREQUENCIES['g'] = 3;
    LETTER_FREQUENCIES['h'] = 2;
    LETTER_FREQUENCIES['i'] = 9;
    LETTER_FREQUENCIES['j'] = 1;
    LETTER_FREQUENCIES['k'] = 1;
    LETTER_FREQUENCIES['l'] = 4;
    LETTER_FREQUENCIES['m'] = 2;
    LETTER_FREQUENCIES['n'] = 6;
    LETTER_FREQUENCIES['o'] = 8;
    LETTER_FREQUENCIES['p'] = 2;
    LETTER_FREQUENCIES['q'] = 1;
    LETTER_FREQUENCIES['r'] = 6;
    LETTER_FREQUENCIES['s'] = 4;
    LETTER_FREQUENCIES['t'] = 6;
    LETTER_FREQUENCIES['u'] = 4;
    LETTER_FREQUENCIES['v'] = 2;
    LETTER_FREQUENCIES['w'] = 2;
    LETTER_FREQUENCIES['x'] = 1;
    LETTER_FREQUENCIES['y'] = 2;
    LETTER_FREQUENCIES['z'] = 1;


var LETTER_SCORES = {};
    LETTER_SCORES['a'] = 1;
    LETTER_SCORES['b'] = 3;
    LETTER_SCORES['c'] = 3;
    LETTER_SCORES['d'] = 2;
    LETTER_SCORES['e'] = 1;
    LETTER_SCORES['f'] = 4;
    LETTER_SCORES['g'] = 2;
    LETTER_SCORES['h'] = 4;
    LETTER_SCORES['i'] = 1;
    LETTER_SCORES['j'] = 8;
    LETTER_SCORES['k'] = 5;
    LETTER_SCORES['l'] = 1;
    LETTER_SCORES['m'] = 3;
    LETTER_SCORES['n'] = 1;
    LETTER_SCORES['o'] = 1;
    LETTER_SCORES['p'] = 3;
    LETTER_SCORES['q'] = 10;
    LETTER_SCORES['r'] = 1;
    LETTER_SCORES['s'] = 1;
    LETTER_SCORES['t'] = 1;
    LETTER_SCORES['u'] = 1;
    LETTER_SCORES['v'] = 4;
    LETTER_SCORES['w'] = 4;
    LETTER_SCORES['x'] = 8;
    LETTER_SCORES['y'] = 4;
    LETTER_SCORES['z'] = 10;
