'use strict';

// Функция заполняющая текст "Остаток на счете ТКС 4 268,10 ₽    18,92 $    " с пропуском валют, если там 0
export function fillCashData(msg, cash_str, cash_element_id) {
    let resultCash = 0;
    for (let cash in msg.cash.payload.data) {
        let currentBalance = msg.cash.payload.data[cash].currentBalance;
        resultCash += currentBalance;
        if (currentBalance !== 0) {
            cash_str += '<strong>' + toCurrency(currentBalance, msg.cash.payload.data[cash].currency) + '</strong>&nbsp;&nbsp;&nbsp;&nbsp;'
        }
    }
    document.getElementById(cash_element_id).innerHTML = (resultCash !== 0) ? cash_str : '';
}

// Функция преобразующая число в локальную валюту
export function toCurrency(value, currency = 'RUB') {
    return value.toLocaleString('ru-RU', {
        style: 'currency',
        currency: currency
    });
}

// Функция преобразующая число в проценты
export function toPercent(value, minimumFractionDigits = 2) {
    return value.toLocaleString('ru-RU', {
        style: 'percent',
        minimumFractionDigits: minimumFractionDigits
    });
}

function zerofill(number, length) {
    let result = number.toString();
    let pad = length - result.length;

    while (pad > 0) {
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
    return zerofill(hrs, 2) + 'ч ' + zerofill(mins, 2) + 'мин';
}

export function getAllAccountsHtmlInfo(accounts) {
    let res = '';
    Object.keys(accounts).forEach(function (key) {
        res += getAccountHtmlInfo(key, accounts[key]);
    });
    return res;
}

function getAccountHtmlInfo(accountName, accountInfo) {
    let rusAccountName = (accountName === 'Bcs') ? "БКС" :
        (accountName === 'Tinkoff') ? "ТКС" :
            (accountName === 'TinkoffIis') ? "ИИС" : accountName;

    let htmlTotalAmount = `<span style="font-weight: bold">${toCurrency(accountInfo.totalAmountPortfolio)}</span>`;
    let htmlExpectedYieldPerDay = `<span style="font-weight: bold" class="${accountInfo.expectedYieldPerDay > 0 ? 'onlineBuy' : 'onlineSell'}">${toCurrency(accountInfo.expectedYieldPerDay)}</span>`;
    let htmlExpectedYield = `<span style="font-weight: bold" class="${accountInfo.expectedYield > 0 ? 'onlineBuy' : 'onlineSell'}">${toCurrency(accountInfo.expectedYield)}</span>`;

    return `Счет ${rusAccountName} ${htmlTotalAmount}, 
            доход по счету ${htmlExpectedYield}, 
            доход сегодня ${htmlExpectedYieldPerDay}<br>`;
}

export function drawDayProgress(element) {
    let progress_style = element.symbol.dayOpen >= element.prices.last.value ? 'red' : 'green';
    let min = element.symbol.dayOpen;
    let max = element.prices.last.value;
    if (min > max) min = [max, max = min][0];

    let dayOpenPercent = 100 - (element.symbol.dayHigh - min) * 100 / (element.symbol.dayHigh - element.symbol.dayLow);
    let dayLastPercent = 100 - (element.symbol.dayHigh - max) * 100 / (element.symbol.dayHigh - element.symbol.dayLow);

    let canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 6;
    canvas.title = "Текущая цена " + element.prices.last.value + "  Дневной диапазон цен " + element.symbol.dayLow + " - " + element.symbol.dayHigh;
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = progress_style;
    ctx.fillRect(0, 2, 100, 2);
    ctx.fillStyle = progress_style;
    ctx.fillRect(dayOpenPercent, 0, dayLastPercent, 6);
    return canvas;
}


export function drawGraph(data, canvas) {
    function getPoints(data) {
        let points = [];
        let len = data.length;
        let sum = 0;
        let count_valid = 0;
        let max;
        let min;
        let d;
        for (let i = 0; i < len; i++) {
            d = data[i];
            if (typeof d === 'number') {
                if (typeof max !== 'number') {
                    max = d;
                    min = d;
                }
                max = d > max ? d : max;
                min = d < max ? d : min;
                count_valid += 1;
                sum += data[i];
            }
        }
        let average = sum / count_valid;
        let middle = (max - min) / 2;
        let range = max - min;
        for (let i = 0; i < len; i++) {
            d = data[i];
            if (typeof d === 'number') {
                points.push({
                    val: 2 * ((d - min) / range - 0.5),
                    data: d,
                    index: i
                });
            } else {
                points.push(null);
            }
        }
        return points;
    }

    let el = document.createElement('canvas');

    let len = data.length;
    let width = parseInt(el.attr('width'), 10);
    let height = parseInt(el.attr('height'), 10);
    let gap = width / (len - 1);
    let ctx = el.getContext('2d');
    let startPoint = null;
    let points = getPoints(data);
    let endPoint;
    let point;
    for (let i = 0; i < len; i++) {
        point = points[i];
        if (point) {
            if (!startPoint) {
                startPoint = point;
            }
            endPoint = point;
        }
    }
    if (!endPoint) {
        return;
    }
    ctx.save();
    ctx.fillStyle = '#f2f2f2';
    ctx.lineWidth = '3';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    ctx.beginPath();
    for (let i = 1; i < len; i++) {
        ctx.moveTo(i * gap, 0);
        ctx.lineTo(i * gap, height);
    }
    ctx.save();
    ctx.strokeStyle = '#DDD';
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(startPoint.index * gap, height);

    for (let i = 0; i < len; i++) {
        point = points[i];
        if (point) {
            ctx.lineTo(point.index * gap, -point.val * height * 0.8 / 2 + height / 2);
        }
    }
    ctx.lineTo(endPoint.index * gap, height);
    ctx.save();
    ctx.fillStyle = 'rgba(8,106,253,.4)';
    ctx.strokeStyle = '#086afc';
    ctx.lineWidth = '2';
    ctx.stroke();
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = '3';
    ctx.strokeRect(0, 0, width, height);
    ctx.restore();
    document.getElementById(canvas).appendChild(el);
}
