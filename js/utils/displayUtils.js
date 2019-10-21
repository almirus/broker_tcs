'use strict';

// Функция заполняющая текст "Остаток на счете ТКС 4 268,10 ₽    18,92 $    " с пропуском валют, если там 0
import {AVATAR_URL, HEALTH, PLURAL_SECURITY_TYPE, port, PROGNOSIS_LINK, SYMBOL_LINK} from "/js/constants.mjs";

const capitalize = function (str1) {
    return str1.charAt(0).toUpperCase() + str1.slice(1);
};

//https://gist.github.com/realmyst/1262561
const declOfNum = function (number, titles) {
    const cases = [2, 0, 1, 1, 1, 2];
    return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
};

function createTextLinks(text) {
    return (text || "").replace(
        /([^\S]|^)(((https?\:\/\/)|(www\.))(\S+))/,
        function (match, space, url) {
            let hyperlink = url;
            if (!hyperlink.match('^https?:\/\/')) {
                hyperlink = 'http://' + hyperlink;
            }
            return space + '<a target="_blank" href="' + hyperlink + '">' + url + '</a>';
        }
    );
}

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

export function renderNews(msg) {
    let buffer = '<div class="nav"><ul class="navigation">' + (msg.news.nav_id ? '<li class="newsNav" data-nav="">Вся лента</li>' : '');
    const itemType = {
        review: 'Обзор',
        news: '',
        forecast: 'Прогноз',
        company_news: 'Новости компаний',
        day_number: 'Цифра дня'
    };
    buffer += msg.news.navs.map(item => {
        return (item.id === 61) ? '' : `<li class="newsNav" data-nav="${item.id}">${item.id === 49 ? '👑' : ''}${item.name}</li>`
    }).join('') + '</ul></div><div style="clear: both;"></div>';
    msg.news.items = msg.news.items || [];
    buffer += msg.news.items.map(news => {
        switch (news.type) {
            case 'forecast': {
                news.item.logo_name = 'https://static.tinkoff.ru/brands/traiding/' + news.item.logo_name.replace('.', 'x160.');
                let back_ground_color = shadeColor(news.item.logo_base_color, -20);
                return `
<div class="forecast bordered" style="background-color: ${back_ground_color}">
<a class="width100" title="Открыть прогноз в новом окне" href="${PROGNOSIS_LINK.replace('${symbol}', news.item.ticker).replace('${securityType}', 'stocks')}" target="_blank">
        <h2 class="header white">${news.item.analyst && !news.item.analyst.search('^[^0-9]*$') ? news.item.analyst + ' из' : ''} ${news.item.company} про ${news.item.ticker}</h2>
        <div class="logo" style="background-size: cover;background-position: 50% 50%; background-image: url(${news.item.logo_name});"></div>
        <div class="recommendation">${news.item.recommendation}</div>
</a>
</div>`
            }
            case 'news':
            case 'review': {
                let is_vedomosti = news.item.provider && news.item.provider.id === 9;
                let is_has_background = news.item.img_big;
                let is_eng = false;
                // определяем язык новости
                chrome.i18n.detectLanguage(news.item.title + news.item.announce, result => {
                    is_eng = result.languages[0].language === 'en'
                });
                let tickers = news.item.tickers.map(item => {
                    return `<a title="Открыть страницу акции" href="${SYMBOL_LINK.replace('${securityType}', PLURAL_SECURITY_TYPE[capitalize(item.type)]) + item.ticker}" target="_blank">
                            <div class="logo" title = "${item.name}" style="background-size: cover; background-position: 50% 50%; background-image: url(${'https://static.tinkoff.ru/brands/traiding/' + item.logo_name.replace('.', 'x160.')});"></div>
                            </a>`;
                }).join('');
                return `
<div data-id="${news.item.id}" class="newsAnnounce ${is_vedomosti ? 'vedomosti' : ''} bordered" title="Читать"
     ${is_vedomosti ? '' : 'style="background-size: cover; background-image: url(' + news.item.img_big + ');"'}>
     <h2 id="${news.item.id}_header" data-id="${news.item.id}" class="header ${is_vedomosti || !is_has_background ? 'black' : 'white'}">${news.is_wm_content ? '👑' : ''}${news.item.title}
     
     </h2><div class="logoContainer">${tickers}</div>  
     <div id="${news.item.id}_announce" data-id="${news.item.id}" class="announce ${is_vedomosti || !is_has_background ? 'black' : 'white'}">${news.item.announce}</div>
     <div data-id="${news.item.id}" class="date ${is_vedomosti || !is_has_background ? 'black' : 'white'}">${itemType[news.type]} ${new Date(news.item.date).toLocaleDateString()}</div>
</div><span class="newsBody ${is_vedomosti ? 'vedomosti' : ''}" id="${news.item.id}_body">${news.item.body}</span>
${is_eng ? '<div data-id="' + news.item.id + '" class="translate" title="Перевести текст на русский">перевести</div>' : ''}`
            }
            case 'day_number': {
                return `
<div data-id="${news.item.id}" class="dayNumber">
<h4 data-id="${news.item.id}">ЦИФРА ДНЯ ${new Date(news.item.date).toLocaleDateString()} ${new Date(news.item.date).toLocaleTimeString()}</h4>
<h2 data-id="${news.item.id}">${news.item.title}</h2>
<div data-id="${news.item.id}" class="announce white">${news.item.announce}</div>
</div><span class="newsBody" id="${news.item.id}_body">${news.item.body}</span>`
            }
        }
    }).join('');
    document.getElementById('news_table').innerHTML = buffer;
}

export function renderPulse(msg) {
    let buffer = `<div class="nav"><ul class="navigation"><li class="pulseNav" data-nav="61">🔥 Пульс</li>
<li class="pulseNav ${(msg.news.profile.id + '_profile') === msg.news.nav_id ? 'current' : ''}" data-nav="${msg.news.profile.id}_profile">Мои посты</li>
<li class="pulseNav ${'users' === msg.news.nav_id ? 'current' : ''}" data-nav="users">Профили</li>`;
    buffer += msg.news.navs.map(item => {
        return `<li class="pulseNav ${item === msg.news.nav_id ? 'current' : ''}" data-nav="${item}">${item}</li>`
    }).join('') + '</ul></div><div style="clear: both;"></div>';
    msg.news.items = msg.news.items || [];
    let profiles = new Set();
    if (msg.news.nav_id && msg.news.items.length>0 && msg.news.items[0].instruments) {
        let ticket = msg.news.items[0].instruments.find(item => item.ticker === msg.news.nav_id);
        buffer += `
<div class="forecast bordered" style="background-color: #b0b3b6" id="ticker_${msg.news.nav_id}">
        <h2 class="header">${ticket.briefName}</h2>
        <div class="logo" style="background-size: cover;background-position: 50% 50%; background-image: url(https://static.tinkoff.ru/brands/traiding/${ticket.image.replace('.', 'x160.')});"></div>
        <div class="recommendation">
        <span class="${ticket.relativeDailyYield > 0 ? 'onlineBuy' : 'onlineSell'}">
        ${(ticket.relativeDailyYield / 100).toLocaleString('ru-RU', {
            style: 'percent',
            minimumFractionDigits: ticket.relativeDailyYield < 0.1 ? 4 : 2
        })}</span>
        ${ticket.lastPrice.toLocaleString('ru-RU', {
            style: 'currency',
            currency: ticket.currency,
            minimumFractionDigits: ticket.lastPrice < 0.1 ? 4 : 2
        })}</div>
</div>`
    };
    buffer += msg.news.items.map(news => {
        switch (news.type) {
            case 'user': {
                let avatar = news.image ? `<img class="avatar" src="${AVATAR_URL.replace('${img}', news.image)}">` : '<img class="avatar" src="/icons/empty_user.png">';
                return `<div class="newsAnnounce bordered pulse">
                    <h2 class="pulseProfile" data-nav="${news.id}_profile">${avatar}${news.nickname}</h2>
                    <div class="post">${news.yearRelativeYield}% за год</div><div style="clear: both;"></div>
                    </div>`
            }
            case 'bond':
            case 'etf':
            case 'share': {
                let ticker = `<div class="logo" title = "${news.showName}" style="background-size: cover; background-position: 50% 50%; background-image: url(${'https://static.tinkoff.ru/brands/traiding/' + news.image.replace('.', 'x160.')});"></div>`;
                return `
<div class="newsAnnounce bordered pulse">
<h2 class="header black">${news.showName}
</h2><div class="logoContainer">${ticker}</div>
<div class="post"><span class="operationCount" data-id="${news.ticker}" data-ticker="${news.ticker}" data-classCode="${news.classCode}">${news.statistics.totalOperationsCount}</span> ${declOfNum(news.statistics.totalOperationsCount, ['сделка', 'сделки', 'сделок'])}, последняя ${new Date(news.statistics.maxTradeDateTime).toLocaleDateString()} ${new Date(news.statistics.maxTradeDateTime).toLocaleTimeString()}</div></div>`;
            }
            case 'social_operation': {
                let ticker = news.item.ticker ? `<div class="logo" title = "${news.item.ticker.name}" style="background-size: cover; background-position: 50% 50%; background-image: url(${'https://static.tinkoff.ru/brands/traiding/' + news.item.ticker.logo_name.replace('.', 'x160.')});"></div>` : '';
                //let likes = '<div class="heart"></div>' + (news.likes_count > 0 ? news.likes_count : '');
                profiles.add(news.item.profile.id);
                let avatar = news.item.profile.image ? `<img class="avatar" src="${AVATAR_URL.replace('${img}', news.item.profile.image)}">` : '<img class="avatar" src="/icons/empty_user.png">';
                return `
<div data-id="${news.item.id}" class="newsAnnounce bordered pulse" style="background-color: ${shadeColor(news.item.ticker.color, -20)}">
<h2 class="header white" data-id="${news.item.id}">${avatar}<strong class="pulseProfile" data-nav="${news.item.profile.id}_profile">${news.item.profile.nickname}</strong> ${news.item.type === "BUY" ? 'купил' : 'продал'} 
${new Date(news.item.date).toLocaleDateString()} ${new Date(news.item.date).toLocaleTimeString()} ${news.item.ticker.name} за ${Number((news.item.price).toFixed(news.item.price < 0.1 ? 6 : 2))}
</h2><span class="profile white" data-id="${news.item.profile.id}_profile"></span>
<a class="width100" title="Открыть страницу акции" href="${SYMBOL_LINK.replace('${securityType}', PLURAL_SECURITY_TYPE[capitalize(news.item.ticker.type)]) + news.item.ticker.ticker}" target="_blank"><div class="logoContainer">${ticker}</div></a></div>`;
            }
            case 'ticker':
            case 'profile':
            case 'instrument': { // по отдельной бумаге, тип не заполняется
                let likes = `<div class="heart ${news.isLiked ? 'isLiked' : ''}" data-id="${news.id}"></div><div id="${news.id}_heart_count" class="heartCount">${(news.likesCount > 0 ? news.likesCount : '')}</div>`;
                let text = news.text;
                let comments_obj = news.commentsCount > 0 ? news.comments.items : [];
                let tickers = news.instruments.slice(0, 15).map(item => {
                    return `<a title="Открыть страницу акции" href="${SYMBOL_LINK.replace('${securityType}', PLURAL_SECURITY_TYPE[capitalize(item.type)]) + item.ticker}" target="_blank">
                            <div class="logo" title = "${item.ticker}" style="background-size: cover; background-position: 50% 50%; background-image: url(${'https://static.tinkoff.ru/brands/traiding/' + (item.image || '').replace('.', 'x160.')});"></div>
                            </a>`;
                }).join('');
                let comments =
                    `<div data-id="${news.id}" class="answerLink">ответить</div>
                    <div id="${news.id}_answer" class="answer" style="display: none">
                    <textarea id="${news.id}_text"></textarea><button class="answerButton" data-id="${news.id}">ответить</button>
                    </div>`;
                if (comments_obj.length > 0) {
                    comments += `
                    <div data-id="${news.id}" class="commentLink">комментариев (${comments_obj.length})</div>
                    <div id="${news.id}" class="comments" style="display: none">${comments_obj.map(item => {
                        profiles.add(item.profileId);
                        let link = SYMBOL_LINK.replace('${securityType}', 'stocks');
                        let comment_text = item.text.replace(/\{?\$([A-Z]*)\}?/ig, '<a target="_blank" href="' + link + "$1" + '"><strong>' + "$1" + "</strong></a>");
                        comment_text = createTextLinks(comment_text);
                        let likes = `<div class="heart isComment ${item.isLiked ? 'isLiked' : ''}" data-id="${item.id}"></div><div id="${item.id}_heart_count" class="heartCount">${(item.likesCount > 0 ? item.likesCount : '')}</div>`;
                        let avatar = item.image ? `<img class="avatar" src="${AVATAR_URL.replace('${img}', item.image)}">` : '<img class="avatar" src="/icons/empty_user.png">';
                        return `<div class="comment">${avatar}<strong class="pulseProfile" data-nav="${item.profileId}_profile">${item.nickname}</strong><span class="profile" data-id="${item.profileId}_profile"></span><br>${comment_text}<br><span>${new Date(item.inserted).toLocaleDateString()} ${new Date(item.inserted).toLocaleTimeString()}${likes}</span></div>`
                    }).join('')}</div>`;
                }
                // заменяем шорткоды в теле текста на ссылки акций
                news.instruments.forEach(item => {
                    let regex = "\{\$" + item.ticker + "\}";
                    text = text.split(regex).join(`<a title="Открыть страницу акции" href="${SYMBOL_LINK.replace('${securityType}', PLURAL_SECURITY_TYPE[capitalize(item.type)]) + item.ticker}" target="_blank">$<strong>${item.ticker}</strong></a>`);
                    text = createTextLinks(text);

                });
                let avatar = news.image ? `<img class="avatar" src="${AVATAR_URL.replace('${img}', news.image)}">` : '<img class="avatar" src="/icons/empty_user.png">';
                profiles.add(news.profileId);
                return `
<div data-id="${news.id}" class="newsAnnounce bordered pulse">
<h2 data-id="${news.id}" class="pulseProfile" data-nav="${news.profileId}_profile">${avatar}${news.nickname}
<span class="profile" data-id="${news.profileId}_profile"></span>
</h2>
<div class="logoContainer">${tickers}</div>
<div class="postTime">${new Date(news.inserted).toLocaleDateString()} ${new Date(news.inserted).toLocaleTimeString()}</div>
<div class="post">${text}<br>${likes}${comments}</div><div style="clear: both;"></div></div>`;
            }
            case 'social_post': {
                let likes = `<div class="heart ${news.is_liked ? 'isLiked' : ''}" data-id="${news.item.id}"></div><div id="${news.item.id}_heart_count" class="heartCount">${(news.likes_count > 0 ? news.likes_count : '')}</div>`;
                let tickers = news.item.tickers.map(item => {
                    return `<a title="Открыть страницу акции" href="${SYMBOL_LINK.replace('${securityType}', PLURAL_SECURITY_TYPE[capitalize(item.type)]) + item.ticker}" target="_blank">
                            <div class="logo" title = "${item.name}" style="background-size: cover; background-position: 50% 50%; background-image: url(${'https://static.tinkoff.ru/brands/traiding/' + item.logo_name.replace('.', 'x160.')});"></div>
                            </a>`;
                }).join('');
                let text = news.item.text;
                let comments_obj = news.comments_count > 0 ? news.comments.items : [];
                let comments =
                    `<div data-id="${news.item.id}" class="answerLink">ответить</div>
                    <div id="${news.item.id}_answer" class="answer" style="display: none">
                    <textarea id="${news.item.id}_text"></textarea><button class="answerButton" data-id="${news.item.id}">ответить</button>
                    </div>`;
                if (comments_obj.length > 0) {
                    comments += `
                    <div data-id="${news.item.id}" class="commentLink">комментариев (${comments_obj.length})</div>
                    <div id="${news.item.id}" class="comments" style="display: none">${comments_obj.map(item => {
                        profiles.add(item.profileId);
                        let link = SYMBOL_LINK.replace('${securityType}', 'stocks');
                        let comment_text = item.text.replace(/\{?\$([A-Z]*)\}?/ig, '<a target="_blank" href="' + link + "$1" + '"><strong>' + "$1" + "</strong></a>");
                        comment_text = createTextLinks(comment_text);
                        let likes = `<div class="heart isComment ${item.isLiked ? 'isLiked' : ''}" data-id="${item.id}"></div><div id="${item.id}_heart_count" class="heartCount">${(item.likesCount > 0 ? item.likesCount : '')}</div>`;
                        let avatar = item.image ? `<img class="avatar" src="${AVATAR_URL.replace('${img}', item.image)}">` : '<img class="avatar" src="/icons/empty_user.png">';
                        return `<div class="comment">${avatar}<strong class="pulseProfile" data-nav="${item.profileId}_profile">${item.nickname}</strong><span class="profile" data-id="${item.profileId}_profile"></span><br>${comment_text}<br><span>${new Date(item.inserted).toLocaleDateString()} ${new Date(item.inserted).toLocaleTimeString()}${likes}</span></div>`
                    }).join('')}</div>`;
                }

                // заменяем шорткоды в теле текста на ссылки акций
                news.item.tickers.forEach(item => {
                    let regex = "\{\$" + item.ticker + "\}";
                    text = text.split(regex).join(`<a title="Открыть страницу акции" href="${SYMBOL_LINK.replace('${securityType}', PLURAL_SECURITY_TYPE[capitalize(item.type)]) + item.ticker}" target="_blank">$<strong>${item.ticker}</strong></a>`);
                    text = createTextLinks(text);

                });
                profiles.add(news.item.profile.id);
                let avatar = news.item.profile.image ? `<img class="avatar" src="${AVATAR_URL.replace('${img}', news.item.profile.image)}">` : '<img class="avatar" src="/icons/empty_user.png">';
                return `
<div data-id="${news.item.id}" class="newsAnnounce bordered pulse">
<h2 data-id="${news.item.id}" class="pulseProfile" data-nav="${news.item.profile.id}_profile">${avatar}${news.item.profile.nickname}
<span class="profile" data-id="${news.item.profile.id}_profile"></span>
</h2>
<div class="logoContainer">${tickers}</div>
<div class="postTime">${new Date(news.item.date).toLocaleDateString()} ${new Date(news.item.date).toLocaleTimeString()}</div>
<div class="post">${text}<br>${likes}${comments}</div><div style="clear: both;"></div></div>`;
            }
        }
    }).join('');
    // отправляем запрос на получение профилей
    profiles.forEach(item => {
        port.postMessage({
            method: 'getProfile',
            params: {profileId: item}
        });
    });
    if (msg.news.items.length === 0) buffer += '<h2>Нет сообщений</h2>';
    document.getElementById('news_table').innerHTML = buffer;
}

export function renderProfile(profile) {
    Array.from(document.querySelectorAll('.profile[data-id="' + profile.profile.id + '_profile"]')).forEach(input => {
        input.innerHTML = `
     <img src="/icons/yeld_ico.png" title="Доходность за год">${profile.profile.statistics.yearRelativeYield}%
     <img src="/icons/amount_ico.png" title="Размер портфеля">${profile.profile.statistics.totalAmountRange.lower ? 'от ' + profile.profile.statistics.totalAmountRange.lower : 'до ' + profile.profile.statistics.totalAmountRange.upper} руб
     <img src="/icons/operation_count.png" title="Количество операций за месяц">
     <span class="operationCount" data-id="${profile.profile.id}_instrument">${profile.profile.statistics.monthOperationsCount} шт</span>
    `;
    });
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
    let heart = accountInfo.marginAttributes ? `<span title="${HEALTH[accountInfo.marginAttributes.marginAccountStatus].title}">${HEALTH[accountInfo.marginAttributes.marginAccountStatus].heart}</span>` : '';
    let marginFee = accountInfo.marginAttributes ? 'Комиссия по марж. торговле ' + accountInfo.marginAttributes.marginFeeAmount.value.toLocaleString('ru-RU', {
        style: 'currency',
        currency: accountInfo.marginAttributes.marginFeeAmount.currency
    }) : '';
    return `Счет ${heart} ${rusAccountName} ${htmlTotalAmount}, 
            доход по счету ${htmlExpectedYield}, 
            доход сегодня ${htmlExpectedYieldPerDay} ${marginFee}<br>`;
}

export function getExportAccountHtml(accounts) {
    let res = '<span title="Сырая выгрузка в формате CSV (все валюты, все счета, все транзакции)" class="exportLink" data-account="all" data-currency="all">Выгрузить все транзакции по всем счетам</span><br>';
    Object.keys(accounts).forEach(key => {
        let rusAccountName = (key === 'Bcs') ? "БКС" :
            (key === 'Tinkoff') ? "ТКС" :
                (key === 'TinkoffIis') ? "ИИС" : key;
        res += `
<span title="Выгрузить данные по счету в формате CSV (все валюты), только операции покупка\продажа" class="exportLink" data-account="${key}" data-currency="all">Выгрузить данные по брокерскому счету ${rusAccountName}</span>
(<span title="Выгрузить отдельно по валюте USD в формате CSV" class="exportLink" data-account="${key}" data-currency="USD">USD</span>,
<span title="Выгрузить отдельно по валюте RUB в формате CSV" class="exportLink" data-account="${key}" data-currency="RUB">RUB</span>,
<span title="Выгрузить отдельно по валюте EUR в формате CSV" class="exportLink" data-account="${key}" data-currency="EUR">EUR</span>)
<br>`;
    });
    return res;
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

export function createTradingviewGraphic(container, symbols = []) {
    if (symbols.length > 1) // общий список
        new TradingView.widget(
            {
                "width": "100%",
                "height": 610,
                "symbol": "LSIN:TCS",
                "interval": "D",
                "timezone": "Europe/Moscow",
                "theme": "Light",
                "style": "1",
                "locale": "ru",
                "toolbar_bg": "#f1f3f6",
                "enable_publishing": false,
                "hide_side_toolbar": false,
                "allow_symbol_change": true,
                "watchlist": [
                    symbols
                ],
                "details": true,
                "calendar": true,
                "studies": [
                    "MACD@tv-basicstudies",
                    "BB@tv-basicstudies",
                    "StochasticRSI@tv-basicstudies"
                ],
                "show_popup_button": true,
                "popup_width": "1000",
                "popup_height": "650",
                "container_id": container
            }
        );
    else // график определенного symbol
        new TradingView.widget(
            {
                "width": "100%",
                "height": 610,
                "symbol": "LSIN:TCS",
                "interval": "D",
                "timezone": "Europe/Moscow",
                "theme": "Light",
                "style": "1",
                "locale": "ru",
                "toolbar_bg": "#f1f3f6",
                "enable_publishing": false,
                "hide_side_toolbar": false,
                "allow_symbol_change": false,

                "studies": [
                    "MACD@tv-basicstudies",
                    "BB@tv-basicstudies",
                    "StochasticRSI@tv-basicstudies"
                ],
                "show_popup_button": true,
                "popup_width": "1000",
                "popup_height": "650",
                "container_id": container
            }
        );
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

function shadeColor(color, percent) {

    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    let RR = ((R.toString(16).length == 1) ? "0" + R.toString(16) : R.toString(16));
    let GG = ((G.toString(16).length == 1) ? "0" + G.toString(16) : G.toString(16));
    let BB = ((B.toString(16).length == 1) ? "0" + B.toString(16) : B.toString(16));

    return "#" + RR + GG + BB;
}