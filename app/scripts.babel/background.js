'use strict';
//
//chrome.runtime
//  .onInstalled.addListener(details => {
//  console.log('previousVersion', details.previousVersion);
//});

chrome.browserAction.setBadgeText({text: '\'Allo'});

var api = 'http://localhost:1337'; //'http://misha-api.herokuapp.com'

setInterval(function(){
  $.post(api + '/user/seen?email=guyso@wix.com');
}, 15000);