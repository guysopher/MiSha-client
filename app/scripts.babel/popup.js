'use strict';

angular
  .module('misha', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        controllerAs: 'main'
      })
      .otherwise({
        redirectTo: '/'
      });
  })

  .controller('MainCtrl', ['$scope', '$resource', function ($scope, $resource) {

    var api = 'http://localhost:1337';

    var User = $resource(api + '/user/:userId', {userId:'@id'});
    var Pending = $resource(api + '/pending/:userId', {userId:'@id'});

    $scope.notifyMe = function(userId) {
      var notify = new Pending({
        user_id: '1',
        waiting_for: userId,
        message_id: 'notify me'
      });
      notify.save();
    }

  }]);