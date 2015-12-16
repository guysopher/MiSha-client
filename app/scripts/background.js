'use strict';
//
//chrome.runtime
//  .onInstalled.addListener(details => {
//  console.log('previousVersion', details.previousVersion);
//});

chrome.browserAction.setBadgeText({ text: '\'Allo' });

var api = 'http://localhost:1337'; //'http://misha-api.herokuapp.com'

setInterval(function () {
  $.post(api + '/user/seen?user_id=567151fe7d2baa1d49c0dcfa', function (res) {
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
//# sourceMappingURL=background.js.map
