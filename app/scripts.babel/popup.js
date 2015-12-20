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
  .config(function ($routeProvider) {
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
  })

  .controller('UserCtrl', ['$scope', '$resource', function ($scope, $resource) {

  }])

  .controller('ListCtrl', ['$scope', '$resource', '$http', function ($scope, $resource, $http) {
    var api = 'http://misha-api.herokuapp.com';

    var User = $resource(api + '/user/:userId', { userId: '@id' });
    var Pending = $resource(api + '/pending/:userId', { userId: '@id' });

    $scope.username = "YOU";
    $scope.users = [];

    chrome.storage.local.get('me', function(res) {
      if(res.me && res.me.name) {
        $scope.username = res.me.name.split(' ')[0];
        $scope.me = res.me;
      }
    });

    chrome.storage.local.get('users', function(res) {
      $scope.users = res;
    });

    User.query({limit:2000}, function(res) {
      $scope.users = res;
      chrome.storage.local.set({'users': res});
    });

    $scope.notifyMe = function(userId) {
      if (!userId) userId = $scope.selectedUser.id;
      var notify = new Pending({
        user_id: $scope.me.id,
        waiting_for: userId,
        message: 'is now available!'
      });
      notify.$save();
      $scope.selectedUser = '';
      $scope.appState = '';
    };

    $scope.sendMessage = function(userId, message) {
      if (!userId) userId = $scope.selectedUser.id;
      var notify = new Pending({
        user_id: userId,
        waiting_for: $scope.me.id,
        message: message
      });
      notify.$save();
      $scope.selectedUser = '';
      $scope.appState = '';
    }

    $scope.selectUser = function(user) {
      $scope.selectedUser = user;
      $scope.appState = isAvailable(user) ? 'available' : 'busy';
    }

    function isAvailable(user) {
      if (!user || !user.last_seen || !user.hasOwnProperty('last_seen')) return false;
      var now = (new Date()).getTime();
      var lastSeen;
      lastSeen = (new Date(Number(user.last_seen))).getTime();
      var isAvail = ((now - lastSeen) < (2 * 60 * 1000));
      if (isAvail) {
        return checkBusyCalendar(user.email)
      } else {
        return false;
      }
      return
    }

    function checkBusyCalendar(email) {
      chrome.identity.getAuthToken({ 'interactive': true, scopes:['https://www.googleapis.com/auth/calendar']}, function(token) {
        var now = new Date();
        var next = new Date();
        next.setTime(now.getTime() + (30*60*1000)); //half an hour
        var nowI = now.toISOString();
        var nextI = next.toISOString();

        $http({
          method: 'GET',
          url: "https://www.googleapis.com/calendar/v3/calendars/" + email + "/events?timeMin="+now.toISOString()+'&timeMax='+next.toISOString(),
          headers: {
            Authorization: 'OAuth '+token
          }
        }).then(function(data) {
          data = data.data;
          return(data && data.items && data.items.length > 0);
        }, function(data) {return false});
      });
    }


  }]);

//  "client_id_prod": "1051518271202-64fst397g2iqr3sahpvb8iohofi3t289.apps.googleusercontent.com",
