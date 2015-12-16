'use strict';
//
//chrome.runtime
//  .onInstalled.addListener(details => {
//  console.log('previousVersion', details.previousVersion);
//});

chrome.browserAction.setBadgeText({ text: '\'Allo' });

var api = 'http://localhost:1337'; //'http://misha-api.herokuapp.com'

setInterval(function () {
  $.post(api + '/user/seen?email=guyso@wix.com');
}, 15000);

//OAUTH stuff
chrome.identity.getAuthToken({ 'interactive': true }, function (token) {
  //load Google's javascript client libraries

  var x = new XMLHttpRequest();
  x.open('GET', 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + token);
  x.onload = function () {
    alert(x.response);
    var parsed_response = JSON.parse(x.response);
    $.get(api + '/user?email=' + parsed_response.email, function (res) {
      console.log('got', res);
    });
  };
  x.send();
});
//# sourceMappingURL=background.js.map
