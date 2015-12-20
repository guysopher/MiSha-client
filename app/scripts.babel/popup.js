'use strict';

angular
  .module('misha', [
    'ui.bootstrap.typeahead',
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize'
  ])
  .config(['$routeProvider', function ($routeProvider) {
    $routeProvider
      .when('/user', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        controllerAs: 'main'
      })
      .when('/', {
        controller:   'ListCtrl',
        controllerAs: 'list',
        templateUrl:  'views/list.html',
      }).otherwise({
        redirectTo: '/'
      });
  }])

  .controller('UserCtrl', ['$scope', '$resource', function ($scope, $resource) {

  }])


  .controller('ListCtrl', ['$scope', '$resource', '$http', function ($scope, $resource) {
    var bg = chrome.extension.getBackgroundPage();

    var api = bg.api;

    var User = $resource(api + '/user/:userId', { userId: '@id' }, {
      'update': { method:'PUT' }
    });
    var Pending = $resource(api + '/pending/:userId', { userId: '@id' });

    $scope.username = "Hi";
    $scope.users = [];

    function refreshUsers() {
      $scope.me = bg && bg.me;
      $scope.username = bg && bg.me && bg.me.name && bg.me.name.split(' ')[0];
      User.query({limit: 2000}, function (res) {
        $scope.users = res;
        chrome.storage.local.set({'users': res});
      });
    }
    refreshUsers();
    setInterval(refreshUsers, bg.seenInterval);

    $scope.toggleBusy = function() {
      if (!$scope.me) return;
      $scope.me.busy = !$scope.me.busy;
      User.update({userId: $scope.me.id}, {busy: $scope.me.busy});
    };

    $scope.invite = function() {
      if (!$scope.selectedUser) return;
      User.save({userId: 'invite'}, {email: $scope.selectedUser.email, name: $scope.selectedUser.name});
      $scope.clearSelectedUser();
    };

    $scope.notifyMe = function(userId) {
      if (!userId) userId = $scope.selectedUser.id;
      if (!$scope.me) return;

      var notify = new Pending({
        user_id: $scope.me.id,
        waiting_for: userId,
        message: 'is now available!'
      });
      notify.$save();
      $scope.clearSelectedUser();

    };

    $scope.sendMessage = function(userId, message) {
      if (!userId) userId = $scope.selectedUser.id;
      if (!$scope.me) return;

      var notify = new Pending({
        user_id: userId,
        waiting_for: $scope.me.id,
        message: message
      });
      notify.$save(function(data){
        if(data && data.$resolved) {
          $scope.clearSelectedUser();
          window.close();
        }
      });
    }

    $scope.clearSelectedUser = function() {
      $scope.selectedUser = '';
      $scope.appState = '';
    }

    $scope.selectUser = function(user) {
      $scope.selectedUser = user;
      $scope.appState = isAvailable(user) ? 'available' : 'busy';
    }

    $scope.getLargeImage = function(url) {
      if (!url) return;
      return url.replace('thumb_small', 'original');
    }

    function isAvailable(user) {
      if (!user || !user.last_seen || !user.hasOwnProperty('last_seen')) return false;
      if (!user.status || user.status != 'available') return false;
      if (user.busy) return false;
      var now = (new Date()).getTime();
      var lastSeen;

      lastSeen = (new Date(Number(user.last_seen))).getTime();

      return ((now - lastSeen) < (bg.awayDuration));
    }

    $scope.rate = function() {
      switch (Math.floor(Math.random() * 3)) {
        case 0:
          $scope.badge = 'king';
          break;
        case 1:
          $scope.badge = 'wixer';
          break;
        case 2:
          $scope.badge = 'mega-kaker';
          break;
      }
    }

  }]);

//  "client_id_prod": "1051518271202-64fst397g2iqr3sahpvb8iohofi3t289.apps.googleusercontent.com",
