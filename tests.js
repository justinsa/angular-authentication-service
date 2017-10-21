/* globals _, afterEach, beforeEach, describe, inject, it, sinon */
'use strict';
describe('$authentication', function () {
  beforeEach(
    module('authentication.service', function ($authenticationProvider) {
      $authenticationProvider.configure({
        onLoginRedirectUrl: '/dashboard',
        onLogoutRedirectUrl: '/home',
        notAuthorizedRedirectUrl: '/notpermitted',
        notAuthenticatedRedirectUrl: '/notauthenticated'
      });
    })
  );

  it('should have a list of functions',
    inject(function ($authentication) {
      var functions = [
        'isAuthenticated',
        'isAuthCookieMissing',
        'isProfileExpired',
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
        'getLastAttemptedUrl',
        'clearLastAttemptedUrl',
        'reauthenticate',
        '$onLoginConfirmed',
        '$onLoginRequired',
        '$onLogoutConfirmed',
        '$onNotAuthenticated',
        '$onNotAuthorized'
      ];
      for (var i in functions) {
        $authentication[functions[i]].should.be.a.Function();
      }
    })
  );

  it('should have an expected configuration',
    inject(function ($authentication) {
      var configuration = $authentication.getConfiguration();
      _.isUndefined(configuration.storageService).should.be.true();
      _.isUndefined(configuration.authCookieKey).should.be.true();
      configuration.profileStorageKey.should.match('$authentication.user-profile');
      configuration.lastAttemptedUrlStorageKey.should.match('$authentication.last-attempted-url');
      configuration.onLoginRedirectUrl.should.match('/dashboard');
      configuration.onLogoutRedirectUrl.should.match('/home');
      configuration.notAuthorizedRedirectUrl.should.match('/notpermitted');
      configuration.notAuthenticatedRedirectUrl.should.match('/notauthenticated');
      configuration.trackLastAttemptedUrl.should.be.true();
      configuration.userRolesProperty.should.match('roles');
      _.isUndefined(configuration.expirationProperty).should.be.true();
      configuration.rolesFunction.should.be.a.Function();
      configuration.validationFunction.should.be.a.Function();
      configuration.reauthentication.should.be.an.Object();
      configuration.reauthentication.fn.should.equal(_.noop);
      configuration.reauthentication.timeout.should.equal(1200000);
      _.isUndefined(configuration.reauthentication.timer).should.be.true();
    })
  );

  describe('isAuthCookieMissing()', function () {
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

  describe('isAuthenticated()', function () {
    it('should return true if the profile is set in the store',
      inject(function ($authentication) {
        $authentication.profile({ roles: ['a', 'b', 'c'] });
        $authentication.store().has('$authentication.user-profile').should.be.true();
        $authentication.isAuthenticated().should.be.true();
      })
    );

    it('should return false if the profile is not set in the store',
      inject(function ($authentication) {
        $authentication.store().remove('$authentication.user-profile');
        $authentication.isAuthenticated().should.be.false();
      })
    );

    describe('with an expiration property defined', function () {
      it('should return true if the profile is not expired',
        inject(function ($authentication) {
          var futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + 1);
          $authentication.getConfiguration().expirationProperty = 'expiration';
          $authentication.getConfiguration().expirationProperty.should.equal('expiration');
          $authentication.profile({ roles: ['a', 'b', 'c'], expiration: futureDate.toISOString() });
          $authentication.isAuthenticated().should.be.true();
        })
      );

      it('should return false if the profile is expired',
        inject(function ($authentication, $rootScope) {
          var pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - 1);
          sinon.spy($rootScope, '$broadcast');
          $authentication.getConfiguration().expirationProperty = 'expiration';
          $authentication.getConfiguration().expirationProperty.should.equal('expiration');
          $authentication.profile({ roles: ['a', 'b', 'c'], expiration: pastDate.toISOString() });
          $authentication.isAuthenticated().should.be.false();
          $rootScope.$broadcast.calledOnce.should.be.true();
          $rootScope.$broadcast.calledWithExactly('event:auth-logoutConfirmed').should.be.true();
        })
      );
    });
    
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
        it('should return false if the profile is set in store',
          inject(function ($authentication, $document, $rootScope) {
            sinon.spy($rootScope, '$broadcast');
            $authentication.profile({ roles: ['a', 'b', 'c'] });
            $document[0].cookie = 'NOT-AUTH-COOKIE=Not Authorized;';
            $authentication.isAuthenticated().should.be.false();
            $authentication.store().has('$authentication.user-profile').should.be.false();
            $rootScope.$broadcast.calledWith('event:auth-logoutConfirmed');
          })
        );
      });

      describe('that is set', function () {
        it('should return false if the profile is not set in store',
          inject(function ($authentication, $document) {
            $document[0].cookie = 'AUTH-COOKIE=Authorized;';
            $authentication.store().has('$authentication.user-profile').should.be.false();
            $authentication.isAuthenticated().should.be.false();
          })
        );

        it('should return true if the profile is set in store',
          inject(function ($authentication, $document) {
            $document[0].cookie = 'AUTH-COOKIE=Authorized;';
            $authentication.profile({ roles: ['a', 'b', 'c'] });
            $authentication.isAuthenticated().should.be.true();
          })
        );
      });
    });
  });

  describe('isProfileExpired()', function () {
    it('should return false if the profile is not set and the expiration property is not set',
      inject(function ($authentication) {
        $authentication.store().remove('$authentication.user-profile');
        $authentication.isProfileExpired().should.be.false();
      })
    );

    it('should return false if the profile is not set and the expiration property is set',
      inject(function ($authentication) {
        $authentication.store().remove('$authentication.user-profile');
        $authentication.getConfiguration().expirationProperty = 'expiration';
        $authentication.getConfiguration().expirationProperty.should.equal('expiration');
        $authentication.isProfileExpired().should.be.false();
      })
    );

    describe('with an existing profile and no matching expiration property', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.profile({ roles: ['a', 'b', 'c'] });
        })
      );

      it('should return false if the expiration property is not set', function () {
        _.isUndefined($authentication.getConfiguration().expirationProperty).should.be.true();
        $authentication.isProfileExpired().should.be.false();
      });

      it('should return false if the expiration property is set to null', function () {
        $authentication.getConfiguration().expirationProperty = null;
        _.isNull($authentication.getConfiguration().expirationProperty).should.be.true();
        $authentication.isProfileExpired().should.be.false();
      });

      it('should return false if the expiration property is set to a value that the profile does not have', function () {
        $authentication.getConfiguration().expirationProperty = 'expiration';
        $authentication.getConfiguration().expirationProperty.should.equal('expiration');
        $authentication.isProfileExpired().should.be.false();
      });
    });

    describe('with an existing profile and matching expiration property', function () {
      var $authentication;
      beforeEach(function () {
        module('authentication.service', function ($authenticationProvider) {
          $authenticationProvider.configure({
            expirationProperty: 'expiration'
          });
        });
      });
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
        })
      );

      it('should return false if it is not set', function () {
        $authentication.profile({ roles: ['a', 'b', 'c'], expiration: undefined });
        $authentication.isProfileExpired().should.be.false();
      });

      it('should return false if it is null', function () {
        $authentication.profile({ roles: ['a', 'b', 'c'], expiration: null });
        $authentication.isProfileExpired().should.be.false();
      });

      it('should return false if it is not of a valid type', function () {
        $authentication.profile({ roles: ['a', 'b', 'c'], expiration: {} });
        $authentication.isProfileExpired().should.be.false();
        $authentication.profile({ roles: ['a', 'b', 'c'], expiration: [] });
        $authentication.isProfileExpired().should.be.false();
        $authentication.profile({ roles: ['a', 'b', 'c'], expiration: true });
        $authentication.isProfileExpired().should.be.false();
        $authentication.profile({ roles: ['a', 'b', 'c'], expiration: 0 });
        $authentication.isProfileExpired().should.be.false();
      });

      it('should return false if it is in the future', function () {
        var futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        $authentication.profile({ roles: ['a', 'b', 'c'], expiration: futureDate });
        $authentication.isProfileExpired().should.be.false();
      });

      it('should return true if it is in the past', function () {
        var pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        $authentication.profile({ roles: ['a', 'b', 'c'], expiration: pastDate });
        $authentication.isProfileExpired().should.be.true();
      });
    });
  });

  describe('loginConfirmed()', function () {
    it('should broadcast auth-loginConfirmed when the user logs in',
      inject(function ($authentication, $rootScope) {
        sinon.spy($rootScope, '$broadcast');
        $authentication.loginConfirmed({ roles: ['a'] });
        $rootScope.$broadcast.calledWith('event:auth-loginConfirmed').should.be.true();
      })
    );

    it('should navigate to the onLoginRedirectUrl when the user logs in', 
      inject(function ($authentication, $location) {
        $location.url('/home');
        $location.url().should.match('/home');
        $authentication.loginConfirmed({ roles: ['a'] });
        $location.url().should.match('/dashboard');
      })
    );

    it('should navigate to the lastAttemptedUrl, if set, when the user logs in', 
      inject(function ($authentication, $location) {
        $location.url('/home');
        $location.url().should.match('/home');
        $authentication.store().set($authentication.getConfiguration().lastAttemptedUrlStorageKey, '/last-attempted-url');
        $authentication.getLastAttemptedUrl().should.equal('/last-attempted-url');
        $authentication.loginConfirmed({ roles: ['a'] });
        $location.url().should.match('/last-attempted-url');
      })
    );

    it('should navigate to the onLoginRedirectUrl if trackLastAttemptedUrl is false when the user logs in', 
      inject(function ($authentication, $location) {
        $location.url('/home');
        $location.url().should.match('/home');
        $authentication.store().set($authentication.getConfiguration().lastAttemptedUrlStorageKey, '/last-attempted-url');
        $authentication.getLastAttemptedUrl().should.equal('/last-attempted-url');
        $authentication.getConfiguration().trackLastAttemptedUrl = false;
        $authentication.loginConfirmed({ roles: ['a'] });
        $location.url().should.match('/dashboard');
      })
    );
  });

  describe('checkAndBroadcastLoginConfirmed', function () {
    it('should broadcast auth-loginConfirmed if the user is logged in',
      inject(function ($authentication, $rootScope) {
        $authentication.profile({ roles: ['a'] });
        sinon.spy($rootScope, '$broadcast');
        $authentication.checkAndBroadcastLoginConfirmed();
        $rootScope.$broadcast.calledWith('event:auth-loginConfirmed').should.be.true();
      })
    );

    it('should not broadcast anything if the user is not logged in',
      inject(function ($authentication, $rootScope) {
        $authentication.store().remove('$authentication.user-profile');
        sinon.spy($rootScope, '$broadcast');
        $authentication.checkAndBroadcastLoginConfirmed();
        $rootScope.$broadcast.neverCalledWith('event:auth-loginConfirmed').should.be.true();
      })
    );
  });

  describe('loginRequired()', function () {
    it('should broadcast event:auth-loginRequired',
      inject(function ($authentication, $rootScope) {
        sinon.spy($rootScope, '$broadcast');
        $authentication.loginRequired();
        $rootScope.$broadcast.calledWith('event:auth-loginRequired');
      })
    );
  });

  describe('logoutConfirmed()', function () {
    it('should broadcast event:auth-logoutConfirmed when the user logs out',
      inject(function ($authentication, $rootScope) {
        sinon.spy($rootScope, '$broadcast');
        $authentication.logoutConfirmed();
        $rootScope.$broadcast.calledWith('event:auth-logoutConfirmed');
      })
    );

    it('should clear the profile from the store',
      inject(function ($authentication) {
        $authentication.profile({ roles: ['a', 'b', 'c'] });
        $authentication.logoutConfirmed();
        $authentication.store().has('$authentication.user-profile').should.be.false();
      })
    );

    it('should navigate to the onLogoutRedirectUrl when the user logs out', 
      inject(function ($authentication, $location) {
        $authentication.profile({ roles: ['a', 'b', 'c'] });
        $location.url('/dashboard/?a=b#anchor');
        $location.url().should.match('/dashboard/?a=b#anchor');
        $authentication.logoutConfirmed();
        $location.url().should.match('/home');
      })
    );

    it('should navigate to the lastAttemptedUrl, if set, when the user logs out', 
      inject(function ($authentication, $location) {
        $location.url('/home');
        $location.url().should.match('/home');
        $authentication.profile({ roles: ['a', 'b', 'c'] });
        $authentication.store().set($authentication.getConfiguration().lastAttemptedUrlStorageKey, '/last-attempted-url');
        $authentication.getLastAttemptedUrl().should.equal('/last-attempted-url');
        $authentication.logoutConfirmed();
        $location.url().should.match('/last-attempted-url');
      })
    );

    it('should navigate to the onLogoutRedirectUrl if trackLastAttemptedUrl is false when the user logs out', 
      inject(function ($authentication, $location) {
        $location.url('/dashboard');
        $location.url().should.match('/dashboard');
        $authentication.profile({ roles: ['a', 'b', 'c'] });
        $authentication.store().set($authentication.getConfiguration().lastAttemptedUrlStorageKey, '/last-attempted-url');
        $authentication.getLastAttemptedUrl().should.equal('/last-attempted-url');
        $authentication.getConfiguration().trackLastAttemptedUrl = false;
        $authentication.logoutConfirmed();
        $location.url().should.match('/home');
      })
    );
  });

  describe('profile()', function () {
    it('should return the profile',
      inject(function ($authentication) {
        $authentication.profile('foo');
        $authentication.profile().should.match('foo');
      })
    );
  });

  describe('allowed()', function () {
    describe('authenticated user', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.profile({ roles: ['a', 'b', 'c'] });
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

      it('should return true if the roles are nested', function () {
        $authentication.allowed('x', ['y', ['z', 'a']]).should.be.true();
      });
    });

    describe('anonymous user', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.store().remove('$authentication.user-profile');
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

  describe('roles()', function () {
    describe('authenticated with multiple roles', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.profile({ roles: ['a', 'b'] });
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
          $authentication.profile({ roles: 1 });
        })
      );

      it('should return the set of roles', function () {
        $authentication.roles().should.match([1]);
      });
    });

    describe('notauthenticated', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.store().remove('$authentication.user-profile');
        })
      );

      it('should return the empty set', function () {
        $authentication.roles().should.match([]);
      });
    });
  });

  describe('isInAllRoles()', function () {
    describe('authenticated', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.profile({ roles: ['a', 'b'] });
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

      it('should return true even if the roles are nested', function () {
        $authentication.isInAllRoles('a', [['b']]).should.be.true();
      });
    });

    describe('not authenticated', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.store().remove('$authentication.user-profile');
        })
      );

      it('should return false', function () {
        $authentication.isInAllRoles().should.be.false();
        $authentication.isInAllRoles('a').should.be.false();
      });
    });
  });

  describe('isInAnyRoles()', function () {
    describe('authenticated', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.profile({ roles: ['a', 'b'] });
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

      it('should return true even if the roles are nested', function () {
        $authentication.isInAnyRoles('x', ['y', ['b']]).should.be.true();
      });
    });

    describe('not authenticated', function () {
      var $authentication;
      beforeEach(
        inject(function (_$authentication_) {
          $authentication = _$authentication_;
          $authentication.store().remove('$authentication.user-profile');
        })
      );

      it('should return false', function () {
        $authentication.isInAnyRoles().should.be.false();
        $authentication.isInAnyRoles('a').should.be.false();
      });
    });
  });

  describe('permit()', function () {
    describe('with no authenticated user', function () {
      it('should stay on url if permission is ANONYMOUS',
        inject(function ($authentication, $location) {
          $location.url('/about');
          $location.url().should.match('/about');
          $authentication.permit('anonymous');
          $location.url().should.match('/about');
        })
      );

      it('should navigate to the not authenticated url if permission is ALL',
        inject(function ($authentication, $location) {
          $location.url('/about');
          $location.url().should.match('/about');
          $authentication.permit('all');
          $location.url().should.match('/notauthenticated');
        })
      );

      it('should navigate to the not authenticated url if permission is not ANONYMOUS',
        inject(function ($authentication, $location) {
          $location.url('/about');
          $location.url().should.match('/about');
          $authentication.permit('a', 'b');
          $location.url().should.match('/notauthenticated');
        })
      );

      it('should broadcast a not authenticated event if user is not authenticated when required to be authenticated',
        inject(function ($authentication, $rootScope) {
          sinon.spy($rootScope, '$broadcast');
          $authentication.permit('a', 'b');
          $rootScope.$broadcast.calledOnce.should.be.true();
          $rootScope.$broadcast.calledWithExactly('event:auth-notAuthenticated', ['a', 'b']).should.be.true();
        })
      );

      it('should store the last attempted url when the user gets redirected for authentication',
        inject(function ($authentication, $location) {
          $location.url('/about?a=b#anchor-tag');
          $location.url().should.match('/about?a=b#anchor-tag');
          $authentication.permit('a', 'b');
          $location.url().should.match('/notauthenticated');
          $authentication.getLastAttemptedUrl().should.equal('/about?a=b#anchor-tag');
        })
      );
    });

    describe('with an authenticated user', function () {
      var $authentication, $location;
      beforeEach(
        inject(function (_$authentication_, _$location_) {
          $authentication = _$authentication_;
          $location = _$location_;
          $authentication.profile({ roles: ['a', 'b', 'c'] });
        })
      );

      it('should navigate to the not permitted url if no permission matches', function () {
        $location.url('/about');
        $location.url().should.match('/about');
        $authentication.permit('d', 'e');
        $location.url().should.match('/notpermitted');
      });

      it('should navigate to the not permitted url if the permission is ANONYMOUS', function () {
        $location.url('/about');
        $location.url().should.match('/about');
        $authentication.permit('ANONYMOUS');
        $location.url().should.match('/notpermitted');
      });

      it('should stay on the url if the permission is ALL', function () {
        $location.url('/about');
        $location.url().should.match('/about');
        $authentication.permit('ALL');
        $location.url().should.match('/about');
      });

      it('should stay on the url if at least one permission matches', function () {
        $location.url('/about');
        $location.url().should.match('/about');
        $authentication.permit('a', 'd', 'e');
        $location.url().should.match('/about');
      });

      it('should work with nested roles', function () {
        $location.url('/about');
        $location.url().should.match('/about');
        $authentication.permit('d', 'e', ['c']);
        $location.url().should.match('/about');
      });

      it('should broadcast a not authorized event if user is not authorized to access a location',
        inject(function ($authentication, $rootScope) {
          sinon.spy($rootScope, '$broadcast');
          $authentication.permit('ANONYMOUS');
          $rootScope.$broadcast.calledOnce.should.be.true();
          $rootScope.$broadcast.calledWithExactly('event:auth-notAuthorized', ['ANONYMOUS']).should.be.true();
        })
      );
    });

    describe('reauthenticate()', function() {
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
