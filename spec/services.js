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

    describe('loginRequired', function() {
      it('should broadcast event:auth-loginRequired', inject(function($authentication, $rootScope) {
        sinon.spy($rootScope, '$broadcast');
        $authentication.loginRequired();
        $rootScope.$broadcast.calledWith('event:auth-loginRequired');
      }));
    });

    describe('logoutConfirmed', function() {
      it('should broadcast event:auth-logoutConfirmed when the user logs out', inject(function($authentication, $rootScope) {
        sinon.spy($rootScope, '$broadcast');
        $authentication.logoutConfirmed();
        $rootScope.$broadcast.calledWith('event:auth-logoutConfirmed');
      }));

      it('should clear user.profile from the store', inject(function($authentication, $store) {
        $store.set('user.profile', {roles:['a','b','c']});
        $authentication.logoutConfirmed();
        $store.has('user.profile').should.be.false;
      }));
    });

    describe('profile', function() {
      it('should return the profile', inject(function($authentication, $store) {
        $store.set('user.profile', 'foo');
        $authentication.profile().should.match('foo');
      }));
    });

    describe('allowed', function() {
      describe('authenticated', function() {
        var $authentication, $store;
        beforeEach(inject(function(_$authentication_, _$store_) {
          $authentication = _$authentication_;
          $store = _$store_;
          $store.set('user.profile', {roles:['a','b','c']});
        }));

        it('should return false if no arguments are provided', function() {
          $authentication.allowed().should.be.false;
        });

        it('should return true if the role is ALL', function() {
          $authentication.allowed('ALL').should.be.true;
        });

        it('should return false if the role is ANONYMOUS', function() {
          $authentication.allowed('ANONYMOUS').should.be.false;
        });

        it('should return true if the role is in [a, b, c]', function() {
          $authentication.allowed('a').should.be.true;
          $authentication.allowed('b').should.be.true;
          $authentication.allowed('c').should.be.true;
        });

        it('should return false if the role is not in [a, b, c]', function() {
          $authentication.allowed('x').should.be.false;
          $authentication.allowed('y').should.be.false;
          $authentication.allowed('z').should.be.false;
        });
      });

      describe('unauthenticated', function() {
        var $authentication, $store;
        beforeEach(inject(function(_$authentication_, _$store_) {
          $authentication = _$authentication_;
          $store = _$store_;
          $store.remove('user.profile');
        }));

        it('should return false if no arguments are provided', function() {
          $authentication.allowed().should.be.false;
        });

        it('should return false if the role is ALL', function() {
          $authentication.allowed('ALL').should.be.false;
        });

        it('should return true if the role is ANONYMOUS', function() {
          $authentication.allowed('ANONYMOUS').should.be.true;
        });

        it('should return false if any roles are provided', function() {
          $authentication.allowed('a', 'b', 'c').should.be.false;
        });
      });
    });

    describe('getConfig', function() {
      it('should get the config', inject(function($authentication) {
        $authentication.getConfig().should.be.an.object;
        $authentication.getConfig().profileStorageKey.should.match('user.profile');
      }));
    });
  });
});
