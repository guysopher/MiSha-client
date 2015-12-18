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


var initInterval = function (me) {
  setInterval(function(){

    //if the user status is not busy - make sure he's not away
    if (me.status != 'busy') {
      //if not charging - set as away
      navigator.getBattery().then(function (res) {
        if (!res.charging) {
          me.status = 'away';
        }
      });

      //if not if tel-aviv port - set as away
      navigator.geolocation.getCurrentPosition(function(res) {
        var lat = res.coords.latitude;
        var lon = res.coords.longitude;
        if (lat < 32.102660 && lat > 32.096141 && lon > 34.772296 && lon < 34.777674) {
            //user is in the port
        } else {
          me.status = 'away';
        }

      });

      //if chrome is idle for 2 minutes - set status as away
      chrome.idle.queryState(2 * 60, function(res) {
        if (res != 'active') {
          me.status = 'away';
        }
      });

      //todo (oded) if not free in calendar - set as away
    }
    $.post(api + '/user/seen?user_id=' + me.id, {user: me}, function(res) {
      console.log("got response", res);
      console.count("got response");

      if (res.notify) {
        //$.delete(api + '/pending/' + res.pending, function(res) {
        //  console.log('Deleted: ', res);
        //});

        notifs.push(res);
        chrome.storage.local.set({notifications: notifs}, function (err, localNotifs) {
          console.log('Set current messages: ', localNotifs);
        });

        chrome.browserAction.setBadgeText({text: '1'});
        chrome.notifications.create('temp', {
          type: "basic",
          iconUrl: "images/icon-128.png",
          title: res.user,
          message: res.message,
          expandedMessage: " Expanded message"

        }, function(data) {
          console.log('Notification callback', data);
        })
      }
    });
  }, 12000);
}

var getUserIdFromEmail = function(email) {
  $.get(api + '/user?email=' + email, function (res) {
    me = res[0];
    console.log('Got User:', me);
    chrome.storage.local.set({ me: me });
    initInterval(me);
  });
}


chrome.identity.getProfileUserInfo(function(res) {
  if (res.email && res.email.indexOf('@wix.com') > 0) {
    getUserIdFromEmail(res.email);
  } else {
    chrome.storage.local.get('me', function(res) {
      if (res.me) {
        initInterval(res.me);
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
