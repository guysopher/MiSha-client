'use strict';
//
//chrome.runtime
//  .onInstalled.addListener(details => {
//  console.log('previousVersion', details.previousVersion);
//});

chrome.browserAction.setBadgeText({text: '\'Allo'});

var api = 'http://localhost:1337'; //'http://misha-api.herokuapp.com'

var initInterval = function (me) {
  setInterval(function(){
    $.post(api + '/user/seen?user_id=' + me.id, function(res) {
      console.log("got response", res);
      console.count("got response");

      if (res.notify) {
        chrome.notifications.create('temp', {
          type: "basic",
          iconUrl: "images/icon-128.png",
          title: res.message,
          message: "Default Message",
          expandedMessage: " Expanded message"

        }, function(data) {
          console.log('Notification callback', data);
        })
      }
    });
  }, 12000);
}


//OAUTH stuff
chrome.identity.getAuthToken(

  {'interactive': true},
  function(token){
    //load Google's javascript client libraries

    var x = new XMLHttpRequest();
    x.open('GET', 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + token);
    x.onload = function() {
      var parsed_response = JSON.parse(x.response);
      $.get(api+'/user?email='+parsed_response.email, function(res) {
        var me = res[0];
        chrome.storage.local.set({me: me});
        initInterval(me);
      });
    };
    x.send();

  }
);


