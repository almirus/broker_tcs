'use strict';

// Функция заполняющая текст "Остаток на счете ТКС 4 268,10 ₽    18,92 $    " с пропуском валют, если там 0
import {
    AVATAR_URL,
    HEALTH,
    IMAGE_URL,
    PLURAL_SECURITY_TYPE,
    port,
    PROGNOSIS_LINK,
    RUS_OPERATION,
    RUS_OPERATION_TYPE,
    SYMBOL_LINK
} from "/js/constants.mjs";

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
</div><span class="newsBody ${is_vedomosti ? 'vedomosti' : ''}" id="${news.item.id}_body">${news.item.body}</span>`
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

export function renderNote(msg) {
    let DOMs = document.getElementsByClassName(`ticker${msg.ticker}Note`);
    if (msg.notes.length > 0 && DOMs.length > 0) {
        Array.from(DOMs).forEach(item => {
            item.innerHTML = msg.notes.map(elem => {
                return elem.text
            }).join(' ')
        });
    }
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
    if (msg.news.nav_id && msg.news.items.length > 0 && msg.news.items[0].instruments) {
        let ticket = msg.news.items[0].instruments.find(item => item.ticker === msg.news.nav_id);
        if (ticket) buffer += `
<div class="forecast bordered" style="background-color: #b0b3b6" id="ticker_${msg.news.nav_id}">
        <h2 class="header">${ticket.briefName} (${ticket.type})</h2>
        <div class="logo" style="background-size: cover;background-position: 50% 50%; background-image: url(https://static.tinkoff.ru/brands/traiding/${ticket.image?.replace('.', 'x160.')});"></div>
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
        })}
        <span data-id="${news.id}" class="translate answerLink">написать</span>
        </div>
        <div class="ticker${ticket.ticker}Note recommendation"></div>
</div>`
    }
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
                let text = news.text.replace(/\n/g, "<br />");
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
                if (comments_obj && comments_obj.length > 0) {
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
                    text = text.split(regex).join(`<a title="Открыть страницу акции" class="ticket" href="${SYMBOL_LINK.replace('${securityType}', PLURAL_SECURITY_TYPE[capitalize(item.type)]) + item.ticker}" target="_blank">$<strong>${item.ticker}</strong> (${item.price} ${item.relativeYield > 0 ? '🔺' : '🔻'}${item.relativeYield} %)</a>`);
                    text = createTextLinks(text);

                });
                let avatar = news.image ? `<img class="avatar" src="${AVATAR_URL.replace('${img}', news.image)}">` : '<img class="avatar" src="/icons/empty_user.png">';
                profiles.add(news.profileId);
                let images = '';
                if (news.postImages?.length > 0) {
                    news.postImages.map(img => {
                        images += `<img class="imgPulse" src="${IMAGE_URL.replace('${imgId}', img.id)}">`;
                    });
                }
                return `
<div data-id="${news.id}" class="newsAnnounce bordered pulse">
<h2 data-id="${news.id}" class="pulseProfile" data-nav="${news.profileId}_profile">${avatar}${news.nickname}
<span class="profile" data-id="${news.profileId}_profile"></span>
</h2>
<div class="logoContainer">${tickers}</div>
<div class="postTime">${new Date(news.inserted).toLocaleDateString()} ${new Date(news.inserted).toLocaleTimeString()}</div>
<div class="post">${text}<br>${images}<br>${likes}${comments}</div><div style="clear: both;"></div></div>`;
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
                    text = text.split(regex).join(`<a class="ticket" title="Открыть страницу акции" href="${SYMBOL_LINK.replace('${securityType}', PLURAL_SECURITY_TYPE[capitalize(item.type)]) + item.ticker}" target="_blank">$<strong>${item.ticker}</strong> (${item.price})</a>`);
                    text = createTextLinks(text);

                });
                profiles.add(news.item.profile.id);
                let images = '';
                if (news.postImages?.length > 0) {
                    news.postImages.map(img => {
                        images += `<img class="imgPulse" src="${IMAGE_URL.replace('${imgId}', img.id)}">`;
                    });
                }
                let avatar = news.item.profile.image ? `<img class="avatar" src="${AVATAR_URL.replace('${img}', news.item.profile.image)}">` : '<img class="avatar" src="/icons/empty_user.png">';
                return `
<div data-id="${news.item.id}" class="newsAnnounce bordered pulse">
<h2 data-id="${news.item.id}" class="pulseProfile" data-nav="${news.item.profile.id}_profile">${avatar}${news.item.profile.nickname}
<span class="profile" data-id="${news.item.profile.id}_profile"></span>
</h2>
<div class="logoContainer">${tickers}</div>
<div class="postTime">${new Date(news.item.date).toLocaleDateString()} ${new Date(news.item.date).toLocaleTimeString()}</div>
<div class="post">${text}<br>${images}<br>${likes}${comments}</div><div style="clear: both;"></div></div>`;
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
     <img src="/icons/yeld_ico.png" title="Доходность за год">${profile.profile.statistics?.yearRelativeYield}%
     <img src="/icons/amount_ico.png" title="Размер портфеля">${profile.profile.statistics?.totalAmountRange.lower ? 'от ' + profile.profile.statistics?.totalAmountRange.lower : 'до ' + profile.profile.statistics?.totalAmountRange.upper} руб
     <img src="/icons/operation_count.png" title="Количество операций за месяц">
     <span class="operationCount" data-id="${profile.profile.id}_instrument">${profile.profile.statistics?.monthOperationsCount} шт</span>
    `;
    });
}

export function renderListOperations(account, list, currencies, hideCommission, operationType) {
    function filterDataForListOperations(account, items) {
        let result = [];
        let accountData = items.filter(item =>
            (item.accountType === account || account === 'All')
            && (!(item.operationType === 'BrokCom') || hideCommission)
            && (operationType === 'features' ? item.operationType === 'WriteOffVarMargin' || item.operationType === 'AccruingVarMargin' :
                operationType === 'dividend' ?
                    item.operationType === 'Dividend' || item.operationType === 'Coupon' :
                    operationType === 'commission' ?
                        //item.operationType === 'MarginCom' || item.operationType.indexOf('Tax') >-1 :
                        (item.operationType !== 'PayOut' && item.operationType !== 'Buy' && item.operationType !== 'BuyWithCard' && item.operationType !== 'WriteOffVarMargin') && (item.payment < 0 || item.price < 0) :
                        operationType === 'payinout' ?
                            item.operationType === 'PayOut' || item.operationType === 'PayInn' || item.operationType === 'BuyWithCard' :
                            (item.status === operationType || operationType === 'All')
            )
        );

        accountData.forEach(item => {
            result.push({
                isin: item.isin || ' ',
                symbol: item.ticker || ' ',
                commission: Math.abs(item.commission || 0) || ' ',
                date: item.date ? new Date(Date.parse(item.date)) : ' ',
                type: item.operationType || ' ',
                price: (!(item.operationType.toLowerCase() === 'buy' && item.operationType.toLowerCase() === 'sell') ? item.payment : item.price) || ' ',
                currency: item.currency || ' ',
                amount: item.quantity || item.quantityRest || ' ',
                description: item.description,
                status: item.status,
                accountType: item.accountType,
            })
        })
        return result;
    }

    let items = filterDataForListOperations(account, list);
    let buffer = "<table><tr><th>ISIN</th><th>SYMBOL</th><th>COMMISSION</th><th>DATE</th><th>TYPE</th><th>PRICE</th><th>CURRENCY</th><th>PRICE_RUB</th><th>CURRENCY</th><th>AMOUNT</th><th>DESCRIPTION</th></tr>";
    let sum = 0;
    let commission = 0;
    items.forEach(item => {
        item.price = item.type.toLowerCase() === 'buy' && item.price > 0 ? item.price * -1 : item.price * 1;
        buffer += `
<tr class="${item.type.toLowerCase() === 'sell' ? 'isOnlineOrderSell' : ''}${item.type.toLowerCase() === 'buy' ? 'isOnlineOrderBuy' : ''}">
    <td>${item.isin}</td>
    <td class="tickerFilter" title="Фильтровать по тикеру за все время">${item.symbol}</td>
    <td>${item.commission}</td>
    <td>${item.date.toLocaleString()}</td>
    <td>${item.type}</td>
    <td>${item.price}</td>
    <td>${item.currency}</td>
    <td>${item.currency !== 'RUB' ? (item.price * currencies[item.currency + 'RUB'].lastPrice).toFixed(2) : ''}</td>
    <td>${item.currency !== 'RUB' ? 'RUB' : ''}</td>
    <td>${item.amount}</td>
    <td>${item.description}<strong> ${RUS_OPERATION_TYPE[item.status]}</strong> на счет ${item.accountType} ${item.amount > 0 ? ', стоимость одного лота <strong>' + (item.price / item.amount).toFixed(2) + '</strong> ' + item.currency : ''}</td>
</tr>`;
        if (item.status !== 'decline') {
            commission += item.currency !== 'RUB' ? item.commission * currencies[item.currency + 'RUB'].lastPrice * 1 : item.commission * 1;
            sum += item.currency !== 'RUB' ? item.price * currencies[item.currency + 'RUB'].lastPrice * 1 : item.price * 1;
        }
    });
    buffer += `<td colspan='3' align="right"><strong>${commission.toFixed(2)}</strong></td><td colspan="4">комиссия в <strong>рублях</strong></td>`;
    buffer += `<td align="right"><strong>${sum.toFixed(2)}</strong></td><td colspan="3">итоговая сумма в <strong>рублях</strong> успешных операций, расчитана по <u>текущему курсу валют</u></td>`;
    buffer += "</table>";
    document.getElementById('operation_container').innerHTML = buffer;
}

export function renderTickers(object) {
    let buffer = '<div class="scroll">';
    let newTickers = object.newTickers;
    let IPOs = object.IPOs[0];
    if (newTickers.different?.length) {
        buffer += '<h3>Новые тикеры</h3>';
        buffer += newTickers.different.map(item => {
            return `<span class="item" title="${item.showName}">${item.isOTC ? '👑' : ''}${item.ticker}</span>`
        }).join('');
    } else {
        buffer += '<h3>Список новых тикеров пуст</h3>'
    }
    if (newTickers.isNotOTC?.length) {
        buffer += '<h3>Внебиржевые, которые стали доступны для всех</h3>';
        buffer += newTickers.isNotOTC.map(item => {
            return `<span class="item" title="${item.showName}">${item.isOTC ? '👑' : ''}${item.ticker}</span>`
        }).join('');
    } else {
        buffer += '<h3>Список внебирживых, которые стали доступны всем пуст</h3>'
    }
    if (IPOs?.shelfSections.length) {
        buffer += '<h3>Первичное размещение</h3>';
        buffer += IPOs.shelfSections.map(item => {
            return `<div title="подробности в приложении" class="newsAnnounce bordered" style="background-size: cover; background-image: url(${item.security?.logo.url || item.picture})">
            <h2 class="header white">${item.name}</h2>
            <div class="announce white">${item.title}</div>
            <div class="announce white">${item.security?.asset.ticker || ('Корзина: ' + item.shortDescription)}</div>
            </div>`
        }).join('');
    }
    buffer += '</div>';
    document.getElementById('newtickers_container').innerHTML = buffer;
    document.getElementById('hideNewList').style.display = 'block';
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
        console.info(key,accounts[key])
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
    let marginFee = accountInfo.marginAttributes ? 'Комиссия по марж. торговле <a href="https://help.tinkoff.ru/margin-trade/long/cost/" target="_blank">' + accountInfo.marginAttributes.marginFeeAmount.value.toLocaleString('ru-RU', {
        style: 'currency',
        currency: accountInfo.marginAttributes.marginFeeAmount.currency
    }) + '</a>, сумма -' + accountInfo.marginAttributes.marginPositionsAmount.value.toLocaleString('ru-RU', {
        style: 'currency',
        currency: accountInfo.marginAttributes.marginPositionsAmount.currency
    }) : '';
    return `Счет ${heart} <strong>${accountInfo.name}</strong> ${htmlTotalAmount}, 
            доход по счету ${htmlExpectedYield}, 
            доход сегодня ${htmlExpectedYieldPerDay} ${marginFee}<br>`;
}

export function getExportAccountHtml(accounts) {
    let res = '<span title="Сырая выгрузка в формате CSV (все валюты, все счета, все транзакции)" class="exportLink" data-account="all" data-currency="all">Выгрузить все транзакции по всем счетам</span><br>';
    Object.keys(accounts).forEach(key => {

        res += `
<span title="Выгрузить данные по счету в формате CSV (все валюты), только операции покупка\продажа" class="exportLink" data-account="${key}" data-currency="all">Выгрузить данные по брокерскому счету ${accounts[key].name}</span>
(<span title="Выгрузить отдельно по валюте USD в формате CSV" class="exportLink" data-account="${key}" data-currency="USD">USD</span>,
<span title="Выгрузить отдельно по валюте RUB в формате CSV" class="exportLink" data-account="${key}" data-currency="RUB">RUB</span>,
<span title="Выгрузить отдельно по валюте EUR в формате CSV" class="exportLink" data-account="${key}" data-currency="EUR">EUR</span>)
<br>`;
    });
    return res;
}

export function drawPremiumConsensus(data) {
    let canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 12;
    let ctx = canvas.getContext('2d');
    if (data?.absolute) {
        let date = new Date(data.createdAt);
        canvas.title = `Консенсус прогноз от 👑Refinitiv (${date.toLocaleDateString()})\n"${RUS_OPERATION[data.recommendationLabel]}" на основе ${data.analystsCount} прогнозов аналитиков\n
        Покупать ${data.absolute.buy}, держать ${data.absolute.hold}, продавать ${data.absolute.sell}`;
        ctx.fillStyle = 'green';
        ctx.fillRect(0, 2, data.absolute.buy * 100 / data.analystsCount, 7);
        ctx.fillStyle = 'orange';
        ctx.fillRect(data.absolute.buy * 100 / data.analystsCount, 2, data.absolute.buy * 100 / data.analystsCount + data.absolute.hold * 100 / data.analystsCount, 7);
        ctx.fillStyle = 'red';
        ctx.fillRect(data.absolute.buy * 100 / data.analystsCount + data.absolute.hold * 100 / data.analystsCount, 2, data.absolute.buy * 100 / data.analystsCount + data.absolute.hold * 100 / data.analystsCount + data.absolute.sell * 100 / data.analystsCount, 7);
    }
    return canvas;
}

export function drawPremiumConsensusFinn(data) {
    let canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 12;
    let ctx = canvas.getContext('2d');
    if (data?.length > 0) {

        let result = {buy: 0, hold: 0, sell: 0, strongBuy: 0, strongSell: 0, sum: 0};
        data.forEach(item => {
            result.buy += item.buy;
            result.hold += item.hold;
            result.sell += item.sell;
            result.strongBuy += item.strongBuy;
            result.strongSell += item.strongSell;
        });
        result.buy = Math.floor(result.buy / data.length);
        result.hold = Math.floor(result.hold / data.length);
        result.sell = Math.floor(result.sell / data.length);
        result.strongBuy = Math.floor(result.strongBuy / data.length);
        result.strongSell = Math.floor(result.strongSell / data.length);
        result.sum = result.buy + result.hold + result.sell + result.strongBuy + result.strongSell;
        canvas.title = `Консенсус прогноз от FinnHUB на основе ${data.length} прогноз${data.length === 1 ? 'а' : 'ов'}, самый свежий от ${data[0].period}\n
        Активно покупать ${result.strongBuy}, покупать ${result.buy}, держать ${result.hold}, продавать ${result.sell}, активно продавать ${result.strongSell}`;
        ctx.fillStyle = 'rgb(23,111,55)';
        ctx.fillRect(0, 2, result.strongBuy * 100 / result.sum, 7);
        ctx.fillStyle = 'rgb(29,185,84)';
        ctx.fillRect(result.strongBuy * 100 / result.sum, 2, result.buy * 100 / result.sum + result.strongBuy * 100 / result.sum, 7);
        ctx.fillStyle = 'rgb(185,139,29)';
        ctx.fillRect(result.buy * 100 / result.sum + result.strongBuy * 100 / result.sum, 2, result.hold * 100 / result.sum + result.buy * 100 / result.sum + result.strongBuy * 100 / result.sum, 7);
        ctx.fillStyle = 'rgb(244,91,91)';
        ctx.fillRect(result.hold * 100 / result.sum + result.buy * 100 / result.sum + result.strongBuy * 100 / result.sum, 2, result.sell * 100 / result.sum + result.hold * 100 / result.sum + result.buy * 100 / result.sum + result.strongBuy * 100 / result.sum, 7);
        ctx.fillStyle = 'rgb(243,0,0)';
        ctx.fillRect(result.sell * 100 / result.sum + result.hold * 100 / result.sum + result.buy * 100 / result.sum + result.strongBuy * 100 / result.sum, 2, result.strongSell * 100 / result.sum + result.strongSell * 100 / result.sum + result.hold * 100 / result.sum + result.buy * 100 / result.sum + result.strongBuy * 100 / result.sum, 7);
    }
    return canvas;
}

export function drawDayProgress(element) {
    let last = element.symbol.lastOTC || element.prices.last?.value;
    let progress_style = element.symbol.dayOpen >= last ? 'red' : 'green';
    let min = element.symbol.dayOpen;
    let max = last;
    if (min > max) min = [max, max = min][0];

    let dayOpenPercent = 100 - (element.symbol.dayHigh - min) * 100 / (element.symbol.dayHigh - element.symbol.dayLow);
    let dayLastPercent = 100 - (element.symbol.dayHigh - max) * 100 / (element.symbol.dayHigh - element.symbol.dayLow);
    let minPercent, maxPercent;
    minPercent = (((element.symbol.dayLow * 100) / last) - 100) / 100;
    maxPercent = (-100 + ((element.symbol.dayHigh * 100) / last)) / 100;
    let canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 6;
    canvas.title = `Текущая цена ${last}, дневной диапазон цен ${element.symbol.dayLow}(${minPercent.toLocaleString('ru-RU', {
        style: 'percent',
        maximumSignificantDigits: 2
    })}) - ${element.symbol.dayHigh}(${maxPercent.toLocaleString('ru-RU', {
        style: 'percent',
        maximumSignificantDigits: 2
    })})`;
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = progress_style;
    ctx.fillRect(0, 2, 100, 2);
    ctx.fillStyle = progress_style;
    ctx.fillRect(dayOpenPercent, 0, dayLastPercent, 6);
    return canvas;
}

export function draw52Progress(element) {
    let last = element.symbol.lastOTC || element.prices.last?.value;
    let progress_style = last >= (element.symbol["52WLow"] + element.symbol["52WHigh"]) / 2 ? 'green' : 'red';
    let min = element.symbol["52WLow"];
    let max = element.symbol["52WHigh"];
    let dayOpenPercent = (element.symbol.dayLow - min) * 100 / (max - min);
    let dayLastPercent = (element.symbol.dayHigh - min) * 100 / (max - min);

    let canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 6;
    canvas.title = `52-недельный диапазон ${min} - ${max}`;
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