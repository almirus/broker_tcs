'use strict';

import {
    ALERT_TICKER_LIST,
    ALL_ACCOUNTS,
    BUY_LINK,
    CANCEL_ORDER,
    CANCEL_STOP,
    CHECK_VERSION_URL,
    COMMENTS_URL,
    CONSENSUS_URL,
    CURRENCY_LIMIT_URL,
    CURRENCY_LIST_URL,
    DIVIDENDS_URL,
    FAVORITE_URL,
    FEATURES_URL,
    FINN_CONSTITUENTS,
    FINN_RECOMENDATION,
    FINN_SYMBOL_URL,
    HOST_URL,
    IMOEX_LIST,
    INFO_URL,
    INTERVAL_TO_CHECK,
    LIQUID_URL,
    LOGIN_URL,
    NEW_TICKERS,
    NEWS_URL,
    NOTE_LIST,
    OPERATIONS_URL,
    OPTION_ALERT,
    OPTION_ALERT_ORDER_PER_SYMBOL,
    OPTION_ALERT_ORDER_VALUE_PER_SYMBOL,
    OPTION_ALERT_TODAY,
    OPTION_ALERT_TODAY_PER_SYMBOL,
    OPTION_ALERT_TODAY_VALUE,
    OPTION_ALERT_TODAY_VALUE_PER_SYMBOL,
    OPTION_ALPHAVANTAGE,
    OPTION_ALPHAVANTAGE_KEY,
    OPTION_CONVERT_TO_RUB,
    OPTION_FAVORITE,
    OPTION_FAVORITE_LIST,
    OPTION_FINN_ENABLED,
    OPTION_FINN_GETLAST,
    OPTION_REDIRECT,
    OPTION_RIFINITIV,
    OPTION_SESSION,
    ORDERS_URL,
    PING_URL,
    PLURAL_SECURITY_TYPE,
    port,
    PORTFOLIO_URL,
    PRICE_URL,
    PROFILE_ACTIVITY_URL,
    PROFILE_INSTRUMENTS_URL,
    PROFILE_URL,
    PROGNOSIS_URL,
    PULSE_COMMENT_LIKE_URL,
    PULSE_FOR_TICKER_URL,
    PULSE_POST_LIKE_URL,
    SEARCH_SECURITY_TYPE,
    SEARCH_URL,
    SELL_LINK,
    SET_ALERT_URL,
    SHELVES_URL,
    SIGN_OUT_URL,
    STOP_URL,
    SUBSCRIPTIONS_URL,
    SYMBOL_EXTENDED_LINK,
    SYMBOL_FUNDAMENTAL_URL,
    SYMBOL_LINK,
    SYMBOL_URL,
    SYMBOL_URL_CONVERT,
    TICKER_LIST,
    UNSUBSCRIBE,
    USER_LIST_URL,
    USER_URL
} from "/js/constants.mjs";
import {giveLessDiffToTarget, hashCode} from "./utils/sortUtils.js";


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
            }).then(response => response.json()),
            fetch(FAVORITE_URL + sessionId)
                .then(response => response.json())
                .then(json => {
                    console.log('list of favorite');
                    let return_data = [];
                    [].concat(json.payload.stocks)
                        .concat(json.payload.bonds)
                        .concat(json.payload.currencies)
                        .concat(json.payload.etf)
                        .concat(json.payload.isgs)
                        .forEach(item => {
                            return_data.push({
                                isin: item.symbol.isin,
                                ticker: item.symbol.ticker,
                                showName: item.symbol.showName,
                                lotSize: item.symbol.lotSize,
                            });
                        });
                    return return_data;
                })

        ]).then(([tcs, iis, favorite]) => {
            resolve({tcs: tcs, iis: iis || [], favorite: favorite})
        }).catch(error => {
            console.log(`cant get portfolio, because ${error}`);
            reject({tcs: [], iis: []});
        })
    })
}

/**
 * конвертируем и дополняем данные для портфолио
 * @param data
 * @param needToConvert
 * @param currenciesCourse
 * @param sessionId
 * @return {Promise<Array>}
 */
async function convertPortfolio(data = [], needToConvert, currenciesCourse, sessionId) {
    let return_data = [];
    for (const element of data) {
        let securityType = SYMBOL_URL_CONVERT[element.securityType];
        await getSymbolInfo(element.ticker, securityType, sessionId).then(symbol => {
            let current_amount = element.currentAmount || {};
            let expected_yield = element.expectedYield || {};
            let earning_today = symbol.payload.earnings ? symbol.payload.earnings.absolute.value * element.currentBalance : 0;
            switch (securityType) {
                case 'notes':
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
                    break;
                case 'futures':
                    return_data.push({
                        expected_yield: {
                            value: element.expectedYield.value,
                            currency: element.expectedYield.currency
                        },
                        prices: {
                            buy: {
                                currency: element.currentAmount.currency,
                                value: symbol.payload.priceInfo.buy
                            },
                            close: {
                                currency: element.currentAmount.currency,
                                value: symbol.payload.priceInfo.close
                            },
                            last: {
                                currency: element.currentAmount.currency,
                                value: symbol.payload.priceInfo.last
                            },
                            sell: {
                                currency: element.currentAmount.currency,
                                value: symbol.payload.priceInfo.sell
                            },
                        },
                        earnings: {
                            absolute: {
                                value: element.expectedYieldPerDay.value,
                                currency: element.currentAmount.currency,
                            },
                            relative: element.expectedYieldPerDayRelative / 100,
                        },
                        contentMarker: undefined,
                        symbol: {
                            symbolType: 'Futures',
                            isOTC: false,
                            securityType: securityType,
                            ticker: element.ticker,
                            isin: element.isin,
                            status: element.status,
                            showName: symbol.payload.viewInfo.showName,
                            longIsEnabled: symbol.payload.orderInfo.longIsEnabled,
                            shortIsEnabled: symbol.payload.orderInfo.shortIsEnabled,
                            lotSize: element.currentBalance,
                            currentAmount: element.currentAmount ? element.currentAmount : {
                                value: element.currentAmount.value * element.currentBalance,
                                currency: element.currentAmount.currency
                            },
                            averagePositionPrice: {
                                value: element.averagePositionPricePt,
                                currency: element.currentAmount.currency
                            },
                            timeToOpen: '',
                            earningToday: element.expectedYieldPerDay.value,
                            expectedYieldRelative: element.expectedYieldRelative,
                            expectedYieldPerDayRelative: element.expectedYieldPerDayRelative,
                            expectedYield: {
                                value: element.expectedYield.value,
                                currency: element.expectedYield.currency
                            },
                        },
                        exchangeStatus: symbol.payload.exchangeInfo.timeToOpen === 0 ? 'Open' : 'Close',
                    });
                    break;
                case 'Stock':
                default:
                    if (symbol.payload.symbol.isOTC) {
                        earning_today = symbol.payload.earnings.absolute.value * element.currentBalance;

                        //expected_yield.value = symbol.payload.relativeOTC;
                    }
                    if (needToConvert && current_amount?.currency !== 'RUB') {
                        let currencyCourse = currenciesCourse[current_amount?.currency + 'RUB']?.lastPrice || 1

                        earning_today = earning_today * currencyCourse;
                        current_amount['value'] = current_amount?.value * currencyCourse;
                        current_amount['currency'] = 'RUB';
                        expected_yield['value'] = expected_yield?.value * currencyCourse;
                        expected_yield['currency'] = 'RUB';

                    }
                    return_data.push({
                        prices: symbol.payload.prices,
                        earnings: symbol.payload.earnings,
                        contentMarker: symbol.payload.contentMarker,
                        holidayDescription: symbol.payload.holidayDescription,
                        symbol: {
                            dayLow: symbol.payload.symbol.dayLow,
                            dayHigh: symbol.payload.symbol.dayHigh,
                            "52WLow": symbol.payload.symbol["52WLow"],
                            "52WHigh": symbol.payload.symbol["52WHigh"],
                            dayOpen: symbol.payload.symbol.dayOpen,
                            lastOTC: symbol.payload.lastOTC || '',
                            absoluteOTC: symbol.payload.absoluteOTC || 0,
                            relativeOTC: symbol.payload.relativeOTC || 0,
                            consensus: symbol.payload.symbol.consensus,
                            premium_consensus: symbol.payload.symbol.premium_consensus,
                            finn_consensus: symbol.payload.symbol.finn_consensus,
                            dividends: symbol.payload.symbol.dividends,
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
                            longIsEnabled: symbol.payload.symbol.longIsEnabled,
                            shortIsEnabled: symbol.payload.symbol.shortIsEnabled,
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
                                currency: element.currentPrice?.currency
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
function exportPortfolio(dateFrom = "2015-03-01T00:00:00Z", dateTo = (new Date()).toJSON(), ticker) {
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            fetch(OPERATIONS_URL + session_id, {
                method: "POST",
                body: JSON.stringify({
                    from: dateFrom,
                    to: dateTo,
                    "overnightsDisabled": true,
                    ...(ticker && {
                        ticker: ticker.toUpperCase()
                    })
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
async function getListStockForNote(name) {
    console.log('try to get list for note');
    let session_id = MainProperties.getSession();
    if (!/^\d+$/.test(name)) { // вручную, введена строка для поиска
        let json = await findTicker(name, session_id);
        let return_data = [];
        await json.payload.values.forEach(item => {
            return_data.push({
                prices: item.prices,
                symbol: {
                    ticker: item.symbol.ticker,
                    showName: item.symbol.showName,
                    isOTC: item.symbol.isOTC
                },
                exchangeStatus: item.exchangeStatus
            });
        });
        return return_data.slice(0, 3);
    }
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
                    getCurrencyCourse().then(list => {
                        console.log(JSON.stringify(list));
                        let result = [];
                        Object.keys(list).forEach(key => {
                                result.push({
                                    symbol: {
                                        ticker: key,
                                        showName: list[key].showName,
                                        lotSize: 1,
                                    },
                                    prices: {
                                        last: {
                                            value: list[key].lastPrice,
                                            currency: 'RUB'
                                        }
                                    }
                                });
                            }
                        );
                        resolve(Object.assign({}, {result: "listStock"}, {stocks: result}));
                    })
                } else
                    findTicker(name, session_id)
                        .then(json => {
                            console.log('found list');
                            let return_data = [];
                            json.payload.values.forEach(item => {
                                return_data.push({
                                    prices: item.prices || {
                                        buy: {
                                            currency: item.orderInfo.pointValue.currency,
                                            value: item.priceInfo.buy
                                        },
                                        close: {
                                            currency: item.orderInfo.pointValue.currency,
                                            value: item.priceInfo.close
                                        },
                                        last: {
                                            currency: item.orderInfo.pointValue.currency,
                                            value: item.priceInfo.last
                                        },
                                        sell: {
                                            currency: item.orderInfo.pointValue.currency,
                                            value: item.priceInfo.sell
                                        },
                                    },
                                    symbol: {
                                        ticker: item.symbol?.ticker || item.isin || item.instrumentInfo.ticker,
                                        showName: item.symbol?.showName || item.showName || item.viewInfo.showName,
                                        lotSize: item.symbol?.lotSize,
                                        isOTC: item.symbol?.isOTC
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
                        [].concat(json.payload.stocks)
                            .concat(json.payload.bonds)
                            .concat(json.payload.currencies)
                            .concat(json.payload.etf)
                            .concat(json.payload.isgs)
                            .forEach(item => {
                                return_data.push({
                                    prices: item.prices,
                                    symbol: {
                                        isin: item.symbol.isin,
                                        ticker: item.symbol.ticker,
                                        showName: item.symbol.showName,
                                        lotSize: item.symbol.lotSize,
                                        isOTC: item.symbol.isOTC
                                    },
                                    exchangeStatus: item.exchangeStatus
                                });
                            });
                        portfolio.favorite = return_data;
                        resolve(Object.assign({}, {result: "listStock"}, {stocks: return_data}));
                    }).catch(function (ex) {
                    console.log('parsing failed', ex);
                    reject(undefined);
                })
            } else {
                if (name === 2) { // портфолио
                    getCurrencyCourse().then(currencies => {
                        MainProperties.getConvertToRUB().then(needConvert => {
                            console.log('get session option');
                            getPortfolio(session_id).then(allPortfolio => {

                                console.log('list of portfolio');
                                Promise.all([
                                        convertPortfolio(allPortfolio.tcs.payload.data, needConvert, currencies, session_id),
                                        convertPortfolio(allPortfolio.iis.payload.data, needConvert, currencies, session_id),

                                    ]
                                ).then(([tcs_data, iis_data]) => {
                                    portfolio.favorite = allPortfolio.favorite;
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

async function getCurrencyCourse() {
    let session_id = await MainProperties.getSession();
    // POST
    let response = await fetch(CURRENCY_LIST_URL + session_id, {
            method: "POST",
            body: JSON.stringify({
                "country": "All",
                "end": 30,
                "orderType": "Asc",
                "sortType": "ByBuyBackDate",
                "start": 0
            }),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        }
    );
    let listOfCurrency = await response.json();
    let result = {};
    listOfCurrency.payload.values.forEach(item => {
        Object.assign(result, {
            [item.symbol.ticker]: {
                showName: item.symbol.showName,
                lastPrice: item.prices.last.value
            }
        }, {});
    });
    return result;
}

function findTicker(search, session_id) {
    return new Promise((resolve, reject) => {
            // Запускаем несколько поисков по всем типам бумаг
            Promise.all(SEARCH_SECURITY_TYPE.map(url =>
                // POST
                fetch(SEARCH_URL.replace('${securityType}', url) + session_id, {
                    method: "POST",
                    body: JSON.stringify({
                        start: 0,
                        end: 10,
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
                }).then(resp => resp.json())
            )).then(listOfFound => {
                if (listOfFound.length > 0) {
                    let result = {payload: {values: []}};
                    //в цикле по сгруппированным по типам найденных бумаг
                    listOfFound.map(listOfTicker => {
                        // объединяем все массивы
                        result.payload.values = result.payload.values.concat(listOfTicker.payload.values)
                    })
                    resolve(result);
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
                        //resolve([]);
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

async function getIndex(indexName) {
    const option = await MainProperties.getAVOption();
    try {
        const response = await fetch(FINN_CONSTITUENTS.replace('${ticker}', indexName) + option.AVKey);
        let json = await response.json();
        return json.constituents;
    } catch (e) {
        console.error('Достигнуто ограничение finnhub', e);
    }
}

function getFavorite() {
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            fetch(FAVORITE_URL + session_id)
                .then(response => response.json())
                .then(json => {
                    console.log('list of Favourite');
                    let return_data = [];
                    [].concat(json.payload.stocks)
                        .concat(json.payload.bonds)
                        .concat(json.payload.currencies)
                        .concat(json.payload.etf)
                        .concat(json.payload.isgs)
                        .forEach(item => {
                            return_data.push({
                                symbol: {
                                    showName: item.symbol.showName,
                                    isin: item.symbol.isin,
                                    ticker: item.symbol.ticker,
                                    symbolType: item.symbol.symbolType,
                                    isOTC: item.symbol.isOTC
                                }
                            });
                        });
                    MainProperties.getFavoriteOption().then(isFavoriteChecked => {
                        resolve(isFavoriteChecked ? return_data : []);
                    })
                }).catch(function (ex) {
                console.log('parsing failed', ex);
                reject([]);
            })
        })
    });
}

function getNews(nav_id) {
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            console.log('Get News');
            let url = '';
            let type = '';
            switch (true) {
                case /users/.test(nav_id):
                    url = USER_LIST_URL + session_id;
                    type = 'user';
                    break;
                case /profile/.test(nav_id):
                    url = PROFILE_ACTIVITY_URL.replace('${navId}', nav_id.slice(0, nav_id.search('_profile'))) + session_id;
                    type = 'profile';
                    break;
                case /instrument/.test(nav_id):
                    type = 'instrument';
                    url = PROFILE_INSTRUMENTS_URL.replace('${navId}', nav_id.slice(0, nav_id.search('_instrument'))) + session_id;
                    break;
                case /^[0-9]+$/.test(nav_id) || !nav_id:
                    url = NEWS_URL.replace('${navId}', nav_id) + session_id;
                    break;
                case /^[A-Z@0-9]+$/.test(nav_id):
                    type = 'ticker';
                    url = PULSE_FOR_TICKER_URL.replace('${navId}', nav_id) + session_id;
                    break;
            }
            fetch(url)
                .then(response => response.json())
                .then(json => {
                    const getFilteredComments = (news) => {
                        return news.map(async item => {
                            item['type'] = item['type'] || type;
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

function getProfile(id = '') {
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            console.log('Get profile');
            fetch(PROFILE_URL.replace('${profileId}', id) + session_id)
                .then(response => response.json())
                .then(json => {
                    if (json.status === 'Error') {
                        console.log('cant get profile', json);
                        resolve([]);
                    } else
                        console.log('success get profile');
                    resolve(json.payload);
                }).catch(ex => {
                console.log('cant get profile', ex);
                resolve([]);
            })
        })
    })
}

function logout() {
    return new Promise((resolve, reject) => {
        MainProperties.getSession().then(session_id => {
            console.log('logout');
            fetch(SIGN_OUT_URL + session_id)
                .then(response => response.json())
                .then(json => {
                    if (json.status === 'Error') {
                        console.log('cant logout', json);
                        resolve(0);
                    } else
                        console.log('success logout');
                    resolve(1);
                }).catch(ex => {
                console.log('cant logout', ex);
                resolve(0);
            })
        })
    })
}

function getPriceInfo(tickerName, securityType = 'stocks', session_id) {
    return new Promise((resolve, reject) => {
        console.log(`Get price for ${tickerName}`);
        if (tickerName) {
            if (securityType === 'futures') {
                fetch((FEATURES_URL.replace('${ticker}', tickerName)) + session_id, {
                    method: "GET",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    }
                }).then(response => response.json())
                    .then(res => {
                        fetch(SYMBOL_EXTENDED_LINK.replace('${ticker}', tickerName) + session_id).then(response => response.json())
                            .then(extendInfo => {
                                /*
                                online_buy_price: res.payload.buy?.value || res.payload.last?.value || 0,
                                online_sell_price: res.payload.sell?.value || res.payload.last?.value || 0,
                                buy_price: item.buy_price || (item.subscriptions ? sorted_subscriptions[0].price : 0),
                                sell_price: item.sell_price || 0,
                                */
                                res.payload = {
                                    buy: {value: res.payload.priceInfo.last},
                                    sell: {value: res.payload.priceInfo.last},
                                    last: {
                                        value: res.payload.priceInfo.last,
                                        currency: res.payload.orderInfo.pointValue.currency
                                    },
                                    earnings: {
                                        absolute: {
                                            currency: res.payload.orderInfo.pointValue.currency,
                                            value: res.payload.earningsInfo.absolute
                                        },
                                        relative: res.payload.earningsInfo.relative
                                    },
                                    isFavorite: extendInfo.payload.isFavorite,
                                    subscriptions: extendInfo.payload.priceAlert
                                };
                                resolve(res);
                            }).catch(e => {
                            console.log(`Сервис доп информации для ${tickerName} недоступен`, e);
                            reject(res)
                        });
                    }).catch(e => {
                    console.log(e);
                    reject(undefined);
                });
            } else
                // POST
                fetch((PRICE_URL.replace('${securityType}', securityType)) + session_id, {
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
        console.log('try to get symbolInfo for', tickerName, securityType);
        fetch(SYMBOL_URL.replace('${securityType}', securityType) + sessionId, {
            method: "POST",
            body: securityType.includes('notes') ? JSON.stringify({isin: tickerName}) : JSON.stringify({ticker: tickerName}),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        }).then(response => response.json())
            .then(async res => {
                if (res.status.toLocaleUpperCase() === 'OK' && !securityType.includes('notes')) {
                    console.log('get fundamentals for ', tickerName);
                    const response = await fetch(SYMBOL_FUNDAMENTAL_URL.replace('${securityType}', securityType) + sessionId, {
                        method: "POST",
                        body: JSON.stringify({
                            period: 'year',
                            ticker: tickerName
                        }),
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });
                    let json = await response.json();
                    if (json.status.toLocaleUpperCase() === 'OK') {
                        res.payload.symbol.dayHigh = json.payload.dayHigh;
                        res.payload.symbol.dayLow = json.payload.dayLow;
                        res.payload.symbol.dayOpen = json.payload.dayOpen;
                        res.payload.symbol["52WLow"] = json.payload["52WLow"];
                        res.payload.symbol["52WHigh"] = json.payload["52WHigh"];
                        res.payload.symbol.dividends = [];
                    } else {
                        console.warn('cant get fundamentals for', tickerName, securityType)
                    }
                }
                const option = await MainProperties.getAVOption();
                if (res.payload.symbol && option.AVOption && res.payload.symbol.isOTC) {
                    try {
                        const response = await fetch(FINN_SYMBOL_URL.replace('${ticker}', tickerName) + option.AVKey);
                        let json = await response.json();
                        res.payload.lastOTC = parseFloat(json.c);
                        res.payload.absoluteOTC = parseFloat(json.c - json.pc);
                        res.payload.relativeOTC = parseFloat((json.c - json.pc) * 100 / json.o) / 100;
                        res.payload['symbol']['dayHigh'] = parseFloat(json.h);
                        res.payload['symbol']['dayLow'] = parseFloat(json.l);
                        res.payload['symbol']['dayOpen'] = parseFloat(json.o);

                    } catch (e) {
                        console.error('Достигнуто ограничение finnhub', e);
                    }
                }
                resolve(res)
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
                        orderType: element.orderType,
                        isOTC: element.isOTC,
                        status: element.status,
                        quantityExecuted: element.quantityExecuted,
                        brokerAccountType: element.brokerAccountType
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
                        price: element.price,
                        currency: element.currency,
                        best_before: undefined,
                        active: true,
                        timeToExpire: element.timeToExpire,
                        orderId: element.orderId,
                        status: element.status,
                        orderType: element.orderType,
                        brokerAccountType: element.brokerAccountType
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
                        let portfolioList = [].concat(portfolio.tcs.payload.data, portfolio.iis.payload.data, portfolio.favorite);
                        portfolioList.forEach(async item => {
                            if (item?.ticker) {
                                const response = await fetch(PROGNOSIS_URL.replace('${ticker}', item.ticker) + session_id);
                                let json = await response.json();
                                item['consensus'] = json.payload.consensus;
                                const api = await MainProperties.getAVOption();
                                const finn = await MainProperties.getFinnOption();
                                if (finn.FinnEnabled && item?.ticker && item.securityType === 'Stock')// только для портфеля запрашиваем рекомендации
                                    try {
                                        const response = await fetch(FINN_RECOMENDATION.replace('${ticker}', item.ticker) + api.AVKey);
                                        let array = await response.json();
                                        if (finn.FinnLast) array = array.slice(0, 1); // только один прогноз
                                        else array = array.slice(0, 6);
                                        item['finn_consensus'] = array; // последние 6 пронозов
                                    } catch (e) {
                                        console.error(e);
                                    }
                            }
                            const rif = await MainProperties.getRifOption();
                            if (rif.RifEnabled && item?.isin) {
                                const response = await fetch(CONSENSUS_URL.replace('${isin}', item.isin) + session_id)
                                let json = await response.json();
                                item['premium_consensus'] = json.payload;
                            }
                            if (item?.ticker) {
                                const response = await fetch(DIVIDENDS_URL.replace('${ticker}', item.ticker) + session_id, {
                                    method: "POST",
                                    body: JSON.stringify({
                                        ticker: item.ticker
                                    }),
                                    headers: {
                                        'Accept': 'application/json',
                                        'Content-Type': 'application/json',
                                    }
                                });
                                let json = await response.json();
                                item['dividends'] = json.payload.dividends;
                            }
                        })
                        resolve(portfolioList);
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
                getFavorite().then(favorite_list => {
                    return (favorite_list.map(item => {
                        item.symbol['favoriteList'] = true;
                        return item.symbol
                    }))
                }),
                getOrders(session_id).then(orders => {
                    return (orders)
                }),
                getStop(session_id).then(stops => {
                    return (stops)
                }),
                getSubscriptions(session_id).then(subscriptions => {
                    return (subscriptions)
                }),
            ]).then(async ([favorite_list, orders, stops, subscriptions]) => {
                portfolio.orders = orders.map(item => {
                    return {
                        symbol: {
                            ticker: item.ticker,
                            symbolType: (item.symbolType || item.securityType || 'Stock')
                        }
                    };
                });
                favorite_list = favorite_list.filter(favoriteItem => {
                    // исключаем из списка Избранного элементы из др списков, чтобы сократить итоговой список
                    return !([].concat(orders, stops, subscriptions).find(item => item.ticker === favoriteItem.ticker));
                })
                let alert_data = [].concat(await MainProperties.getFavoriteListOption() ? favorite_list : [], orders, stops, subscriptions);
                let i = 0;
                const alertOrderOption = await MainProperties.getAlertOrderOption();
                //console.info(alert_data);
                //TODO сделать запрос к поиску
                for (const item of alert_data) {
                    //alert_data.forEach(function (item, i, alertList) {

                    await getPriceInfo(item.ticker, SYMBOL_URL_CONVERT[(item.symbolType || item.securityType || 'Stock')], session_id).then(priceInfo => {

                        let sorted_subscriptions = item.subscriptions?.sort((a, b) => a.price - b.price);
                        let opacity_rate = giveLessDiffToTarget({
                            online_buy_price: priceInfo.payload.buy?.value || priceInfo.payload.last?.value || 0,
                            online_sell_price: priceInfo.payload.sell?.value || priceInfo.payload.last?.value || 0,
                            buy_price: item.buy_price || (item.subscriptions ? sorted_subscriptions[sorted_subscriptions.length - 1]?.price : 0),
                            sell_price: item.sell_price || 0,
                        });

                        if (item.orderId && alertOrderOption.alertEnabled && opacity_rate > 0 && Math.abs(opacity_rate) * 100 <= alertOrderOption.alertOrder) {
                            getOldRelative(item.ticker + '_order').then(old_relative => {
                                console.log('repeated alert for ' + item.ticker, old_relative);
                                //chrome.storage.sync.remove(item.ticker + '_order');

                            }).catch(e => {
                                // сохраняем достигнутую доходность
                                setOldRelative(item.ticker + '_order', alertOrderOption.alertOrder);
                                chrome.notifications.create(OPTION_ALERT_ORDER_PER_SYMBOL + '|' + item.ticker, {
                                    type: 'basic',
                                    iconUrl: '/icons/order.png',
                                    title: `Заявка по ${item.ticker} близка к исполнению (примерно на ${(Math.abs(opacity_rate) * 100).toFixed(2)}%)`,
                                    message: 'Проверьте свой портфель',
                                    requireInteraction: true,
                                    buttons: [
                                        {title: 'Удалить уведомление и перейти в портфель'}
                                    ],
                                    priority: 0
                                });
                                console.log('alert order near to execution')
                            });

                        }
                        alert_data[i] = {
                            ticker: item.ticker,
                            securityType: PLURAL_SECURITY_TYPE[(item.symbolType || item.securityType || 'Stock')],
                            showName: item.showName,
                            buy_price: item.buy_price || (item.subscriptions ? item.subscriptions[0].price : 0),
                            sell_price: item.sell_price,
                            best_before: item.best_before,
                            active: item.active,
                            earnings: priceInfo.payload.earnings,
                            exchangeStatus: priceInfo.payload.exchangeStatus,
                            currency: !priceInfo.payload.last ? 'USD' : priceInfo.payload.last.currency,
                            online_average_price: !priceInfo.payload.last ? 0 : priceInfo.payload.last.value,
                            online_buy_price: priceInfo.payload.buy?.value,
                            online_sell_price: priceInfo.payload.sell?.value || priceInfo.payload.last?.value || 0,
                            price: item.price,
                            orderId: item.orderId,
                            opacity_rate: opacity_rate,
                            operationType: item.operationType,
                            timeToExpire: item.timeToExpire,
                            status: item.status,
                            isFavorite: priceInfo.payload.isFavorite,
                            isOTC: item.isOTC,
                            subscriptPrice: sorted_subscriptions,
                            quantity: item.quantity,
                            quantityExecuted: item.quantityExecuted,
                            favoriteList: item.favoriteList,
                            orderType: item.orderType,
                            brokerAccountType: item.brokerAccountType
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

async function getNewTickers(clean) {
    let session_id = await MainProperties.getSession();
    let search_obj = {
        country: "All",
        sortType: "ByPrice",
        orderType: "Asc",
    };
    let response = await fetch(SEARCH_URL + session_id, {
        method: "POST",
        body: JSON.stringify(search_obj),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
    });
    let listOfFound = await response.json();
    if (listOfFound.status.toLocaleUpperCase() === 'OK') {
        async function getValue(name) {
            return new Promise(resolve => {
                chrome.storage.local.get(name, data => {
                    resolve(data);
                });
            });
        }

        let list = listOfFound.payload.values.reduce((result, item, index) => {
            result.push({
                ticker: item.symbol.ticker,
                showName: item.symbol.showName,
                isOTC: item.symbol.isOTC,
                symbolType: item.symbol.symbolType,
            });
            return result;
        }, []);
        let newList = [];
        // сохраненение нового списка newList останется undefined
        if (!clean) {
            // берем список ранее сохраненного списка
            newList = await getValue(NEW_TICKERS);
            newList = newList[NEW_TICKERS];
        }
        console.log('get old list');
        if (newList?.length) {
            // ищем разницу между списками
            const different = newList.filter(o1 => !list.some(o2 => o1.ticker === o2.ticker));
            // ищем одинаковые но которые поменяли флаг isOTC
            let isNotOTC = newList.filter(o1 => list.some(o2 => o1.ticker === o2.ticker && o1.isOTC !== o2.isOTC));
            // брокер возвращает дубли, удаляем
            isNotOTC = isNotOTC.filter(item => {
                return !item.isOTC
            });
            return {different: different, isNotOTC: isNotOTC};
        } else {
            chrome.storage.local.set({[NEW_TICKERS]: list}, () => {
                console.log('save newtickets list');
            })
            return {different: undefined, isNotOTC: undefined};
        }

    } else {
        console.log('Сервис поиска недоступен');
        return undefined
    }
}

async function getIPO() {
    let session_id = await MainProperties.getSession();
    let response = await fetch(SHELVES_URL + session_id, {
        method: "GET",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
    });
    let shelves = await response.json();

    if (shelves.status.toLocaleUpperCase() === 'OK') {
        return shelves.payload.shelves.filter(item => {
            return item.shelfName && (item.shelfName.toLocaleUpperCase() === 'РАЗМЕЩЕНИЯ' || item.shelfName.toLocaleUpperCase().indexOf('IPO') > 0)
        })

    } else {
        console.log('Сервис поиска недоступен');
        return undefined
    }
}

async function getTreeMap(listName = 'All', isOTC) {
    let session_id = await MainProperties.getSession();
    let list;
    let search_obj = {
        start: 0,
        end: 500,
        sortType: "ByPrice",
        orderType: "Asc",
        country: listName
    };
    if (isOTC) {
        search_obj['filterOTC'] = isOTC === 1
    }
    if (listName === 'Mine') {
        search_obj['country'] = 'All';
        search_obj['popular'] = true;
        let favorite = await getFavorite();
        // сворачиваем все портфолио до списка акций для рисования навигации в пульсе
        list = [...new Set([].concat(portfolio.items.stocks_tcs, portfolio.items.stocks_iis, portfolio.orders, favorite).filter(item => {
            return item.symbol.symbolType === 'Stock'
        }).reduce((prev, curr) => {
            return [...prev, ...[curr.symbol.ticker]];
        }, []))];
        search_obj['tickers'] = list;
    }
    if (listName === 'IMOEX') {
        search_obj['country'] = 'All';
        search_obj['tickers'] = IMOEX_LIST;
    }
    if (listName === '^GSPC' || listName === '^NDX' || listName === '^DJI') {
        search_obj['country'] = 'All';
        search_obj['tickers'] = await getIndex(listName);
    }
    // POST
    let response = await fetch(SEARCH_URL + session_id, {
        method: "POST",
        body: JSON.stringify(search_obj),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
    });
    let listOfFound = await response.json();

    if (listOfFound.status.toLocaleUpperCase() === 'OK') {
        // уникальный массив категорий (секторов)
        let category = Array.from(new Set(listOfFound.payload.values.map(({symbol}) => symbol.sector)));
        // список тикеров для TreeMap
        let list = listOfFound.payload.values.reduce((result, item, index) => {
            if (item.earnings) {
                let fill;
                item.earnings.relative *= 100;
                //item.earnings.relative = Math.random()*100;
                if (item.earnings.relative < -3) {
                    fill = 'rgb(246, 53, 56)';
                }
                if (item.earnings.relative >= -3 && item.earnings.relative <= -2) {
                    fill = 'rgb(191, 64, 69)'
                }
                if (item.earnings.relative >= -2 && item.earnings.relative < -1) {
                    fill = 'rgb(139, 68, 78)'
                }
                if (item.earnings.relative >= -1 && item.earnings.relative < 1) {
                    fill = '#414553'
                }
                if (item.earnings.relative >= 1 && item.earnings.relative < 2) {
                    fill = 'rgb(53, 118, 78)'
                }
                if (item.earnings.relative >= 2 && item.earnings.relative <= 3) {
                    fill = 'rgb(47, 158, 79)'
                }
                if (item.earnings.relative > 3) {
                    fill = 'rgb(48, 204, 90)'
                }

                let obj = {
                    parent: item.symbol.sector,
                    id: item.symbol.ticker,
                    product: (item.symbol.isOTC ? '👑' : '') + item.symbol.ticker,
                    showName: item.symbol.showName,
                    relative: item.earnings.relative.toFixed(2), // здесь истинное значение для вывода на экран
                    value: Math.abs(item.earnings.relative), //treemap не учитывает отриц значения, приходится перобразовыввать
                    fill: fill,
                };
                result.push(obj);
            }
            return result;
        }, []);
        // склееиваем все списки
        return ([{ // родительский пустой узел
            parent: null,
            id: 0,
            product: ''
        }].concat(category.reduce((result, item, index) => {
            let obj = { // категории
                parent: 0,
                id: item,
                product: item,
            };
            result.push(obj);
            return result;
        }, [])).concat(list));// список тикеров
    } else {
        console.log('Сервис поиска недоступен');
        return undefined
    }
}

/*
    добавляет заметку по тикеру в хранилище
 */
function addNote(ticker, note, date) {
    return new Promise(resolve => {
        chrome.storage.sync.get([NOTE_LIST], notes => {
            notes[NOTE_LIST][hashCode(ticker + note)] = {ticker: ticker, note: note, date: date};
            chrome.storage.sync.set({[NOTE_LIST]: notes}, () => {
                console.log('add new note, now is ', notes);
                resolve(notes)
            })
        });
    })
}

function deleteNote(id) {
    chrome.storage.sync.get([NOTE_LIST], notes => {
        notes.push({ticker: ticker, note: note, date: date});
        chrome.storage.sync.set({[NOTE_LIST]: notes}, () => {
            console.log('add new note');
            port.postMessage({result: "noteList", params: {list: notes}});
        })
    });

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
            case 'getListStockForNote':
                getListStockForNote(msg.params).then(function (list_symbols) {
                    console.log("send message listStockForNote .....");
                    port.postMessage({result: "listStockForNote", stocks: list_symbols});
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
            case 'getOperations':
                getCurrencyCourse().then(currencies => {
                    exportPortfolio(msg.dateFrom, msg.dateTo, msg.ticker)
                        .then(result => {
                                port.postMessage(Object.assign({},
                                    {result: "listOfOperations"},
                                    {account: msg.account},
                                    {list: result},
                                    {currencies: currencies},
                                    {hideCommission: msg.hideCommission},
                                    {operationType: msg.operationType})
                                );
                            }
                        )
                        .catch(e => {
                            console.log(`cant send data for operations, because ${e}`)
                        });
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
                    exportPortfolio()
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
                    (async () => {
                        let favorite = [];
                        if (await MainProperties.getFavoriteOption()) favorite = await getFavorite();
                        // сворачиваем все портфолио до списка акций для рисования навигации в пульсе
                        // пульс доступен только для акций, поэтому фильтруем
                        news['navs'] = [...new Set([].concat(portfolio.items.stocks_tcs, portfolio.items.stocks_iis, portfolio.orders, favorite).filter(item => {
                            return item.symbol.symbolType === 'Stock' && !item.symbol.isOTC
                        }).reduce((prev, curr) => {
                            return [...prev, ...[curr.symbol.ticker]];
                        }, []))];
                        news['nav_id'] = msg.params.nav_id;
                        //news['tickers_list'] = tickers_list;
                        getProfile().then(profile => {
                            news['profile'] = profile;
                            port.postMessage(Object.assign({},
                                {result: "pulse"},
                                {news: news}));
                            console.log("send puls list .....");
                        });
                    })();


                });
                break;
            case 'getTreemap':
                getTreeMap(msg.country, msg.isOTC).then(res => {
                    port.postMessage(Object.assign({},
                        {result: "treemap"},
                        {list: res}));
                    console.log("send treemap .....");
                });
                break;
            case 'getNewTickers':
                Promise.all([getNewTickers(), getIPO()]).then(([newTickers, IPOs]) => {
                    port.postMessage(Object.assign({},
                        {result: "newTickers"},
                        {IPOs: IPOs},
                        {newTickers: newTickers}));
                    console.log("send list of new tickers.....");
                });
                break;
            case 'cleanNewTickers':
                Promise.all([getNewTickers(true), getIPO()]).then(([newTickers, IPOs]) => {
                    port.postMessage(Object.assign({},
                        {result: "newTickers"},
                        {IPOs: IPOs},
                        {newTickers: newTickers}));
                    console.log("send list of new tickers.....");
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
            case 'getProfile':
                getProfile(msg.params.profileId).then(res => {
                    port.postMessage(Object.assign({},
                        {result: "profile"},
                        {profile: res}));
                    console.log("send profile .....");
                });
                break;
            case 'logout':
                logout().then(res => {
                    console.log("logout .....");
                });
                break;
            case 'addNote':
                addNote(msg.params.ticker, msg.params.note, msg.params.date).then(res => {
                    console.log("send update notes table .....");
                    port.postMessage({result: "noteList", list: res});
                })
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
    if (notificationId.includes(OPTION_ALERT_ORDER_PER_SYMBOL)) {
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
    // нажали на кнопках в Уведомлении об изменении цены акций
    if (notificationId.includes(OPTION_ALERT_ORDER_PER_SYMBOL)) {
        chrome.notifications.clear(notificationId);
        chrome.storage.sync.remove(ticker[1] + '_order');
        // перейти в список
        if (btnIdx === 0) {
            redirect_to_page('https://www.tinkoff.ru/invest/orders/', true)
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

    static async getFinnOption() {
        if (!(this._FinnEnabled === undefined) && !(this._FinnLast === undefined)) {
            return {FinnEnabled: this._FinnEnabled, FinnLast: this._FinnLast};
        }
        const promises = [
            new Promise(resolve =>
                chrome.storage.sync.get([OPTION_FINN_ENABLED], (result) => {
                    this._FinnEnabled = result[OPTION_FINN_ENABLED];
                    resolve(result[OPTION_FINN_ENABLED]);
                })
            ),
            new Promise(resolve =>
                chrome.storage.sync.get([OPTION_FINN_GETLAST], (result) => {
                    this._FinnLast = result[OPTION_FINN_GETLAST];
                    resolve(result[OPTION_FINN_GETLAST]);
                })
            )
        ];
        return new Promise(resolve => {
            Promise.all(promises)
                .then(([Enabled, Last]) => {
                    this._FinnEnabled = Enabled;
                    this._FinnLast = Last;
                    //console.log('get NOT cached AVOption');
                    resolve({FinnEnabled: Enabled, FinnLast: Last});
                })
        })
    }

    static async getRifOption() {
        if (!(this._RifEnabled === undefined)) {
            return {RifEnabled: this._RifEnabled};
        }
        const promises = [
            new Promise(resolve =>
                chrome.storage.sync.get([OPTION_RIFINITIV], (result) => {
                    this._RifEnabled = result[OPTION_RIFINITIV];
                    resolve(result[OPTION_RIFINITIV]);
                })
            )
        ];
        return new Promise(resolve => {
            Promise.all(promises)
                .then(([Enabled]) => {
                    this._RifEnabled = Enabled;
                    resolve({RifEnabled: Enabled});
                })
        })
    }

    static async getFavoriteOption() {
        if (!(this._favoriteOption === undefined)) {
            //console.log('get cached sessionId');
            return this._favoriteOption
        }
        return new Promise(resolve =>
            chrome.storage.sync.get([OPTION_FAVORITE], result => {
                this._favoriteOption = result[OPTION_FAVORITE];
                resolve(result[OPTION_FAVORITE]);
            })
        );

    };

    static async getAlertOrderOption() {
        if (!(this._alertOrder === undefined) && !(this._alertOrderEnabled === undefined)) {
            //console.log('get cached sessionId');
            return {alertOrder: this._alertOrder, alertEnabled: this._alertOrderEnabled};
        }
        return new Promise(resolve =>
            chrome.storage.sync.get([OPTION_ALERT_ORDER_PER_SYMBOL, OPTION_ALERT_ORDER_VALUE_PER_SYMBOL], result => {
                if (result[OPTION_ALERT_ORDER_PER_SYMBOL]) {
                    this._alertOrder = result[OPTION_ALERT_ORDER_VALUE_PER_SYMBOL];
                    this._alertOrderEnabled = result[OPTION_ALERT_ORDER_PER_SYMBOL];
                    resolve({
                        alertOrder: result[OPTION_ALERT_ORDER_VALUE_PER_SYMBOL],
                        alertEnabled: result[OPTION_ALERT_ORDER_PER_SYMBOL]
                    });
                } else {
                    this._alertOrder = 0;
                    this.alertEnabled = false;
                    resolve({alertOrder: 0, alertEnabled: false});
                }
            })
        );

    };

    static async getFavoriteListOption() {
        if (!(this._favoriteListOption === undefined)) {
            //console.log('get cached sessionId');
            return this._favoriteListOption
        }
        return new Promise(resolve =>
            chrome.storage.sync.get([OPTION_FAVORITE_LIST], result => {
                this._favoriteListOption = result[OPTION_FAVORITE_LIST];
                resolve(result[OPTION_FAVORITE_LIST]);
            })
        );

    };
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
            if (key === OPTION_FAVORITE) MainProperties._favoriteOption = storageChange.newValue;
            if (key === OPTION_FAVORITE_LIST) MainProperties._favoriteListOption = storageChange.newValue;
            if (key === OPTION_ALERT_ORDER_VALUE_PER_SYMBOL) MainProperties._alertOrder = storageChange.newValue;
            if (key === OPTION_ALERT_ORDER_PER_SYMBOL) MainProperties._alertOrderEnabled = storageChange.newValue;
            // при установке галочек в опциях запрашиваем вновь прогноз, который будет измененм в зависомости от опций
            if (key === OPTION_RIFINITIV) {
                MainProperties._RifEnabled = storageChange.newValue;
                portfolio._prognosisList = undefined;
                (async () => {
                    await getPrognosisList().then(list => {
                        portfolio._prognosisList = list;
                    });
                })()
            }
            if (key === OPTION_FINN_ENABLED) {
                MainProperties._FinnEnabled = storageChange.newValue;
                portfolio._prognosisList = undefined;
                (async () => {
                    await getPrognosisList().then(list => {
                        portfolio._prognosisList = list;
                    });
                })()
            }
            if (key === OPTION_FINN_GETLAST) {
                MainProperties._FinnLast = storageChange.newValue;
                portfolio._prognosisList = undefined;
                (async () => {
                    await getPrognosisList().then(list => {
                        portfolio._prognosisList = list;
                    });
                })()
            }
        }
    }
});

const portfolio = class {
    items;
    orders;
    favorite;
    holidays = new Set();

    set items(items) {
        this.items = items;
    };

    get items() {
        return this.items;
    };

    set orders(orders) {
        this.orders = orders;
    };

    get orders() {
        return this.orders;
    };

    set favorite(favorite) {
        this.favorite = favorite;
    };

    get favorite() {
        return this.favorite;
    };

    set holidays(holidays) {
        this.holidays.add(holidays);
    };

    get holidays() {
        return this.holidays;
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