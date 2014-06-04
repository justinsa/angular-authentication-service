'use strict';
describe('services', function() {
  beforeEach(module('authentication.service'));
  describe('$authentication', function() {
    it('should have a list of functions', inject(function($authentication) {
      var functions = ['configure'];
      for (var i in functions) {
        $authentication[functions[i]].should.be.a.Function;
      }
    }));
  });
});