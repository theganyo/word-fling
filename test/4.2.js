'use strict';

var should = require('should');
var player = require('../lib/player');
var redis = require('./redis');

var test_player = {
  email: 'email@test.com',
  name: 'Test Name',
  password: 'password'
};

describe('4.2', function() {

  before(function(done) {
    redis.flushdb(done);
  });

  describe('player', function() {

    it('should create a new player', function(done) {
      player.createPlayer(test_player.email, test_player.name, test_player.password, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.containEql({ email: test_player.email });
        result.should.containEql({ name: test_player.name });
        done();
      });
    });

    it('should retrieve the player', function(done) {
      player.getPlayer(test_player.email, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.containEql({ email: test_player.email });
        result.should.containEql({ name: test_player.name });
        done();
      });
    });

  });
});
