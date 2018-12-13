export const INFO_URL = 'https://api.tinkoff.ru/v1/session_status?sessionid=';
export const LOGIN_URL = 'https://www.tinkoff.ru/login/?redirectTo=/invest/broker_account/';
export const HOST_URL = 'https://www.tinkoff.ru/';
export const FAVORITE_URL = 'https://api.tinkoff.ru/trading//user/get_favorites?sessionId=';
export const ADD_FAFORITE_URL = 'https://api.tinkoff.ru/trading//user/add_to_favorites?sessionId=';
// POST {"tickers":["MAGN"]}
export const PORTFOLIO_URL = 'https://api.tinkoff.ru/trading/portfolio/purchased_securities?sessionId=';
export const ALL_ACCOUNTS = 'https://api.tinkoff.ru/trading/portfolio/all_accounts?sessionId=';
export const BUY_LINK = 'https://www.tinkoff.ru/invest/buy/';
export const SELL_LINK = 'https://www.tinkoff.ru/invest/sell/';
export const SYMBOL_LINK = 'https://www.tinkoff.ru/invest/broker_account/stock/';
export const PING_URL = 'https://api.tinkoff.ru/v1/ping?sessionid=';
export const PRICE_URL = 'https://api.tinkoff.ru/trading/stocks/price?sessionId=';
/*
{
  "payload": {
    "instrumentStatus": "OpenAll",
    "earnings": {
      "absolute": {
        "currency": "RUB",
        "value": 0.32
      },
      "relative": 0.003143418467583497
    },
    "last": {
      "currency": "RUB",
      "value": 102.12,
      "fromCache": false
    },
    "buy": {
      "currency": "RUB",
      "value": 102.12,
      "fromCache": false
    },
    "exchangeStatus": "Open",
    "close": {
      "currency": "RUB",
      "value": 101.8,
      "fromCache": false
    },
    "sell": {
      "currency": "RUB",
      "value": 102,
      "fromCache": false
    }
  },
  "trackingId": "lJbOmmaiPA",
  "time": "2018-12-13T15:56:35.827+03:00",
  "status": "Ok"
}
*/
export const SYMBOL_URL = 'https://api.tinkoff.ru/trading/symbols/get?sessionId=';
export const SEARCH_URL = 'https://api.tinkoff.ru/trading/stocks/list?sessionId=';
export const USER_URL = 'https://api.tinkoff.ru/trading/user/info?sessionId=';
export const CHECK_VERSION_URL = 'https://api.tinkoff.ru/trading/other/version?sessionId=';

export const INTERVAL_TO_CHECK = 1;
export const OPTION_COSMETICS = 'cosmetic';
export const OPTION_SESSION = 'session';
export const OPTION_REDIRECT = 'redirect';
export const OPTION_ALERT = 'alert_redirect';
export const OPTION_ALERT_TODAY = 'alert_today';
export const OPTION_ALERT_TODAY_VALUE = 'alert_today_value';
export const OPTION_ALERT_TODAY_PER_SYMBOL = 'alert_today_per_symbol';
export const OPTION_ALERT_TODAY_VALUE_PER_SYMBOL = 'alert_today_value_per_symbol';
export const TICKER_LIST = 'tickerList';


export let port = chrome.runtime.connect({
    name: "tcs_trader"
});