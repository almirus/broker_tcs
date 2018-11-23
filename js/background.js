const INFO_URL = 'https://api.tinkoff.ru/v1/session_status?sessionid=';
const TRADING_PURCHASED_URL = 'https://api.tinkoff.ru/trading/portfolio/purchased_securities?sessionId=';
const LOGIN_URL = 'https://www.tinkoff.ru/login/?redirectTo=/invest/broker_account/';
const HOST_URL = 'https://www.tinkoff.ru/';
const ALL_ACCOUNTS = 'https://api.tinkoff.ru/trading/portfolio/all_accounts?sessionId=';
const BUY_LINK = 'https://www.tinkoff.ru/invest/buy/';
const SELL_LINK = 'https://www.tinkoff.ru/invest/sell/';
const PING_URL = 'https://api.tinkoff.ru/v1/ping?sessionid=';
const INTERVAL_TO_CHECK=1;

/**
 * проверяем что сессия жива
 * @param {string} sessionId значение
 * @return {Promise<Response | never | boolean>} можно использовать или нет
 */
function sessionIsAlive(sessionId) {
    return fetch(INFO_URL + sessionId)
        .then(function (response) {
            return response.json()
        }).then(function (json) {
            if (json.resultCode === 'OK') {
                if (json.payload.accessLevel === 'ANONYMOUS') {
                    console.log('session is dead');
                    return false;
                } else {
                    console.log('session is alive');
                    return true;
                }
            } else {
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
                sessionIsAlive(psid[0].value).then(function (response) {
                    if (response) {
                        resolve(psid[0].value)
                    } else
                        reject(undefined);
                })
            } else {
                console.log('psid not found');
                reject(undefined);
            }
        });
    })
}

/**
 * получаем полную стоимость всех бумаг
 * @return {object} - сумма
 */
function getAllSum() {
    return new Promise(function (resolve, reject) {
        console.log('try to get sums');
        getTCSsession().then(function (session_id) {
            fetch(TRADING_PURCHASED_URL + session_id)
                .then(function (response) {
                    return response.json()
                }).then(function (json) {
                console.log('parsed json', json);
                resolve({
                    totalAmountPortfolio: json.payload.totalAmountPortfolio.value,
                    expectedYield: json.payload.expectedYield.value,
                    expectedYieldRelative: json.payload.expectedYieldRelative/100,
                    expectedYieldPerDay: json.payload.expectedYieldPerDay.value,
                    expectedYieldPerDayRelative: json.payload.expectedYieldPerDayRelative/100,
                });
            }).catch(function (ex) {
                console.log('parsing failed', ex)
                reject(undefined);
            })
        }).catch(function () {
            // редиректим на страницу логина
            chrome.tabs.query({url: HOST_URL + '*'}, function (tabs) {
                if (tabs.length) {
                    // если был открыт - обновляем
                    chrome.tabs.reload(tabs[0].id);
                    chrome.tabs.update(tabs[0].id, {selected: true, url: LOGIN_URL});
                } else {
                    // иначе - открываем заново
                    chrome.tabs.create({active: true, url: LOGIN_URL});
                }
            });

        })
    })
}

/**
 * обновляем все данные на форме
 * @return {object} данные для отображения на форме
 */
function updatePopup() {
    return new Promise(function (resolve, reject) {
        let date = new Date();
        let time_str = {timestamp: date.toLocaleDateString() + ' ' + date.toLocaleTimeString()};
        getAllSum().then(function (sums) {
            resolve( Object.assign({}, time_str, sums));
        }).catch(() => {
            console.log('can\'t resolve sums');
            reject(undefined);
        })
    })
}

chrome.runtime.onConnect.addListener(function (port) {
    console.log("Connected .....");
    port.onMessage.addListener(function (msg) {
        console.log("message received " + JSON.stringify(msg));
        switch (msg.method) {
            case 'getAllSum':
                getAllSum().then(function (sums) {
                    port.postMessage({sum: sums});
                });
                break;
            case'updatePopup':
                updatePopup().then(function (popup_data) {
                    port.postMessage(popup_data);
                });
                break;
            default:
                port.postMessage('unknown request');
        }
    });
});

chrome.alarms.create("pingServer", {
    delayInMinutes: INTERVAL_TO_CHECK,
    periodInMinutes: INTERVAL_TO_CHECK
});

chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name === "pingServer") {
        console.log('ping server');
        getTCSsession().then(function (session_id) {
            fetch(PING_URL + session_id).then(function(response) {
                return response.blob();
            })
        })
    }
});