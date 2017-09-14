/*
chrome.runtime.sendMessage({method: "getAllSum"}, function (reply) {
    chrome.extension.getBackgroundPage().console.log('get sum from background =' + JSON.stringify(reply));
});
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    chrome.extension.getBackgroundPage().console.log('get sum from background ' + request.sum);
    document.getElementById('sum').innerText = request.sum;
});
*/

let port = chrome.extension.connect({
    name: "tcs_trader"
});

port.postMessage({method: "getAllSum"});

port.onMessage.addListener(function(msg) {
    chrome.extension.getBackgroundPage().console.log('get sum from background ' + msg.sum);
});