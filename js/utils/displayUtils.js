'use strict';

// Функция заполняющая текст "Остаток на счете ТКС 4 268,10 ₽    18,92 $    " с пропуском валют, если там 0
export function fillCashData(msg, cash_str, cash_element_id) {
    let resultCash = 0;
    for (let cash in msg.cash.payload.data) {
        let currentBalance = msg.cash.payload.data[cash].currentBalance;
        resultCash +=  currentBalance;
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