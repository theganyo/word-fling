#!/usr/bin/env node
'use strict';

var app = require('commander');
var _ = require('lodash');
var util = require('util');
var dictionary = require('../lib/dictionary');
var tileBag = require('../lib/tile_bag');
var player = require('../lib/player');

// set up commands

app
  .command('ping')
  .description('verify the Redis server is available as configured')
  .action(function() {
    var redisConfig = require('../config/redis_config');
    console.log('attempting to contact using Redis config: %s', JSON.stringify(redisConfig, null, 2));
    var redisClient = require('../lib/redis');
    redisClient.ping(function(err, result) {
      if (err) { return console.log(err.stack); }
      console.log('result: %s', result);
      process.exit();
    });
  });

app
  .command('import-dictionary <file>')
  .description('import word dictionary from a file (eg. /usr/share/dict/words)')
  .action(function(file) {
    dictionary.importFile(file, function(err, numRecords) {
      print(err, util.format('Import finished. %d words in dictionary.', numRecords));
    });
  });

app
  .command('lookup-word <word>')
  .description('lookup word in the dictionary')
  .action(print(dictionary.isValidWord));

app
  .command('score-word <file>')
  .description('score a word')
  .action(print(tileBag.scoreWord));

app
  .command('create-player <email> <password>')
  .description('create a new player')
  .action(print(player.createPlayer));

app
  .command('get-player <email>')
  .description('get a player')
  .action(print(player.getPlayer));

app
  .command('check-password <email> <password>')
  .description('validate a player\'s password')
  .action(print(player.isValidPassword));

app
  .command('watch-game <gameId>')
  .option('-t, --test', 'watch on test db')
  .description('watch a game being played. specify a game number or \'*\' to watch all games')
  .action(watchGame);

app
  .command('play-game')
  .description('start a game')
  .action(playGame);

// parse command line and run commands

app.parse(process.argv);


// display help as needed

if (!app.runningCommand) {
  var commands = app.commands.map(function(command) { return command._name; });
  if (!_.contains(commands, app.rawArgs[2])) {
    app.help();
  }
}

// print result of a called function

function print(func) {
  function printResult(err, result) {
    if (err) {
      console.log(err.stack);
      process.exit(1);
    } else {
      console.log(result);
      process.exit(0);
    }
  }
  return function doIt(arg1, arg2) {
    var args = [ arg1 ];
    if (typeof arg2 === 'string') { args.push(arg2) }
    args.push(printResult);
    var result = func.apply(this, args);
    if (result) { printResult(result); }
  }
}

function formatMessage(message) {
    var msg = JSON.parse(message);
    console.log('%s %s', channel, msg.event);

    switch (msg.event) {

      case 'new game':
        console.log('  Players: %s', Object.keys(msg.playerScores).join(', '));
        break;

      case 'end turn':
        console.log('  %s played word "%s" for a score of %s', msg.lastTurn.playerId, msg.lastTurn.word, msg.lastTurn.score);
        console.log('  Scores: %j', msg.playerScores);
        break;

      case 'end game':
        console.log('  Final score: %j', msg.playerScores);
    }
}

function watchGame(gameId, options) {

  var redis = options.test ? require('../test/redis') : require('../lib/redis');

  // TODO: define an event handlers for pmessage events
  // TODO: parse the message
  // TODO: based on the msg.event, use console.log to print an appropriate friendly message
  // TODO: subscribe to the passed-in game's event channel
}

function playGame() {
  ask('how many players?')
  repeat(numPlayers(), 'player id?')
  newConnection
}