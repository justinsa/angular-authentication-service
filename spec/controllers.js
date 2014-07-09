'use strict';

describe('controllers', function() {
  var $authentication, $cookieStore, $location, $rootScope, $scope, $store, createController;

  describe('with no auth cookie', function() {
    beforeEach(function() {
      module('authentication.service', ['$authenticationProvider', function($authenticationProvider) {
        $authenticationProvider.configure({
          notPermittedRedirectPath: '/notpermitted',
          unauthenticatedRedirectPath: '/unauthenticated'
        });
      }]);
      inject(function($injector) {
        $authentication = $injector.get('$authentication');
        $location = $injector.get('$location');
        $store = $injector.get('$store');
        $rootScope = $injector.get('$rootScope');
        $scope = $rootScope.$new();
        var $controller = $injector.get('$controller');
        createController = function() {
          return $controller('SecurityController', { '$scope': $scope });
        };
      });
    });

    it('should have a permit function', function() {
      var controller = createController();
      $scope.permit.should.be.a.function;
    });

    it('should navigate to the unauthenticated page if user is not authenticated', function() {
      $location.path('/about')
      $location.path().should.match('/about');
      var controller = createController();
      $location.path().should.match('/unauthenticated');
    });

    it('should navigate to the not permitted page if the user does not have permissions', function() {
      $location.path('/about');
      $store.set('user.profile', { roles: ['a', 'b', 'c'] });
      var controller = createController();
      $location.path().should.match('/about');
      $scope.permit('d', 'e');
      $location.path().should.match('/notpermitted');
    });

    it('should stay on the page if the user is authenticated and has permission', function() {
      $location.path('/about');
      $store.set('user.profile', { roles: ['a', 'b', 'c'] });
      var controller = createController();
      $location.path().should.match('/about');
      $scope.permit('a', 'd', 'e');
      $location.path().should.match('/about');
    });

    it('should stay on the page if the user is authenticated and the permission is ALL', function() {
      $location.path('/about');
      $store.set('user.profile', { roles: ['a', 'b', 'c'] });
      var controller = createController();
      $location.path().should.match('/about');
      $scope.permit('ALL');
      $location.path().should.match('/about');
    });

    it('should navigate to the not permitted page if the user is authenticated and the permission is ANONYMOUS', function() {
      $location.path('/about');
      $store.set('user.profile', { roles: ['a', 'b', 'c'] });
      var controller = createController();
      $location.path().should.match('/about');
      $scope.permit('ANONYMOUS');
      $location.path().should.match('/notpermitted');
    });

    it('should stay on the page if the user is anonymous and the permission is ANONYMOUS', function() {
      $location.path('/about');
      var controller = createController();
      $store.remove('user.profile');
      $location.path().should.match('/about');
      $scope.permit('ANONYMOUS');
      $location.path().should.match('/about');
    });
  });

  describe('with an auth cookie', function() {
    beforeEach(function() {
      module('authentication.service', ['$authenticationProvider', function($authenticationProvider) {
        $authenticationProvider.configure({
          authCookieKey: 'AUTH-COOKIE',
          notPermittedRedirectPath: '/notpermitted',
          unauthenticatedRedirectPath: '/unauthenticated'
        });
      }]);
      inject(function($injector) {
        $authentication = $injector.get('$authentication');
        $cookieStore = $injector.get('$cookieStore');
        $location = $injector.get('$location');
        $store = $injector.get('$store');
        $rootScope = $injector.get('$rootScope');
        $scope = $rootScope.$new();
        var $controller = $injector.get('$controller');
        createController = function() {
          return $controller('SecurityController', { '$scope': $scope });
        };
      });
    });

    it('should navigate to the unauthenticated page if the user has no auth cookie on controller creation', function() {
      $location.path('/about');
      $store.set('user.profile', { roles: ['a', 'b', 'c'] });
      $cookieStore.remove('AUTH-COOKIE');
      var controller = createController();
      $location.path().should.match('/unauthenticated');
    });

    it('should navigate to the unauthenticated page if the user has no auth cookie on permit call', function() {
      $location.path('/about');
      var controller = createController();
      $location.path().should.match('/unauthenticated');
      $location.path('/about');
      $location.path().should.match('/about');
      $store.set('user.profile', { roles: ['a', 'b', 'c'] });
      $cookieStore.remove('AUTH-COOKIE');
      $scope.permit('a');
      $location.path().should.match('/unauthenticated');
    });

    it('should stay on the page if the user has an auth cookie and is permitted', function() {
      $location.path('/about');
      $store.set('user.profile', { roles: ['a', 'b', 'c'] });
      $cookieStore.put('AUTH-COOKIE', 'Authorized');
      var controller = createController();
      $location.path().should.match('/about');
      $scope.permit('a');
      $location.path().should.match('/about');
    });

    it('should navigate to the not permitted page if the user has an auth cookie and is not permitted', function() {
      $location.path('/about');
      $store.set('user.profile', { roles: ['a', 'b', 'c'] });
      $cookieStore.put('AUTH-COOKIE', 'Authorized');
      var controller = createController();
      $location.path().should.match('/about');
      $scope.permit('d');
      $location.path().should.match('/notpermitted');
    });
  });
});
