/*
Game Event: {
  playerScores: {
    playerId: playerScore
  },
  lastTurn: {
    playerId: playerId,
    word: word,
    score: score
  },
  currentPlayer: currentPlayerId
}
*/

module.exports = {
  gameChannel: gameChannel,
  newGame: newGame,
  endTurn: endTurn,
  endGame: endGame
};

var redis = require('./redis');
var debug = require('debug')('word-fling:pubsub');
var utility = require('./utility');

function gameChannel(gameId) {
  return utility.makeKey('game', gameId);
}

function newGame(gameId, playerIds, currentPlayerId, cb) {

  debug('newGame');

  var playerScores = {};
  playerIds.forEach(function(playerId) {
    playerScores[playerId] = 0;
  });
  var message = {
    event: 'new game',
    playerScores: playerScores,
    currentPlayer: currentPlayerId
  };

  var channel = gameChannel(gameId);
  redis.publish(channel, JSON.stringify(message), cb);
}

function endTurn(gameId, turn, playerScores, currentPlayerId, cb) {

  debug('endTurn');

  var message = {
    event: 'end turn',
    playerScores: playerScores,
    currentPlayer: currentPlayerId,
    lastTurn: turn
  };

  var channel = gameChannel(gameId);
  redis.publish(channel, JSON.stringify(message), cb);
}

function endGame(gameId, lastTurn, playerScores, cb) {

  debug('endGame');

  var message = {
    event: 'end game',
    playerScores: playerScores,
    lastTurn: lastTurn
  };

  var channel = gameChannel(gameId);
  redis.publish(channel, JSON.stringify(message), cb);
}
