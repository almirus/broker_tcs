'use strict';

import {
    ALERT_TICKER_LIST,
    ALL_ACCOUNTS,
    AV_SYMBOL_URL,
    BUY_LINK,
    CANCEL_ORDER,
    CANCEL_STOP,
    CHECK_VERSION_URL,
    COMMENTS_URL,
    CURRENCY_LIMIT_URL,
    CURRENCY_PRICE_URL,
    CURRENCY_SYMBOL_URL,
    EUR_RUB,
    FAVORITE_URL,
    HOST_URL,
    INFO_URL,
    INTERVAL_TO_CHECK,
    LIQUID_URL,
    LOGIN_URL,
    NEWS_URL,
    OPERATIONS_URL,
    OPTION_ALERT,
    OPTION_ALERT_TODAY,
    OPTION_ALERT_TODAY_PER_SYMBOL,
    OPTION_ALERT_TODAY_VALUE,
    OPTION_ALERT_TODAY_VALUE_PER_SYMBOL,
    OPTION_ALPHAVANTAGE,
    OPTION_ALPHAVANTAGE_KEY,
    OPTION_CONVERT_TO_RUB,
    OPTION_REDIRECT,
    OPTION_SESSION,
    ORDERS_URL,
    PING_URL,
    PLURAL_SECURITY_TYPE,
    PORTFOLIO_URL,
    PRICE_URL,
    PROFILE_ACTIVITY_URL,
    PROFILE_INSTRUMENTS_URL,
    PROGNOSIS_URL,
    PULSE_COMMENT_LIKE_URL,
    PULSE_FOR_TICKER_URL,
    PULSE_POST_LIKE_URL,
    SEARCH_URL,
    SELL_LINK,
    SET_ALERT_URL,
    STOP_URL,
    SUBSCRIPTIONS_URL,
    SYMBOL_EXTENDED_LINK,
    SYMBOL_FUNDAMENTAL_URL,
    SYMBOL_LINK,
    SYMBOL_URL,
    TICKER_LIST,
    UNSUBSCRIBE,
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
    console.log(sessionId);
    return fetch(INFO_URL + sessionId)
        .then(response => response.json())
        .then(json => {
            if (json.resultCode.toLocaleUpperCase() === 'OK' && json.payload.accessLevel === 'CLIENT') {
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
    return new Promise((resolve, reject) => {
        console.log('try to get cookies');
        chrome.cookies.getAll({}, cookie => {
            let psid = cookie.filter(value => value.name === 'psid' && value.domain === 'www.tinkoff.ru');
            if (psid.length > 0 && psid[0].value) {
                console.log('psid founded' + psid[0].value);
                sessionIsAlive(psid[0].value).then(response => {
                    if (response) {
                        resolve(psid[0].value)
                    } else
                        reject(undefined);
                }).catch(e => {
                    console.log(e);
                });
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
    return new Promise((resolve, reject) => {
        console.log('try to get sums');
        MainProperties.getSession().then(sessionId => {
            fetch(ALL_ACCOUNTS + sessionId)
                .then(response => {
                    if (response.status === 502) {
                        return {status: 502, text: 'Сервис брокера недоступен'};
                    } else return response.json()
                }).then(json => {
                if (json.payload.code && json.payload.code.toUpperCase() === 'INSUFFICIENTPRIVILEGES') {
                    MainProperties._sessionId = undefined;
                    reject(undefined);
                }
                let accounts = {};
                json.payload.accounts.forEach(item => {
                    accounts[item.brokerAccountType] = {};
                    accounts[item.brokerAccountType].totalAmountPortfolio = item.totalAmount.value;
                    accounts[item.brokerAccountType].expectedYield = item.expectedYield.value;
                    accounts[item.brokerAccountType].expectedYieldRelative = item.expectedYieldRelative / 100;
                    accounts[item.brokerAccountType].expectedYieldPerDay = item.expectedYieldPerDay.value;
                    accounts[item.brokerAccountType].expectedYieldPerDayRelative = item.expectedYieldPerDayRelative / 100;
                    accounts[item.brokerAccountType].marginAttributes = item.marginAttributes;
                });
                resolve({
                    accounts: accounts,
                    totalAmountPortfolio: json.payload.totals.totalAmount.value,
                    expectedYield: json.payload.totals.expectedYield.value,
                    expectedYieldRelative: json.payload.totals.expectedYieldRelative / 100,
                    expectedYieldPerDay: json.payload.totals.expectedYieldPerDay.value,
                    expectedYieldPerDayRelative: json.payload.totals.expectedYieldPerDayRelative / 100,
                });
            }).catch(ex => {
                MainProperties._sessionId = undefined;
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
    return new Promise((resolve, reject) => {
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
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            fetch(USER_URL + session_id)
                .then(response => {
                    if (response.status !== 200) reject({status: response.status});
                    return response.json()
                }).then(json => {
                if (json.payload.accessLevel.toUpperCase() === 'ANONYMOUS') {
                    console.log('session is dead');
                    reject(undefined);
                } else
                    resolve(
                        {
                            result: "updateUserInfo",
                            riskProfile: json.payload.riskProfile ? json.payload.riskProfile : 'еще не определен',
                            approvedW8: json.payload.approvedW8 ? 'подписана' : 'не подписана',
                            employee: json.payload.employee,
                            qualStatus: json.payload.qualStatus ? 'есть статус' : 'еще нет статуса',
                            accounts: json.payload.accounts
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
 * получаем все портфолио
 * @param sessionId
 * @return {Promise<any>}
 */
function getPortfolio(sessionId) {
    return new Promise((resolve, reject) => {
        Promise.all([
            fetch(PORTFOLIO_URL + sessionId, { // tcs+bcs
                method: "POST",
                body: JSON.stringify({
                    brokerAccountType: 'All',
                    currency: 'RUB'
                }),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }).then(response => response.json()),
            fetch(PORTFOLIO_URL + sessionId, { //iis
                method: "POST",
                body: JSON.stringify({
                    brokerAccountType: 'TinkoffIis',
                    currency: 'RUB'
                }),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }).then(response => response.json())
        ])
            .then(([tcs, iis]) => {
                resolve({tcs: tcs, iis: iis || []})
            })
            .catch(error => {
                console.log(`cant get portfolio, because ${error}`);
                reject({tcs: [], iis: []});
            })
    })
}

/**
 * конвертируем и дополняем данные для портфолио
 * @param data
 * @param needToConvert
 * @param currencyCourse
 * @param sessionId
 * @return {Promise<Array>}
 */
async function convertPortfolio(data = [], needToConvert, currencyCourse, sessionId) {
    let return_data = [];
    for (const element of data) {
        let securityType = PLURAL_SECURITY_TYPE[element.securityType];
        await getSymbolInfo(element.ticker, securityType, sessionId).then(symbol => {
            let current_amount = element.currentAmount;
            let expected_yield = element.expectedYield || {};
            let earning_today = symbol.payload.earnings ? symbol.payload.earnings.absolute.value * element.currentBalance : 0;
            if (!symbol.payload.symbol) {
                return_data.push({
                    prices: undefined,
                    earnings: undefined,
                    contentMarker: undefined,
                    symbol: {
                        symbolType: 'Note',
                        isOTC: false,
                        securityType: securityType,
                        ticker: element.ticker,
                        isin: element.isin,
                        status: element.status,
                        showName: symbol.payload.showName,
                        lotSize: element.currentBalance,
                        currentAmount: element.currentAmount ? element.currentAmount : {
                            value: symbol.payload.nominal * element.currentBalance,
                            currency: symbol.payload.currency
                        },
                        averagePositionPrice: {
                            value: symbol.payload.nominal,
                            currency: symbol.payload.currency
                        },
                        timeToOpen: '',
                    },
                    exchangeStatus: ''
                });
            } else {
                if (symbol.payload.symbol.isOTC) {
                    earning_today = symbol.payload.absoluteOTC * element.currentBalance;
                    //expected_yield.value = symbol.payload.relativeOTC;
                }
                if (needToConvert && current_amount.currency === 'USD') {
                    earning_today = earning_today * currencyCourse.payload.last.value;
                    current_amount.value = current_amount.value * currencyCourse.payload.last.value;
                    current_amount.currency = 'RUB';
                    expected_yield.value = (expected_yield.value * currencyCourse.payload.last.value) || 0;
                    expected_yield.currency = 'RUB';
                }

                return_data.push({
                    prices: symbol.payload.prices,
                    earnings: symbol.payload.earnings,
                    contentMarker: symbol.payload.contentMarker,
                    symbol: {
                        dayLow: symbol.payload.symbol.dayLow,
                        dayHigh: symbol.payload.symbol.dayHigh,
                        dayOpen: symbol.payload.symbol.dayOpen,
                        lastOTC: symbol.payload.lastOTC || '',
                        absoluteOTC: symbol.payload.absoluteOTC || 0,
                        relativeOTC: symbol.payload.relativeOTC || 0,
                        consensus: symbol.payload.symbol.consensus,
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
                        isin: element.isin,
                        status: element.status,
                        showName: symbol.payload.symbol.showName || symbol.payload.symbol.description,
                        lotSize: element.currentBalance,
                        expectedYieldRelative: element.expectedYieldRelative,
                        expectedYieldPerDayRelative: element.expectedYieldPerDayRelative / 100,
                        expectedYield: expected_yield,
                        currentPrice: element.currentPrice,
                        currentAmount: current_amount,
                        earningToday: earning_today,
                        averagePositionPrice: element.averagePositionPrice || {
                            value: 0,
                            currency: element.currentPrice.currency
                        },
                        timeToOpen: symbol.payload.symbol.timeToOpen,
                    },
                    exchangeStatus: symbol.payload.exchangeStatus
                });
            }
        })
    }
    return return_data;
}

/**
 * Удаляет уведомление о достижении цены
 * @param orderId
 * @param brokerAccountType
 * @return {Promise<any>}
 */
function deleteOrder(orderId, brokerAccountType = 'Tinkoff') {
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            fetch(CANCEL_ORDER.replace('${orderId}', orderId).replace('${brokerAccountType}', brokerAccountType) + session_id)
                .then(response => response.json())
                .then(json => {
                    if (json.status === 'Error') {
                        console.log('cant delete order', json);
                        reject(undefined);
                    } else
                        console.log('success deleting order');
                    resolve(json);
                }).catch(ex => {
                console.log('cant delete order', ex);
                reject(undefined);
            })
        })
    })
}

/**
 * Удаляет уведомление с мобильного
 * @param orderId
 * @return {Promise<any>}
 */
function unsubscribe(orderId) {
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            fetch(UNSUBSCRIBE.replace('${orderId}', orderId) + session_id)
                .then(response => response.json())
                .then(json => {
                    if (json.status === 'Error') {
                        console.log('cant delete subscribe', json);
                        reject(undefined);
                    } else
                        console.log('success subscribe order');
                    resolve(json);
                }).catch(ex => {
                console.log('cant delete subscribe', ex);
                reject(undefined);
            })
        })
    })
}

/**
 * Отменяет тейкпрофит и стоплосс
 * @param orderId
 * @param brokerAccountType
 * @return {Promise<any>}
 */
function cancelStop(orderId, brokerAccountType = 'Tinkoff') {
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            fetch(CANCEL_STOP.replace('${orderId}', orderId).replace('${brokerAccountType}', brokerAccountType) + session_id)
                .then(response => response.json())
                .then(json => {
                    if (json.status === 'Error') {
                        console.log('cant delete stop', json);
                        reject(undefined);
                    } else
                        console.log('success deleting stop');
                    resolve(json);
                }).catch(ex => {
                console.log('cant delete stop', ex);
                reject(undefined);
            })
        })
    })
}

/**
 * Формирует список для экспорта в CVS
 * @param brokerAccountType
 * @return {Promise<any>}
 */
function exportPortfolio(brokerAccountType = 'Tinkoff') {
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            fetch(OPERATIONS_URL + session_id, {
                method: "POST",
                body: JSON.stringify({
                    from: "2015-03-01T00:00:00Z",
                    to: (new Date()).toJSON(),
                    "overnightsDisabled": true
                }),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            })
                .then(response => response.json())
                .then(json => {
                    if (json.status === 'Error') {
                        console.log('cant get operations', json);
                        reject([]);
                    } else
                        console.log('obtained operations');
                    resolve(json.payload.items);
                }).catch(ex => {
                console.log('cant get operations', ex);
                reject([]);
            })
        })
    })
}

/**
 * получаем список акций
 * @return {object} данные для отображения на форме
 */
function getListStock(name) {
    return new Promise((resolve, reject) => {
        console.log('try to get list');
        MainProperties.getSession().then(session_id => {
            if (!/^\d+$/.test(name)) { // вручную, введена строка для поиска
                if (name && name.toUpperCase().includes('ВАЛЮТ')) {
                    Promise.all([
                        getPriceInfo(USD_RUB, undefined, session_id).then(usd => {
                            let usdInfo = {};
                            usdInfo.prices = usd.payload;
                            usdInfo.exchangeStatus = usd.payload.exchangeStatus;
                            usdInfo.symbol = {
                                ticker: USD_RUB,
                                showName: "Доллар США",
                                lotSize: 1,
                            };
                            return usdInfo;
                        }).catch(function (ex) {
                            console.log('parsing failed', ex);
                            reject(undefined);
                        }),
                        getPriceInfo(EUR_RUB, undefined, session_id).then(eur => {
                            let eurInfo = {};
                            eurInfo.prices = eur.payload;
                            eurInfo.exchangeStatus = eur.payload.exchangeStatus;
                            eurInfo.symbol = {
                                ticker: EUR_RUB,
                                showName: "Евро",
                                lotSize: 1,
                            };
                            return eurInfo;
                        }).catch(function (ex) {
                            console.log('parsing failed', ex);
                            reject(undefined);
                        })]
                    ).then(currency => {
                        resolve(Object.assign({}, {result: "listStock"}, {stocks: currency}));
                    })
                } else
                    findTicker(name, session_id)
                        .then(json => {
                            console.log('found list');
                            let return_data = [];
                            json.payload.values.forEach(item => {
                                return_data.push({
                                    prices: item.prices,
                                    symbol: {
                                        ticker: item.symbol.ticker,
                                        showName: item.symbol.showName,
                                        lotSize: item.symbol.lotSize,
                                    },
                                    exchangeStatus: item.exchangeStatus
                                });
                            });
                            resolve(Object.assign({}, {result: "listStock"}, {stocks: return_data}));
                        }).catch(function (ex) {
                        console.log('parsing failed', ex);
                        reject(undefined);
                    })
            } else if (name === 3) { // избранное
                fetch(FAVORITE_URL + session_id)
                    .then(response => response.json())
                    .then(json => {
                        console.log('list of favorite');
                        let return_data = [];
                        json.payload.stocks.forEach(item => {
                            return_data.push({
                                prices: item.prices,
                                symbol: {
                                    ticker: item.symbol.ticker,
                                    showName: item.symbol.showName,
                                    lotSize: item.symbol.lotSize,
                                },
                                exchangeStatus: item.exchangeStatus
                            });
                        });
                        resolve(Object.assign({}, {result: "listStock"}, {stocks: return_data}));
                    }).catch(function (ex) {
                    console.log('parsing failed', ex);
                    reject(undefined);
                })
            } else {
                if (name === 2) { // портфолио
                    getPriceInfo(USD_RUB, undefined, session_id).then(currency => {
                        MainProperties.getConvertToRUB().then(needConvert => {
                            console.log('get session option');
                            getPortfolio(session_id).then(allPortfolio => {

                                console.log('list of portfolio');
                                Promise.all([
                                        convertPortfolio(allPortfolio.tcs.payload.data, needConvert, currency, session_id),
                                        convertPortfolio(allPortfolio.iis.payload.data, needConvert, currency, session_id)
                                    ]
                                ).then(([tcs_data, iis_data]) => {
                                    portfolio.items = {
                                        stocks_tcs: tcs_data,
                                        stocks_iis: iis_data
                                    };
                                    resolve(Object.assign({}, {result: "listStock"}, {stocks_tcs: tcs_data}, {stocks_iis: iis_data}));
                                });
                            }).catch(function (ex) {
                                console.log('parsing failed', ex);
                                reject(undefined);
                            })
                        })
                    })
                }
            }
        })
    })
}

function findTicker(search, session_id) {
    return new Promise((resolve, reject) => {
            // POST
            fetch(SEARCH_URL + session_id, {
                method: "POST",
                body: JSON.stringify({
                    start: 0,
                    end: 100,
                    sortType: "ByName",
                    orderType: "Asc",
                    country: "All",
                    //otcType:["Tradable","Market"],
                    filter: search
                }),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            }).then(response => response.json())
                .then(listOfFound => {
                    if (listOfFound.status.toLocaleUpperCase() === 'OK') {
                        resolve(listOfFound);
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
    return new Promise((resolve, reject) => {
        console.log('try to get available cash');
        MainProperties.getSession().then(session_id => {
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
                }).then(response => response.json())
                    .then(res => {
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

function getSubscriptions(session_id) {
    return new Promise((resolve, reject) => {
        console.log('Get Subscriptions');
        fetch(SUBSCRIPTIONS_URL + session_id)
            .then(response => response.json())
            .then(json => {
                if (json.status === 'Error') {
                    console.log('cant get Subscriptions', json);
                    reject([]);
                } else
                    console.log('success get Subscriptions');
                resolve(json.payload.subscriptions);
            }).catch(ex => {
            console.log('cant get Subscriptions', ex);
            reject(undefined);
        })
    })
}

function getComments(id) {
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            console.log('Get Comments');
            fetch(COMMENTS_URL.replace('${commentId}', id) + session_id)
                .then(response => response.json())
                .then(json => {
                    if (json.status === 'Error') {
                        console.log('cant get Comments', json);
                        resolve([]);
                    } else
                        console.log('success get Comments');
                    resolve(json.payload);
                }).catch(ex => {
                console.log('cant get Comments', ex);
                resolve([]);
            })
        })
    })
}

function getNews(nav_id) {
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            console.log('Get News');
            let url = '';
            switch (true) {
                case /profile/.test(nav_id):
                    url = PROFILE_ACTIVITY_URL.replace('${navId}', nav_id.slice(0, nav_id.search('_profile'))) + session_id;
                    break;
                case /instrument/.test(nav_id):
                    url = PROFILE_INSTRUMENTS_URL.replace('${navId}', nav_id.slice(0, nav_id.search('_instrument'))) + session_id;
                    break;
                case /^[0-9]+$/.test(nav_id) || !nav_id:
                    url = NEWS_URL.replace('${navId}', nav_id) + session_id;
                    break;
                case /^[A-Z0-9]+$/.test(nav_id):
                    url = PULSE_FOR_TICKER_URL.replace('${navId}', nav_id) + session_id;
                    break;
            }
            fetch(url)
                .then(response => response.json())
                .then(json => {
                    const getFilteredComments = (news) => {
                        return news.map(async item => {
                            if (item.comments_count > 0 || item.commentsCount > 0)
                                await getComments(item.id || item.item.id).then(comments => {
                                    return item['comments'] = comments; // модифицируем исходный массив, добавляем комменты
                                });
                            else return item;
                        })
                    };
                    Promise.all(getFilteredComments(json.payload.items || [])).then(() => {
                        if (json.status === 'Error') {
                            console.log('cant get News', json);
                            resolve({});
                        } else
                            console.log('success get News');
                        resolve(json.payload);
                    });
                }).catch(ex => {
                console.log('cant get News', ex);
                reject(undefined);
            })
        })
    })
}

function postComment(postId, text) {
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            console.log('Post comment');
            // POST
            fetch(COMMENTS_URL.replace('${commentId}', postId) + session_id, {
                method: "POST",
                body: JSON.stringify({text: text}),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            }).then(response => response.json())
                .then(res => {

                })
        });
    })
}

function likeComment(commentId, like) {
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            console.log('Like comment');
            if (like)
            // POST
                fetch(PULSE_COMMENT_LIKE_URL.replace('${commentId}', commentId) + session_id, {
                    method: "POST",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    }
                }).then(response => response.json())
                    .then(res => {
                        console.log('Comment is liked');
                    });
            else {
                // DELETE
                fetch(PULSE_COMMENT_LIKE_URL.replace('${commentId}', commentId) + session_id, {
                    method: "DELETE",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    }
                }).then(response => response.json())
                    .then(res => {
                        console.log('Comment is disliked');
                    });
            }
        });
    })
}

function likePost(postId, like) {
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            console.log('Like post');
            if (like)
            // POST
                fetch(PULSE_POST_LIKE_URL.replace('${postId}', postId) + session_id, {
                    method: "POST",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    }
                }).then(response => response.json())
                    .then(res => {
                        console.log('Post is liked');
                    });
            else {
                // DELETE
                fetch(PULSE_POST_LIKE_URL.replace('${postId}', postId) + session_id, {
                    method: "DELETE",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    }
                }).then(response => response.json())
                    .then(res => {
                        console.log('Post is disliked');
                    });
            }
        });
    })
}

function getPriceInfo(tickerName, securityType = 'stocks', session_id) {
    return new Promise((resolve, reject) => {
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
            }).then(response => response.json())
                .then(res => {
                    fetch(SYMBOL_EXTENDED_LINK.replace('${ticker}', tickerName) + session_id).then(response => response.json())
                        .then(extendInfo => {
                            res.payload.isFavorite = extendInfo.payload.isFavorite;
                            //res.payload.subscriptId = extendInfo.payload.priceAlert ? extendInfo.payload.priceAlert[0].subscriptionId : undefined;
                            //res.payload.subscriptPrice = extendInfo.payload.priceAlert ? extendInfo.payload.priceAlert : [];
                            res.payload.subscriptions = extendInfo.payload.priceAlert;
                            resolve(res);
                        }).catch(e => {
                        console.log(`Сервис доп информации для ${tickerName} недоступен`, e);
                        reject(res)
                    });
                }).catch(e => {
                console.log(e);
                reject(undefined);
            })
        } else reject(undefined);
    })

}

function getSymbolInfo(tickerName, securityType, sessionId) {
    return new Promise((resolve, reject) => {
        // POST
        console.log('try to get symbolInfo for', tickerName);
        fetch((tickerName.includes('RUB') ? CURRENCY_SYMBOL_URL : SYMBOL_URL.replace('${securityType}', securityType)) + sessionId, {
            method: "POST",
            body: securityType.includes('notes') ? JSON.stringify({isin: tickerName}) : JSON.stringify({ticker: tickerName}),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        }).then(response => response.json())
            .then(res => {
                if (res.status.toLocaleUpperCase() === 'OK' && !securityType.includes('notes')) {
                    fetch(SYMBOL_FUNDAMENTAL_URL + sessionId, {
                        method: "POST",
                        body: JSON.stringify({
                            period: 'year',
                            ticker: tickerName
                        }),
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    }).then(response => response.json())
                        .then(json => {
                            res.payload.symbol.dayHigh = json.payload.dayHigh;
                            res.payload.symbol.dayLow = json.payload.dayLow;
                            res.payload.symbol.dayOpen = json.payload.dayOpen;

                            if (res.payload.contentMarker.prognosis) {
                                console.log('try to get prognosis for', tickerName);
                                fetch(PROGNOSIS_URL.replace('${ticker}', tickerName) + sessionId).then(response => response.json())
                                    .then(prognosis => {
                                        res.payload.symbol.consensus = prognosis.payload.consensus;
                                        resolve(res);
                                    })
                                    .catch(e => {
                                        console.log('Сервис прогнозов недоступен', e);
                                        resolve(res);
                                    });
                            } else {
                                MainProperties.getAVOption().then(option => {
                                    // если OTC и установлена настройка использвать alphavantage и начиная за 30 минут до открытия биржи
                                    if (option.AVOption && res.payload.symbol.isOTC && res.payload.symbol.timeToOpen - (60000 * 30) < 0)
                                        fetch(AV_SYMBOL_URL.replace('${ticker}', tickerName) + option.AVKey).then(response => response.json())
                                            .then(otc => {
                                                if (otc.Note) {
                                                    console.log('Достигнуто ограничение alphavantage');
                                                } else {
                                                    res.payload.lastOTC = parseFloat(otc["Global Quote"]["05. price"]);
                                                    res.payload.absoluteOTC = parseFloat(otc["Global Quote"]["09. change"]);
                                                    res.payload.relativeOTC = parseFloat(otc["Global Quote"]["10. change percent"]) / 100;
                                                }
                                                resolve(res);
                                            })
                                            .catch(e => {
                                                console.log('Сервис alphavantage недоступен', e);
                                                resolve(res);
                                            });
                                    else resolve(res);
                                })
                            }
                        });

                } else {
                    console.log(`Сервис информации о бумаге ${tickerName} недоступен`);
                    resolve(res)
                }
            }).catch(e => {
            console.log('cant get symbolInfo, because', e);
            reject(e);
        })
    })
}

function checkTicker(item) {
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            getPriceInfo(item.ticker, undefined, session_id).then(res => {
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
    chrome.storage.sync.get([TICKER_LIST], data => {
        let alert_data = data[TICKER_LIST] || [];
        // фильтруем по совпадению имени и установленной цене
        let new_alert_date = alert_data.filter(item => !(!!item && item.ticker === ticker && (item.sell_price === sell_price || item.buy_price === buy_price)));
        chrome.storage.sync.set({[TICKER_LIST]: new_alert_date}, function () {
            console.log('Save ticker ' + JSON.stringify(new_alert_date));
        })
    })
}

function getOrders(session_id) {
    return new Promise((resolve, reject) => {
        fetch(ORDERS_URL + session_id)
            .then(response => response.json())
            .then(json => {
                let return_data = [];
                json.payload.orders.forEach(element => {
                    return_data.push({
                        ticker: element.ticker,
                        securityType: element.securityType || 'Stock',
                        showName: element.showName,
                        quantity: element.quantity,
                        operationType: element.operationType,
                        buy_price: element.operationType === 'Buy' ? element.price.value : '',
                        sell_price: element.operationType === 'Sell' ? element.price.value : '',
                        best_before: undefined,
                        active: true,
                        timeToExpire: element.timeToExpire,
                        orderId: element.orderId,
                        status: element.status
                    });
                });
                resolve(return_data)
            })
            .catch(error => {
                console.log(`Cant get orders, because ${error}`);
                reject([]);
            })
    })
}

function getStop(session_id) {
    return new Promise((resolve, reject) => {
        fetch(STOP_URL + session_id)
            .then(response => response.json())
            .then(json => {
                let return_data = [];
                json.payload.orders.forEach(element => {
                    return_data.push({
                        ticker: element.ticker,
                        securityType: element.securityType,
                        showName: element.showName,
                        quantity: element.quantity,
                        operationType: element.operationType,
                        buy_price: element.operationType === 'Buy' ? element.stopPrice : '',
                        sell_price: element.operationType === 'Sell' ? element.stopPrice : '',
                        best_before: undefined,
                        active: true,
                        timeToExpire: undefined,
                        orderId: element.orderId,
                        status: element.status
                    });
                });
                resolve(return_data)
            })
            .catch(error => {
                console.log(`Cant get orders, because ${error}`);
                reject([]);
            })
    })
}

function getLiquidList(brokerAccountType = 'Tinkoff') {
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            fetch(LIQUID_URL + session_id, {
                method: "POST",
                body: JSON.stringify({
                    brokerAccountType: brokerAccountType
                }),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            })
                .then(response => response.json())
                .then(json => {
                    if (json.status === 'Error') {
                        console.log('cant get liquid', json);
                        reject(undefined);
                    } else
                        console.log('success get liquid list');
                    resolve(json.payload);
                }).catch(ex => {
                console.log('cant get liquid', ex);
                reject(undefined);
            })
        })
    })
}

function getPrognosisList() {
    return new Promise((resolve, reject) => {
            MainProperties.getSession().then(session_id => {
                getPortfolio(session_id).then(portfolio => {
                        let portfolioList = [].concat(portfolio.tcs.payload.data, portfolio.iis.payload.data);
                        portfolioList.forEach(item => {
                            if (item.contentMarker) {
                                fetch(PROGNOSIS_URL.replace('${ticker}', item.symbol.ticker) + session_id).then(response => response.json())
                                    .then(prognosis => {
                                        res.payload.symbol.consensus = prognosis.payload.consensus;
                                        resolve(res);
                                    })
                                    .catch(e => {
                                        console.log('Сервис прогнозов недоступен', e);
                                        resolve(res);
                                    });
                            }
                        })
                    }
                );
            }).catch(function (ex) {
                console.log('parsing failed', ex);
                reject(undefined);
            });
        }
    )
}

function updateAlertPrices() {
    return new Promise(function (resolve) {
        MainProperties.getSession().then(session_id => {
            Promise.all([
                getOrders(session_id).then(orders => {
                    return (orders)
                }),
                getStop(session_id).then(stops => {
                    return (stops)
                }),
                getSubscriptions(session_id).then(subscriptions => {
                    return (subscriptions)
                }),
            ]).then(async ([orders, stops, subscriptions]) => {
                let alert_data = [].concat(orders, stops, subscriptions);
                let i = 0;
                for (const item of alert_data) {
                    //alert_data.forEach(function (item, i, alertList) {
                    await getPriceInfo(item.ticker, PLURAL_SECURITY_TYPE[(item.symbolType || item.securityType || 'Stock')], session_id).then(res => {
                        alert_data[i] = {
                            ticker: item.ticker,
                            securityType: PLURAL_SECURITY_TYPE[(item.symbolType || item.securityType || 'Stock')],
                            showName: item.showName,
                            buy_price: item.buy_price || (item.subscriptions ? item.subscriptions[0].price : 0),
                            sell_price: item.sell_price,
                            best_before: item.best_before,
                            active: item.active,
                            earnings: res.payload.earnings,
                            exchangeStatus: res.payload.exchangeStatus,
                            currency: !res.payload.last ? 'USD' : res.payload.last.currency,
                            online_average_price: !res.payload.last ? 0 : res.payload.last.value,
                            online_buy_price: res.payload.buy ? res.payload.buy.value : '',
                            online_sell_price: res.payload.sell ? res.payload.sell.value : '',
                            orderId: item.orderId,
                            operationType: item.operationType,
                            timeToExpire: item.timeToExpire,
                            status: item.status,
                            isFavorite: res.payload.isFavorite,
                            subscriptPrice: item.subscriptions,
                            quantity: item.quantity,
                        };
                        i++;
                    })
                }
                resolve(Object.assign({}, {result: "listAlerts"}, {stocks: alert_data}));
            });
        })
    })
}


function checkPortfolioAlerts() {
    chrome.storage.sync.get([OPTION_ALERT_TODAY], result => {
        if (result[OPTION_ALERT_TODAY]) {
            getAllSum().then(sums => {
                chrome.storage.sync.get([OPTION_ALERT_TODAY_VALUE], result => {
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
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([ALERT_TICKER_LIST], data => {
            let alert_data = data[ALERT_TICKER_LIST] || {};
            console.log(`get relative for ${ticker}=${alert_data[ticker]}`);
            if (alert_data[ticker]) resolve(alert_data[ticker]);
            else reject(undefined);
        })
    });
}

function setOldRelative(ticker, relative) {
    chrome.storage.local.get([ALERT_TICKER_LIST], data => {
        let relative_list = data[ALERT_TICKER_LIST] || {};
        relative_list[ticker] = relative;
        chrome.storage.local.set({[ALERT_TICKER_LIST]: relative_list}, () => {
            console.log('save relative ' + JSON.stringify(data));
        })
    })
}

function checkSymbolsAlerts() {
    chrome.storage.sync.get([OPTION_ALERT_TODAY_PER_SYMBOL], result => {
        if (result[OPTION_ALERT_TODAY_PER_SYMBOL]) {
            MainProperties.getSession().then(session_id => {
                getListStock(2).then(list_symbols => {
                    chrome.storage.sync.get([OPTION_ALERT_TODAY_VALUE_PER_SYMBOL], alert_percent => {
                        let alert_value = alert_percent[OPTION_ALERT_TODAY_VALUE_PER_SYMBOL] || 5;
                        list_symbols.stocks_tcs.concat(list_symbols.stocks_iis).forEach(item => {
                            if (!(item.exchangeStatus === 'Close'))
                                getPriceInfo(item.symbol.ticker, item.symbol.securityType, session_id).then(price_info => {
                                    let earnings_relative = price_info.payload.earnings.relative * 100;
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
    chrome.storage.sync.get([TICKER_LIST], data => {
        let alert_data = data[TICKER_LIST] || [];
        alert_data.forEach(item => {
            // пока не работает проверка на статус биржи, раньше бралась из Storage сейчас там ее нет
            if ((!item.best_before || Date.parse(item.best_before) > new Date())) {
                //if ((!item.best_before || Date.parse(item.best_before) > new Date()) && !(item.exchangeStatus === 'Close')) {
                // или дата не установлена или больше текущей => проверка не просрочилась и биржа не закрыта
                console.log(`check alert for ${item.ticker}`);
                checkTicker(item).then(response => {
                    console.log('Пытаемся проверить ' + item.ticker + ' на продажу по ' + item.sell_price + ' и покупку по ' + item.buy_price);
                    if (response.buy || response.sell) {
                        chrome.notifications.create((response.buy ? 'buy|' : 'sell|') + item.ticker, {
                            type: 'basic',
                            iconUrl: response.buy ? '/icons/buy-2-64.png' : '/icons/sell-2-64.png',
                            title: response.buy ? `Сработала проверка на покупку по ${item.buy_price}` : `Сработала проверка на продажу по ${item.sell_price}`,
                            message: response.buy ? `Цена ${item.ticker} достигла цены покупки ${response.value}` : `Цена ${item.ticker} достигла цены продажи ${response.value}`,
                            requireInteraction: true,
                            priority: 0
                        });
                        chrome.storage.sync.get([OPTION_ALERT], result => {
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

function createMobileAlert(params) {
    MainProperties.getSession().then(session_id => {
        fetch(SET_ALERT_URL.replace('${ticker}', params.ticker).replace('${price}', params.price) + session_id)
            .then(response => response.json())
            .then(json => {
                if (!json.payload.confirm) {
                    console.log('cant set mobile alert ' + JSON.stringify(json));
                }
            })
    })
}

// основной слушатель
chrome.runtime.onConnect.addListener(function (port) {
    console.log("Connected .....");
    port.onMessage.addListener(function (msg) {
        console.log("Background - message received " + JSON.stringify(msg));
        switch (msg.method) {
            case 'createMobileAlert':
                createMobileAlert(msg.params);
                break;
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
            case 'getListStockForOrder':
                getListStock(msg.params).then(function (list_symbols) {
                    console.log("send message listStock .....");
                    list_symbols.result = "listStockForOrder";
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
                MainProperties.getSession().then(session_id => {
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
                }).catch(e => {
                    console.log("error .....");
                    port.postMessage(Object.assign({}, {result: "updateUserInfo"}, {status: e.status}));

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
                    .then(response => response.json())
                    .then(async json => {
                        port.postMessage(Object.assign({}, {result: "versionAPI"}, {version: json}));
                    });
                break;
            case 'deleteOrder':
                deleteOrder(msg.params)
                    .then(result => {
                            console.log('try to delete order', result);
                            updateAlertPrices().then(function (alert_list) {
                                console.log("send message tickerInfo .....");
                                port.postMessage(alert_list);
                            })
                        }
                    )
                    .catch(e => {
                        console.log(`cant send delete order, because ${e}`)
                    });
                break;
            case 'cancelStop':
                cancelStop(msg.params)
                    .then(result => {
                            console.log('try to delete order', result);
                            updateAlertPrices().then(function (alert_list) {
                                console.log("send message tickerInfo .....");
                                port.postMessage(alert_list);
                            })
                        }
                    )
                    .catch(e => {
                        console.log(`cant send delete order, because ${e}`)
                    });
                break;
            case 'unsubscribe':
                unsubscribe(msg.params)
                    .then(result => {
                            console.log('try to unsubscribe', result);
                            updateAlertPrices().then(function (alert_list) {
                                console.log("send message tickerInfo .....");
                                port.postMessage(alert_list);
                            })
                        }
                    )
                    .catch(e => {
                        console.log(`cant send delete order, because ${e}`)
                    });
                break;
            case 'exportPortfolio':
                console.log('send data for Export');
                if (msg.params.collapse) {
                    getListStock(2).then(function (list_symbols) {
                        list_symbols.result = 'listPortfolio';
                        port.postMessage(Object.assign({},
                            {result: "listForExport"},
                            {account: msg.params.account},
                            {currency: msg.params.currency},
                            {collapse: msg.params.collapse},
                            {list: (msg.params.account === 'Tinkoff' ? list_symbols.stocks_tcs : list_symbols.stocks_iis)})
                        );
                    });
                } else
                    exportPortfolio(msg.params.account)
                        .then(result => {
                                port.postMessage(Object.assign({},
                                    {result: "listForExport"},
                                    {account: msg.params.account},
                                    {currency: msg.params.currency},
                                    {collapse: msg.params.collapse},
                                    {list: result})
                                );
                            }
                        )
                        .catch(e => {
                            console.log(`cant send data for export, because ${e}`)
                        });
                break;
            case 'getLiquid':
                portfolio.getLiquid().then(list => {
                    port.postMessage(Object.assign({},
                        {result: "listLiquid"},
                        {list: list}));
                    console.log("send liquid list .....");
                });
                break;
            case 'getPrognosis':
                portfolio.getPrognosis().then(list => {
                    port.postMessage(Object.assign({},
                        {result: "listPrognosis"},
                        {list: list}));
                    console.log("send prognosis list .....");
                });
                break;
            case 'getNews':
                getNews(msg.params.nav_id).then(news => {
                    news['nav_id'] = msg.params.nav_id
                    port.postMessage(Object.assign({},
                        {result: "news"},
                        {news: news}));
                    console.log("send news list .....");
                });
                break;
            case 'getPulse':
                getNews(msg.params.nav_id).then(news => {
                    // сворачиваем все портфолио до списка акций для рисования навигации в пульсе
                    news['navs'] = [].concat(portfolio.items.stocks_tcs, portfolio.items.stocks_iis).reduce((prev, curr) => {
                        return [...prev, ...[{id: curr.symbol.ticker, name: curr.symbol.ticker}]];
                    }, []);
                    news['nav_id'] = msg.params.nav_id;
                    //news['tickers_list'] = tickers_list;
                    port.postMessage(Object.assign({},
                        {result: "pulse"},
                        {news: news}));
                    console.log("send puls list .....");
                });
                break;
            case 'postComment':
                postComment(msg.params.postId, msg.params.text).then(res => {
                    console.log("post comment .....");
                });
                break;
            case 'setLikeComment':
                likeComment(msg.params.commentId, msg.params.like).then(res => {
                    console.log("like comment .....");
                });
                break;
            case 'setLikePost':
                likePost(msg.params.commentId, msg.params.like).then(res => {
                    console.log("like post .....");
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
    await MainProperties.getSession().then(async session_id => {
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
        MainProperties.getSessionOption().then(pingFlag => {
            if (pingFlag) {
                console.log('ping server');
                MainProperties.getSession().then(session_id => {
                    fetch(PING_URL + session_id)
                        .then(response => response.json())
                        .then(response => {
                            if (response.payload.accessLevel.toUpperCase() === 'ANONYMOUS') {
                                MainProperties._sessionOption = undefined;
                                // меняем иконку на воскл знак
                                chrome.browserAction.setTitle({title: 'Сессия истекла, проверьте настройки'});
                                chrome.browserAction.setIcon({path: "/icons/icon16_warning.png"});
                            } else {
                                checkAlerts();          // достижение цены по бумагам в списке отслеживания
                                checkPortfolioAlerts(); // резкая смена доходности портфеля
                                checkSymbolsAlerts();   // резкая смена доходности бумаг в портфеле
                                //updateAlertPrices();  // обновляем цены в интерфейсе настроек
                                // возвращаем обычную иконку
                                chrome.browserAction.setIcon({path: "/icons/icon16.png"});
                                chrome.browserAction.setTitle({title: 'TCS Broker'});
                            }

                        }).catch(e => {
                        MainProperties._sessionOption = undefined;
                        // меняем иконку на воскл знак
                        chrome.browserAction.setTitle({title: 'Нет сети'});
                        chrome.browserAction.setIcon({path: "/icons/icon16_warning.png"});
                        console.log('Сервис недоступен или ошибка сети' + e);
                    })
                }).catch(e => {
                    // сессия невалидна
                    chrome.storage.sync.get([OPTION_REDIRECT], result => {
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

/**
 * класс кэширующий все параметры, которые редко меняюся (но могут быть затратными по времени как fetch sessionId,
 * так и ограниченные по количеству в единицу времени как обращение в local storage)
 * все меоды статические, при первомом запросе формируется асинхронный вызов,
 * последующие вызовы получают значения из полей класса
 */
export class MainProperties {

    static async getSession() {
        if (!(this._sessionId === undefined)) {
            //console.log('get cached sessionId');
            return this._sessionId
        }
        return await getTCSsession().then(sessionId => {
            this._sessionId = sessionId;
            //console.log('get NOT cached sessionId');
            return sessionId;
        })

    };

    static async getSessionOption() {
        if (!(this._sessionOption === undefined)) {
            //console.log('get cached convertToRUB', this._convertToRUB);
            return this._sessionOption;
        }
        return new Promise(resolve =>
            chrome.storage.sync.get([OPTION_SESSION], result => {
                this._sessionOption = result[OPTION_SESSION];
                resolve(result[OPTION_SESSION]);
            })
        );
    }

    static async getConvertToRUB() {
        if (!(this._convertToRUB === undefined)) {
            //console.log('get cached convertToRUB', this._convertToRUB);
            return this._convertToRUB;
        }
        return new Promise(resolve =>
            chrome.storage.sync.get([OPTION_CONVERT_TO_RUB], result => {
                this._convertToRUB = result[OPTION_CONVERT_TO_RUB];
                resolve(result[OPTION_CONVERT_TO_RUB]);
            })
        );
    }

    static async getAVOption() {
        if (!(this._AVOption === undefined) && !(this._AVKey === undefined)) {
            //console.log('get cached AVOption');
            return {AVOption: this._AVOption, AVKey: this._AVKey};
        }
        const promises = [
            new Promise(resolve =>
                chrome.storage.sync.get([OPTION_ALPHAVANTAGE], (result) => {
                    this._AVOption = result[OPTION_ALPHAVANTAGE];
                    resolve(result[OPTION_ALPHAVANTAGE]);
                })
            ),
            new Promise(resolve =>
                chrome.storage.sync.get([OPTION_ALPHAVANTAGE_KEY], (result) => {
                    this._AVKey = result[OPTION_ALPHAVANTAGE_KEY];
                    resolve(result[OPTION_ALPHAVANTAGE_KEY]);
                })
            )
        ];
        return new Promise(resolve => {
            Promise.all(promises)
                .then(([AV_Option, AV_Key]) => {
                    this._AVOption = AV_Option;
                    this._AVKey = AV_Key;
                    //console.log('get NOT cached AVOption');
                    resolve({AVOption: AV_Option, AVKey: AV_Key});
                })
        })
    }
}

// вызывается при изменении storage
chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (let key in changes) {
        let storageChange = changes[key];
        if (namespace === 'local') {
            // перерисовываем таблицу с уведомлениями при изменении Storage
            if (key === TICKER_LIST) port.postMessage({result: "listStock"});
        } else {
            // обновляем значение в стат классе
            if (key === OPTION_CONVERT_TO_RUB) MainProperties._convertToRUB = storageChange.newValue;
            if (key === OPTION_ALPHAVANTAGE) MainProperties._AVOption = storageChange.newValue;
            if (key === OPTION_ALPHAVANTAGE_KEY) MainProperties._AVKey = storageChange.newValue;
            if (key === OPTION_SESSION) MainProperties._sessionOption = storageChange.newValue;
        }
    }
});

let portfolio = class {
    items;
    set items(items) {
        this.items = items;
    };

    get items() {
        return this.items;
    };

    static async getLiquid() {
        if (!(this._liquidList === undefined)) {
            return this._liquidList
        }
        return await getLiquidList().then(list => {
            this._liquidList = list;
            return list;
        })
    }

    static async getPrognosis() {
        if (!(this._prognosisList === undefined)) {
            return this._prognosisList
        }
        return await getPrognosisList().then(list => {
            this._prognosisList = list;
            return list;
        })
    }
};