'use strict';
export const INFO_URL = 'https://api.tinkoff.ru/v1/session_status?appName=invest_terminal&appVersion=4.19.0&sessionid=';
export const LOGIN_URL = 'https://www.tinkoff.ru/login/?redirectTo=/invest/broker_account/';
export const SIGN_OUT_URL = 'https://api.tinkoff.ru/v1/sign_out?appName=invest_terminal&appVersion=4.19.0&sessionid=';
export const HOST_URL = 'https://www.tinkoff.ru/';
export const FAVORITE_URL = 'https://api.tinkoff.ru/trading/user/get_favorites?sessionId=';
export const ADD_FAFORITE_URL = 'https://api.tinkoff.ru/trading/user/add_to_favorites?sessionId=';
export const PORTFOLIO_URL = 'https://api.tinkoff.ru/trading/portfolio/purchased_securities?appName=invest_terminal&appVersion=4.19.0&sessionId=';
export const ALL_ACCOUNTS = 'https://api.tinkoff.ru/trading/portfolio/all_accounts?sessionId=';
export const BUY_LINK = 'https://www.tinkoff.ru/invest/buy/';
export const SELL_LINK = 'https://www.tinkoff.ru/invest/sell/';
export const EVENTS_LINK = 'https://www.tinkoff.ru/invest/stocks/${symbol}/events/';
export const PROGNOSIS_LINK = 'https://www.tinkoff.ru/invest/${securityType}/${symbol}/prognosis/';
export const DIVIDENDS_URL = 'https://api.tinkoff.ru/trading/stocks/dividends?sessionId=';
//export const SYMBOL_LINK = 'https://www.tinkoff.ru/invest/broker_account/stock/';
export const SYMBOL_LINK = 'https://www.tinkoff.ru/invest/${securityType}/';
export const PING_URL = 'https://api.tinkoff.ru/v1/ping?sessionid=';
export const PRICE_URL = 'https://api.tinkoff.ru/trading/${securityType}/price?sessionId=';
export const FEATURES_URL = 'https://api.tinkoff.ru/trading/futures/get?ticker=${ticker}&y=omg&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const CURRENCY_PRICE_URL = 'https://api.tinkoff.ru/trading/currency/price?sessionId=';
export const SYMBOL_URL = 'https://api.tinkoff.ru/trading/${securityType}/get?sessionId=';
export const CURRENCY_SYMBOL_URL = 'https://api.tinkoff.ru/trading/currency/get?sessionId=';
export const CURRENCY_LIST_URL = 'https://api.tinkoff.ru/trading/currency/list?y=omg&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const PROGNOSIS_URL = 'https://api-invest.tinkoff.ru/smartfeed-public/v1/feed/api/instruments/${ticker}/forecasts?id_kind=ticker&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const CONSENSUS_URL = 'https://api-invest.tinkoff.ru/apa/analytics/forecast/consensus?isin=${isin}&y=omg&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId='
export const SET_ALERT_URL = 'https://api.tinkoff.ru/trading/subscriptions/price_alert?ticker=${ticker}&price=${price}&sessionId=';
export const ORDERS_URL = 'https://api.tinkoff.ru/trading/user/orders?sessionId=';
export const STOP_URL = 'https://api.tinkoff.ru/trading/user/stop_orders?appName=invest_terminal&appVersion=4.19.0&sessionId=';
export const CANCEL_ORDER = 'https://api.tinkoff.ru/trading/order/cancel?orderId=${orderId}&brokerAccountType=${brokerAccountType}&sessionId=';
export const CANCEL_STOP = 'https://api.tinkoff.ru/trading/order/cancel_stop?orderId=${orderId}&brokerAccountType=${brokerAccountType}&sessionId=';
export const UNSUBSCRIBE = 'https://api.tinkoff.ru/trading/subscriptions/unsubscribe?subscriptId=${orderId}&sessionId=';
export const HOLD_BUY_ORDER = 'https://api.tinkoff.ru/trading/order/hold_buy_price?ticker=${ticker}&accountType=${accountType}&orderType=${orderType}&quantity=${quantity}&sessionId=';
export const HOLD_SELL_ORDER = 'https://api.tinkoff.ru/trading/order/hold_sell_price?ticker=${ticker}&accountType=${accountType}&orderType=${orderType}&quantity=${quantity}&sessionId=';
export const CREATE_ORDER = 'https://api.tinkoff.ru/trading/order/limit_order?ticker=${ticker}&price=${price}&quantity=${quantity}&side=${side}&accountType=${accountType}&sessionId=';
export const CONFIRM_ORDER = 'https://api.tinkoff.ru/trading/order/confirm?requestId=${requestId}&smsNumber=${smsNumber}&sessionId=';
export const FULL_PRICE_ORDER = 'https://api.tinkoff.ru/trading/order/full_price_limit?operationType=${operationType}&quantity=${quantity}&ticker=${ticker}&price=${price}&accountType=${accountType}&sessionId=';
export const SYMBOL_EXTENDED_LINK = 'https://api.tinkoff.ru/trading/symbols/user_info?ticker=${ticker}&sessionId=';
export const SYMBOL_FUNDAMENTAL_URL = 'https://api.tinkoff.ru/trading/${securityType}/fundamentals?sessionId=';
export const OPERATIONS_URL = 'https://api.tinkoff.ru/trading/user/operations?sessionId='; //{"from":"2015-03-01T00:00:00Z","to":"2019-07-24T08:42:44Z","overnightsDisabled":true}
export const SUBSCRIPTIONS_URL = 'https://api.tinkoff.ru/trading/subscriptions/price_subscriptions?sessionId=';
export const LIQUID_URL = 'https://api.tinkoff.ru/trading/portfolio/liquid_portfolio?sessionId=';
export const RECALIBRATION_LINK = 'https://www.tinkoff.ru/invest/recommendations/recalibration/';
export const FINN_RECOMENDATION = 'https://finnhub.io/api/v1/stock/recommendation?symbol=${ticker}&token=';
export const FINN_CONSTITUENTS = 'https://finnhub.io/api/v1/index/constituents?symbol=${ticker}&token=';
export const SEARCH_URL = 'https://api.tinkoff.ru/trading/${securityType}/list?cpswc=true&ccc=true&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const USER_URL = 'https://api.tinkoff.ru/trading/user/info?sessionId=';
export const CURRENCY_LIMIT_URL = 'https://api.tinkoff.ru/trading/portfolio/currency_limits?sessionId=';
export const CHECK_VERSION_URL = 'https://api.tinkoff.ru/trading/other/version?sessionId=';
export const ACCOUNTS_URL = 'https://api.tinkoff.ru/trading/user/broker_accounts?appName=invest_terminal&appVersion=4.19.0&sessionId=';
export const SHELVES_URL = 'https://api-invest.tinkoff.ru/catalog/shelves?y=omg&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const NOTE_PUT_URL ='https://api-invest-gw.tinkoff.ru/social/note/v1/instrument/note/${noteId}?y=omg&deviceId=2cb59723b132726c&appVersion=4.20.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId='
export const NOTE_URL ='https://api-invest-gw.tinkoff.ru/social/note/v1/instrument/${ticker}/note?y=omg&deviceId=2cb59723b132726c&appVersion=4.20.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId='
//{start: "2018-02-01", end: "2019-01-10", group: "M", currency: "RUR", timezone: "+03:00"}
export const SUMMARY_URL = 'https://api.tinkoff.ru/trading/portfolio/portfolio_summary?sessionId=';
export const NEWS_URL = 'https://api-invest.tinkoff.ru/smartfeed-public/v1/feed/api/main?nav_id=${navId}&limit=30&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const COMMENTS_URL = 'https://api-invest-gw.tinkoff.ru/social/v1/post/${commentId}/comment?limit=30&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const PULSE_FOR_TICKER_URL = 'https://api-invest-gw.tinkoff.ru/social/v1/post/instrument/${navId}?limit=30&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const PROFILE_ACTIVITY_URL = 'https://api-invest-gw.tinkoff.ru/social/v1/profile/${navId}/post?limit=30&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const PROFILE_INSTRUMENTS_URL = 'https://api-invest-gw.tinkoff.ru/social/v1/profile/${navId}/instrument?limit=30&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const AVATAR_URL = 'https://api-invest-gw.tinkoff.ru/social/file/v1/cache/profile/avatar/${img}?size=small&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const IMAGE_URL = 'https://api-invest-gw.tinkoff.ru/social/file/v1/cache/post/image/${imgId}?size=small&appName=investing&appVersion=4.19.0&origin=mobile,ib5,loyalty,platform&platform=android&y=omg&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const PULSE_POST_LIKE_URL = 'https://api-invest-gw.tinkoff.ru/social/v1/post/${postId}/like?size=small&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const PULSE_COMMENT_LIKE_URL = 'https://api-invest-gw.tinkoff.ru/social/v1/post/comment/${commentId}/like?size=small&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const PROFILE_URL = 'https://api-invest-gw.tinkoff.ru/social/v1/profile/${profileId}?size=small&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const USER_LIST_URL = 'https://api-invest-gw.tinkoff.ru/social/v1/profile/catalog?limit=30&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const USER_OPERATION_BY_TICKER_URL = 'https://api-invest-gw.tinkoff.ru/social/v1/profile/${profileId}/operation/instrument/${ticker}/${classCode}?limit=50&deviceId=2cb59723b132726c&appVersion=4.19.0&platform=android&appName=investing&origin=mobile%2Cib5%2Cloyalty%2Cplatform&sessionId=';
export const YANDEX_TRANSLATE = 'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20190913T211312Z.13833f619c95d3aa.29ec76510845a30c5b01ab996a071b915eaf96a1';

export const INTERVAL_TO_CHECK = 1;//min
export const OPTION_COSMETICS = 'cosmetic';
export const OPTION_SESSION = 'session';
export const OPTION_REDIRECT = 'redirect';
export const OPTION_ALERT = 'alert_redirect';
export const OPTION_ALERT_TODAY = 'alert_today';
export const OPTION_ALERT_TODAY_VALUE = 'alert_today_value';
export const OPTION_ALERT_TODAY_PER_SYMBOL = 'alert_today_per_symbol';
export const OPTION_ALERT_TODAY_VALUE_PER_SYMBOL = 'alert_today_value_per_symbol';
export const OPTION_ALERT_ORDER_PER_SYMBOL = 'alert_order_per_symbol';
export const OPTION_ALERT_ORDER_VALUE_PER_SYMBOL = 'alert_order_value_per_symbol';
export const OPTION_CONVERT_TO_RUB = 'convert_to_rub';
export const OPTION_SORT_BY = 'sort_by';
export const OPTION_ALPHAVANTAGE = 'alphavantage';
export const OPTION_ALPHAVANTAGE_KEY = 'alphavantage_key';
export const OPTION_FAVORITE = 'favorite';
export const OPTION_FAVORITE_LIST = 'add_favorite';
export const TICKER_LIST = 'tickerList';
export const NOTE_LIST = 'noteList';
export const ALERT_TICKER_LIST = 'alertTickerList';
export const NOTES_LIST = 'notesList';
export const NEW_TICKERS = 'newTickersList';
export const OPTION_RIFINITIV = 'rifinitiv';
export const OPTION_FINN_ENABLED = 'finnconsensus';
export const OPTION_FINN_GETLAST = 'finnconsensus_1m';
export const OPTION_MINUS_CURRENT_POS = 'minus_current_pos';
//up to 5 API requests per minute and 500 requests per day
export const ALPHAVANTAGE_KEY = 'M3JMJM8U22EIIO2Y';
export const AV_SYMBOL_URL = 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=';
export const FINN_SYMBOL_URL = 'https://finnhub.io/api/v1/quote?symbol=${ticker}&token=';
//https://rest-demo.tradingview.com/tradingview/v1/mapping
export const USD_RUB = 'USDRUB';
export const EUR_RUB = 'EURRUB';
export const HEALTH = {
    MarginCall: {
        heart: "❤", title: 'Тобi пiзда'
    },
    Demand: {
        heart: "💛", title: 'Необходимо пополнить счет'
    },
    Normal: {
        heart: "💚", title: 'Торговля без ограничений'
    }
};
export const PLURAL_SECURITY_TYPE = {
    Stock: 'stocks',
    Share: 'stocks',
    Currency: 'currencies',
    Bond: 'bonds',
    Bonds: 'bonds',
    ETF: 'etfs',
    Note: 'notes',
    Futures: 'futures'
};
export const SYMBOL_URL_CONVERT = {
    Stock: 'stocks',
    Share: 'stocks',
    Currency: 'currency',
    Bond: 'bonds',
    Bonds: 'bonds',
    ETF: 'etfs',
    Note: 'notes',
    Futures: 'futures'
};
export const SEARCH_SECURITY_TYPE = [
    'stocks',
    'currency',
    'bonds',
    'etfs',
    'futures'
];
export const RUS_OPERATION_TYPE = {
    done: 'успешна',
    decline: 'отменена',
    progress: 'в процессе',
}
export const RUS_OPERATION = {
    Buy: 'Покупать',
    Hold: 'Держать',
    Sell: 'Продавать',
};
export const IMOEX_LIST = [
    'AFKS',
    'AFLT',
    'ALRS',
    'CBOM',
    'CHMF',
    'DSKY',
    'FEES',
    'FIVE',
    'GAZP',
    'GMKN',
    'HYDR',
    'IRAO',
    'LKOH',
    'LSRG',
    'MAGN',
    'MAIL',
    'MGNT',
    'MOEX',
    'MTSS',
    'NLMK',
    'NVTK',
    'PHOR',
    'PIKK',
    'PLZL',
    'POGR',
    'POLY',
    'QIWI',
    'ROSN',
    'RSTI',
    'RTKM',
    'RUAL',
    'SBER',
    'SBERP',
    'SNGS',
    'SNGSP',
    'TATN',
    'TATNP',
    'TCSG',
    'TRNFP',
    'UPRO',
    'VTBR',
    'YNDX'];
export let port = chrome.runtime.connect({
    name: "tcs_trader"
});

export class Ticker {
    constructor(name, ticker) {
        this.name = name;
        this.ticker = ticker;
    }
}

export class Price {
    constructor(value, currency) {
        this.value = value;
        this.currency = currency;
    }
}

export class Symbol {
    couponsAcquired;
    currentPrice;
    stopOrders = [];
    isin;
    averagePositionPrice;
    securityType;
    currentBalance;
    expectedYield;
    expectedYieldPerDayRelative;
    couponsYield;
    ticker;
    expectedYieldPerDay;
    limits;
    expectedYieldRelative;
    currentAmount;
    symbolOwner;
    prognosis;

    constructor(data) {
        Object.assign(this, data);
    }

    set prognosis(prognosis) {
        this.prognosis = prognosis;
    }
}


class StockList {
    list = [];

    constructor(data = []) {
        data.forEach(item => {
            this.list.push(new Symbol(item))
        })
    }

    add(symbol, symbolOwner) {
        this.list.push(symbol);
    }

    remove(isin) {

    }
}

export class Portfolio extends StockList {
    totalAmountNotes;
    benefits;
    totalAmountCurrencies;
    totalAmountEtf;
    totalAmountStocks;
    totalAmountBonds;
    expectedYield;
    expectedYieldPerDayRelative;
    portfolioAmountByCurrency;
    totalAmountPortfolio;
    expectedYieldPerDay;
    expectedYieldRelative;
}


//hold
/*{
    payload: {
        markupCoefficient: 0.003,
            nkd: 0,
            validUntil: "2019-02-11T17:17:36.979+03:00",
            amountWithoutMarkup: {
            currency: "USD",
                value: 38.66
        },
        priceHold: {
            id: "863055790941974753",
                holdType: "Buy"
        },
        amount: {
            currency: "USD",
                value: 38.78
        },
        ticker: "MU"
    },
    trackingId: "NG9hPBvEBI",
        time: "2019-02-11T17:15:36.99+03:00",
    status: "Ok"
}*/

//create_order
/*
{
    payload: {
        message: "Цена не попадает в допустимый интервал от 36.63 до 40.5",
            code: "RequestValidation",
            info: {
            field: "price"
        }
    },
    trackingId: "GoWzdnsgfw",
        time: "2019-02-11T17:20:35.631+03:00",
    status: "Error"
}*/
/*
{
    payload: {
        requestId: "4578719464638531345",
            confirmationType: "Sms"
    },
    trackingId: "UWcQGRSXZO",
        time: "2019-02-11T17:22:19.378+03:00",
    status: "NeedConfirmation"
}*/
