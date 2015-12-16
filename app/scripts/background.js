'use strict';
//
//chrome.runtime
//  .onInstalled.addListener(details => {
//  console.log('previousVersion', details.previousVersion);
//});

chrome.browserAction.setBadgeText({ text: '\'Allo' });

var api = 'http://localhost:1337'; //'http://misha-api.herokuapp.com'

var initInterval = function initInterval(me) {
  setInterval(function () {
    $.post(api + '/user/seen?user_id=' + me.id, function (res) {
      console.log("got response", res);
      console.count("got response");

      if (res.notify) {
        chrome.notifications.create('temp', {
          type: "basic",
          iconUrl: "images/icon-128.png",
          title: res.message,
          message: "Default Message",
          expandedMessage: " Expanded message"

        }, function (data) {
          console.log('Notification callback', data);
        });
      }
    });
  }, 12000);
};

var getUserIdFromEmail = function(email) {
  $.get(api + '/user?email=' + email, function (res) {
    var me = res[0];
    chrome.storage.local.set({ me: me });
    initInterval(me);
  });
}

//OAUTH stuff
chrome.identity.getProfileUserInfo(function(res) {
  if (res.email) {
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

//# sourceMappingURL=background.js.map
