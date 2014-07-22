/* globals afterEach, beforeEach, describe, inject, it, sinon */
'use strict';

describe('services', function() {
  beforeEach(
    module('authentication.service', function ($authenticationProvider) {
      $authenticationProvider.configure({
        notPermittedRedirectPath: '/notpermitted',
        unauthenticatedRedirectPath: '/unauthenticated'
      });
    })
  );

  describe('$authentication', function() {
    it('should have a list of functions',
      inject(function ($authentication) {
        var functions = [
          'isAuthenticated',
          'isAuthCookieMissing',
          'checkAndBroadcastLoginConfirmed',
          'loginConfirmed',
          'loginRequired',
          'logoutConfirmed',
          'allowed',
          'profile',
          'roles',
          'permit',
          'getConfiguration'
        ];
        for (var i in functions) {
          $authentication[functions[i]].should.be.a.function; // jshint ignore:line
        }
      })
    );

    it('should have an expected configuration',
      inject(function ($authentication) {
        var configuration = $authentication.getConfiguration();
        (configuration.authCookieKey === null).should.be.true; // jshint ignore:line
        configuration.profileStorageKey.should.match('user.profile');
        configuration.notPermittedRedirectPath.should.match('/notpermitted');
        configuration.unauthenticatedRedirectPath.should.match('/unauthenticated');
        configuration.userRolesProperty.should.match('roles');
        configuration.rolesFunction.should.be.a.function; // jshint ignore:line
        configuration.validationFunction.should.be.a.function; // jshint ignore:line
      })
    );

    describe('isAuthCookieMissing', function() {
      afterEach(inject(function($document) {
        // Clear cookies
        $document[0].cookie = 'AUTH-COOKIE=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
        $document[0].cookie = 'PRE-AUTH-COOKIE=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
        $document[0].cookie = 'POST-AUTH-COOKIE=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }));

      describe('where cookie is not required', function() {
        it ('should return false if auth cookie is not set',
          inject(function ($authentication) {
            $authentication.isAuthCookieMissing().should.be.false; // jshint ignore:line
          })
        );

        it ('should return false if auth cookie is set',
          inject(function ($authentication, $document) {
            $document[0].cookie = 'AUTH-COOKIE=Authorized';
            $authentication.isAuthCookieMissing().should.be.false; // jshint ignore:line
          })
        );
      });

      describe('where cookie is required', function() {
        beforeEach(function() {
          module('authentication.service', function ($authenticationProvider) {
            $authenticationProvider.configure({
              authCookieKey: 'AUTH-COOKIE'
            });
          });
        });

        it ('should return true if auth cookie is not set',
          inject(function ($authentication) {
            $authentication.isAuthCookieMissing().should.be.true; // jshint ignore:line
          })
        );

        it ('should return false if auth cookie is set',
          inject(function ($authentication, $document) {
            $document[0].cookie = 'AUTH-COOKIE=Authorized';
            $authentication.isAuthCookieMissing().should.be.false; // jshint ignore:line
          })
        );

        it ('should return false if auth cookie is set with other cookies',
          inject(function ($authentication, $document) {
            $document[0].cookie = 'PRE-AUTH-COOKIE=Not Authorized';
            $document[0].cookie = 'AUTH-COOKIE=Authorized';
            $document[0].cookie = 'POST-AUTH-COOKIE=Not Authorized';
            $authentication.isAuthCookieMissing().should.be.false; // jshint ignore:line
          })
        );
      });
    });

    describe('isAuthenticated', function() {
      it('should return true if user.profile is set in the store',
        inject(function ($authentication, $store) {
          $store.set('user.profile', { roles: ['a', 'b', 'c'] });
          $store.has('user.profile').should.be.true; // jshint ignore:line
          $authentication.isAuthenticated().should.be.true; // jshint ignore:line
        })
      );

      it('should return false if user.profile is not set in the store',
        inject(function ($authentication, $store) {
          $store.remove('user.profile');
          $authentication.isAuthenticated().should.be.false; // jshint ignore:line
        })
      );

      describe('with an auth cookie required', function() {
        beforeEach(function() {
          module('authentication.service', function ($authenticationProvider) {
            $authenticationProvider.configure({
              authCookieKey: 'AUTH-COOKIE'
            });
          });
        });

        afterEach(inject(function($document) {
          // Clear cookies
          $document[0].cookie = 'AUTH-COOKIE=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
          $document[0].cookie = 'NOT-AUTH-COOKIE=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }));

        describe('that is not set', function() {
          it('should return false if user.profile is set in store',
            inject(function ($authentication, $document, $rootScope, $store) {
              sinon.spy($rootScope, '$broadcast');
              $store.set('user.profile', { roles: ['a', 'b', 'c'] });
              $store.has('user.profile').should.be.true; // jshint ignore:line
              $document[0].cookie = 'NOT-AUTH-COOKIE=Not Authorized';
              $authentication.isAuthenticated().should.be.false; // jshint ignore:line
              $store.has('user.profile').should.be.false; // jshint ignore:line
              $rootScope.$broadcast.calledWith('event:auth-logoutConfirmed');
            })
          );
        });

        describe('that is set', function() {
          it('should return false if user.profile is not set in store',
            inject(function ($authentication, $document, $store) {
              $document[0].cookie = 'AUTH-COOKIE=Authorized';
              $store.has('user.profile').should.be.false; // jshint ignore:line
              $authentication.isAuthenticated().should.be.false; // jshint ignore:line
            })
          );

          it('should return true if user.profile is set in store',
            inject(function ($authentication, $document, $store) {
              $document[0].cookie = 'AUTH-COOKIE=Authorized';
              $store.set('user.profile', { roles: ['a', 'b', 'c'] });
              $authentication.isAuthenticated().should.be.true; // jshint ignore:line
            })
          );
        });
      });
    });

    describe('loginConfirmed', function() {
      it('should broadcast auth-loginConfirmed when the user logs in',
        inject(function ($authentication, $rootScope) {
          sinon.spy($rootScope, '$broadcast');
          $authentication.loginConfirmed({ roles: ['a', 'b', 'c'] });
          $rootScope.$broadcast.calledWith('event:auth-loginConfirmed').should.be.true; // jshint ignore:line
        })
      );
    });

    describe('checkAndBroadcastLoginConfirmed', function() {
      it('should broadcast auth-loginConfirmed if the user is logged in',
        inject(function ($authentication, $rootScope, $store) {
          $store.set('user.profile', { roles: ['a', 'b', 'c'] });
          sinon.spy($rootScope, '$broadcast');
          $authentication.checkAndBroadcastLoginConfirmed();
          $rootScope.$broadcast.calledWith('event:auth-loginConfirmed').should.be.true; // jshint ignore:line
        })
      );

      it('should not broadcast anything if the user is not logged in',
        inject(function ($authentication, $rootScope, $store) {
          $store.remove('user.profile');
          sinon.spy($rootScope, '$broadcast');
          $authentication.checkAndBroadcastLoginConfirmed();
          $rootScope.$broadcast.neverCalledWith('event:auth-loginConfirmed').should.be.true; // jshint ignore:line
        })
      );
    });

    describe('loginRequired', function() {
      it('should broadcast event:auth-loginRequired',
        inject(function ($authentication, $rootScope) {
          sinon.spy($rootScope, '$broadcast');
          $authentication.loginRequired();
          $rootScope.$broadcast.calledWith('event:auth-loginRequired');
        })
      );
    });

    describe('logoutConfirmed', function() {
      it('should broadcast event:auth-logoutConfirmed when the user logs out',
        inject(function ($authentication, $rootScope) {
          sinon.spy($rootScope, '$broadcast');
          $authentication.logoutConfirmed();
          $rootScope.$broadcast.calledWith('event:auth-logoutConfirmed');
        })
      );

      it('should clear user.profile from the store',
        inject(function ($authentication, $store) {
          $store.set('user.profile', { roles: ['a', 'b', 'c'] });
          $authentication.logoutConfirmed();
          $store.has('user.profile').should.be.false; // jshint ignore:line
        })
      );
    });

    describe('profile', function() {
      it('should return the profile',
        inject(function ($authentication, $store) {
          $store.set('user.profile', 'foo');
          $authentication.profile().should.match('foo');
        })
      );
    });

    describe('allowed call', function() {
      describe('authenticated user', function() {
        var $authentication, $store;
        beforeEach(
          inject(function (_$authentication_, _$store_) {
            $authentication = _$authentication_;
            $store = _$store_;
            $store.set('user.profile', { roles: ['a', 'b', 'c'] });
          })
        );

        it('should return false if no arguments are provided', function() {
          $authentication.allowed().should.be.false; // jshint ignore:line
        });

        it('should return true if the role is ALL', function() {
          $authentication.allowed('ALL').should.be.true; // jshint ignore:line
        });

        it('should return false if the role is ANONYMOUS', function() {
          $authentication.allowed('ANONYMOUS').should.be.false; // jshint ignore:line
        });

        it('should return true if the role is in [a, b, c]', function() {
          $authentication.allowed('a').should.be.true; // jshint ignore:line
          $authentication.allowed('b').should.be.true; // jshint ignore:line
          $authentication.allowed('c').should.be.true; // jshint ignore:line
        });

        it('should return false if the role is not in [a, b, c]', function() {
          $authentication.allowed('x').should.be.false; // jshint ignore:line
          $authentication.allowed('y').should.be.false; // jshint ignore:line
          $authentication.allowed('z').should.be.false; // jshint ignore:line
        });
      });

      describe('anonymous user', function() {
        var $authentication, $store;
        beforeEach(
          inject(function (_$authentication_, _$store_) {
            $authentication = _$authentication_;
            $store = _$store_;
            $store.remove('user.profile');
          })
        );

        it('should return false if no arguments are provided', function() {
          $authentication.allowed().should.be.false; // jshint ignore:line
        });

        it('should return false if the role is ALL', function() {
          $authentication.allowed('ALL').should.be.false; // jshint ignore:line
        });

        it('should return true if the role is ANONYMOUS', function() {
          $authentication.allowed('ANONYMOUS').should.be.true; // jshint ignore:line
        });

        it('should return false if any roles are provided', function() {
          $authentication.allowed('a', 'b', 'c').should.be.false; // jshint ignore:line
        });
      });
    });

    describe('roles call', function() {
      describe('authenticated with multiple roles', function() {
        var $authentication, $store;
        beforeEach(
          inject(function (_$authentication_, _$store_) {
            $authentication = _$authentication_;
            $store = _$store_;
            $store.set('user.profile', { roles: ['a', 'b'] });
          })
        );

        it('should return the set of roles', function() {
          $authentication.roles().should.match(['a', 'b']);
        });
      });

      describe('authenticated with singular role value', function() {
        var $authentication, $store;
        beforeEach(
          inject(function (_$authentication_, _$store_) {
            $authentication = _$authentication_;
            $store = _$store_;
            $store.set('user.profile', { roles: 1 });
          })
        );

        it('should return the set of roles', function() {
          $authentication.roles().should.match([1]);
        });
      });

      describe('unauthenticated', function() {
        var $authentication, $store;
        beforeEach(
          inject(function (_$authentication_, _$store_) {
            $authentication = _$authentication_;
            $store = _$store_;
            $store.remove('user.profile');
          })
        );

        it('should return the empty set', function() {
          $authentication.roles().should.match([]);
        });
      });
    });

    describe('permit call', function() {
      describe('with no authenticated user', function() {
        it('should stay on path if permission is ANONYMOUS',
          inject(function ($authentication, $location) {
            $location.path('/about');
            $location.path().should.match('/about');
            $authentication.permit('anonymous');
            $location.path().should.match('/about');
          })
        );

        it('should navigate to the unauthenticated path if permission is ALL',
          inject(function ($authentication, $location) {
            $location.path('/about');
            $location.path().should.match('/about');
            $authentication.permit('all');
            $location.path().should.match('/unauthenticated');
          })
        );

        it('should navigate to the unauthenticated path if permission is not ANONYMOUS',
          inject(function ($authentication, $location) {
            $location.path('/about');
            $location.path().should.match('/about');
            $authentication.permit('a', 'b');
            $location.path().should.match('/unauthenticated');
          })
        );
      });

      describe('with an authenticated user', function() {
        var $authentication, $location, $store;
        beforeEach(
          inject(function (_$authentication_, _$location_, _$store_) {
            $authentication = _$authentication_;
            $location = _$location_;
            $store = _$store_;
            $store.set('user.profile', { roles: ['a', 'b', 'c'] });
          })
        );

        it('should navigate to the not permitted path if no permission matches', function() {
          $location.path('/about');
          $location.path().should.match('/about');
          $authentication.permit('d', 'e');
          $location.path().should.match('/notpermitted');
        });

        it('should navigate to the not permitted path if the permission is ANONYMOUS', function() {
          $location.path('/about');
          $location.path().should.match('/about');
          $authentication.permit('ANONYMOUS');
          $location.path().should.match('/notpermitted');
        });

        it('should stay on the path if the permission is ALL', function() {
          $location.path('/about');
          $location.path().should.match('/about');
          $authentication.permit('ALL');
          $location.path().should.match('/about');
        });

        it('should stay on the path if at least one permission matches', function() {
          $location.path('/about');
          $location.path().should.match('/about');
          $authentication.permit('a', 'd', 'e');
          $location.path().should.match('/about');
        });
      });
    });
  });
});
