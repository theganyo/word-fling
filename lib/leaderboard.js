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

  // TODO: for each of the scores, add score and playerId to a list
  // TODO: use the list of scores and players to call ZADD on the leaderboard
  // TODO: trim the leaderboard to the TOP_SCORERS_SIZE
}

function trimToSize(key, size, cb) {
  // TODO: use ZREMRANGEBYRANK to trim to key to the size specified
}

function getTopPlayers(n, cb) {

  var key = makeKey(TOP_SCORERS);

  // TODO: use ZREVRANGE and WITHSCORES to get the playerIds and scores
  // TODO: return the results as a hash of objects like this: { playerId: id, score: score }
}

/// Private

function makeKey(leaderboard) {
  return PREFIX + ':' + leaderboard;
}