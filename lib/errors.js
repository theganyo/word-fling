'use strict';

module.exports = {

  makeError: makeError,

  inactiveGame: "Sorry, this game is not longer active.",
  notYourTurn: "Sorry, it's not your turn.",
  notAWord: "%s isn't in the dictionary",
  cantPlayLetters: "Your tray doesn't have all these letters: %s",
  notAValidPlay: "Your word must include letters from the previous turn: %s or %s"
};

var util = require('util');
var debug = require('debug')('word-fling:errors');

function makeError(code, params) {
  var message = util.format.apply(this, arguments);
  debug('error: %s', message);
  return new Error(message);
}