'use strict';
//
//chrome.runtime
//  .onInstalled.addListener(details => {
//  console.log('previousVersion', details.previousVersion);
//});

var api = 'http://misha-api.herokuapp.com';;
//var api = 'http://localhost:1337';

function isDevMode() {
  return !('update_url' in chrome.runtime.getManifest());
}

var api = isDevMode() ? 'http://localhost:1337' : 'http://misha-api.herokuapp.com';
var me = undefined;
var users = undefined;

var seenInterval = 15 * 1000;
var awayDuration = 2 * 60;
var calenderCheckInterval = 5 * 60 * 1000;
var refreshUsersInterval = 5 * 60 * 1000;

var busyCalender = false;
var notifs = [];
var MAX_PER_DAY = 60 * 60 * 8;
var MAX_PER_WEEK = MAX_PER_DAY * 5;

var started = localStorage['started'];

var checkBusyCalendar = function () {
  var started = localStorage['started'];
  if (me && me.email) {
    chrome.identity.getAuthToken({ 'interactive': true, scopes:['https://www.googleapis.com/auth/calendar']}, function(token) {
      var now = new Date();
      var next = new Date();
      next.setTime(now.getTime() + (calenderCheckInterval)); //half an hour
      var nowI = now.toISOString();
      var nextI = next.toISOString();

      $.ajax({
        url: "https://www.googleapis.com/calendar/v3/calendars/" + me.email + "/events?timeMin="+now.toISOString()+'&timeMax='+next.toISOString(),
        headers: {
          Authorization: 'OAuth '+token
        }
      }).done(function(data) {
        busyCalender = false;
        if (data && data.items && data.items.length > 0) {
          for (var i=0; i < data.items.length; i++) {
            var item = data.items[i];
            if (item.transparency != "transparent" && item.status == "confirmed") {
              for (var att, a=0; att = item.attendees[a]; a++) {
                if (att.self && att.responseStatus == "accepted") {
                  busyCalender = true;
                  break;
                }
              }
            }
          }
        }

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

//function isAvailable(user) {
//  if (!user || !user.last_seen || !user.hasOwnProperty('last_seen')) return false;
//  if (!user.status) return false;
//  if (user.busy && user.busy != "false") return false;
//  var now = (new Date()).getTime();
//  var lastSeen;
//  lastSeen = (new Date(Number(user.last_seen))).getTime();
//  console.log("Last seen " + (now - lastSeen) / 60 / 1000 + " minutes ago");
//  return ((now - lastSeen) < (2 * 60 * 1000))
//}

var calculateRate = function (ratesByDays, today, tomorrow) {
  //returns a number between 0 and 1
  var total = 0;
  for (var i = 0; i < 7; i++) {
    if (i != today && i != tomorrow) {
      total += Number(ratesByDays[i]);
    }
  }
  total = Math.min(1,    (total / MAX_PER_WEEK) //8 hours a day in the last 5 days is the max
  );
  return total;
}

function refreshUsers() {
  $.get(api + '/user?limit=2000', function (res) {
    users = res;
  });
}

refreshUsers();
setInterval(refreshUsers, refreshUsersInterval);

var seenLoop = function () {

  var today = (new Date()).getDay();
  var tomorrow = ((new Date()).getDay() + 1) % 7;

  if (!me.rate || !me.rateByDay) {
    var defaultRate = 60 * 60 * 4; //four hours
    me.rateByDay = [defaultRate, defaultRate, defaultRate, defaultRate, defaultRate, defaultRate, defaultRate];
    me.rate = calculateRate(me.rateByDay, today, tomorrow);
  }

  //clear next day data
  me.rateByDay[tomorrow] = 0;

  me.rate = calculateRate(me.rateByDay, today, tomorrow);

  me.status =  me.status || 'available';

  //if the user status is not busy - make sure he's not away
  if (me.busy && me.busy != "false") {
    chrome.browserAction.setIcon({'path': api + '/images/icons/red.png'})
  } else {
    chrome.browserAction.setIcon({'path': api + '/images/icons/' + (me.status=='available' ? 'green' : 'yellow') + '.png'})
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
    chrome.idle.queryState(awayDuration, function (res) {
      console.log('Got Idle: ', res);
      if (res != 'active') {
        console.log("Chrome is idle");
        me.reasons['Chrome is idle'] = true;
      } else {
        console.log("Chrome is NOT idle");
        me.reasons['Chrome is idle'] = false;
      }
    });

    //if (isAvailable(me)) {
    //  console.log("Computer is NOT sleeping");
    //  me.reasons['Computer is sleeping'] = false;
    //} else {
    //  console.log("Computer is sleeping");
    //  me.reasons['Computer is sleeping'] = true;
    //}
    me.reasons['Computer is sleeping'] = false;

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
    } else {
      me.status = 'available';
    }


    //add seenInterval seconds to availability rate
    me.rateByDay[today] = Math.min(Number(me.rateByDay[today]) + (seenInterval / 1000), MAX_PER_DAY);

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
          iconUrl: res.photo || "images/icon-128.png",
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
  setInterval(seenLoop, seenInterval);
  seenLoop();
}

var getUserIdFromEmail = function (email) {
  $.get(api + '/user?email=' + email, function (res) {
    clearInterval(initUserInterval);
    me = res[0];
    console.log('Got User:', me);
    initInterval();

    setInterval(checkBusyCalendar, calenderCheckInterval);
    checkBusyCalendar();
  });
}

var isLegitUser = true;
var initUserInterval = setInterval(initUser, 30 * 1000);
initUser();

function initUser() {
  chrome.identity.getProfileUserInfo(function (res) {
    if (res.email && res.email.indexOf('@wix.com') > 0) {
      getUserIdFromEmail(res.email);
    } else {
      clearInterval(initUser);
      isLegitUser = false;
    }
  });
}


chrome.browserAction.setIcon({'path': api + '/images/icons/blue.png'})
