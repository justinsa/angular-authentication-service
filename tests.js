/* globals afterEach, beforeEach, describe, inject, it, sinon */
'use strict';
describe('$authentication', function () {
  beforeEach(
    module('authentication.service', function ($authenticationProvider) {
      $authenticationProvider.configure({
        onLoginRedirectPath: '/dashboard',
        onLogoutRedirectPath: '/home',
        notPermittedRedirectPath: '/notpermitted',
        unauthenticatedRedirectPath: '/unauthenticated'
      });
    })
  );

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
        'isInAllRoles',
        'isInAnyRoles',
        'permit',
        'getConfiguration',
        'reauthenticate'
      ];
      for (var i in functions) {
        $authentication[functions[i]].should.be.a.Function();
      }
    })
  );

  it('should have an expected configuration',
    inject(function ($authentication) {
      var configuration = $authentication.getConfiguration();
      (configuration.storageService === undefined).should.be.true();
      (configuration.authCookieKey === undefined).should.be.true();
      configuration.profileStorageKey.should.match('user.profile');
      configuration.onLoginRedirectPath.should.match('/dashboard');
      configuration.onLogoutRedirectPath.should.match('/home');
      configuration.notPermittedRedirectPath.should.match('/notpermitted');
      configuration.unauthenticatedRedirectPath.should.match('/unauthenticated');
      configuration.userRolesProperty.should.match('roles');
      configuration.rolesFunction.should.be.a.Function();
      configuration.validationFunction.should.be.a.Function();
    })
  );

  describe('isAuthCookieMissing', function () {
    afterEach(inject(function($document) {
      // Clear cookies
      $document[0].cookie = 'AUTH-COOKIE=;expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      $document[0].cookie = 'PRE-AUTH-COOKIE=;expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      $document[0].cookie = 'POST-AUTH-COOKIE=;expires=Thu, 01 Jan 1970 00:00:00 GMT;';
    }));

    describe('where cookie is not required', function () {
      it ('should return false if auth cookie is not set',
        inject(function ($authentication) {
          $authentication.isAuthCookieMissing().should.be.false();
        })
      );

      it ('should return false if auth cookie is set',
        inject(function ($authentication, $document) {
          $document[0].cookie = 'AUTH-COOKIE=Authorized;';
          $authentication.isAuthCookieMissing().should.be.false();
        })
      );
    });

    describe('where cookie is required', function () {
      beforeEach(function () {
        module('authentication.service', function ($authenticationProvider) {
          $authenticationProvider.configure({
            authCookieKey: 'AUTH-COOKIE'
          });
        });
      });

      it ('should return true if auth cookie is not set',
        inject(function ($authentication) {
          $authentication.isAuthCookieMissing().should.be.true();
        })
      );

      it ('should return false if auth cookie is set',
        inject(function ($authentication, $document) {
          $document[0].cookie = 'AUTH-COOKIE=Authorized;';
          $authentication.isAuthCookieMissing().should.be.false();
        })
      );

      it ('should return false if auth cookie is set with other cookies',
        inject(function ($authentication, $document) {
          $document[0].cookie = 'PRE-AUTH-COOKIE=Not Authorized;';
          $document[0].cookie = 'AUTH-COOKIE=Authorized;';
          $document[0].cookie = 'POST-AUTH-COOKIE=Not Authorized;';
          $authentication.isAuthCookieMissing().should.be.false();
        })
      );
    });
  });

  describe('isAuthenticated', function () {
    it('should return true if user.profile is set in the store',
      inject(function ($authentication) {
        $authentication.store().set('user.profile', { roles: ['a', 'b', 'c'] });
        $authentication.store().has('user.profile').should.be.true();
        $authentication.isAuthenticated().should.be.true();
      })
    );

    it('should return false if user.profile is not set in the store',
      inject(function ($authentication) {
        $authentication.store().remove('user.profile');
        $authentication.isAuthenticated().should.be.false();
      })
    );

    describe('with an auth cookie required', function () {
      beforeEach(function () {
        module('authentication.service', function ($authenticationProvider) {
          $authenticationProvider.configure({
            authCookieKey: 'AUTH-COOKIE'
          });
        });
      });

      afterEach(inject(function($document) {
        // Clear cookies
        $document[0].cookie = 'AUTH-COOKIE=;expires=Thu, 01 Jan 1970 00:00:00 GMT;';
        $document[0].cookie = 'NOT-AUTH-COOKIE=;expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      }));

      describe('that is not set', function () {
        it('should return false if user.profile is set in store',
          inject(function ($authentication, $document, $rootScope) {
            sinon.spy($rootScope, '$broadcast');
            $authentication.store().set('user.profile', { roles: ['a', 'b', 'c'] });
            $authentication.store().has('user.profile').should.be.true();
            $document[0].cookie = 'NOT-AUTH-COOKIE=Not Authorized;';
            $authentication.isAuthenticated().should.be.false();
            $authentication.store().has('user.profile').should.be.false();
            $rootScope.$broadcast.calledWith('event:auth-logoutConfirmed');
          })
        );
      });

      describe('that is set', function () {
        it('should return false if user.profile is not set in store',
          inject(function ($authentication, $document) {
            $document[0].cookie = 'AUTH-COOKIE=Authorized;';
            $authentication.store().has('user.profile').should.be.false();
            $authentication.isAuthenticated().should.be.false();
          })
        );

        it('should return true if user.profile is set in store',
          inject(function ($authentication, $document) {
            $document[0].cookie = 'AUTH-COOKIE=Authorized;';
            $authentication.store().set('user.profile', { roles: ['a', 'b', 'c'] });
            $authentication.isAuthenticated().should.be.true();
          })
        );
      });
    });
  });

  describe('loginConfirmed', function () {
    it('should broadcast auth-loginConfirmed when the user logs in',
      inject(function ($authentication, $rootScope) {
        sinon.spy($rootScope, '$broadcast');
        $authentication.loginConfirmed({ roles: ['a'] });
        $rootScope.$broadcast.calledWith('event:auth-loginConfirmed').should.be.true();
      })
    );

    it('should navigate to the onLoginRedirectPath when the user logs in', 
      inject(function ($authentication, $location) {
        $location.path('/home');
        $location.path().should.match('/home');
        $authentication.loginConfirmed({ roles: ['a'] });
        $location.path().should.match('/dashboard');
      })
    );
  });

  describe('checkAndBroadcastLoginConfirmed', function () {
    it('should broadcast auth-loginConfirmed if the user is logged in',
      inject(function ($authentication, $rootScope) {
        $authentication.store().set('user.profile', { roles: ['a'] });
        sinon.spy($rootScope, '$broadcast');
        $authentication.checkAndBroadcastLoginConfirmed();
        $rootScope.$broadcast.calledWith('event:auth-loginConfirmed').should.be.true();
      })
    );

    it('should not broadcast anything if the user is not logged in',
      inject(function ($authentication, $rootScope) {
        $authentication.store().remove('user.profile');
        sinon.spy($rootScope, '$broadcast');
        $authentication.checkAndBroadcastLoginConfirmed();
        $rootScope.$broadcast.neverCalledWith('event:auth-loginConfirmed').should.be.true();
      })
    );
  });

  describe('loginRequired', function () {
    it('should broadcast event:auth-loginRequired',
      inject(function ($authentication, $rootScope) {
        sinon.spy($rootScope, '$broadcast');
        $authentication.loginRequired();
        $rootScope.$broadcast.calledWith('event:auth-loginRequired');
      })
    );
  });

  describe('logoutConfirmed', function () {
    it('should broadcast event:auth-logoutConfirmed when the user logs out',
      inject(function ($authentication, $rootScope) {
        sinon.spy($rootScope, '$broadcast');
        $authentication.logoutConfirmed();
        $rootScope.$broadcast.calledWith('event:auth-logoutConfirmed');
      })
    );

    it('should clear user.profile from the store',
      inject(function ($authentication) {
        $authentication.store().set('user.profile', { roles: ['a', 'b', 'c'] });
        $authentication.logoutConfirmed();
        $authentication.store().has('user.profile').should.be.false();
      })
    );

    it('should navigate to the onLogoutRedirectPath when the user logs out', 
      inject(function ($authentication, $location) {
        $authentication.store().set('user.profile', { roles: ['a', 'b', 'c'] });
        $location.path('/dashboard');
        $location.path().should.match('/dashboard');
        $authentication.logoutConfirmed();
        $location.path().should.match('/home');
      })
    );
  });

  describe('profile', function () {
    it('should return the profile',
      inject(function ($authentication) {
        $authentication.store().set('user.profile', 'foo');
        $authentication.profile().should.match('foo');
      })
    );
  });

  describe('allowed call', function () {
    describe('authenticated user', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.store().set('user.profile', { roles: ['a', 'b', 'c'] });
        })
      );

      it('should return false if no arguments are provided', function () {
        $authentication.allowed().should.be.false();
      });

      it('should return true if the role is ALL', function () {
        $authentication.allowed('ALL').should.be.true();
      });

      it('should return false if the role is ANONYMOUS', function () {
        $authentication.allowed('ANONYMOUS').should.be.false();
      });

      it('should return true if the role is in [a, b, c]', function () {
        $authentication.allowed('a').should.be.true();
        $authentication.allowed('b').should.be.true();
        $authentication.allowed('c').should.be.true();
      });

      it('should return false if the role is not in [a, b, c]', function () {
        $authentication.allowed('x').should.be.false();
        $authentication.allowed('y').should.be.false();
        $authentication.allowed('z').should.be.false();
      });
    });

    describe('anonymous user', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.store().remove('user.profile');
        })
      );

      it('should return false if no arguments are provided', function () {
        $authentication.allowed().should.be.false();
      });

      it('should return false if the role is ALL', function () {
        $authentication.allowed('ALL').should.be.false();
      });

      it('should return true if the role is ANONYMOUS', function () {
        $authentication.allowed('ANONYMOUS').should.be.true();
      });

      it('should return false if any roles are provided', function () {
        $authentication.allowed('a', 'b', 'c').should.be.false();
      });
    });
  });

  describe('roles call', function () {
    describe('authenticated with multiple roles', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.store().set('user.profile', { roles: ['a', 'b'] });
        })
      );

      it('should return the set of roles', function () {
        $authentication.roles().should.match(['a', 'b']);
      });
    });

    describe('authenticated with singular role value', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.store().set('user.profile', { roles: 1 });
        })
      );

      it('should return the set of roles', function () {
        $authentication.roles().should.match([1]);
      });
    });

    describe('unauthenticated', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.store().remove('user.profile');
        })
      );

      it('should return the empty set', function () {
        $authentication.roles().should.match([]);
      });
    });
  });

  describe('isInAllRoles call', function () {
    describe('authenticated', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.store().set('user.profile', { roles: ['a', 'b'] });
        })
      );

      it('should return false if user has none of the specified roles', function () {
        $authentication.isInAllRoles().should.be.false();
        $authentication.isInAllRoles('c').should.be.false();
        $authentication.isInAllRoles('c', 'd').should.be.false();
      });

      it('should return false if user has some, but not all, of the roles', function () {
        $authentication.isInAllRoles('a', 'c').should.be.false();
        $authentication.isInAllRoles('a', 'b', 'c').should.be.false();
      });

      it('should return true if user has all of the roles', function () {
        $authentication.isInAllRoles('a').should.be.true();
        $authentication.isInAllRoles('a', 'b').should.be.true();
      });
    });

    describe('unauthenticated', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.store().remove('user.profile');
        })
      );

      it('should return false', function () {
        $authentication.isInAllRoles().should.be.false();
        $authentication.isInAllRoles('a').should.be.false();
      });
    });
  });

  describe('isInAnyRoles call', function () {
    describe('authenticated', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.store().set('user.profile', { roles: ['a', 'b'] });
        })
      );

      it('should return false if user has none of the specified roles', function () {
        $authentication.isInAnyRoles().should.be.false();
        $authentication.isInAnyRoles('c').should.be.false();
        $authentication.isInAnyRoles('c', 'd').should.be.false();
      });

      it('should return true if user has some, but not all, of the roles', function () {
        $authentication.isInAnyRoles('a', 'c').should.be.true();
        $authentication.isInAnyRoles('a', 'b', 'c').should.be.true();
      });

      it('should return true if user has all of the roles', function () {
        $authentication.isInAnyRoles('a').should.be.true();
        $authentication.isInAnyRoles('a', 'b').should.be.true();
      });
    });

    describe('unauthenticated', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.store().remove('user.profile');
        })
      );

      it('should return false', function () {
        $authentication.isInAnyRoles().should.be.false();
        $authentication.isInAnyRoles('a').should.be.false();
      });
    });
  });

  describe('permit call', function () {
    describe('with no authenticated user', function () {
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

    describe('with an authenticated user', function () {
      var $authentication, $location;
      beforeEach(
        inject(function (_$authentication_, _$location_) {
          $authentication = _$authentication_;
          $location = _$location_;
          $authentication.store().set('user.profile', { roles: ['a', 'b', 'c'] });
        })
      );

      it('should navigate to the not permitted path if no permission matches', function () {
        $location.path('/about');
        $location.path().should.match('/about');
        $authentication.permit('d', 'e');
        $location.path().should.match('/notpermitted');
      });

      it('should navigate to the not permitted path if the permission is ANONYMOUS', function () {
        $location.path('/about');
        $location.path().should.match('/about');
        $authentication.permit('ANONYMOUS');
        $location.path().should.match('/notpermitted');
      });

      it('should stay on the path if the permission is ALL', function () {
        $location.path('/about');
        $location.path().should.match('/about');
        $authentication.permit('ALL');
        $location.path().should.match('/about');
      });

      it('should stay on the path if at least one permission matches', function () {
        $location.path('/about');
        $location.path().should.match('/about');
        $authentication.permit('a', 'd', 'e');
        $location.path().should.match('/about');
      });
    });

    describe('reauthenticate', function() {
      var $authentication, configuration;

      beforeEach(module(function($authenticationProvider) {
        configuration = {
          profileStorageKey: 'foo',
          reauthentication: {
            fn: sinon.spy(),
            timeoute: 100
          }
        };
        $authenticationProvider.configure(configuration);
      }));

      beforeEach(inject(function (_$authentication_) {
        $authentication = _$authentication_;
      }));

      describe('without authenticated user', function () {
        beforeEach(inject(function () {
          $authentication.store().set('foo', null);
        }));

        it('should not have a registered callback', function () {
          (configuration.reauthentication.timer === undefined).should.be.true();
        });

        it('should not call reauthentication.fn if the user is not authenticated', function () {
          $authentication.reauthenticate();
          configuration.reauthentication.fn.called.should.be.false();
        });
      });

      describe('with authenticated user', function () {
        beforeEach(inject(function () {
          $authentication.store().set('foo', 'not null');
        }));

        it('should call reauthentication.fn if the user is authenticated', function () {
          $authentication.reauthenticate();
          configuration.reauthentication.fn.called.should.be.true();
        });

        it('should register a callback', function () {
          (configuration.reauthentication.timer === undefined).should.be.true();
          $authentication.reauthenticate();
          (configuration.reauthentication.timer !== undefined).should.be.true();
        });
      });

      describe('on logout', function() {
        beforeEach(function () {
          $authentication.store().set('foo', 'not null');
        });

        it('should unregister the interval', function () {
          (configuration.reauthentication.timer === undefined).should.be.true();
          $authentication.reauthenticate();
          (configuration.reauthentication.timer !== undefined).should.be.true();
          $authentication.logoutConfirmed();
          (configuration.reauthentication.timer === undefined).should.be.true();
        });
      });
    });
  });
});
