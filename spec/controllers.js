'use strict';

require('should');
global._ = require('underscore');
global._.str = require('underscore.string');
var sinon = require('sinon');

describe('controllers', function() {
  describe('security', function() {
    var securityController = require('../angular-authentication-service.js');

    it('should have a configure function', function() {
      securityController.configure.should.be.a.Function;
    });

    it('should have a permit function', function() {
      securityController.permit.should.be.a.Function;
    });

    it('should error when given a bad email address', function() {
      var req = { body: { email: 'bad@email', firstName: 'first', lastName: 'last', phone: '5555555555', postalCode: '55555'} };
      var res = { json: sinon.spy() };

      securityController.post.lead(req, res);
      res.json.calledWith(400).should.be.true;
    })
  });
});