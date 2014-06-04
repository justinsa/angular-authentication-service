(function (window, _, angular, undefined) {
  'use strict';
  var _configuration = {};
  var service = angular.module('authentication.service', ['local.storage']);
  service.controller('SecurityController', ['$authentication', '$location', '$scope', function ($authentication, $location, $scope) {
    $scope.permit = function () {
      if (!$authentication.allowed(arguments)) {
        $location.path(_configuration.notPermittedRedirectPath);
      }
    };

    if (!$authentication.isAuthenticated()) {
      $location.path(_configuration.unauthenticatedRedirectPath);
    }
  }]);
  service.factory('$authentication', ['$rootScope', '$store', function($rootScope, $store) {
    return {
      /**
       * call this function to provide configuration options to the service.
       */
      configure: function (configuration) {
        _configuration = _.defaults(configuration, {
          profileStorageKey: 'user.profile',
          notPermittedRedirectPath: '/',
          unauthenticatedRedirectPath: '/',
          userProperty: 'roles',
          validationFunction: function (user, roles) {
            return _.has(user, _configuration.userProperty) &&
              (_.find(roles, function (role) {
                return _.contains(user[_configuration.userProperty], role);
              }) !== undefined);
          }
        });
      },

      /**
       * returns true if there is a user profile in storage.
       */
      isAuthenticated: function() {
        return $store.has(_configuration.profileStorageKey);
      },

      /**
       * call this function to indicate that authentication was successful.
       * @param data an optional argument to pass on to $broadcast which may be useful for
       * example if you need to pass through details of the user that was logged in.
       */
      loginConfirmed: function (data) {
        $store.set(_configuration.profileStorageKey, data);
        $rootScope.$broadcast('event:auth-loginConfirmed', data);
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
        $store.remove(_configuration.profileStorageKey);
        $rootScope.$broadcast('event:auth-logoutConfirmed');
      },

      /**
       * call this function to determine if a user is permitted by the roles provided.
       * 'all' is a special case role that will return true for all authenticated users.
       * 'anonymous' is a special case role that will return true for an unauthenticated user.
       */
      allowed: function() {
        var authenticated = $store.has(_configuration.profileStorageKey);
        // handle 'all' and 'anonymous' special cases
        if (arguments.length === 1) {
          switch (arguments[0]) {
            case 'all' : return authenticated;
            case 'anonymous' : return !authenticated;
            default: break;
          }
        }
        // handle generic case of a list of defined roles
        if (arguments.length === 0 || !authenticated) {
          return false;
        }
        var user = $store.get(_configuration.profileStorageKey);
        return _configuration.validationFunction(user, arguments);
      },

      /**
       * call this function to retrieve the existing user profile from storage.
       */
      profile: function() {
        return $store.get(_configuration.profileStorageKey);
      }
    };
  }]);
})(window, window._, window.angular);