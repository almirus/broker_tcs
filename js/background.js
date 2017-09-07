function getTCSsession() {
    console.log('try to get cookies');
    var session_id;
    chrome.cookies.getAll({}, function (cookie) {
        var psid = cookie.filter(function (value) {
            return value.name == 'psid';
        });
        session_id=psid[0].value;
    });
    return session_id;
}

function getSum() {
    var session_id = getTCSsession();
    console.log('ssid='+session_id);
    if (session_id) {
        $.getJSON('https://api.tinkoff.ru/trading/portfolio/purchased_securities?sessionId=' + session_id, function (data) {
            console.log('sum='+data.payload.totalAmountStocks);
            return data.payload.totalAmountStocks;
        });
    }else{
        return 'Ошибка получения сумм'
    }
};
chrome.runtime.onMessage.addListener(function(message,sender,sendRepsonse){
    if(message.method == "getSum")
        chrome.runtime.sendMessage(getSum(), function (response) {
            ;
        })
});