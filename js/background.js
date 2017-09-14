const INFO_URL = 'https://api01.tinkoff.ru/v1/personal_info?sessionid=';
const TRADING_PURCHASED_URL = 'https://api.tinkoff.ru/trading/portfolio/purchased_securities?sessionId=';
const LOGIN_URL='https://www.tinkoff.ru/login/?redirectTo=%2Finvest%2F';
const HOST_URL='https://www.tinkoff.ru/';
/**
 * проверяем что сессия жива
 * @param {string} значение sessionId
 * @return {boolean} можно использовать или нет
 */
function sessionIsAlive(sessionId) {
    return fetch(INFO_URL + sessionId)
        .then(function (response) {
            return response.json()
        }).then(function (json) {
            if (json.resultCode=='OK') {
                console.log('session is alive');
                return true;
            }else{
                console.log('session is dead');
                return false;
            }
        }).catch(function (ex) {
            console.log('parsing failed', ex);
            return false;
        });
}
/**
 * получаем сессию пользователя из cookies + проверка что она валидна
 * @return {object} - возвращается строка с sessionId через promise
 */
function getTCSsession() {
    return new Promise(function (resolve, reject) {
        console.log('try to get cookies');
        chrome.cookies.getAll({}, function (cookie) {
            let psid = cookie.filter(function (value) {
                // нам нужен только один единственный с именем psid
                return value.name === 'psid';
            });
            if (psid[0].value) {
                console.log('psid founded');
                if (sessionIsAlive(psid[0].value)){
                    resolve(psid[0].value)
                } else {
                    reject(undefined);
                }
            } else {
                console.log('psid not found');
                reject(undefined);
            }
        });
    })
}

/**
 * получаем полную стоимость всех бумаг
 * @return {float} - сумма
 */
function getAllSum() {
    console.log('try to get sums');
    getTCSsession().then(function (session_id) {
        fetch(TRADING_PURCHASED_URL + session_id)
            .then(function (response) {
                return response.json()
            }).then(function (json) {
                console.log('parsed json', json);
            return json.payload.totalAmountStocks.value;
        }).catch(function (ex) {
            console.log('parsing failed', ex)
        })
    }).catch(function () {
        // редиректим на страницу логина
        chrome.tabs.query({url:HOST_URL+'*'}, function(tabs) {
            if(tabs.length) {
                // если был открыт - обновляем
                chrome.tabs.reload(tabs[0].id);
                chrome.tabs.update(tabs[0].id, {selected: true, url: LOGIN_URL});
            } else {
                // иначе - открываем заново
                chrome.tabs.create({active: true, url: LOGIN_URL});
            }
        });

    })
}

/**
 * обновляем все данные на форме
 * @return {object} данные для отображения на форме
 */
function updatePopup(){

}

/*
chrome.runtime.onMessage.addListener(function (message, sender, sendRepsonse) {
    if (message.method == "getAllSum")
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {sum: getAllSum()}, function(response) {
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
        if (request.method == "getAllSum")
            sendResponse({sum: getAllSum()});
    });
*/

chrome.runtime.onConnect.addListener(function(port) {
    console.log("Connected .....");
    port.onMessage.addListener(function(msg) {
        console.log("message recieved " + JSON.stringify(msg));
        if (msg.method == "getAllSum") {
            getAllSum().tnen(function (sums){
                port.postMessage({sum: sums});
            });

        }
    });
});