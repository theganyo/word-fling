/*
  Provides access to Dictionary functions.
  Redis Key:
    dictionary
  Redis Schema:
    Set of words
*/
'use strict';

module.exports = {
  importFile: importFile,
  isValidWord: isValidWord,
  addWord: addWord
};

var redis = require('./redis');
var DICTIONARY_KEY = 'dictionary';

// Public

function importFile(dictionaryFile, cb) {

  var util = require('util');
  var fs = require('fs');
  var readline = require('readline');

  var rd = readline.createInterface({
    input: fs.createReadStream(dictionaryFile),
    output: process.stdout,
    terminal: false
  });

  rd.on('line', function onLine(line) {
    var word = line.split('/')[0]; // remove postfix (for SCOWL files)
    addWord(word, function(err) {
      if (err) { return cb(err); }
    });
  });

  rd.on('close', function onClose() {
    redis.scard(DICTIONARY_KEY, cb);
  });
}

function isValidWord(word, cb) {
  redis.sismember(DICTIONARY_KEY, word, function(err, result) {
    cb(err, !!result); // convert word to boolean
  })
}

function addWord(word, cb) {
  redis.sadd(DICTIONARY_KEY, word, cb);
}
