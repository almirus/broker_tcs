'use strict';

// Функция заполняющая текст "Остаток на счете ТКС 4 268,10 ₽    18,92 $    " с пропуском валют, если там 0
export function fillCashData(msg, cash_str, cash_element_id) {
    let resultCash = 0;
    for (let cash in msg.cash.payload.data) {
        let currentBalance = msg.cash.payload.data[cash].currentBalance;
        resultCash += currentBalance;
        if (currentBalance > 0) {
            cash_str += '<strong>' + toLocaleString(currentBalance, msg.cash.payload.data[cash].currency) + '</strong>&nbsp;&nbsp;&nbsp;&nbsp;'
        }
    }
    document.getElementById(cash_element_id).innerHTML = (resultCash > 0) ? cash_str : '';
}

export function toLocaleString(value, currency = 'RUB') {
    return value.toLocaleString('ru-RU', {
        style: 'currency',
        currency: currency
    });
}

function zerofill(number, length) {
    let result = number.toString();
    let pad = length - result.length;

    while(pad > 0) {
        result = '0' + result;
        pad--;
    }

    return result;
}

export function msToTime(s) {
    let ms = s % 1000;
    s = (s - ms) / 1000;
    let secs = s % 60;
    s = (s - secs) / 60;
    let mins = s % 60;
    let hrs = (s - mins) / 60;
    return zerofill(hrs,2) + 'ч ' + zerofill(mins,2) + 'мин ' + zerofill(secs,2) ;
}