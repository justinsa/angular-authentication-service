/* globals define, module */
(function (root, factory) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) {
    factory(
      typeof _ === 'undefined' ? require('lodash') : root._,
      typeof angular === 'undefined' ? require('angular') : root.angular
    );
    module.exports = 'ng-authentication-service';
  } else if (typeof define === 'function' && define.amd) {
    define(['lodash', 'angular'], factory);
  } else {
    factory(root._, root.angular);
  }
}(this, function (_, angular, undefined) {
  'use strict';
  angular.module('authentication.service', []).provider('$authentication', function () {
    var configuration = {
      authCookieKey: undefined,
      storageService: undefined,
      profileStorageKey: '$authentication.user-profile',
      lastAttemptedUrlStorageKey: '$authentication.last-attempted-url',
      onLoginRedirectUrl: '/',
      onLogoutRedirectUrl: '/',
      notAuthorizedRedirectUrl: '/',
      notAuthenticatedRedirectUrl: '/',
      trackLastAttemptedUrl: true,
      userRolesProperty: 'roles',
      expirationProperty: undefined,
      extensions: undefined,
      events: {
        loginConfirmed: 'event:auth-loginConfirmed',
        loginRequired: 'event:auth-loginRequired',
        logoutConfirmed: 'event:auth-logoutConfirmed',
        notAuthenticated: 'event:auth-notAuthenticated',
        notAuthorized: 'event:auth-notAuthorized'
      },
      rolesFunction: function (userProfile) {
        if (_.has(userProfile, this.userRolesProperty)) {
          var roles = userProfile[this.userRolesProperty];
          return _.isArray(roles) ? roles : [roles];
        }
        return [];
      },
      validationFunction: function (userRoles, allowedRoles) {
        return !_.isEmpty(userRoles) && !_.isEmpty(allowedRoles) &&
          (_.find(allowedRoles, function (role) { return _.includes(userRoles, role); }) !== undefined);
      },
      reauthentication: {
        fn: _.noop,
        timeout: 1200000,
        timer: undefined
      }
    };

    this.configure = function (options) {
      configuration = _.defaults(options, configuration);
    };

    this.$get = [
    '$document', '$injector', '$location', '$log', '$rootScope', '$window',
    function ($document, $injector, $location, $log, $rootScope, $window) {
      var storeService;
      var storageService = function () {
        if (storeService === undefined) {
          if (!_.isString(configuration.storageService)) {
            // Use a simple, in-memory storage option
            storeService = {
              dictionary: {},
              get: function (key) {
                return this.dictionary[key];
              },
              has: function (key) {
                return !_.isNil(this.get(key));
              },
              remove: function (key) {
                delete this.dictionary[key];
              },
              set: function (key, value) {
                this.dictionary[key] = value;
                return this.dictionary[key];
              }
            };
            return storeService;
          }
          if (!$injector.has(configuration.storageService)) {
            $log.error('No matching service registered in Angular: ', configuration.storageService);
            return undefined;
          }
          storeService = $injector.get(configuration.storageService);
          _.each(['get', 'has', 'remove', 'set'], function (methodName) {
            if (!_.has(storeService, methodName)) {
              $log.error('storageService is missing method: ', methodName);
              return undefined;
            }
          });
        }
        return storeService;
      };
      var compact = function (array) {
        return _.flattenDeep(array);
      };

      var api = {
        /**
         * returns true if there is a user profile in storage.
         */
        isAuthenticated: function () {
          var hasProfile = storageService().has(configuration.profileStorageKey);
          if (this.isAuthCookieMissing() || this.isProfileExpired()) {
            if (hasProfile) {
              // The profile exists and either it is expired or the cookie is absent / expired.
              // Clear the profile and broadcast logout to ensure the app updates completely.
              // Set the doNotRedirect flag to prevent a $location change during logout.
              this.logoutConfirmed(true);
              hasProfile = false;
            }
          }
          return hasProfile;
        },

        /**
         * returns true if the auth cookie is required and not present.
         */
        isAuthCookieMissing: function () {
          var key = configuration.authCookieKey;
          if (_.isString(key) && !_.isEmpty(key)) {
            key += '=';
            var cookies = $document[0].cookie.split(';');
            return !_.some(cookies, function (cookie) {
              // A cookie is considered deleted in 2 cases:
              //   1. the cookie does not exist
              //   2. the cookie is set to no value
              if (_.isString(cookie)) {
                cookie = cookie.trim();
                return _.startsWith(cookie, key) && cookie !== key;
              }
              return false;
            });
          }
          return false;
        },

        /**
         * returns true if there is a user profile and it has an expiration value in the past.
         */
        isProfileExpired: function () {
          var profile = this.profile(), expirationDate, expirationValue;
          if (_.isNil(profile)) {
            return false;
          }
          expirationValue = profile[configuration.expirationProperty];
          if (_.isString(expirationValue)) {
            expirationDate = Date.parse(expirationValue);
          } else if (_.isDate(expirationValue)) {
            expirationDate = expirationValue;
          }
          if (_.isNil(expirationDate)) {
            // A null or undefined value for the expirationDate indicates the expiration is to be ignored;
            // either the expiration value is of an unexpected type or that while the configuration is defining
            // the property for expiration, the application is not actually setting it.
            return false;
          }
          return expirationDate < Date.now();
        },

        /**
         * call this function to indicate that authentication was successful.
         * @param data an optional argument to pass on to $broadcast which may be useful for
         * example if you need to pass through details of the user that was logged in.
         */
        loginConfirmed: function (data) {
          var targetUrl = this.getLastAttemptedUrl(configuration.onLoginRedirectUrl);
          storageService().set(configuration.profileStorageKey, data);
          configuration.reauthentication.timer = setInterval(configuration.reauthentication.fn, configuration.reauthentication.timeout);
          $rootScope.$broadcast(configuration.events.loginConfirmed, data);
          if (_.isString(targetUrl)) {
            $location.url(targetUrl);
          }
        },

        /**
         * call this function to check whether a current user is logged in
         * and to broadcast the auth-loginConfirmed event, if so. This allows
         * directives to load an initial state without duplicating code.
         */
        checkAndBroadcastLoginConfirmed: function () {
          if (this.isAuthenticated()) {
            $rootScope.$broadcast(configuration.events.loginConfirmed, this.profile());
          }
        },

        /**
         * call this function to indicate that authentication is required.
         */
        loginRequired: function () {
          $rootScope.$broadcast(configuration.events.loginRequired);
        },

        /**
         * call this function to indicate that unauthentication is required.
         * @param doNotRedirect flag to indicate whether to skip logout redirection
         */
        logoutConfirmed: function (doNotRedirect) {
          var targetUrl = this.getLastAttemptedUrl(configuration.onLogoutRedirectUrl);
          storageService().remove(configuration.profileStorageKey);
          $window.clearInterval(configuration.reauthentication.timer);
          configuration.reauthentication.timer = undefined;
          $rootScope.$broadcast(configuration.events.logoutConfirmed);
          if (doNotRedirect !== true && _.isString(targetUrl)) {
            $location.url(targetUrl);
          }
        },

        /**
         * call this function to determine if a user is permitted by the roles provided.
         * 'all' is a special case role that will return true for all authenticated users.
         * 'anonymous' is a special case role that will return true for an unauthenticated user.
         */
        allowed: function () {
          var args = compact(arguments);
          var authenticated = this.isAuthenticated();
          // handle 'all' and 'anonymous' special cases
          if (args.length === 1 && _.isString(args[0])) {
            if (args[0].toUpperCase() === 'ALL') {
              return authenticated;
            }
            if (args[0].toUpperCase() === 'ANONYMOUS') {
              return !authenticated;
            }
          }
          // handle generic case of a list of defined roles
          if (args.length === 0 || !authenticated) {
            return false;
          }
          return configuration.validationFunction(this.roles(), args);
        },

        /**
         * call this function to get or set the existing user profile from storage.
         * @param data the user profile
         */
        profile: function (data) {
          if (!_.isNil(data)) {
            storageService().set(configuration.profileStorageKey, data);
          }
          return storageService().get(configuration.profileStorageKey);
        },

        /**
         * call this function to retrieve the collection of roles for the user profile.
         */
        roles: function () {
          return configuration.rolesFunction(this.profile());
        },

        /**
         * call this function to determine if the user profile is in all of the specified roles.
         */
        isInAllRoles: function () {
          var needles = compact(arguments);
          var haystack = configuration.rolesFunction(this.profile());
          return needles.length > 0 && _.intersection(haystack, needles).length === needles.length;
        },

        /**
         * call this function to determine if the user profile is in any of the specified roles.
         */
        isInAnyRoles: function () {
          var needles = compact(arguments);
          var haystack = configuration.rolesFunction(this.profile());
          return _.intersection(haystack, needles).length > 0;
        },

        /**
         * call this function to determine if a user is permitted and redirect if not.
         */
        permit: function () {
          this.setLastAttemptedUrl($location.url());
          if (!this.allowed(arguments)) {
            var url = configuration.notAuthenticatedRedirectUrl,
                event = configuration.events.notAuthenticated;
            if (this.isAuthenticated()) {
              url = configuration.notAuthorizedRedirectUrl;
              event = configuration.events.notAuthorized;
            }
            $location.url(url);
            $rootScope.$broadcast(event, _.toArray(arguments));
          }
        },

        /**
         * returns the configuration hash.
         */
        getConfiguration: function () {
          return configuration;
        },

        /**
         * returns the last attempted URL value, or fallback if value is undefined or tracking is disabled.
         * @param fallback URL to fallback to if the last attempted URL is undefined or tracking is disabled
         */
        getLastAttemptedUrl: function (fallback) {
          var value = storageService().get(configuration.lastAttemptedUrlStorageKey);
          if (configuration.trackLastAttemptedUrl !== true || !_.isString(value)) {
            value = fallback;
          }
          return value;
        },

        /**
         * Sets and returns the last attempted url value.
         * @param value the value to set for the last attempted URL
         */
        setLastAttemptedUrl: function (value) {
          return storageService().set(configuration.lastAttemptedUrlStorageKey, value);
        },

        /**
         * returns the configured storage service.
         */
        store: storageService,

        /**
         * call to re-authenticate, useful in token situations.
         */
        reauthenticate: function () {
          if (this.isAuthenticated()) {
            configuration.reauthentication.fn();
            configuration.reauthentication.timer = setInterval(configuration.reauthentication.fn, configuration.reauthentication.timeout);
          }
        },

        /**
         * sets handler as a listener to the event: 'event:auth-loginConfirmed'.
         * @param handler the event handler
         */
        $onLoginConfirmed: function (handler) {
          $rootScope.$on(configuration.events.loginConfirmed, handler);
        },

        /**
         * sets handler as a listener to the event: 'event:auth-loginRequired'.
         * @param handler the event handler
         */
        $onLoginRequired: function (handler) {
          $rootScope.$on(configuration.events.loginRequired, handler);
        },

        /**
         * sets handler as a listener to the event: 'event:auth-logoutConfirmed'.
         * @param handler the event handler
         */
        $onLogoutConfirmed: function (handler) {
          $rootScope.$on(configuration.events.logoutConfirmed, handler);
        },

        /**
         * sets handler as a listener to the event: 'event:auth-notAuthenticated'.
         * @param handler the event handler
         */
        $onNotAuthenticated: function (handler) {
          $rootScope.$on(configuration.events.notAuthenticated, handler);
        },

        /**
         * sets handler as a listener to the event: 'event:auth-notAuthorized'.
         * @param handler the event handler
         */
        $onNotAuthorized: function (handler) {
          $rootScope.$on(configuration.events.notAuthorized, handler);
        }
      };
      return _.defaults(api, configuration.extensions);
    }];
  });
  return angular;
}));
