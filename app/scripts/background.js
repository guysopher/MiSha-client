'use strict';
//
//chrome.runtime
//  .onInstalled.addListener(details => {
//  console.log('previousVersion', details.previousVersion);
//});

chrome.browserAction.setBadgeText({ text: '\'Allo' });

var api = 'http://localhost:1337'; //'http://misha-api.herokuapp.com'



//OAUTH stuff
chrome.identity.getAuthToken({ 'interactive': true }, function (token) {
  //load Google's javascript client libraries

  var x = new XMLHttpRequest();
  x.open('GET', 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + token);
  x.onload = function () {
    alert(x.response);
    var parsed_response = JSON.parse(x.response);
    $.get(api + '/user?email=' + parsed_response.email, function (res) {
      chrome.storage.local.set({me: res[0]});
      console.log('got', res);
    });
  };
  x.send();
});

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
