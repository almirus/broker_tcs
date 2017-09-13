
    chrome.runtime.sendMessage({method:"getSum"},function(reply){
        chrome.extension.getBackgroundPage().console.log('get sum from background ='+reply);
    });
    chrome.runtime.onMessage.addListener (function (request, sender, sendResponse) {
        chrome.extension.getBackgroundPage().console.log('get sum from background '+request.sum);
        document.getElementById('sum').innerText=request.sum;
    });