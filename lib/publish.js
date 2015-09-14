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

  var channel = gameChannel(gameId);

  // TODO: set all player scores to 0
  // TODO: create a message (event, playerScores, currentPlayer)
  // TODO: publish the message (as JSON)
}

function endTurn(gameId, turn, playerScores, currentPlayerId, cb) {

  var channel = gameChannel(gameId);

  // TODO: create a message (event, playerScores, currentPlayer, lastTurn)
  // TODO: publish the message (as JSON)
}

function endGame(gameId, lastTurn, playerScores, cb) {

  var channel = gameChannel(gameId);

  // TODO: create a message (event, playerScores, lastTurn)
  // TODO: publish the message (as JSON)
}
