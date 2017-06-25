[![Bower Version](https://img.shields.io/bower/v/ng-authentication-service.svg)](https://github.com/justinsa/angular-authentication-service)
[![NPM Version](https://img.shields.io/npm/v/ng-authentication-service.svg)](https://www.npmjs.com/package/ng-authentication-service)
![Master Build Status](https://codeship.com/projects/e0e25100-6039-0133-0431-46609ca5f084/status?branch=master)
[![license](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat)](https://github.com/justinsa/angular-authentication-service/blob/master/LICENSE)

An authentication and authorization helper service for Angular client applications.

## Dependencies

* AngularJS - http://angularjs.org
* Lodash - http://lodash.com

## Basic Setup

Add this module to your app as a dependency:
```JAVASCRIPT
var app = angular.module('yourApp', ['authentication.service']);
```

Inject $authentication as a parameter in declarations that require it:
```JAVASCRIPT
app.controller('yourController', function($scope, $authentication){ ... });
```

## Configuration Options

To override the default configuration options, configure the module with an options argument during application configuration and provide overrides for any of the following options.

```JAVASCRIPT
app.config(['$authenticationProvider', function ($authenticationProvider) {
  $authenticationProvider.configure({
    authCookieKey: undefined,
    storageService: undefined,
    profileStorageKey: 'user.profile',
    onLoginRedirectPath: '/',
    onLogoutRedirectPath: '/',
    notPermittedRedirectPath: '/',
    unauthenticatedRedirectPath: '/',
    userRolesProperty: 'roles',
    events: {
      loginConfirmed: 'event:auth-loginConfirmed',
      loginRequired: 'event:auth-loginRequired',
      logoutConfirmed: 'event:auth-logoutConfirmed'
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
      fn: function () {},
      timeout: 1200000,
      timer: undefined
    }
  });
}]);
```

### Storage Service Option

If you do not provide a storage service then a simple, in-memory dictionary will be used.

You can provide any storage service that supports the following API:

  1. ```mixed get(key)```
  2. ```boolean has(key)```
  3. ```void remove(key)```
  4. ```void set(key, value)```

To configure a storage service for the authentication provider you provide the service name:

```JAVASCRIPT
app.config(['$authenticationProvider', function ($authenticationProvider) {
  $authenticationProvider.configure({
    storageService: '$store'
  });
}]);
```

The ng-authentication-service was designed in tandem with the [ng-local-storage-service](https://github.com/justinsa/angular-local-storage-service).

## API

### isAuthenticated()
```JAVASCRIPT
// Returns true if there is a user profile loaded in local storage, false otherwise.
$authentication.isAuthenticated();
```

### isAuthCookieMissing()
```JAVASCRIPT
// Returns true if the authCookieKey is defined and no auth cookie is present, false otherwise.
$authentication.isAuthCookieMissing();
```

### loginConfirmed(data)
```JAVASCRIPT
// Store the profile (data) in local storage, notify all listeners of login, and redirect to onLoginRedirectPath if defined.
$authentication.loginConfirmed({ ... });
```
Broadcast via: ```event:auth-loginConfirmed``` with the ```data``` parameter as an argument.

### checkAndBroadcastLoginConfirmed()
```JAVASCRIPT
// Check whether a user is logged in and broadcast the auth-loginConfirmed event, if so.
$authentication.checkAndBroadcastLoginConfirmed();
```

### loginRequired()
```JAVASCRIPT
// Notify all listeners that authentication is required.
$authentication.loginRequired();
```
Broadcast via: ```event:auth-loginRequired```.

### logoutConfirmed()
```JAVASCRIPT
// Remove any existing profile from local storage, notify all listeners of logout, and redirect to onLogoutRedirectPath if defined.
$authentication.logoutConfirmed();
```
Broadcast via: ```event:auth-logoutConfirmed```.

### allowed(...)
```JAVASCRIPT
// Return true if the user is unauthenticated, false otherwise.
$authentication.allowed('anonymous');

// Return true if the user is authenticated, false otherwise.
$authenticated.allowed('all');

// Return true if the configured validationFunction returns true, false otherwise.
$authenticated.allowed('role1', 'role2', ...);

// will flatten provided arrays that are any depth in the arguments list
$authentication.allowed('X', ['Y', 'Z'], [['A']]) === $authentication.allowed('X', 'Y', 'Z', 'A')
```

### profile()
```JAVASCRIPT
// Return the current user profile from local storage if it exists.
$authentication.profile();
```

### roles()
```JAVASCRIPT
// Return the current collection of roles of the user profile from local storage if it exists.
$authentication.roles();
```

### isInAllRoles(...)
```JAVASCRIPT
// Return true if the current user profile is in all of the specified roles, false otherwise.
$authentication.isInAllRoles('role1', 'role2', ...);

// will flatten provided arrays that are any depth in the arguments list
$authentication.isInAllRoles('X', ['Y', 'Z'], [['A']]) === $authentication.isInAllRoles('X', 'Y', 'Z', 'A')
```

### isInAnyRoles()
```JAVASCRIPT
// Return true if the current user profile is in at least one of the specified roles, false otherwise.
$authentication.isInAnyRoles('role1', 'role2', ...);

// will flatten provided arrays that are any depth in the arguments list
$authentication.isInAnyRoles('X', ['Y', 'Z'], [['A']]) === $authentication.isInAnyRoles('X', 'Y', 'Z', 'A')
```

### permit(...)
```JAVASCRIPT
// Determine if the current user profile is allowed and redirect to either notPermittedRedirectPath or unauthenticatedRedirectPath if not.
$authentication.permit('role1', 'role2', ...);

// will flatten provided arrays that are any depth in the arguments list
$authentication.permit('X', ['Y', 'Z'], [['A']]) === $authentication.permit('X', 'Y', 'Z', 'A')
```

### getConfiguration()
```JAVASCRIPT
// Return the configuration object.
$authentication.getConfiguration();
```

### store()
```JAVASCRIPT
// Returns the configured storage service.
$authentication.store();
```

### reauthenticate()
```JAVASCRIPT
// Enable re-authentication via the configured reauthentication.fn at reauthentication.timeout intervals.
$authentication.reauthenticate();
```

## Development
After forking you should only have to run ```npm install``` from a command line to get your environment setup.

After install you have two gulp commands available to you:

1. ```gulp js:lint```
2. ```gulp js:test```
