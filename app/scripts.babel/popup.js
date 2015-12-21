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


  .controller('ListCtrl', ['$scope', '$resource', '$timeout', '$interval', function ($scope, $resource, $timeout, $interval) {
    var bg = chrome.extension.getBackgroundPage();

    var api = bg.api;

    var User = $resource(api + '/user/:userId', { userId: '@id' }, {
      'update': { method:'PUT' }
    });
    var Pending = $resource(api + '/pending/:userId', { userId: '@id' });

    $scope.username = "Hi";
    $scope.users = [];
    $scope.started = 'init';
    chrome.storage.local.get('started', function(res){
      if (res.started) {
        $scope.started = res.started;
      } else {
        $scope.started = false;
      }
    });
    $scope.detailed = false;
    $scope.timeOfDay = calculateTimeOfDay();

    function calculateTimeOfDay() {
      var now = new Date();
      var nowHour = now.getHours();
      if(nowHour < 5) {
        return 'NIGHT';
      } else if (nowHour < 12) {
        return 'MORNING';
      } else if (nowHour < 17) {
        return 'AFTERNOON';
      } else if (nowHour < 21) {
        return 'EVENING';
      } else {
        return 'NIGHT';
      }
    }

    function refreshUsers() {
      $scope.me = bg && bg.me;
      $scope.username = bg && bg.me && bg.me.name && bg.me.name.split(' ')[0];
      $scope.users = bg.users;
    }

    $scope.hideHeader = function() {
      var ele = $('h1');
      var h = ele.height();
      ele.css('height', h + 'px');
      $timeout(function() {
        ele.css('height', 0)
        .css('padding', 0)
        .css('margin', 0);
      });
    }

    $scope.start = function() {
      chrome.storage.local.set({'started' : true});
      $scope.started = true;
    }

    $scope.toggleDetails = function(state) {
      if (!state) state = !$scope.detailed;
      $scope.detailed = state;
    }

    $scope.invite = function() {
      if (!$scope.selectedUser) return;
      User.save({userId: 'invite'}, {from: $scope.me.email, to: $scope.selectedUser.email, name: $scope.selectedUser.name});
      $scope.successAndClose();
    };

    $scope.notifyMe = function(userId) {
      if (!userId) userId = $scope.selectedUser.id;
      if (!$scope.me) return;

      var notify = new Pending({
        user_id: $scope.me.id,
        waiting_for: userId,
        message: "I've returned to my desk, you can come over!"
      });
      notify.$save(function(data) {
        if(data && data.$resolved) {
        }
      });

      $scope.successAndClose();
    };

    $scope.sendMessage = function(userId, message) {
      if (!$scope.me) return;

      if (!message) message = "Get ready... I'm coming (to your desk)";
      if (!userId) userId = $scope.selectedUser.id;

      var notify = new Pending({
        user_id: userId,
        waiting_for: $scope.me.id,
        message: message
      });
      notify.$save(function(data){
      });

      $scope.successAndClose();

    }

    $scope.successAndClose = function() {
      $scope.showSuccess = true;
      $timeout(function() {
        window.close();
      }, 7000);
    }

    $scope.clearSelectedUser = function() {
      $scope.selectedUser = '';
      $scope.appState = '';
      $scope.detailed = false;
    }

    $scope.selectUser = function(user) {
      $scope.selectedUser = user;
      $scope.appState = getUserAvailability(user);
      User.get({userId: user.id}, function (res) {
        $scope.selectedUser = res;
        $scope.appState = getUserAvailability(res);
      });
    }

    $scope.getLargeImage = function(url) {
      if (!url) return;
      return url.replace('thumb_small', 'original');
    }

    function isAvailable(user) {
      if (!user || !user.last_seen || !user.hasOwnProperty('last_seen')) return false;
      if (!user.status || user.status != 'available') return false;
      if (user.busy && user.busy != 'false') return false;
      var now = (new Date()).getTime();
      var lastSeen;

      lastSeen = (new Date(Number(user.last_seen))).getTime();

      return ((now - lastSeen) < (bg.awayDuration));
    }

    function getUserAvailability(user) {
      if (!user || !user.last_seen || !user.hasOwnProperty('last_seen')) return 'away';
      if (user.busy && user.busy != 'false') return 'busy';
      if (!user.status || user.status == 'away') return 'away';

      var now = (new Date()).getTime();
      var lastSeen;

      lastSeen = (new Date(Number(user.last_seen))).getTime();

      return ((now - lastSeen) < (bg.awayDuration))? 'available': 'busy';
    }

    $scope.rate = function(selectedUser) {
      switch (selectedUser) {
        case selectedUser.rank:
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

    $scope.appStateColor = function(state) {
      if (!state) state = $scope.appState;
      return (state =='busy' ? 'red' : (state == 'available' ? 'green' : 'yellow'));
    }


    $scope.toggleBusy = function(state) {
      if (!$scope.me) return;
      if (!state) state = !$scope.me.busy;

      $scope.me.busy = state;
      if ($scope.me.busy) {
        $scope.imBusy = true;
        $scope.clearSelectedUser();
        $scope.appState = 'busy';
        chrome.browserAction.setIcon({'path': api + '/images/icons/red.png'})
      } else {
        $scope.imBusy = false;
        $scope.appState = '';
        chrome.browserAction.setIcon({'path': api + '/images/icons/' + ($scope.me.status=='available' ? 'green' : 'yellow') + '.png'})
      }

      User.update({userId: $scope.me.id}, {busy: $scope.me.busy});
    };

    refreshUsers();
    $scope.toggleBusy($scope.me.busy);
    $interval(refreshUsers, bg.seenInterval);


  }]);

//  "client_id_prod": "1051518271202-64fst397g2iqr3sahpvb8iohofi3t289.apps.googleusercontent.com",
