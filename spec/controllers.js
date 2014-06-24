'use strict';

describe('controllers', function() {
  var $authentication, $location, $rootScope, $scope, $store, createController;

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
    $scope.permit('d');
    $location.path().should.match('/notpermitted');
  });
});
