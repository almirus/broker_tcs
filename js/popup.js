$(function() {
    chrome.runtime.sendMessage({method:"getSum"},function(reply){
        $('#sum').text(reply);
    });
});