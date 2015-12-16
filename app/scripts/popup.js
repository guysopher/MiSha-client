'use strict';

angular.module('misha', ['ngAnimate', 'ngCookies', 'ngResource', 'ngRoute', 'ngSanitize']).config(function ($routeProvider) {
  $routeProvider.when('/main', {
    templateUrl: 'views/main.html',
    controller: 'MainCtrl',
    controllerAs: 'main'
  }).when('/', {
    controller: 'ListCtrl',
    controllerAs: 'list',
    templateUrl: 'views/list.html'
    //    resolve:      {
    //      users:  {
    //  return users.get().catch(function (e) {
    //    console.error(e);
    //    return [];
    //  });
    //}
  }).otherwise({
    redirectTo: '/'
  });
}).controller('MainCtrl', ['$scope', '$resource', function ($scope, $resource) {

  var api = 'http://localhost:1337';

  var User = $resource(api + '/user/:userId', { userId: '@id' });
  var Pending = $resource(api + '/pending/:userId', { userId: '@id' });

  chrome.storage.local.get('me', function (res) {
    $scope.me = res.me;
  });

  $scope.notifyMe = function (userId) {
    var notify = new Pending({
      user_id: '567151fe7d2baa1d49c0dcfa',
      waiting_for: '567151fe7d2baa1d49c0dcf9',
      message: 'is now available!'
    });
    notify.$save();
  };

  $scope.sendMessage = function (userId, message) {
    var notify = new Pending({
      user_id: userId,
      waiting_for: $scope.me.id,
      message: message
    });
    notify.$save();
  };
}]).controller('ListCtrl', ['$scope', '$resource', function ($scope, $resource) {

  var api = 'http://localhost:1337';

  var User = $resource(api + '/user/:userId', { userId: '@id' });
  var Pending = $resource(api + '/pending/:userId', { userId: '@id' });

  $scope.users = [];
  $scope.username = "GUY";
  User.query({ limit: 2000 }).$promise.then(function (data) {
    $scope.users = data;
  });

  $scope.notifyMe = function (userId) {
    var notify = new Pending({
      user_id: '1',
      waiting_for: userId,
      message_id: 'notify me'
    });
    notify.save();
  };
}]);
//# sourceMappingURL=popup.js.map
