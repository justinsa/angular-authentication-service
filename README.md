[![Bower Version](https://img.shields.io/bower/v/ng-authentication-service.svg)](https://github.com/justinsa/angular-authentication-service)
[![NPM Version](https://img.shields.io/npm/v/ng-authentication-service.svg)](https://www.npmjs.com/package/ng-authentication-service)
![Master Build Status](https://codeship.com/projects/e0e25100-6039-0133-0431-46609ca5f084/status?branch=master)
[![license](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat)](https://github.com/justinsa/angular-authentication-service/blob/master/LICENSE)

An authentication and authorization helper service for Angular client applications.

##Dependencies

* AngularJS - http://angularjs.org
  * Angular Cookies - ngCookies
  * angular-local-storage-service - [local.storage]((https://github.com/justinsa/angular-local-storage-service))
* lodash

##Basic Setup

1. Add this module to your app as a dependency:
```JAVASCRIPT
var app = angular.module('yourApp', ['authentication.service']);
```
2. Inject $authentication as a parameter in declarations that require it:
```JAVASCRIPT
app.controller('yourController', function($scope, $authentication){ ... });
```

##Configuration Options

To override the default configuration options, configure the module with an options argument during application configuration and provide overrides for any of the following options.

```JAVASCRIPT
app.config(['$authenticationProvider', function ($authenticationProvider) {
  $authenticationProvider.configure({
    authCookieKey: null,
    profileStorageKey: 'user.profile',
    onLoginRedirectPath: '/',
    onLogoutRedirectPath: '/',
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
        (_.find(allowedRoles, function (role) { return _.includes(userRoles, role); }) !== undefined);
    },
    reauthFunc: function () {},
    reauthTimeout: 1200000,
    reauthId: null
  });
}]);
```

##API
###isAuthenticated()
```JAVASCRIPT
// Returns true if there is a user profile loaded in local storage, false otherwise.
$authentication.isAuthenticated();
```

###isAuthCookieMissing()
```JAVASCRIPT
// Returns true if the authCookieKey is defined and no auth cookie is present, false otherwise.
$authentication.isAuthCookieMissing();
```

###loginConfirmed(data)
```JAVASCRIPT
// Store the profile (data) in local storage, notify all listeners of login, and redirect to onLoginRedirectPath if defined.
$authentication.loginConfirmed({ ... });
```
Broadcast via: ```event:auth-loginConfirmed``` with the ```data``` parameter as an argument.

###checkAndBroadcastLoginConfirmed()
```JAVASCRIPT
// Check whether a user is logged in and broadcast the auth-loginConfirmed event, if so.
$authentication.checkAndBroadcastLoginConfirmed();
```

###loginRequired()
```JAVASCRIPT
// Notify all listeners that authentication is required.
$authentication.loginRequired();
```
Broadcast via: ```event:auth-loginRequired```.

###logoutConfirmed()
```JAVASCRIPT
// Remove any existing profile from local storage, notify all listeners of logout, and redirect to onLogoutRedirectPath if defined.
$authentication.logoutConfirmed();
```
Broadcast via: ```event:auth-logoutConfirmed```.

###allowed(...)
```JAVASCRIPT
// Return true if the user is unauthenticated, false otherwise.
$authentication.allowed('anonymous');

// Return true if the user is authenticated, false otherwise.
$authenticated.allowed('all');

// Return true if the configured validationFunction returns true, false otherwise.
$authenticated.allowed('role1', 'role2', ...);
```

###profile()
```JAVASCRIPT
// Return the current user profile from local storage if it exists.
$authentication.profile();
```

###roles()
```JAVASCRIPT
// Return the current collection of roles of the user profile from local storage if it exists.
$authentication.roles();
```

###isInAllRoles(...)
```JAVASCRIPT
// Return true if the current user profile is in all of the specified roles, false otherwise.
$authentication.isInAllRoles('role1', 'role2', ...);
```

###isInAnyRoles()
```JAVASCRIPT
// Return true if the current user profile is in at least one of the specified roles, false otherwise.
$authentication.isInAnyRoles('role1', 'role2', ...);
```

###permit(...)
```JAVASCRIPT
// Determine if the current user profile is allowed and redirect to either notPermittedRedirectPath or unauthenticatedRedirectPath if not.
$authentication.permit('role1', 'role2', ...);
```

This function also stores the current ```$location.path()``` for redirecting to if the user is required to login again.

###getAttemptedPath()
```JAVASCRIPT
// Return the last attempted path set by the permit call.
$authentication.getAttemptedPath();
```

###getConfiguration()
```JAVASCRIPT
// Return the configuration object.
$authentication.getConfiguration();
```

###reauth()
```JAVASCRIPT
// Enable re-authentication via the configured reauthFunc at reauthTimeout intervals.
$authentication.reauth();
```

##Development
After forking you should only have to run ```npm install``` from a command line to get your environment setup.

After install you have two gulp commands available to you:

1. ```gulp js:lint```
2. ```gulp js:test```
