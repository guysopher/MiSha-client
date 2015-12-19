'use strict';
//
//chrome.runtime
//  .onInstalled.addListener(details => {
//  console.log('previousVersion', details.previousVersion);
//});

var api = 'http:localhost:1337'; //http://misha-api.herokuapp.com';

var me = undefined;

var notifs = [];
chrome.storage.local.get('notifications', function (res) {
  if (res.notifications) {
    notifs = res.notifications;
    console.log('Get current messages: ', notifs);
  }
});

function isAvailable(user) {
  if (!user || !user.last_seen || !user.hasOwnProperty('last_seen')) return false;
  if (!user.status) return false;
  if (user.busy && user.busy != "false") return false;
  var now = new Date().getTime();
  var lastSeen;
  lastSeen = new Date(Number(user.last_seen)).getTime();
  console.log("Last seen " + (now - lastSeen) / 60 / 1000 + " minutes ago");
  return now - lastSeen < 2 * 60 * 1000;
}

var initInterval = function initInterval() {
  setInterval(function () {

    //if the user status is not busy - make sure he's not away
    if (me.busy && me.busy != "false") {} else {

      if (typeof me.reasons == 'undefined') me.reasons = {};

      //if not charging - set as away
      navigator.getBattery().then(function (res) {
        console.log('Got Battery: ', res);
        if (!res.charging) {
          console.log("You're running on battery power");
          me.reasons['Running on battery power'] = true;
        } else {
          console.log("You're NOT running on battery power");
          me.reasons['Running on battery power'] = false;
        }
      });

      //if not if tel-aviv port - set as away
      navigator.geolocation.getCurrentPosition(function (res) {

        console.log('Got Location: ', res);
        var lat = res.coords.latitude;
        var lon = res.coords.longitude;

        if (lat < 32.102660 && lat > 32.096141 && lon > 34.772296 && lon < 34.777674) {
          //user is in the port
          console.log("You're at Tel Aviv port");
          me.reasons['Not at Tel-Aviv Port'] = false;
        } else {
          console.log("You're NOT at Tel Aviv port");
          me.reasons['Not at Tel-Aviv Port'] = true;
        }
      });

      //if chrome is idle for 2 minutes - set status as away
      chrome.idle.queryState(2 * 60, function (res) {
        console.log('Got Idle: ', res);
        if (res != 'active') {
          console.log("Chrome is idle");
          me.reasons['Chrome is idle'] = true;
        } else {
          console.log("Chrome is NOT idle");
          me.reasons['Chrome is idle'] = false;
        }
      });

      if (isAvailable(me)) {
        console.log("Computer is NOT sleeping");
        me.reasons['Computer is sleeping'] = false;
      } else {
        console.log("Computer is sleeping");
        me.reasons['Computer is sleeping'] = true;
      }

      //todo (oded) if not free in calendar - set as away

      var r;
      var reasons = [];
      for (r in me.reasons) {
        if (me.reasons.hasOwnProperty(r) && me.reasons[r] && me.reasons[r] != "false") {
          reasons.push(r);
        }
      }

      me.reason = "";
      if (reasons.length > 0) {
        me.status = 'away';
        me.reason = reasons.join(' & ');
      }
    }

    refreshUser(me);

    $.post(api + '/user/seen?user_id=' + me.id, { user: me }, function (res) {
      console.log("got response", res);
      console.count("got response");

      if (res.notify) {
        //$.delete(api + '/pending/' + res.pending, function(res) {
        //  console.log('Deleted: ', res);
        //});

        notifs.push(res);
        chrome.storage.local.set({ notifications: notifs }, function (err, localNotifs) {
          console.log('Set current messages: ', localNotifs);
        });

        chrome.browserAction.setBadgeText({ text: '1' });
        chrome.notifications.create('temp', {
          type: "basic",
          iconUrl: "images/icon-128.png",
          title: res.user,
          message: res.message,
          expandedMessage: " Expanded message"

        }, function (data) {
          console.log('Notification callback', data);
        });
      }
    });
  }, 12000);
};

var getUserIdFromEmail = function getUserIdFromEmail(email) {
  $.get(api + '/user?email=' + email, function (res) {
    me = res[0];
    console.log('Got User:', me);
    initInterval();
  });
};

var refreshUser = function refreshUser(user) {
  $.get(api + '/user/?id=' + user.id, function (res) {
    me = res;
    console.log('Got User:', me);
  });
};

chrome.identity.getProfileUserInfo(function (res) {
  if (res.email && res.email.indexOf('@wix.com') > 0) {
    getUserIdFromEmail(res.email);
  } else {
    chrome.storage.local.get('me', function (res) {
      if (res.me) {
        refreshUser();
        initInterval();
      } else {
        chrome.identity.getAuthToken({ 'interactive': true }, function (token) {
          //load Google's javascript client libraries

          var x = new XMLHttpRequest();
          x.open('GET', 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + token);
          x.onload = function () {
            var parsed_response = JSON.parse(x.response);
            getUserIdFromEmail(parsed_response.email);
          };
          x.send();
        });
      }
    });
  }
});
//# sourceMappingURL=background.js.map
