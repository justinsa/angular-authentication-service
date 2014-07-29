(function (window, _, angular, undefined) {
  'use strict';
  var module = angular.module('authentication.service', ['ngCookies', 'local.storage']);
  module.provider('$authentication', function() {

    /**
     * call this function to provide configuration options to the service.
     */
    var configuration = {
      authCookieKey: null,
      profileStorageKey: 'user.profile',
      notPermittedRedirectPath: '/',
      unauthenticatedRedirectPath: '/',
      userRolesProperty: 'roles',
      rolesFunction: function (userProfile) {
        if (_.has(userProfile, this.userRolesProperty)) {
          var roles = userProfile[this.userRolesProperty];
          return _.isArray(roles) ? roles : [roles];
        }
        return [];
      },
      validationFunction: function (userRoles, allowedRoles) {
        return !_.isEmpty(userRoles) && !_.isEmpty(allowedRoles) &&
          (_.find(allowedRoles, function (role) { return _.contains(userRoles, role); }) !== undefined);
      },
      reauthFunc: function () {},
      reauthTimeout: 1200000,
      reauthId: null
    };

    this.configure = function (configurationOpts) {
      configuration = _.defaults(configurationOpts, configuration);
    };

    this.$get = [
    '$cookieStore', '$document', '$location', '$rootScope', '$store',
    function ($cookieStore, $document, $location, $rootScope, $store) {
      var authFunctions = {
        /**
         * returns true if there is a user profile in storage.
         */
        isAuthenticated: function() {
          if (this.isAuthCookieMissing()) {
            if ($store.has(configuration.profileStorageKey)) {
              // The cookie is absent or expired but we still have the profile stored.
              // Clear the profile and broadcast logout to ensure the app updates.
              this.logoutConfirmed();
            }
            return false;
          }
          return $store.has(configuration.profileStorageKey);
        },

        /**
         * returns true if the auth cookie is required and not present.
         */
        isAuthCookieMissing: function() {
          var key = configuration.authCookieKey;
          if (_.isString(key) && !_.isEmpty(key)) {
            key += '=';
            var cookies = $document[0].cookie.split(';');
            return !_.any(cookies, function (cookie) {
              return _.isString(cookie) && cookie.trim().indexOf(key) === 0;
            });
          }
          return false;
        },

        /**
         * call this function to indicate that authentication was successful.
         * @param data an optional argument to pass on to $broadcast which may be useful for
         * example if you need to pass through details of the user that was logged in.
         */
        loginConfirmed: function (data) {
          $store.set(configuration.profileStorageKey, data);
          configuration.reauthId = setInterval(configuration.reauthFunc, configuration.reauthTimeout);
          $rootScope.$broadcast('event:auth-loginConfirmed', data);
        },

        /**
         * call this function to check whether a current user is logged in
         * and to broadcast the auth-loginConfirmed event, if so. This allows
         * directives to load an initial state without duplicating code.
         */
        checkAndBroadcastLoginConfirmed: function() {
          if (this.isAuthenticated()) {
            $rootScope.$broadcast('event:auth-loginConfirmed', this.profile());
          }
        },

        /**
         * call this function to indicate that authentication is required.
         */
        loginRequired: function() {
          $rootScope.$broadcast('event:auth-loginRequired');
        },

        /**
         * call this function to indicate that unauthentication was successful.
         */
        logoutConfirmed: function() {
          $store.remove(configuration.profileStorageKey);
          window.clearInterval(configuration.reauthId);
          configuration.reauthId = null;
          $rootScope.$broadcast('event:auth-logoutConfirmed');
        },

        /**
         * call this function to determine if a user is permitted by the roles provided.
         * 'all' is a special case role that will return true for all authenticated users.
         * 'anonymous' is a special case role that will return true for an unauthenticated user.
         */
        allowed: function() {
          var args = _.toArray(arguments);
          var authenticated = this.isAuthenticated();
          // handle 'all' and 'anonymous' special cases
          if (args.length === 1) {
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
         * call this function to retrieve the existing user profile from storage.
         */
        profile: function() {
          return $store.get(configuration.profileStorageKey);
        },

        /**
         * call this function to retrieve the collection of roles for the user profile.
         */
        roles: function() {
          return configuration.rolesFunction(this.profile());
        },

        /**
         * call this function to determine if a user is permitted and redirect if not.
         */
        permit: function () {
          if (this.allowed.apply(this, _.toArray(arguments))) {
            return;
          }
          if (this.isAuthenticated()) {
            $location.path(configuration.notPermittedRedirectPath);
          } else {
            $location.path(configuration.unauthenticatedRedirectPath);
          }
        },

        /**
         * returns the configuration hash.
         */
        getConfiguration: function() {
          return configuration;
        },

        /**
         * call to reauthenticate, useful in token situations.
         */
        reauth: function() {
          if (authFunctions.isAuthenticated()) {
            configuration.reauthFunc();
            configuration.reauthId = setInterval(configuration.reauthFunc, configuration.reauthTimeout);
          }
        }
      };

      return authFunctions;
    }];
  });
})(window, window._, window.angular);
