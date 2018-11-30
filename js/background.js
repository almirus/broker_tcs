'use strict';

import {
    BUY_LINK,
    FAVORITE_URL,
    HOST_URL,
    INFO_URL,
    INTERVAL_TO_CHECK,
    LOGIN_URL,
    OPTION_ALERT,
    OPTION_ALERT_TODAY,
    OPTION_REDIRECT,
    OPTION_SESSION,
    PING_URL,
    PORTFOLIO_URL,
    PRICE_URL,
    SELL_LINK,
    SYMBOL_URL,
    TICKER_LIST,
    TRADING_PURCHASED_URL
} from "/js/constants.mjs";


function redirect_to_page(url, open_new = false) {
    chrome.tabs.query({url: HOST_URL + '*'}, function (tabs) {
        console.log('redirect to page');
        if (!open_new && tabs.length) {
            // если был открыт - обновляем
            chrome.tabs.reload(tabs[0].id);
            chrome.tabs.update(tabs[0].id, {selected: true, url: url});
        } else {
            // иначе - открываем заново
            chrome.tabs.create({active: true, url: url});
        }
    });
}

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
            if (json.resultCode.toLocaleUpperCase() === 'OK') {
                if (json.payload.accessLevel.toLocaleUpperCase() === 'ANONYMOUS') {
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
            if (psid.length > 0 && psid[0].value) {
                console.log('psid founded');
                sessionIsAlive(psid[0].value).then(function (response) {
                    if (response) {
                        resolve(psid[0].value)
                    } else
                        reject(false);
                }).catch(e => {
                    console.log(e);
                });
            } else {
                console.log('psid not found');
                reject(false);
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
                    expectedYieldRelative: json.payload.expectedYieldRelative / 100,
                    expectedYieldPerDay: json.payload.expectedYieldPerDay.value,
                    expectedYieldPerDayRelative: json.payload.expectedYieldPerDayRelative / 100,
                });
            }).catch(function (ex) {
                console.log('parsing failed', ex)
                reject(undefined);
            })
        }).catch(function () {
            redirect_to_page(LOGIN_URL);
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
            resolve(Object.assign({}, {result: "updatePopup"}, time_str, sums));
        }).catch(() => {
            console.log('can\'t resolve sums');
            reject(undefined);
        })
    })
}

/**
 * получаем список акций
 * @return {object} данные для отображения на форме
 */
function getListStock(name) {
    return new Promise(function (resolve, reject) {
        console.log('try to get list');
        getTCSsession().then(function (session_id) {
            if (name === 3) {
                fetch(FAVORITE_URL + session_id)
                    .then(function (response) {
                        return response.json()
                    }).then(function (json) {
                    console.log('list of favorite');
                    let return_data = [];
                    json.payload.stocks.forEach(function (element) {
                        return_data.push({
                            prices: element.prices,
                            symbol: {
                                ticker: element.symbol.ticker,
                                showName: element.symbol.showName,
                                lotSize: element.symbol.lotSize,
                            },
                            exchangeStatus: element.exchangeStatus
                        });
                    });
                    resolve(Object.assign({}, {result: "listStock"}, {stocks: return_data}));
                }).catch(function (ex) {
                    console.log('parsing failed', ex);
                    reject(undefined);
                })
            } else {
                if (name === 2) {
                    fetch(PORTFOLIO_URL + session_id)
                        .then(function (response) {
                            return response.json()
                        }).then(function (json) {
                        console.log('list of portfolio');
                        let return_data = [];
                        json.payload.data.forEach(function (element) {
                            return_data.push({
                                prices: {
                                    last: {
                                        value: element.currentPrice.value,
                                        currency: element.currentPrice.currency
                                    }
                                },
                                symbol: {
                                    ticker: element.ticker,
                                    // showName: symbol.payload.symbol.brand,
                                    lotSize: element.currentBalance,
                                },
                                exchangeStatus: element.exchangeStatus
                            });
                        });
                        resolve(Object.assign({}, {result: "listStock"}, {stocks: return_data}));
                    }).catch(function (ex) {
                        console.log('parsing failed', ex)
                        reject(undefined);
                    })
                }
            }
        })
    })
}

function getTickerInfo(ticker, session_id) {
    return new Promise(function (resolve, reject) {
        // POST
        fetch(PRICE_URL + session_id, {
            method: "POST",
            body: JSON.stringify({ticker: ticker}),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        }).then(function (res) {
            return res.json();
        })
            .then(function (res) {
                if (res.status.toLocaleUpperCase() === 'OK') {
                    resolve(res);
                } else {
                    console.log('Сервис цен недоступен');
                    reject(undefined)
                }
            }).catch(e => {
            console.log(e);
            reject(undefined);
        })
    })
}

function getSymbolInfo(ticker, session_id) {
    return new Promise(function (resolve, reject) {
        // POST
        fetch(SYMBOL_URL + session_id, {
            method: "POST",
            body: JSON.stringify({ticker: ticker}),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        }).then(function (res) {
            return res.json();
        })
            .then(function (res) {
                if (res.status.toLocaleUpperCase() === 'OK') {
                    resolve(res);
                } else {
                    console.log('Сервис информации о бумаге недоступен');
                    reject(undefined)
                }
            }).catch(e => {
            console.log(e);
            reject(undefined);
        })
    })
}

function checkTicker(item) {
    return new Promise(function (resolve, reject) {
        getTCSsession().then(function (session_id) {
            getTickerInfo(item.ticker, session_id).then(function (res) {
                let sell, buy = 0;
                let last_price = res.payload.last.value;
                let sell_price = res.payload.buy.value;
                let buy_price = res.payload.sell.value;
                if (item.sell_price && last_price >= item.sell_price) sell = 1;
                if (item.buy_price && last_price <= item.buy_price) buy = 1;
                resolve({buy: buy, sell: sell});
            }).catch(e => {
                console.log(e);
                reject(undefined);
            })
        }).catch(e => {
            console.log(e);
            reject(undefined);
        });
    })
}

function deleteFromAlert(ticker) {
    console.log('Удаляем проверку ' + ticker);
    chrome.storage.sync.get([TICKER_LIST], function (data) {
        let alert_data = data[TICKER_LIST] || [];
        let new_alert_date = alert_data.slice();
        alert_data.forEach(function (item, i) {
            if (item.ticker === ticker) {
                new_alert_date.splice(i, 1);
            }
        });
        chrome.storage.sync.set({[TICKER_LIST]: new_alert_date}, function () {
            console.log('Save ticker ' + JSON.stringify(new_alert_date));
        })
    })
}

function updatePrices() {
    chrome.storage.sync.get([TICKER_LIST], function (data) {
        let alert_data = data[TICKER_LIST] || [];
        alert_data.forEach(function (item, i, alertList) {
            getTCSsession().then(function (session_id) {
                getTickerInfo(item.ticker, session_id).then(function (res) {
                    alertList[i] = {
                        ticker: item.ticker,
                        showName: item.showName,
                        buy_price: item.buy_price,
                        sell_price: item.sell_price,
                        best_before: item.best_before,
                        active: item.active,

                        exchangeStatus: res.payload.exchangeStatus,
                        currency: res.payload.last.currency,
                        online_average_price: res.payload.last.value,
                        online_buy_price: res.payload.buy.value,
                        online_sell_price: res.payload.sell.value,
                    };
                    chrome.storage.sync.set({[TICKER_LIST]: alertList}, function () {
                        //console.log('Save ticker ' + JSON.stringify(allertList));
                    })
                })
            })
        })
    })
}

function checkPortfolioAlerts() {
    chrome.storage.sync.get([OPTION_ALERT_TODAY], function (result) {
        if (result[OPTION_ALERT_TODAY]) {
            console.log('check portfolio for yield');
            getAllSum().then(function (sums) {
                if (sums.expectedYieldPerDayRelative >= 0.001) {
                    chrome.notifications.create(OPTION_ALERT_TODAY, {
                        type: 'basic',
                        iconUrl: '/icons/profits_72px_1204282_easyicon.net.png',
                        title: 'Доходность резко повысилась более чем на 3%',
                        message: 'Проверьте свой портфель',
                        requireInteraction: true,
                        buttons: [
                            {title: 'Удалить уведомление и перейти в портфель'}
                        ],
                        priority: 0
                    });
                }
                if (sums.expectedYieldPerDayRelative <= -0.001) {
                    chrome.notifications.create(OPTION_ALERT_TODAY, {
                        type: 'basic',
                        iconUrl: '/icons/loss_72px_1204272_easyicon.net.png',
                        title: 'Доходность резко снизилась более чем на 3%',
                        message: 'Проверьте свой портфель',
                        requireInteraction: true,
                        buttons: [
                            {title: 'Удалить уведомление и перейти в портфель'}
                        ],
                        priority: 0
                    });
                }
            })
        }
    })
}

function checkAlerts() {
    chrome.storage.sync.get([TICKER_LIST], function (data) {
        let alert_data = data[TICKER_LIST] || [];
        alert_data.forEach(function (item) {
            if (!item.best_before || Date.parse(item.best_before) > new Date()) {
                // или дата не установлена или больше текущей => проверка не просрочилась
                checkTicker(item).then(function (response) {
                    console.log('Пытаемся проверить ' + item.ticker + ' на продажу по ' + item.sell_price + ' и покупку по ' + item.buy_price);
                    if (response.buy) {
                        chrome.notifications.create('buy|' + item.ticker, {
                            type: 'basic',
                            iconUrl: '/icons/buy-2-64.png',
                            title: 'Цена достигла',
                            message: 'Цена ' + item.ticker + ' достигла цены покупки ' + item.buy_price,
                            requireInteraction: true,
                            priority: 0
                        });
                        chrome.storage.sync.get([OPTION_ALERT], function (result) {
                            if (result[OPTION_ALERT])
                                redirect_to_page(BUY_LINK + item.ticker + '/', true);
                        });
                        deleteFromAlert(item.ticker);
                        console.log('Проверка сработала по покупке ' + item.ticker + ' за ' + item.buy_price);
                    }
                    if (response.sell) {
                        chrome.notifications.create('sell|' + item.ticker, {
                            type: 'basic',
                            iconUrl: "/icons/sell-2-64.png",
                            title: 'Цена достигла',
                            message: 'Цена ' + item.ticker + ' достигла цены продажи ' + item.sell_price,
                            requireInteraction: true,
                            priority: 0
                        });
                        chrome.storage.sync.get([OPTION_ALERT], function (result) {
                            if (result[OPTION_ALERT])
                                redirect_to_page(SELL_LINK + item.ticker + '/', true);
                        });
                        deleteFromAlert(item.ticker);
                        console.log('Проверка сработала по продаже ' + item.ticker + ' за ' + item.sell_price);
                    }

                }).catch(e => {
                    console.log('Не удалось проверить цену ' + item.ticker + ' потому что ' + e);
                })
            } else {
                // просрочилась проверка
                if (Date.parse(item.best_before) < new Date()) deleteFromAlert(item.ticker);
            }
        })
    });
}

// основной слушатель
chrome.runtime.onConnect.addListener(function (port) {
    console.log("Connected .....");
    port.onMessage.addListener(function (msg) {
        console.log("Background - message received " + JSON.stringify(msg));
        switch (msg.method) {
            case 'updatePrices':
                updatePrices();
                break;
            case 'getTickerInfo':
                getTickerInfo(msg.params).then(function (ticker_info) {
                    console.log("send message tickerInfo .....");
                    port.postMessage(Object.assign({}, {result: "tickerInfo"}, {ticker: ticker_info}));
                });
                break;
            case 'getListStock':
                getListStock(msg.params).then(function (list_symbols) {
                    console.log("send message listStock .....");
                    port.postMessage(list_symbols);
                });
                break;
            case 'updatePopup':
                updatePopup().then(function (popup_data) {
                    console.log("send message updatePopup .....");
                    port.postMessage(popup_data);
                });
                break;
            case 'getSession':
                getTCSsession().then(function (session_id) {
                    console.log("send message session .....");
                    port.postMessage(Object.assign({}, {result: "session"}, {sessionId: session_id}));
                }).catch(e => {
                    port.postMessage(Object.assign({}, {result: "session"}, {sessionId: undefined}));
                    console.log(e);
                });
                break;
            default:
                port.postMessage('unknown request');
        }
    });
});

chrome.notifications.onClicked.addListener(function (notificationId) {
    let ticker = notificationId.split("|");
    if (notificationId.includes("buy")) {
        redirect_to_page(BUY_LINK + ticker[1], true)
    }
    if (notificationId.includes("sell")) {
        redirect_to_page(SELL_LINK + ticker[1], true)
    }
    if (notificationId === OPTION_ALERT_TODAY) {
        redirect_to_page(LOGIN_URL)
    }
});
chrome.notifications.onButtonClicked.addListener(function(notificationId, btnIdx) {
    if (notificationId === OPTION_ALERT_TODAY) {
        if (btnIdx === 0) {
            chrome.notifications.clear(notificationId);
            chrome.storage.sync.set({[OPTION_ALERT_TODAY]: false}, function () {
                console.log('Alert_today option set to ' + false);
                redirect_to_page(LOGIN_URL)
            })
        }
    }
});

// запускаем фоновый пинг сервера + в нем все проверки
chrome.alarms.create("pingServer", {
    delayInMinutes: INTERVAL_TO_CHECK,
    periodInMinutes: INTERVAL_TO_CHECK
});

chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === "pingServer") {
        chrome.storage.sync.get([OPTION_SESSION], function (result) {
            console.log('get session option');
            if (result[OPTION_SESSION]) {
                console.log('ping server');
                getTCSsession().then(function (session_id) {
                    fetch(PING_URL + session_id).then(function (response) {
                        checkAlerts();
                        checkPortfolioAlerts();
                        updatePrices();
                        // возвращаем обычную иконку
                        chrome.browserAction.setIcon({path: "/icons/icon16.png"});
                        chrome.browserAction.setTitle({title: 'TCS Broker'});
                        return response.blob();
                    }).catch(e => {
                        console.log('Сервис недоступен ' + e);
                    })
                }).catch(e => {
                    // сессия невалидна
                    chrome.storage.sync.get([OPTION_REDIRECT], function (result) {
                        console.log('get redirect option');
                        if (result[OPTION_REDIRECT]) {
                            redirect_to_page(LOGIN_URL)
                        } else {
                            // меняем иконку на воскл знак
                            chrome.browserAction.setTitle({title: 'Сессия истекла, проверьте настройки'});
                            chrome.browserAction.setIcon({path: "/icons/icon16_warning.png"});
                        }
                    });
                    console.log(e);
                })
            }
        })
    }
});