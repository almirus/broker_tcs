export const INFO_URL = 'https://api.tinkoff.ru/v1/session_status?sessionid=';
export const TRADING_PURCHASED_URL = 'https://api.tinkoff.ru/trading/portfolio/purchased_securities?sessionId=';
export const LOGIN_URL = 'https://www.tinkoff.ru/login/?redirectTo=/invest/broker_account/';
export const HOST_URL = 'https://www.tinkoff.ru/';
export const FAVORITE_URL = 'https://api.tinkoff.ru/trading//user/get_favorites?sessionId=';
export const PORTFOLIO_URL = 'https://api.tinkoff.ru/trading/portfolio/purchased_securities?sessionId=';
export const ALL_ACCOUNTS = 'https://api.tinkoff.ru/trading/portfolio/all_accounts?sessionId=';
export const BUY_LINK = 'https://www.tinkoff.ru/invest/buy/';
export const SELL_LINK = 'https://www.tinkoff.ru/invest/sell/';
export const PING_URL = 'https://api.tinkoff.ru/v1/ping?sessionid=';
export const INTERVAL_TO_CHECK = 1;
export const OPTION_COSMETICS = 'cosmetic';
export const OPTION_SESSION = 'session';
export const OPTION_REDIRECT = 'redirect';
export const OPTION_ALERT = 'alert_redirect';
export const OPTION_ALERT_TODAY = 'alert_today';
export const TICKER_LIST = 'tickerList';
export const PRICE_URL = 'https://api.tinkoff.ru/trading/stocks/price?sessionId=';
export const SYMBOL_URL = 'https://api.tinkoff.ru/trading/symbols/get?sessionId=';

//export const EXTENSION_ID='gggmpnfbhgpbglfenigemnnlfhjddcid';
export const EXTENSION_ID = 'gapmjheepdpmgeidjoickhapneiapgek';

export let port = chrome.runtime.connect( {
    name: "tcs_trader"
});