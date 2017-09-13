function getTCSsession() {
    return new Promise(function (resolve, reject) {
        console.log('try to get cookies');
        chrome.cookies.getAll({}, function (cookie) {
            var psid = cookie.filter(function (value) {
                return value.name == 'psid';
            });
            if (psid[0].value) {
                console.log('psid founded');
                // пробуем проверить полученную печеньку
                fetch('https://api01.tinkoff.ru/v1/personal_info?sessionid=' + psid[0].value)
                    .then(function (response) {
                        return response.json()
                    }).then(function (json) {
                    console.log('parsed json', json);
                    if (json.resultCode=='OK') {
                        resolve(psid[0].value);
                    }else{
                        reject(undefined);
                    }

                }).catch(function (ex) {
                    console.log('parsing failed', ex)
                });

            } else {
                console.log('psid not found');
                reject(undefined);
            }
        });
    })
}

function getSum() {
    getTCSsession().then(function (session_id) {
        fetch('https://api.tinkoff.ru/trading/portfolio/purchased_securities?sessionId=' + session_id)
            .then(function (response) {
                return response.json()
            }).then(function (json) {
            console.log('parsed json', json)

        }).catch(function (ex) {
            console.log('parsing failed', ex)
        })
    }).catch(function () {
        // редиректим на страницу логина
    })
}

chrome.runtime.onMessage.addListener(function (message, sender, sendRepsonse) {
    if (message.method == "getSum")
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {sum: getSum()}, function(response) {
                console.log(response);
            });
        });
});
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(sender.tab ?
            "from a content script:" + sender.tab.url :
            "from the extension");
        console.log(request);
        if (request.method == "getSum")
            sendResponse({sum: getSum()});
    });

