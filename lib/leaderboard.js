/*
 Provides access to Players.
 Redis Key:
 players:{email}
 Redis Schema:
 Hash: {
 email: 'email'
 passwordHash: 'hash'
 }
 */
'use strict';

module.exports = {
  addScores: addScores,
  getTopPlayers: getTopPlayers
};

var redis = require('./redis');
var _ = require('lodash');

var PREFIX = 'leaderboard';

var TOP_SCORERS = 'Top Scorers';
var TOP_SCORERS_SIZE = 10;

/// Public

// scores: { playerId: score }
function addScores(scores, cb) {

  var key = makeKey(TOP_SCORERS);

  var params = [key];
  Object.keys(scores).forEach(function(playerId) {
    var score = scores[playerId];
    params.push(score);
    params.push(playerId);
  });

  redis.zadd(params, function(err) {
    if (err) { return cb(err); }

    trimToSize(key, TOP_SCORERS_SIZE, cb)
  });
}

function trimToSize(key, size, cb) {
  // -1000 is arbitrary
  redis.zremrangebyrank(key, -1000, (size + 1) * -1, cb);
}

function getTopPlayers(n, cb) {

  var results = [];
  var key = makeKey(TOP_SCORERS);
  redis.zrevrange(key, 0, n - 1, 'WITHSCORES', function(err, playersAndScores) {
    if (err) { return cb(err); }

    for (var i = 0; i < playersAndScores.length; i += 2) {
      var playerId = playersAndScores[i];
      var score = playersAndScores[i + 1];
      results.push({ playerId: playerId, score: parseInt(score) })
    }

    cb(null, results);
  });
}

/// Private

function makeKey(leaderboard) {
  return PREFIX + ':' + leaderboard;
}