'use strict';

export function sortAlertRow(first, second) {
    return giveLessDiffToTarget(first) > giveLessDiffToTarget(second)
}

export function giveLessDiffToTarget(desireTicker) {
    let diffToBuy = 100;
    let diffToSell = 100;
    if (desireTicker.buy_price) diffToBuy = (desireTicker.online_buy_price - desireTicker.buy_price) / desireTicker.online_buy_price;
    if (desireTicker.sell_price) diffToSell = (desireTicker.sell_price - desireTicker.online_sell_price) / desireTicker.online_sell_price;
    return (diffToBuy < diffToSell) ? diffToBuy : diffToSell;
}

// {
//     active: true
//     best_before: ""
//     buy_price: "66.22"
//     currency: "RUB"
//     earnings:
//         absolute: {currency: "RUB", value: 0.0525}
//     relative: 0.0007907817442385902
//     __proto__: Object
//     exchangeStatus: "Open"
//     online_average_price: 66.4425
//     online_buy_price: 66.445
//     online_sell_price: 66.43
//     sell_price: ""
//     showName: "Доллар США"
//     ticker: "USDRUB"
// }