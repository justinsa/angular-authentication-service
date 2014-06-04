'use strict';

describe('controllers', function() {
  beforeEach(module('authentication.service'));
  describe('SecurityController', function() {
    var scope;
    var ctrl;

    it('should have a permit function', function() {
      scope.permit.should.be.a.Function;
    });

    it('should define a set of controls', function() {
      _.keys(scope.controls).length.should.equal(2);
    });
  });
});