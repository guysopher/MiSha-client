'use strict';
//
//chrome.runtime
//  .onInstalled.addListener(details => {
//  console.log('previousVersion', details.previousVersion);
//});

//var api = 'http://misha-api.herokuapp.com';;
var api = 'http://localhost:1337';

var me = undefined;

var seenInterval = 12 * 1000;
var awayDuration = 2 * 60 * 1000;

var calenderCheckInterval = 5 * 60 * 1000;
var busyCalender = false;
var notifs = [];



var checkBusyCalendar = function () {
  if (me && me.email) {
    chrome.identity.getAuthToken({ 'interactive': true, scopes:['https://www.googleapis.com/auth/calendar']}, function(token) {
      var now = new Date();
      var next = new Date();
      next.setTime(now.getTime() + (30*60*1000)); //half an hour
      var nowI = now.toISOString();
      var nextI = next.toISOString();

      $.ajax({
        url: "https://www.googleapis.com/calendar/v3/calendars/" + me.email + "/events?timeMin="+now.toISOString()+'&timeMax='+next.toISOString(),
        headers: {
          Authorization: 'OAuth '+token
        }
      }).done(function(data) {
        busyCalender = (data && data.items && data.items.length > 0);
        console.log('busy calender result is: ', busyCalender)
      });
    });
  } else {
    busyCalender = false;
  }
};


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
  var now = (new Date()).getTime();
  var lastSeen;
  lastSeen = (new Date(Number(user.last_seen))).getTime();
  console.log("Last seen " + (now - lastSeen) / 60 / 1000 + " minutes ago");
  return ((now - lastSeen) < (2 * 60 * 1000))
}

var calculateRate = function (ratesByDays, today, tomorrow) {
  //returns a number between 0 and 1
  var total = 0;
  for (var i = 0; i < 7; i++) {
    if (i != today && i != tomorrow) {
      total += ratesByDays[i];
    }
  }
  total = Math.min(1,
    (total / 60 / 60 / 8 / 5) //8 hours a day in the last 5 days is the max
  );
  return total;
}

var seenLoop = function () {

  var today = (new Date()).getDay();
  var tomorrow = ((new Date()).getDay() + 1) % 7;

  //clear next day data
  me.rateByDay[tomorrow] = 0;

  me.rate = calculateRate(me.rateByDay, today, tomorrow);

  me.status =  me.status || 'available';
  chrome.browserAction.setBadgeText({text: me.status.replace('available', 'free')});

  //if the user status is not busy - make sure he's not away
  if (me.busy && me.busy != "false") {

  } else {

    if (typeof(me.reasons) == 'undefined') me.reasons = {};

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

    console.log('checking busy calender', busyCalender);
    me.reasons['in meetings'] = busyCalender;

    var r, reasons = [];
    for (r in me.reasons) {
      if (me.reasons.hasOwnProperty(r) && (me.reasons[r] && me.reasons[r] != "false")) {
        reasons.push(r);
      }
    }

    me.reason = "";
    if (reasons.length > 0) {
      me.status = 'away';
      me.reason = reasons.join(' & ');

    }

    //add seenInterval seconds to availability rate
    me.rateByDay[today] += (seenInterval / 1000);

    $.post(api + '/user/seen?user_id=' + me.id, {user: me}, function (res) {
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

        chrome.notifications.create('temp', {
          type: "basic",
          iconUrl: "images/icon-128.png",
          title: res.user,
          message: res.message,
          expandedMessage: " Expanded message"

        }, function (data) {
          console.log('Notification callback', data);
        })
      }
    });
  }
}

var initInterval = function () {

  var defaultRate = 60 * 60 * 4; //four hours

  if (!me.rate) {
    me.rateByDay = [defaultRate, defaultRate, defaultRate, defaultRate, defaultRate, defaultRate, defaultRate];
    var today = (new Date()).getDay();
    var tomorrow = ((new Date()).getDay() + 1) % 7;
    me.rate = calculateRate(me.rateByDay, today, tomorrow);
  }
  setInterval(seenLoop, seenInterval);
  seenLoop();
}

var getUserIdFromEmail = function (email) {
  $.get(api + '/user?email=' + email, function (res) {
    me = res[0];
    console.log('Got User:', me);
    initInterval();

    setInterval(checkBusyCalendar, calenderCheckInterval);
    checkBusyCalendar();
  });
}



var refreshUser = function (user) {
  return;
  $.get(api + '/user/?id=' + user.id, function (res) {
    me = res;
    console.log('Got User:', me);
  });
}

chrome.identity.getProfileUserInfo(function (res) {
  if (res.email && res.email.indexOf('@wix.com') > 0) {
    getUserIdFromEmail(res.email);
  //} else {
  //  chrome.storage.local.get('me', function(res) {
  //    if (res.me) {
  //      refreshUser();
  //      initInterval(res.me);
  //    } else {
  //      chrome.identity.getAuthToken({ 'interactive': true }, function (token) {
  //        //load Google's javascript client libraries
  //
  //        var x = new XMLHttpRequest();
  //        x.open('GET', 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + token);
  //        x.onload = function () {
  //          var parsed_response = JSON.parse(x.response);
  //          getUserIdFromEmail(parsed_response.email);
  //        };
  //        x.send();
  //      });
  //    }
  //  });
  }
});
