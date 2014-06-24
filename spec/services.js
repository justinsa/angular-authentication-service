'use strict';

describe('services', function() {
  beforeEach(module('authentication.service'));

  describe('$authentication', function() {
    it('should have a list of functions', inject(function($authentication) {
      var functions = ['isAuthenticated', 'checkAndBroadcastLoginConfirmed', 'loginConfirmed', 'loginRequired', 'logoutConfirmed', 'allowed', 'profile'];
      for (var i in functions) {
        $authentication[functions[i]].should.be.a.function;
      }
    }));

    describe('isAuthenticated', function() {
      it('should return true if user.profile is set in the store', inject(function($authentication, $store) {
        $store.set('user.profile', {roles:['a','b','c']});
        $store.has('user.profile').should.be.true;
        $authentication.isAuthenticated().should.be.true;
      }));

      it('should return false if user.profile is not set in the store', inject(function($authentication, $store) {
        $store.remove('user.profile');
        $authentication.isAuthenticated().should.be.false;
      }));
    });

    describe('loginConfirmed', function() {
      it('should broadcast auth-loginConfirmed when the user logs in', inject(function($authentication, $rootScope) {
        sinon.spy($rootScope, '$broadcast');
        $authentication.loginConfirmed({roles:['a','b','c']});
        $rootScope.$broadcast.calledWith('event:auth-loginConfirmed').should.be.true;
      }));
    });

    describe('checkAndBroadcastLoginConfirmed', function() {
      it('should broadcast auth-loginConfirmed if the user is logged in', inject(function($authentication, $rootScope, $store) {
        $store.set('user.profile', {roles:['a','b','c']});
        sinon.spy($rootScope, '$broadcast');
        $authentication.checkAndBroadcastLoginConfirmed();
        $rootScope.$broadcast.calledWith('event:auth-loginConfirmed').should.be.true;
      }));

      it('should not broadcast anything if the user is not logged in', inject(function($authentication, $rootScope, $store) {
        $store.remove('user.profile');
        sinon.spy($rootScope, '$broadcast');
        $authentication.checkAndBroadcastLoginConfirmed();
        $rootScope.$broadcast.neverCalledWith('event:auth-loginConfirmed').should.be.true;
      }));
    });

  });
});
