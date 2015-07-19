'use strict';

var should = require('should');
var dictionary = require('../lib/dictionary');
var redis = require('./redis');
var path = require('path');

var DICTIONARY_KEY = 'dictionary';
var dictionary_file = path.resolve(__dirname, '5.2.dictionary');

describe('5.2', function() {

  before(function(done) {
    redis.flushdb(done);
  });

  describe('dictionary', function() {

    it('should import a dictionary file', function(done) {
      dictionary.importFile(dictionary_file, function(err, result) {
        should.not.exist(err);
        result.should.eql(10);

        redis.smembers(DICTIONARY_KEY, function(err, members) {
          should.not.exist(err);
          should.exist(members);
          members.should.be.an.array;
          members.length.should.eql(10);
          members.should.containEql('Scottie', 'Scottish');
          done();
        });
      });
    });

    it('should validate a good word', function(done) {
      dictionary.isValidWord('Scott', function(err, result) {
        should.not.exist(err);
        result.should.be.true;
        done();
      });
    });

    it('should not validate a bad word', function(done) {
      dictionary.isValidWord('NOT_A_WORD', function(err, result) {
        should.not.exist(err);
        result.should.be.false;
        done();
      });
    });
  });
});
