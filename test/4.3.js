'use strict';

var should = require('should');
var player = require('../lib/player');
var redis = require('./redis');

var test_player = {
  email: 'email@test.com',
  name: 'Test Name',
  password: 'password'
};

describe('4.3', function() {

  before(function(done) {
    redis.flushdb(function(err) {
      should.not.exist(err);
      player.createPlayer(test_player.email, test_player.name, test_player.password, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        done();
      });
    });
  });

  describe('player', function() {

    it('should not store the password', function(done) {
      // also check the database directly
      var key = 'player:' + test_player.email;
      redis.hgetall(key, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.have.properties('email', 'name');
        result.should.not.have.property('password');
        done();
      });
    });

    it('should validate a good password', function(done) {
      player.isValidPassword(test_player.email, test_player.password, function(err, result) {
        should.not.exist(err);
        result.should.be.true;
        done();
      });
    });

    it('should not validate a bad password', function(done) {
      player.isValidPassword(test_player.email, 'bad password', function(err, result) {
        should.not.exist(err);
        result.should.be.false;
        done();
      });
    });

    it('should allow changing the password', function(done) {
      var newPassword = 'new password';
      player.changePassword(test_player.email, test_player.password, newPassword, function(err) {
        should.not.exist(err);
        player.isValidPassword(test_player.email, newPassword, function(err, result) {
          should.not.exist(err);
          result.should.be.true;
          done();
        });
      });
    });
  });
});
