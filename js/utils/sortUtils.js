'use strict';

export function giveLessDiffToTarget(desireTicker) {
    let diffToBuy = 100;
    let diffToSell = 100;
    desireTicker.online_buy_price = desireTicker.online_buy_price || desireTicker.online_average_price;
    desireTicker.online_sell_price = desireTicker.online_sell_price || desireTicker.online_average_price;
    if (desireTicker.buy_price && desireTicker.online_buy_price) diffToBuy = (desireTicker.online_buy_price - desireTicker.buy_price) / desireTicker.online_buy_price;
    if (desireTicker.sell_price && desireTicker.online_sell_price) diffToSell = (desireTicker.sell_price - desireTicker.online_sell_price) / desireTicker.online_sell_price;
    if (diffToBuy + diffToSell === 200) return 0;
    return (diffToBuy < diffToSell) ? diffToBuy :diffToSell;
}