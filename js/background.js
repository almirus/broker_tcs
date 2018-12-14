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
    OPTION_ALERT_TODAY_PER_SYMBOL,
    OPTION_ALERT_TODAY_VALUE,
    OPTION_ALERT_TODAY_VALUE_PER_SYMBOL,
    OPTION_REDIRECT,
    OPTION_SESSION,
    PING_URL,
    PORTFOLIO_URL,
    PRICE_URL,
    SEARCH_URL,
    SELL_LINK,
    SYMBOL_LINK,
    SYMBOL_URL,
    TICKER_LIST,
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
            fetch(PORTFOLIO_URL + session_id)
                .then(function (response) {
                    return response.json()
                }).then(function (json) {

                resolve({
                    totalAmountPortfolio: json.payload.totalAmountPortfolio.value,
                    expectedYield: json.payload.expectedYield.value,
                    expectedYieldRelative: json.payload.expectedYieldRelative / 100,
                    expectedYieldPerDay: json.payload.expectedYieldPerDay.value,
                    expectedYieldPerDayRelative: json.payload.expectedYieldPerDayRelative / 100,
                });
            }).catch(function (ex) {
                console.log('parsing failed', ex);
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
            if (!/^\d+$/.test(name)) { // вручную, введена строка для поиска
                findTicker(name, session_id)
                    .then(function (json) {
                        console.log('found list');
                        let return_data = [];
                        json.payload.values.forEach(function (element) {
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
            } else if (name === 3) { // избранное
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
                if (name === 2) { // портфолио
                    fetch(PORTFOLIO_URL + session_id)
                        .then(function (response) {
                            return response.json()
                        }).then(async function (json) {
                        console.log('list of portfolio');
                        let return_data = [];
                        for (const element of json.payload.data) {
                            await getSymbolInfo(element.ticker, session_id).then(function (symbol) {
                                return_data.push({
                                    prices: symbol.payload.prices,
                                    earnings: symbol.payload.earnings,
                                    symbol: {
                                        ticker: element.ticker,
                                        showName: symbol.payload.symbol.description,
                                        lotSize: element.currentBalance,
                                        expectedYieldRelative: element.expectedYieldRelative,
                                        expectedYield: element.expectedYield,
                                        currentPrice: element.currentPrice,
                                        currentAmount: element.currentAmount,
                                        averagePositionPrice: element.averagePositionPrice || {},
                                    },
                                    exchangeStatus: element.exchangeStatus
                                });
                            }).catch(e => {
                                console.log(e);
                            });
                        }
                        resolve(Object.assign({}, {result: "listStock"}, {stocks: return_data}));
                    }).catch(function (ex) {
                        console.log('parsing failed', ex);
                        reject(undefined);
                    })
                }
            }
        })
    })
}

function findTicker(search, session_id) {
    return new Promise(function (resolve, reject) {
            // POST
            fetch(SEARCH_URL + session_id, {
                method: "POST",
                body: JSON.stringify({
                    start: 0,
                    end: 1000,
                    sortType: "ByName",
                    orderType: "Asc",
                    country: "All",
                    filter: search
                }),
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
                        console.log('Сервис поиска недоступен');
                        reject(undefined)
                    }
                }).catch(e => {
                console.log(e);
                reject(undefined);
            })
        }
    )
}

function getPriceInfo(ticker, session_id) {
    return new Promise(function (resolve, reject) {
        console.log(`Get price for ${ticker}`);
        if (ticker) {
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
                        console.log(`Сервис цен недоступен для ${ticker}`);
                        reject(undefined)
                    }
                }).catch(e => {
                console.log(e);
                reject(undefined);
            })
        } else reject(undefined);
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
                    console.log(`Сервис информации о бумаге ${ticker} недоступен`);
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
            getPriceInfo(item.ticker, session_id).then(function (res) {
                let sell = 0, buy = 0;
                let last_price = res.payload.last.value;
                let sell_price = res.payload.buy.value;
                let buy_price = res.payload.sell.value;
                if (item.sell_price && (last_price / 1) >= item.sell_price / 1) sell = 1;
                if (item.buy_price && (last_price / 1) <= item.buy_price / 1) buy = 1;
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
    console.log('delete alert for ' + ticker);
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

function updateAlertPrices() {
    chrome.storage.sync.get([TICKER_LIST], function (data) {
        let alert_data = data[TICKER_LIST] || [];
        alert_data.forEach(function (item, i, alertList) {
            getTCSsession().then(function (session_id) {
                getPriceInfo(item.ticker, session_id).then(function (res) {
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
                chrome.storage.sync.get([OPTION_ALERT_TODAY_VALUE], function (result) {
                    let alert_value = result[OPTION_ALERT_TODAY_VALUE] || 2;
                    if (sums.expectedYieldPerDayRelative >= (alert_value / 100)) {
                        chrome.notifications.create(OPTION_ALERT_TODAY, {
                            type: 'basic',
                            iconUrl: '/icons/profits_72px_1204282_easyicon.net.png',
                            title: `Доходность резко повысилась более чем на ${alert_value}%`,
                            message: 'Проверьте свой портфель',
                            requireInteraction: true,
                            buttons: [
                                {title: 'Удалить уведомление и перейти в портфель'}
                            ],
                            priority: 0
                        });
                    }
                    if (sums.expectedYieldPerDayRelative <= -(alert_value / 100)) {
                        chrome.notifications.create(OPTION_ALERT_TODAY, {
                            type: 'basic',
                            iconUrl: '/icons/loss_72px_1204272_easyicon.net.png',
                            title: `Доходность резко снизилась более чем на ${alert_value}%`,
                            message: 'Проверьте свой портфель',
                            requireInteraction: true,
                            buttons: [
                                {title: 'Удалить уведомление и перейти в портфель'}
                            ],
                            priority: 0
                        });
                    }
                })
            })
        }
    })
}

function checkSymbolsAlerts() {
    chrome.storage.sync.get([OPTION_ALERT_TODAY_PER_SYMBOL], function (result) {
        if (result[OPTION_ALERT_TODAY_PER_SYMBOL]) {
            console.log('check portfolio symbols for yield');
            getTCSsession().then(function (session_id) {
                getListStock(2).then(function (list_symbols) {
                    chrome.storage.sync.get([OPTION_ALERT_TODAY_VALUE_PER_SYMBOL], function (result) {
                        let alert_value = result[OPTION_ALERT_TODAY_VALUE_PER_SYMBOL] || 5;
                        list_symbols.stocks.forEach(function (item, i, alertList) {
                            getPriceInfo(item.symbol.ticker, session_id).then(function (res) {
                                let earnings_relative = (res.payload.earnings.relative * 100).toFixed(2);
                                if (earnings_relative / 1 >= (alert_value / 1)) {
                                    chrome.notifications.create(OPTION_ALERT_TODAY_PER_SYMBOL + '|' + item.symbol.ticker, {
                                        type: 'basic',
                                        iconUrl: '/icons/profits_72px_1204282_easyicon.net.png',
                                        title: `Доходность ${item.symbol.ticker} достигла ${alert_value}% и составила ${earnings_relative}%`,
                                        message: 'Проверьте свой портфель',
                                        requireInteraction: true,
                                        buttons: [
                                            {title: 'Купить'},
                                            {title: 'Продать'},
                                            {title: 'Больше не показывать'},
                                        ],
                                        priority: 0
                                    });
                                }
                                if (earnings_relative / 1 <= -(alert_value / 1)) {
                                    chrome.notifications.create(OPTION_ALERT_TODAY_PER_SYMBOL + '|' + item.symbol.ticker, {
                                        type: 'basic',
                                        iconUrl: '/icons/loss_72px_1204272_easyicon.net.png',
                                        title: `Доходность ${item.symbol.ticker} достигла -${alert_value}% и составила ${earnings_relative}%`,
                                        message: 'Проверьте свой портфель',
                                        requireInteraction: true,
                                        buttons: [
                                            {title: 'Купить'},
                                            {title: 'Продать'},
                                            {title: 'Больше не показывать'},
                                        ],
                                        priority: 0
                                    });
                                }
                            }).catch(e => {
                                console.log(e);
                            });

                        });
                    })
                });
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
                console.log(`check alert for ${item.ticker}`);
                checkTicker(item).then(function (response) {
                    console.log('Пытаемся проверить ' + item.ticker + ' на продажу по ' + item.sell_price + ' и покупку по ' + item.buy_price);
                    if (response.buy) {
                        chrome.notifications.create('buy|' + item.ticker, {
                            type: 'basic',
                            iconUrl: '/icons/buy-2-64.png',
                            title: 'Цена достигла',
                            message: `Цена ${item.ticker} достигла цены покупки ${item.buy_price}`,
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
                            message: `Цена ${item.ticker} достигла цены продажи ${item.sell_price}`,
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
            case 'updateAlertPrices':
                updateAlertPrices().then(function (alert_list) {
                    console.log("send message tickerInfo .....");
                    port.postMessage(Object.assign({}, {result: "updatePrice"}, {stocks: alert_list}));
                });
                break;
            case 'getPriceInfo':
                getPriceInfo(msg.params).then(function (ticker_info) {
                    console.log("send message tickerInfo .....");
                    port.postMessage(Object.assign({}, {result: "tickerInfo"}, {ticker: ticker_info}));
                });
                break;
            case 'getPortfolio':
                getListStock(2).then(function (list_symbols) {
                    console.log("send message portfolio .....");
                    list_symbols.result = 'listPortfolio';
                    port.postMessage(list_symbols);
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
// листнер на клик по уведомлению
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
    if (notificationId.includes(OPTION_ALERT_TODAY_PER_SYMBOL)) {
        redirect_to_page(SYMBOL_LINK + ticker[1])
    }
});
// листнер на клик по кнопкам в уведомлении
chrome.notifications.onButtonClicked.addListener(function (notificationId, btnIdx) {
    let ticker = notificationId.split("|");
    // нажали по кнопке Удалить уведомление о изменении стоимости портфеля
    if (notificationId === OPTION_ALERT_TODAY) {
        if (btnIdx === 0) {
            chrome.notifications.clear(notificationId);
            chrome.storage.sync.set({[OPTION_ALERT_TODAY]: false}, function () {
                console.log('Alert_today option set to ' + false);
                redirect_to_page(LOGIN_URL)
            })
        }
    }
    // нажали на кнопках в Уведомлении об изменении цены акций
    if (notificationId.includes(OPTION_ALERT_TODAY_PER_SYMBOL)) {
        chrome.notifications.clear(notificationId);
        if (btnIdx === 0) {
            redirect_to_page(BUY_LINK + ticker[1], true)
        } else if (btnIdx === 1) {
            redirect_to_page(SELL_LINK + ticker[1], true)
        } else {
            // ставим метку больше не показывать
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
                        checkAlerts();          // достижение цены по бумагам в списке отслеживания
                        checkPortfolioAlerts(); // резкая смена доходности портфеля
                        checkSymbolsAlerts(); // резкая смена доходности портфеля
                        updateAlertPrices();    // обновляем цены в интерфейсе настроек

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