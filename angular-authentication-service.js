(function (window, _, angular, undefined) {
  'use strict';
  var module = angular.module('authentication.service', ['local.storage']);
  module.controller('SecurityController', ['$authentication', '$location', '$scope', function ($authentication, $location, $scope) {
    $scope.permit = function () {
      if (!$authentication.allowed.apply($authentication, _.toArray(arguments))) {
        $location.path($authentication.getConfig().notPermittedRedirectPath);
      }
    };

    if (!$authentication.isAuthenticated()) {
      $location.path($authentication.getConfig().unauthenticatedRedirectPath);
    }
  }]);
  module.provider('$authentication', function() {
    /**
     * call this function to provide configuration options to the service.
     */
     var configuration = {};

    this.configure = function (configurationOpts) {
      configuration = _.defaults(configurationOpts, {
        profileStorageKey: 'user.profile',
        notPermittedRedirectPath: '/',
        unauthenticatedRedirectPath: '/',
        userProperty: 'roles',
        validationFunction: function (user, roles) {
          return _.has(user, configuration.userProperty) &&
            (_.find(roles, function (role) {
              return _.contains(user[configuration.userProperty], role);
            }) !== undefined);
        }
      });
    };

    this.$get = ['$rootScope', '$store', function($rootScope, $store) {
      return {

        /**
         * returns true if there is a user profile in storage.
         */
        isAuthenticated: function() {
          return $store.has(configuration.profileStorageKey);
        },

        /**
         * call this function to indicate that authentication was successful.
         * @param data an optional argument to pass on to $broadcast which may be useful for
         * example if you need to pass through details of the user that was logged in.
         */
        loginConfirmed: function (data) {
          $store.set(configuration.profileStorageKey, data);
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
          $rootScope.$broadcast('event:auth-logoutConfirmed');
        },

        /**
         * call this function to determine if a user is permitted by the roles provided.
         * 'all' is a special case role that will return true for all authenticated users.
         * 'anonymous' is a special case role that will return true for an unauthenticated user.
         */
        allowed: function() {
          var args = _.toArray(arguments);
          var authenticated = $store.has(configuration.profileStorageKey);
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
          var user = $store.get(configuration.profileStorageKey);
          return configuration.validationFunction(user, args);
        },

        /**
         * call this function to retrieve the existing user profile from storage.
         */
        profile: function() {
          return $store.get(configuration.profileStorageKey);
        },

        /**
         * call this function to get the configuration options
         */
        getConfig: function() {
          return configuration;
        }
      };
    }];
  });
})(window, window._, window.angular);