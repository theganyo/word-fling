/*
 Utility functions
 */
'use strict';

module.exports = {
  makeKey: makeKey,
  canMakeWord: canMakeWord
};

var _ = require('lodash');

// joins string arguments together with :
function makeKey() {
  var args = Array.prototype.slice.call(arguments);
  return args.join(':');
}

function canMakeWord(trayLetters, wordLetters, requiredExternalLetter) {

  var testWordLetters = wordLetters;

  if (requiredExternalLetter) {
    var index = _.indexOf(wordLetters, requiredExternalLetter);
    if (index < 0) { return false; }
    testWordLetters = _.clone(wordLetters);
    delete(testWordLetters[index]);
  }

  var testLetters = _.clone(trayLetters);
  testWordLetters.forEach(function(letter) {
    var index = testLetters.indexOf(letter);
    if (index === -1) { return false; }
    delete(testLetters[index]);
  });

  return true;
}
