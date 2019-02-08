'use strict';
export const INFO_URL = 'https://api.tinkoff.ru/v1/session_status?sessionid=';
export const LOGIN_URL = 'https://www.tinkoff.ru/login/?redirectTo=/invest/broker_account/';
export const HOST_URL = 'https://www.tinkoff.ru/';
export const FAVORITE_URL = 'https://api.tinkoff.ru/trading//user/get_favorites?sessionId=';
export const ADD_FAFORITE_URL = 'https://api.tinkoff.ru/trading//user/add_to_favorites?sessionId=';
export const PORTFOLIO_URL = 'https://api.tinkoff.ru/trading/portfolio/purchased_securities?sessionId=';
export const ALL_ACCOUNTS = 'https://api.tinkoff.ru/trading/portfolio/all_accounts?sessionId=';
export const BUY_LINK = 'https://www.tinkoff.ru/invest/buy/';
export const SELL_LINK = 'https://www.tinkoff.ru/invest/sell/';
export const EVENTS_LINK = 'https://www.tinkoff.ru/invest/stocks/${symbol}/events/';
export const PROGNOS_LINK = 'https://www.tinkoff.ru/invest/stocks/${symbol}/prognosis/';
//export const SYMBOL_LINK = 'https://www.tinkoff.ru/invest/broker_account/stock/';
export const SYMBOL_LINK = 'https://www.tinkoff.ru/invest/${securityType}/';
export const PING_URL = 'https://api.tinkoff.ru/v1/ping?sessionid=';
export const PRICE_URL = 'https://api.tinkoff.ru/trading/${securityType}/price?sessionId=';
export const CURRENCY_PRICE_URL = 'https://api.tinkoff.ru/trading/currency/price?sessionId=';
export const SYMBOL_URL = 'https://api.tinkoff.ru/trading/${securityType}/get?sessionId=';
export const CURRENCY_SYMBOL_URL = 'https://api.tinkoff.ru/trading/currency/get?sessionId=';
export const PROGNOSIS_URL = 'https://api.tinkoff.ru/trading/stocks/prognosis?ticker=${ticker}&sessionId=';
export const SET_ALERT_URL = 'https://api.tinkoff.ru/trading/subscriptions/price_alert?ticker=${ticker}&price=${price}&sessionId=';
export const ORDERS_URL = 'https://api.tinkoff.ru/trading/user/orders?brokerAccountType=${account}&sessionId=';



export const SEARCH_URL = 'https://api.tinkoff.ru/trading/stocks/list?sessionId=';
export const USER_URL = 'https://api.tinkoff.ru/trading/user/info?sessionId=';
export const CURRENCY_LIMIT_URL = 'https://api.tinkoff.ru/trading/portfolio/currency_limits?sessionId=';
export const CHECK_VERSION_URL = 'https://api.tinkoff.ru/trading/other/version?sessionId=';

//{start: "2018-02-01", end: "2019-01-10", group: "M", currency: "RUR", timezone: "+03:00"}
export const SUMMARY_URL = 'https://api.tinkoff.ru/trading/portfolio/portfolio_summary?sessionId=';

export const INTERVAL_TO_CHECK = 1;//min
export const OPTION_COSMETICS = 'cosmetic';
export const OPTION_SESSION = 'session';
export const OPTION_REDIRECT = 'redirect';
export const OPTION_ALERT = 'alert_redirect';
export const OPTION_ALERT_TODAY = 'alert_today';
export const OPTION_ALERT_TODAY_VALUE = 'alert_today_value';
export const OPTION_ALERT_TODAY_PER_SYMBOL = 'alert_today_per_symbol';
export const OPTION_ALERT_TODAY_VALUE_PER_SYMBOL = 'alert_today_value_per_symbol';
export const OPTION_CONVERT_TO_RUB = 'convert_to_rub';
export const OPTION_SORT_BY_NEAREST = 'sort_by_nearest';
export const TICKER_LIST = 'tickerList';
export const ALERT_TICKER_LIST = 'alertTickerList';
//up to 5 API requests per minute and 500 requests per day
export const  ALPHAVANTAGE_KEY = 'M3JMJM8U22EIIO2Y';
export  const AV_SYMBOL_URL = 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=';

export const USD_RUB = 'USDRUB';

export let port = chrome.runtime.connect({
    name: "tcs_trader"
});

export class Price {
    constructor(value, currency) {
        this.value = value;
        this.currency = currency;
    }
}

export class Symbol {
    constructor() {

    }
}

export class AlertList {
    add(symbol) {
        this.symbol.push(symbol);
    }

    remove(symbolName) {

    }

    update() {

    }

    render() {

    }
}

export class Portfolio extends AlertList {


}