'use strict';

import {
    ALERT_TICKER_LIST,
    BUY_LINK,
    CHECK_VERSION_URL,
    CURRENCY_LIMIT_URL,
    CURRENCY_PRICE_URL,
    CURRENCY_SYMBOL_URL,
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
    OPTION_CONVERT_TO_RUB,
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
    USD_RUB,
    USER_URL
} from "/js/constants.mjs";

function redirect_to_page(url, open_new = false) {
    chrome.tabs.query({url: HOST_URL + '*'}, function (tabs) {
        console.log('redirect to page');
        if (!open_new && tabs.length) {
            // если был открыт - обновляем
            chrome.tabs.reload(tabs[0].id);
            chrome.tabs.update(tabs[0].id, {highlighted: true, url: url});
        } else {
            // иначе - открываем заново
            chrome.tabs.create({active: true, url: url});
        }
    });
}

/**
 * проверяем что сессия жива
 * @param {string} sessionId значение
 * @return {Promise<Response  | boolean>} можно использовать или нет
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
                    if (response.status === 502) {
                        return {status: 502, text: 'Сервис брокера недоступен'};
                    } else return response.json()
                }).then(function (json) {

                resolve({
                    totalAmountPortfolio: json.payload.totalAmountPortfolio.value,
                    expectedYield: json.payload.expectedYield.value,
                    expectedYieldRelative: json.payload.expectedYieldRelative / 100,
                    expectedYieldPerDay: json.payload.expectedYieldPerDay.value,
                    expectedYieldPerDayRelative: json.payload.expectedYieldPerDayRelative / 100,
                });
            }).catch(ex => {
                console.log('portfolio parsing failed', ex);
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
        }).catch(e => {
            console.log('can\'t resolve sums');
            reject(e);
        })
    })
}

/**
 * получаем данные об авторизованном пользователе
 * @return {object} данные для отображения на форме
 */
function getUserInfo() {
    return new Promise(function (resolve, reject) {
        getTCSsession().then(function (session_id) {
            fetch(USER_URL + session_id)
                .then(function (response) {
                    return response.json()
                }).then(function (json) {
                resolve(
                    {
                        result: "updateUserInfo",
                        riskProfile: json.payload.riskProfile ? json.payload.riskProfile : 'еще не определен',
                        approvedW8: json.payload.approvedW8 ? 'подписана' : 'не подписана',
                        employee: json.payload.employee,
                        qualStatus: json.payload.qualStatus ? 'есть статус' : 'еще нет статуса',
                    });
            }).catch(ex => {
                console.log('userInfo parsing failed', ex);
                reject(undefined);
            })
        }).catch(function () {
            reject(false);
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
            if (name === USD_RUB) {
                let return_data = [];
                let usdInfo = {};
                getPriceInfo(USD_RUB, undefined, session_id).then(function (result) {
                        usdInfo.prices = result.payload;
                        usdInfo.exchangeStatus = result.payload.exchangeStatus;
                    }
                ).then(function () {
                    usdInfo.symbol = {
                        ticker: USD_RUB,
                        showName: "Доллар США",
                        lotSize: 1,
                    };
                    return_data.push(usdInfo);
                    resolve(Object.assign({}, {result: "listStock"}, {stocks: return_data}));
                }).catch(function (ex) {
                    console.log('parsing failed', ex);
                    reject(undefined);
                })
            } else if (!/^\d+$/.test(name)) { // вручную, введена строка для поиска
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
                    getPriceInfo(USD_RUB, undefined, session_id).then(ticker => {
                        chrome.storage.sync.get([OPTION_CONVERT_TO_RUB], function (result) {
                            console.log('get session option');
                            fetch(PORTFOLIO_URL + session_id)
                                .then(function (response) {
                                    return response.json()
                                }).then(async function (json) {
                                console.log('list of portfolio');
                                let return_data = [];
                                for (const element of json.payload.data) {
                                    let securityType = (element.securityType === "Currency") ? "currencies" : element.securityType.toLowerCase() + 's';
                                    await getSymbolInfo(element.ticker, securityType, session_id).then(function (symbol) {
                                        let current_amount = element.currentAmount;
                                        let expected_yield = element.expectedYield;
                                        let earning_today = symbol.payload.earnings ? symbol.payload.earnings.absolute.value * element.currentBalance : 0;
                                        if (result[OPTION_CONVERT_TO_RUB] && current_amount.currency === 'USD') {
                                            earning_today = earning_today * ticker.payload.last.value;
                                            current_amount.value = current_amount.value * ticker.payload.last.value;
                                            current_amount.currency = 'RUB';
                                            expected_yield.value = expected_yield.value * ticker.payload.last.value;
                                            expected_yield.currency = 'RUB';
                                        }
                                        return_data.push({
                                            prices: symbol.payload.prices,
                                            earnings: symbol.payload.earnings,
                                            contentMarker: symbol.payload.contentMarker,
                                            symbol: {
                                                symbolType: symbol.payload.symbol.symbolType,
                                                isOTC: symbol.payload.symbol.isOTC,
                                                sessionOpen: symbol.payload.symbol.sessionOpen,
                                                sessionClose: symbol.payload.symbol.sessionClose,
                                                premarketStartTime: symbol.payload.symbol.premarketStartTime,
                                                premarketEndTime: symbol.payload.symbol.premarketEndTime,
                                                marketEndTime: symbol.payload.symbol.marketEndTime,
                                                marketStartTime: symbol.payload.symbol.marketStartTime,
                                                securityType: securityType,
                                                ticker: element.ticker,
                                                showName: symbol.payload.symbol.showName || symbol.payload.symbol.description,
                                                lotSize: element.currentBalance,
                                                expectedYieldRelative: element.expectedYieldRelative,
                                                expectedYield: expected_yield,
                                                currentPrice: element.currentPrice,
                                                currentAmount: current_amount,
                                                earningToday: earning_today,
                                                averagePositionPrice: element.averagePositionPrice || {
                                                    value: 0,
                                                    currency: element.currentPrice.currency
                                                },
                                            },
                                            exchangeStatus: symbol.payload.exchangeStatus
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
                        });
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

function getAvailableCash(brokerName) {
    return new Promise(function (resolve, reject) {
        console.log('try to get available cash');
        getTCSsession().then(function (session_id) {
                // POST
                fetch(CURRENCY_LIMIT_URL + session_id, {
                    method: "POST",
                    body: JSON.stringify({
                        brokerAccountType: brokerName
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
                            console.log(`${res.payload.message} - ${brokerName}`);
                            reject(undefined)
                        }
                    }).catch(e => {
                    console.log(e);
                    reject(undefined);
                })
            }
        )
    })
}

function getPriceInfo(tickerName, securityType = 'stocks', session_id) {
    return new Promise(function (resolve, reject) {
        console.log(`Get price for ${tickerName}`);
        if (tickerName) {
            // POST
            fetch((tickerName.includes('RUB') ? CURRENCY_PRICE_URL : PRICE_URL.replace('${securityType}', securityType)) + session_id, {
                method: "POST",
                body: JSON.stringify({ticker: tickerName}),
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
                        console.log(`Сервис цен недоступен для ${tickerName}`);
                        reject(undefined)
                    }
                }).catch(e => {
                console.log(e);
                reject(undefined);
            })
        } else reject(undefined);
    })

}

function getSymbolInfo(tickerName, securityType, session_id) {
    return new Promise(function (resolve, reject) {
        // POST

        fetch((tickerName.includes('RUB') ? CURRENCY_SYMBOL_URL : SYMBOL_URL.replace('${securityType}', securityType)) + session_id, {
            method: "POST",
            body: JSON.stringify({ticker: tickerName}),
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
                    console.log(`Сервис информации о бумаге ${tickerName} недоступен`);
                    reject(res)
                }
            }).catch(e => {
            console.log(e);
            reject(e);
        })
    })
}

function checkTicker(item) {
    return new Promise(function (resolve, reject) {
        getTCSsession().then(function (session_id) {
            getPriceInfo(item.ticker, undefined, session_id).then(function (res) {
                let last_price = res.payload.last.value;
                // у внебержевых отсутствуют sell buy цены - берем last
                let sell_price = res.payload.sell ? res.payload.sell.value : last_price;
                let buy_price = res.payload.buy ? res.payload.buy.value : last_price;
                let sell = !!item.sell_price && (sell_price >= item.sell_price / 1);
                let buy = !!item.buy_price && (buy_price <= item.buy_price / 1);
                resolve({buy: buy, sell: sell, value: buy ? buy_price : sell_price});
            }).catch(e => {
                console.log(e);
                reject(e);
            })
        }).catch(e => {
            console.log(e);
            reject(e);
        });
    })
}

function deleteFromAlert(ticker, sell_price, buy_price) {
    console.log('delete alert for ' + ticker);
    chrome.storage.sync.get([TICKER_LIST], function (data) {
        let alert_data = data[TICKER_LIST] || [];
        // фильтруем по совпадению имени и установленной цене
        let new_alert_date = alert_data.filter(item => !(!!item && item.ticker === ticker && (item.sell_price === sell_price || item.buy_price === buy_price)));
        chrome.storage.sync.set({[TICKER_LIST]: new_alert_date}, function () {
            console.log('Save ticker ' + JSON.stringify(new_alert_date));
        })
    })
}

function updateAlertPrices() {
    return new Promise(function (resolve, reject) {
        getTCSsession().then(function (session_id) {
            chrome.storage.sync.get([TICKER_LIST], async function (data) {
                let alert_data = data[TICKER_LIST] || [];
                let i = 0;
                for (const item of alert_data) {
                    //alert_data.forEach(function (item, i, alertList) {
                    await getPriceInfo(item.ticker, undefined, session_id).then(function (res) {
                        alert_data[i] = {
                            ticker: item.ticker,
                            showName: item.showName,
                            buy_price: item.buy_price,
                            sell_price: item.sell_price,
                            best_before: item.best_before,
                            active: item.active,
                            earnings: res.payload.earnings,
                            exchangeStatus: res.payload.exchangeStatus,
                            currency: res.payload.last.currency,
                            online_average_price: res.payload.last.value,
                            online_buy_price: res.payload.buy ? res.payload.buy.value : '',
                            online_sell_price: res.payload.sell ? res.payload.sell.value : '',
                        };
                        i++;
                    })
                }
                resolve(Object.assign({}, {result: "listAlerts"}, {stocks: alert_data}));
            })
        })
    })
}


function checkPortfolioAlerts() {
    chrome.storage.sync.get([OPTION_ALERT_TODAY], function (result) {
        if (result[OPTION_ALERT_TODAY]) {
            getAllSum().then(function (sums) {
                chrome.storage.sync.get([OPTION_ALERT_TODAY_VALUE], function (result) {
                    let alert_value = result[OPTION_ALERT_TODAY_VALUE] || 2;
                    getOldRelative('portfolio').then(old_relative => {
                        let portfolio_relative = Math.abs(sums.expectedYieldPerDayRelative - (old_relative || 0));
                        console.log(`check portfolio for yield ${old_relative * 100}<>${alert_value}`);
                        if (portfolio_relative >= alert_value / 100) {
                            let icon = sums.expectedYieldPerDayRelative < (old_relative || 0) ? '/icons/loss_72px_1204272_easyicon.net.png' : '/icons/profits_72px_1204282_easyicon.net.png';
                            let sign = sums.expectedYieldPerDayRelative < (old_relative || 0) ? '-' : '+';
                            chrome.notifications.create(OPTION_ALERT_TODAY, {
                                type: 'basic',
                                iconUrl: icon,
                                title: `Доходность портфеля изменилась на ${sign}${alert_value}% и составила ${sums.expectedYieldPerDayRelative * 100}`,
                                message: 'Проверьте свой портфель',
                                requireInteraction: true,
                                buttons: [
                                    {title: 'Удалить уведомление и перейти в портфель'}
                                ],
                                priority: 0
                            });
                            // сохраняем достигнутую доходность
                            setOldRelative('portfolio', sums.expectedYieldPerDayRelative);
                        }
                    }).catch(e => {
                        setOldRelative('portfolio', sums.expectedYieldPerDayRelative);
                        console.log('save new expectedYieldPerDayRelative')
                    })
                })
            })
        }
    })
}

function getOldRelative(ticker) {
    return new Promise(function (resolve, reject) {
        chrome.storage.local.get([ALERT_TICKER_LIST], function (data) {
            let alert_data = data[ALERT_TICKER_LIST] || {};
            console.log(`get relative for ${ticker}=${alert_data[ticker]}`);
            if (alert_data[ticker]) resolve(alert_data[ticker]);
            else reject(undefined);
        })
    });
}

function setOldRelative(ticker, relative) {
    chrome.storage.local.get([ALERT_TICKER_LIST], function (data) {
        let relative_list = data[ALERT_TICKER_LIST] || {};
        relative_list[ticker] = relative;
        chrome.storage.local.set({[ALERT_TICKER_LIST]: relative_list}, () => {
            console.log('save relative ' + JSON.stringify(data));
        })
    })
}

function checkSymbolsAlerts() {
    chrome.storage.sync.get([OPTION_ALERT_TODAY_PER_SYMBOL], function (result) {
        if (result[OPTION_ALERT_TODAY_PER_SYMBOL]) {
            getTCSsession().then(function (session_id) {
                getListStock(2).then(function (list_symbols) {
                    chrome.storage.sync.get([OPTION_ALERT_TODAY_VALUE_PER_SYMBOL], function (result) {
                        let alert_value = result[OPTION_ALERT_TODAY_VALUE_PER_SYMBOL] || 5;
                        list_symbols.stocks.forEach(function (item, i, alertList) {
                            if (!(item.exchangeStatus === 'Close'))
                                getPriceInfo(item.symbol.ticker, item.symbol.securityType, session_id).then(function (res) {
                                    let earnings_relative = res.payload.earnings.relative * 100;
                                    getOldRelative(item.symbol.ticker).then(old_relative => {
                                        let symbol_relative = Math.abs(earnings_relative - (old_relative || 0));
                                        console.log(`check portfolio symbols ${item.symbol.ticker} for yield ${symbol_relative} <> ${alert_value}`);
                                        if (symbol_relative >= alert_value * 1) {
                                            let icon = earnings_relative < (old_relative * 1 || 0) ? '/icons/loss_72px_1204272_easyicon.net.png' : '/icons/profits_72px_1204282_easyicon.net.png';
                                            let sign = earnings_relative < (old_relative * 1 || 0) ? '-' : '+';
                                            chrome.notifications.create(OPTION_ALERT_TODAY_PER_SYMBOL + '|' + item.symbol.ticker + '|' + item.symbol.securityType, {
                                                type: 'basic',
                                                iconUrl: icon,
                                                title: `Доходность ${item.symbol.ticker} изменилась на ${sign}${alert_value}% и составила ${earnings_relative.toFixed(2)}%`,
                                                message: 'Проверьте свой портфель',
                                                requireInteraction: true,
                                                buttons: [
                                                    {title: 'Купить/Продать (редирект на страницу)'},
                                                    //{title: 'Больше не показывать'},
                                                ],
                                                priority: 0
                                            });
                                            // сохраняем достигнутую доходность
                                            setOldRelative(item.symbol.ticker, earnings_relative);
                                        }
                                    }).catch(e => {
                                        console.log(`item ${item.symbol.ticker} is absent in alertList ${e}`);
                                        // не нашли в списке с доходностью, добавляем
                                        setOldRelative(item.symbol.ticker, earnings_relative);
                                    })
                                }).catch(e => {
                                    console.log(`price for ${item.symbol.ticker} unavailable ${e}`);
                                });
                            else console.log(`stock for ${item.symbol.ticker} is close`)
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
            // пока не работает проверка на статус биржи, раньше бралась из Storage сейчас там ее нет
            if ((!item.best_before || Date.parse(item.best_before) > new Date())) {
                //if ((!item.best_before || Date.parse(item.best_before) > new Date()) && !(item.exchangeStatus === 'Close')) {
                // или дата не установлена или больше текущей => проверка не просрочилась и биржа не закрыта
                console.log(`check alert for ${item.ticker}`);
                checkTicker(item).then(function (response) {
                    console.log('Пытаемся проверить ' + item.ticker + ' на продажу по ' + item.sell_price + ' и покупку по ' + item.buy_price);
                    if (response.buy || response.sell) {
                        chrome.notifications.create(response.buy ? 'buy|' : 'sell|' + item.ticker, {
                            type: 'basic',
                            iconUrl: response.buy ? '/icons/buy-2-64.png' : '/icons/sell-2-64.png',
                            title: response.buy ? `Сработала проверка на покупку по ${item.buy_price}` : `Сработала проверка на продажу по ${item.sell_price}`,
                            message: response.buy ? `Цена ${item.ticker} достигла цены покупки ${response.value}` : `Цена ${item.ticker} достигла цены продажи ${response.value}`,
                            requireInteraction: true,
                            priority: 0
                        });
                        chrome.storage.sync.get([OPTION_ALERT], function (result) {
                            if (result[OPTION_ALERT])
                                redirect_to_page((response.buy ? BUY_LINK : SELL_LINK) + item.ticker + '/', true);
                        });
                        deleteFromAlert(item.ticker, item.sell_price, item.buy_price);
                        console.log(response.buy ? `Проверка сработала по покупке ${item.ticker} за ${item.buy_price}` : `Проверка сработала по продаже ${item.ticker} за ${item.buy_price}`);
                    }

                }).catch(e => {
                    console.log('Не удалось проверить цену ' + item.ticker + ' потому что ' + e);
                })
            } else {
                // просрочилась проверка
                if (Date.parse(item.best_before) < new Date()) deleteFromAlert(item.ticker, item.sell_price, item.buy_price);
                console.log(`Stock is ${item.exchangeStatus}`);

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
                    port.postMessage(alert_list);
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
            case 'updateHeader':
                updatePopup().then(function (popup_data) {
                    console.log("send message updateHeader .....");
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
            case 'getUserInfo':
                getUserInfo().then(function (user_data) {
                    console.log("send message getuserInfo .....");
                    port.postMessage(user_data);
                });
                break;
            case 'getAvailableCashTCS':
                getAvailableCash('Tinkoff').then(function (cash_data) {
                    console.log("send message cash_data .....");
                    port.postMessage(Object.assign({}, {result: "cashDataTCS"}, {cash: cash_data}));
                }).catch(e => {
                    console.log('Nothing to send')
                });
                break;
            case 'getAvailableCashBCS':
                getAvailableCash('Bcs').then(function (cash_data) {
                    console.log("send message cash_data .....");
                    port.postMessage(Object.assign({}, {result: "cashDataBCS"}, {cash: cash_data}));
                }).catch(e => {
                    console.log('Nothing to send')
                });
                break;
            case 'getAvailableCashIIS':
                getAvailableCash('TinkoffIis').then(function (cash_data) {
                    console.log("send message cash_data .....");
                    port.postMessage(Object.assign({}, {result: "cashDataIIS"}, {cash: cash_data}));
                }).catch(e => {
                    console.log('Nothing to send')
                });
                break;
            case 'getVersionAPI':
                fetch(CHECK_VERSION_URL)
                    .then(function (response) {
                        return response.json()
                    }).then(async function (json) {
                    port.postMessage(Object.assign({}, {result: "versionAPI"}, {version: json}));
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
        //redirect_to_page(SYMBOL_LINK + ticker[1])
        chrome.notifications.clear(notificationId)
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
        // перейти в акцию
        if (btnIdx === 0) {
            redirect_to_page(SYMBOL_LINK.replace('${securityType}', ticker[2] || 'stocks') + ticker[1], true)
        }
    }
});

async function getRate(fromTo) {
    await getTCSsession().then(async function (session_id) {
        await getPriceInfo(fromTo, session_id).then(ticker => {
            return ticker.payload.last.value;
        })
    });
}

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
                        checkSymbolsAlerts();   // резкая смена доходности бумаг в портфеле
                        //updateAlertPrices();    // обновляем цены в интерфейсе настроек
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