'use strict';

import {
    ALERT_TICKER_LIST,
    EVENTS_LINK,
    INTERVAL_TO_CHECK,
    LOGIN_URL,
    OPTION_ALERT,
    OPTION_ALERT_ORDER_PER_SYMBOL,
    OPTION_ALERT_ORDER_VALUE_PER_SYMBOL,
    OPTION_ALERT_TODAY,
    OPTION_ALERT_TODAY_PER_SYMBOL,
    OPTION_ALERT_TODAY_VALUE,
    OPTION_ALERT_TODAY_VALUE_PER_SYMBOL,
    OPTION_ALPHAVANTAGE,
    OPTION_ALPHAVANTAGE_KEY,
    OPTION_CONVERT_TO_RUB,
    OPTION_COSMETICS,
    OPTION_FAVORITE,
    OPTION_FAVORITE_LIST,
    OPTION_FINN_ENABLED,
    OPTION_FINN_GETLAST,
    OPTION_MINUS_CURRENT_POS,
    OPTION_REDIRECT,
    OPTION_RIFINITIV,
    OPTION_SESSION,
    OPTION_SORT_BY,
    port,
    PROGNOSIS_LINK,
    RECALIBRATION_LINK,
    SYMBOL_LINK,
    TICKER_LIST,
    YANDEX_TRANSLATE
} from "/js/constants.mjs";
import {exportCSVFile} from "./utils/csvExporter.js";
import {
    draw52Progress,
    drawDayProgress,
    drawPremiumConsensus,
    drawPremiumConsensusFinn,
    fillCashData,
    getAllAccountsHtmlInfo,
    getExportAccountHtml,
    msToTime,
    renderListOperations,
    renderNews,
    renderNote,
    renderProfile,
    renderPulse,
    renderTickers,
    toCurrency,
    toPercent
} from "./utils/displayUtils.js";
import {throttle} from "./utils/systemUtils.js";

Array.from(document.getElementsByClassName('toggle')).forEach(function (input) {
    input.addEventListener('click', function (event) {
        let toggle = function (elem) {
            elem.classList.toggle('is-visible');
        };
        if (!event.target.classList.contains('toggle')) return;
        event.preventDefault();
        let content = document.getElementById(input.getAttribute('data-toggle'));
        if (!content) return;
        toggle(content);
    }, false)
});

port.onMessage.addListener(function (msg) {
    console.log(`Option - message received ${msg.result}`);
    switch (msg.result) {
        case 'listStock':
            create_table(msg.stocks || msg.stocks_tcs.concat(msg.stocks_iis));
            break;
        case 'listStockForOrder':
            create_orders_table(msg.stocks || msg.stocks_tcs.concat(msg.stocks_iis));
            //setAddButtonHandler();
            break;
        case 'listStockForNote':
            create_note_table(msg.stocks);
            break;
        case 'listPortfolio':
            create_portfolio_table('portfolioTCS', msg.stocks_tcs);
            let iisStyle = 'none';
            if (msg.stocks_tcs.length < 14 || document.getElementById('iis_portfolio_input').checked)
                iisStyle = 'block';
            if (msg.stocks_iis.length > 0) create_portfolio_table('portfolioIIS', msg.stocks_iis);
            document.getElementById('portfolioIIS').style = 'display:' + iisStyle;
            setTickerPulseButton();
            setTickerFilter();
            break;
        case 'listAlerts':
            create_alert_table(msg.stocks);
            break;
        case 'tickerInfo':
            create_table(msg.stocks);
            break;
        case 'session':
            if (msg.sessionId) {
                document.getElementById('message').innerText = 'Активная сессия';
                document.getElementById('error_message').innerHTML = `&nbsp;`;
                document.getElementById('logout').style.visibility = 'visible';
            } else {
                document.getElementById('message').innerText = '';
                document.getElementById('error_message').innerHTML = `Сессия истекла. <a target="_blank" href="${LOGIN_URL}">Залогиниться</a>`;
                document.getElementById('logout').style.visibility = 'hidden';

            }
            // дизейблим пункты связанные с получением данных онлайн
            let op = document.getElementById("add_list_type").getElementsByTagName("option");
            for (let i = 0; i < op.length; i++) {
                op[i].disabled = !msg.sessionId
            }
            break;
        case 'updatePopup':
            //document.getElementById('timestamp').innerText=msg.timestamp;
            document.getElementById('sum').innerText = toCurrency(msg.totalAmountPortfolio);
            document.getElementById('all').className = msg.expectedYield > 0 ? "onlineBuy" : "onlineSell";
            document.getElementById('earnedAll').innerText = toCurrency(msg.expectedYield);
            document.getElementById('earnedAllPercent').innerText = toPercent(msg.expectedYieldRelative);
            chrome.browserAction.setTitle({title: 'TCS Broker. Сегодня: ' + toCurrency(msg.expectedYieldPerDay) + ' (' + toPercent(msg.expectedYieldPerDayRelative) + ')'});
            document.title = 'сегодня: ' + toCurrency(msg.expectedYieldPerDay) + ' (' + toPercent(msg.expectedYieldPerDayRelative) + ')' +
                ' всего: ' + toCurrency(msg.expectedYield) + ' (' + toPercent(msg.expectedYieldRelative) + ')';
            document.getElementById('day').className = msg.expectedYieldPerDay > 0 ? "onlineBuy" : "onlineSell";
            document.getElementById('earnedToday').innerText = toCurrency(msg.expectedYieldPerDay);
            document.getElementById('earnedTodayPercent').innerText = toPercent(msg.expectedYieldPerDayRelative);

            document.getElementById('allAccounts').innerHTML = getAllAccountsHtmlInfo(msg.accounts);
            console.log(msg.accounts);
            document.getElementById('exportOperations').innerHTML = getExportAccountHtml(msg.accounts);
            // клик по выгрузке портфеля
            setTimeout(() => Array.from(document.getElementsByClassName('exportLink')).forEach(item => {
                item.addEventListener('click', function (e) {
                    e.target.innerHTML = 'Выгружается, ждите...';
                    throttle(port.postMessage({
                        method: "exportPortfolio",
                        params: {
                            account: e.target.getAttribute('data-account'),
                            currency: e.target.getAttribute('data-currency'),
                            collapse: document.getElementById('exportFilter').checked
                        }
                    }), 500);
                });
            }), 500);
            break;
        case 'updateUserInfo':
            if (msg.status) {
                document.getElementById('portfolioTCS').innerHTML = '<h2>API брокера недоступен, возможно идет обновление</h2>';
                break;
            }
            document.getElementById('riskProfile').innerText = msg.riskProfile;
            document.getElementById('qualStatus').innerText = msg.qualStatus;
            /*
            if (msg.qualStatus === 'есть статус') {
                document.getElementById('alphavantage_option').style = 'display:block';
            }
            */
            document.getElementById('approvedW8').innerText = msg.approvedW8;
            document.getElementById('employee').innerHTML = msg.employee ? 'Вы сотрудник банка 🏦💲☝<br>' : '';
            console.log(msg.accounts);
            let iis = (msg.accounts.filter(item => item.accountType === 'TinkoffIis')).length > 0
                ? '<input type="radio" value="0" checked="checked" name="broker_type" id="broker_portfolio_input">' +
                '<label for="broker_portfolio_input">Портфель Тинькофф</label>' : '';
            let tcs = (msg.accounts.filter(item => item.accountType === 'Tinkoff')).length > 0
                ? '<input type="radio" value="1" name="broker_type" id="iis_portfolio_input">' +
                '<label for="iis_portfolio_input">Портфель ИИС</label>' : '';
            if (iis && tcs) {
                document.getElementById('accounts').innerHTML = iis + tcs;
                document.getElementById('broker_portfolio_input').addEventListener('change', function () {
                    let tableTCS = document.getElementById('portfolioTCS');
                    let tableIIS = document.getElementById('portfolioIIS');
                    tableTCS.style = 'display:block';
                    tableIIS.style = 'display:none';
                });
                document.getElementById('iis_portfolio_input').addEventListener('change', function () {
                    let tableTCS = document.getElementById('portfolioTCS');
                    let tableIIS = document.getElementById('portfolioIIS');
                    tableIIS.style = 'display:block';
                    tableTCS.style = 'display:none';
                });
            }
            break;
        case 'cashDataTCS':
            fillCashData(msg, 'Остаток на счете ТКС ', 'cashTCS');
            break;
        case 'cashDataBCS':
            fillCashData(msg, 'Остаток на счете БКС ', 'cashBCS');
            break;
        case 'cashDataIIS':
            fillCashData(msg, 'Остаток на счете ИИС ', 'cashIIS');
            break;
        case 'versionAPI':
            document.getElementById('versionAPI').innerText = `Версия API ${msg.version.payload.version}`;
            break;
        case 'listForExport':
            exportCSVFile({
                isin: 'isin',
                symbol: 'symbol',
                commission: 'commission',
                date: 'date',
                type: 'operation',
                price: 'price',
                currency: 'currency',
                amount: 'amount',
                description: 'description'
            }, msg.list, msg.account, msg.currency, msg.collapse);
            break;
        case 'listOfOperations':
            renderListOperations(msg.account, msg.list, msg.currencies, msg.hideCommission, msg.operationType);
            setTickerFilter();
            break;
        case 'listLiquid':
            liquidList = msg.list;
            break;
        case 'listPrognosis':
            listPrognosis = msg.list;
            break;
        case 'news':
            renderNews(msg);
            setNewsButton();
            setNewsToggleButton();
            //setTranslateButton();
            break;
        case 'pulse':
            renderPulse(msg);
            setPulseButton();
            setCommentToggleButton();
            setAnswerToggleButton();
            likeToggleButton();
            break;
        case 'note':
            renderNote(msg);
            break;
        case 'noteList':
            renderNotes(msg);
            break;
        case 'profile':
            renderProfile(msg);
            break;
        case 'newTickers':
            renderTickers(msg);
            break;
        case 'treemap':
            document.getElementById('treemap_container').innerHTML = '<div class="scale" width="357" align="right" title="" style="float: right; margin-right: 0px;"><div class="step" style="background: rgb(246, 53, 56); width: 50px; padding-left: 6px; padding-right: 6px;">-3%</div><div class="step" style="background: rgb(191, 64, 69); width: 50px; padding-left: 6px; padding-right: 6px;">-2%</div><div class="step" style="background: rgb(139, 68, 78); width: 50px; padding-left: 6px; padding-right: 6px;">-1%</div><div class="step" style="background: rgb(65, 69, 84); width: 50px; padding-left: 6px; padding-right: 6px;">0%</div><div class="step" style="background: rgb(53, 118, 78); width: 50px; padding-left: 6px; padding-right: 6px;">+1%</div><div class="step" style="background: rgb(47, 158, 79); width: 50px; padding-left: 6px; padding-right: 6px;">+2%</div><div class="step" style="background: rgb(48, 204, 90); width: 50px; padding-left: 6px; padding-right: 6px;">+3%</div></div>';
            anychart.onDocumentReady(() => {
                let dataTree = anychart.data.tree(msg.list, 'as-table');
                let chart = anychart.treeMap(dataTree);
                chart.title("Карта будет пустой, если рынки закрыты");
                // sets chart settings
                chart
                    .padding([10, 10, 10, 20])
                    // setting the number of levels shown
                    .maxDepth(2)
                    .selectionMode('none')
                    .hintDepth(1)
                // sets settings for labels
                chart
                    .labels()
                    .useHtml(true)
                    .format(function () {
                        return `<span style="color: #000000;    text-shadow: 0 1px 0 rgba(255,255,255,0.25)">${this.getData('product')}<br>${this.getData('relative')}%</span>`;
                    });
                // sets settings for headers
                chart.headers().format(function () {
                    return this.getData('product');
                });
                chart.labels().adjustFontSize(true);
                // sets settings for tooltip
                chart
                    .tooltip()
                    .useHtml(true)
                    .titleFormat(function () {
                        return `${this.getData('product')} ${this.getData('relative') ? this.getData('relative') + '%' : ''}`;
                    })
                    .format(function () {
                        return (
                            this.getData('showName') || this.getData('product')
                        );
                    });

                // set container id for the chart
                chart.container('treemap_container');
                // initiate chart drawing
                chart.draw();
            });
            break;
    }
});

function setNewsButton() {
    Array.from(document.getElementsByClassName("newsNav")).forEach(function (input) {
        input.addEventListener('click', function (e) {
            let button = e.target;
            document.getElementById('news_table').innerHTML = '<img src="css/loader.gif" alt="loading">';
            port.postMessage({method: "getNews", params: {nav_id: button.dataset.nav}});
        })
    })
}

function likeToggleButton() {
    Array.from(document.getElementsByClassName("heart")).forEach(function (input) {
        input.addEventListener('click', function (e) {
            let button = e.target;
            let is_liked = button.classList.contains('isLiked');
            let is_comment = button.classList.contains('isComment');
            port.postMessage({
                method: is_comment ? "setLikeComment" : "setLikePost",
                params: {commentId: button.dataset.id, like: !is_liked}
            });
            if (is_liked) {
                button.classList.remove('isLiked');
                document.getElementById(button.dataset.id + '_heart_count').innerText = parseInt(document.getElementById(button.dataset.id + '_heart_count').innerText || 0) - 1;
            } else {
                button.classList.add('isLiked');
                document.getElementById(button.dataset.id + '_heart_count').innerText = parseInt(document.getElementById(button.dataset.id + '_heart_count').innerText || 0) + 1;
            }
        })
    })
}

function setTickerPulseButton() {
    Array.from(document.querySelectorAll(".pulseTicker")).forEach(function (input) {
        input.addEventListener('click', function (e) {
            let button = e.target;
            document.getElementById('pulse').checked = true;
            document.getElementById('alert_table').style.display = 'none';
            document.getElementById('price_table').style.display = 'none';
            document.getElementById('news_table').style.display = 'block';
            document.getElementById('graphic_table').style.display = 'none';
            document.getElementById('treemap_table').style.display = 'none';
            document.getElementById('operation_table').style.display = 'none';
            document.getElementById('news_table').innerHTML = ' <img src="css/loader.gif" alt="loading">';
            port.postMessage({method: "getPulse", params: {nav_id: button.dataset.nav}});
        })
    })
}

function setAlertSortButton() {
    Array.from(document.querySelectorAll(".sorting")).forEach(function (input) {
        input.addEventListener('click', function (e) {
            let column = e.target.dataset.columnName;
            tinysort(document.getElementById('alert_table').table.querySelector('tr'), {
                selector: '.comparator',
                order: order,
            });
        })
    })
}

function setPulseButton() {
    Array.from(document.querySelectorAll(".pulseNav, .pulseProfile")).forEach(function (input) {
        input.addEventListener('click', function (e) {
            let button = e.target;
            document.getElementById('news_table').innerHTML = ' <img src="css/loader.gif" alt="loading">';
            port.postMessage({method: "getPulse", params: {nav_id: button.dataset.nav}});
        })
    })
}

function setNewsToggleButton() {
    Array.from(document.querySelectorAll(".newsAnnounce, .dayNumber")).forEach(function (input) {
        input.addEventListener('click', function (e) {
            let button = e.target;
            document.getElementById(button.dataset.id + '_body').style.display = document.getElementById(button.dataset.id + '_body').style.display === "none"
            || document.getElementById(button.dataset.id + '_body').style.display === "" ? 'block' : 'none'
        })
    })
}

function setTickerFilter() {
    Array.from(document.querySelectorAll(".tickerFilter")).forEach(function (input) {
        input.addEventListener('click', function (e) {
            //document.getElementById('operation_date_from').valueAsDate = new Date('2015-03-01T00:00:00Z');
            document.getElementById('alert_table').style.display = 'none';
            document.getElementById('price_table').style.display = 'none';
            document.getElementById('treemap_table').style.display = 'none';
            document.getElementById('operation_table').style.display = 'block';
            document.getElementById('hideNewList').style.display = 'none';
            document.getElementById('graphic_table').style.display = 'none';
            document.getElementById('news_table').style.display = 'none';
            document.getElementById('notes_table').style.display = 'none';
            document.getElementById('newtickers_table').style.display = 'none';
            document.getElementById('operation_list').checked = true;
            port.postMessage({
                method: "getOperations",
                account: document.getElementById('operation_account').value || 'All',
                dateFrom: undefined,
                dateTo: undefined,
                hideCommission: document.getElementById('operation_commission').checked,
                operationType: document.getElementById('operation_type').value,
                ticker: e.target.dataset.ticker || e.target.innerText
            })
        })
    });
}

function setTranslateButton() {
    Array.from(document.querySelectorAll(".translate")).forEach(function (input) {
        input.addEventListener('click', function (e) {
            let button = e.target;
            ['_header', '_announce', '_body'].map(itemForTranslate => {
                let body = `text=${encodeURIComponent(document.getElementById(button.dataset.id + itemForTranslate).innerHTML)}`;
                fetch(
                    `${YANDEX_TRANSLATE}&lang=ru&format=html`,
                    {
                        method: "POST",
                        body: body,
                        headers: new Headers({
                            'Content-Type': 'application/x-www-form-urlencoded'
                        })
                    }
                )
                    .then(res => res.json())
                    .then(res => document.getElementById(button.dataset.id + itemForTranslate).innerHTML = res.text.join());
            });
        }, {
            once: true,
        })

    })
}

function setCommentToggleButton() {
    Array.from(document.querySelectorAll(".commentLink")).forEach(function (input) {
        input.addEventListener('click', function (e) {
            let button = e.target;
            document.getElementById(button.dataset.id).style.display = document.getElementById(button.dataset.id).style.display === "none"
            || document.getElementById(button.dataset.id).style.display === "" ? 'block' : 'none'
        })
    })
}

function setAnswerToggleButton() {
    Array.from(document.querySelectorAll(".answerLink")).forEach(function (input) {
        input.addEventListener('click', function (e) {
            let button = e.target;
            document.getElementById(button.dataset.id + '_answer').style.display = document.getElementById(button.dataset.id + '_answer').style.display === "none"
            || document.getElementById(button.dataset.id + '_answer').style.display === "" ? 'block' : 'none'
            document.getElementById(button.dataset.id + '_text').focus();
        })
    });
    Array.from(document.querySelectorAll(".answerButton")).forEach(function (input) {
        input.addEventListener('click', function (e) {
            let button = e.target;
            let comment_for_submit = document.getElementById(button.dataset.id + '_text').value;
            port.postMessage({method: "postComment", params: {postId: button.dataset.id, text: comment_for_submit}});
            document.getElementById(button.dataset.id + '_text').value = '';
            document.getElementById(button.dataset.id + '_answer').style.display = 'none';
        })
    })
}

// назначаем динамически handler для отслеживания кнопки Добавить
function setAddButtonHandler() {
    Array.from(document.getElementsByClassName("addNote")).forEach(function (input) {
        input.addEventListener('click', event => {
            let ticker = event.target.dataset.ticker;
            let note = document.getElementById('note_' + ticker).value;
            let date = document.getElementById('date_' + ticker).value;
            port.postMessage({method: "addNote", params: {ticker: ticker, note: note, date: date}});
        });
    });
    Array.from(document.getElementsByClassName("tickerPrice")).forEach(function (input) {
        input.addEventListener('input', event => {
            let ticker = event.target.dataset.ticker;
            let last = document.getElementById('last_' + ticker).innerText * 1;
            if (document.getElementById('buy_price_' + ticker).value * 1 > 0) {
                let percent = 100 - last * 100 / document.getElementById('buy_price_' + ticker).value;
                if (percent < 0) document.getElementById('percent_' + ticker).className = 'onlineSell'
                else document.getElementById('percent_' + ticker).className = 'onlineBuy';
                document.getElementById('percent_' + ticker).innerText = percent.toFixed(2);
            }
        });
    });
    Array.from(document.getElementsByClassName("addTicker")).forEach(function (input) {

        input.addEventListener('click', function (e) {
            let button = e.target;
            let ticker = button.dataset.ticker;
            let showName = button.dataset.showname;
            let buy_price = document.getElementById('buy_price_' + button.dataset.ticker).value;
            let sell_price = undefined; //document.getElementById('sell_price_' + button.dataset.ticker).value;
            let mobile_alert = 1;
            let date = undefined;//document.getElementById('datetime_' + button.dataset.ticker).value;
            let mobile_alert_price;
            if (mobile_alert && buy_price && sell_price) {
                mobile_alert_price = prompt('Вы указали одновременно и цену покупки и продажи\nДля мобильного уведомления нужно указать только одну (last price), введите интересующую стоимость для ' + button.dataset.ticker, buy_price);
            }
            if (mobile_alert) {
                mobile_alert_price = parseFloat(mobile_alert_price || buy_price || sell_price); // только одна цена для мобильного
                // отправляем запрос на создание моб уведомления
                port.postMessage({method: "createMobileAlert", params: {ticker: ticker, price: mobile_alert_price}});
            }
            let alert_symbol = {
                ticker: ticker,
                showName: showName,
                buy_price: buy_price,
                sell_price: sell_price,
                active: true,
                best_before: date
            };

            chrome.storage.sync.get([TICKER_LIST], function (data) {
                let alert_data = data[TICKER_LIST] || [];
                alert_data.push(alert_symbol);
                let new_alert_date = alert_data.filter(item => !!item);
                chrome.storage.sync.set({[TICKER_LIST]: new_alert_date}, function () {
                    console.log('Save ticker ' + JSON.stringify(new_alert_date));
                    alert('Добавлено в список отслеживания в браузере' + (mobile_alert ? ' и уведомление в приложении брокера' : ''));
                })
            });

        }, {
            once: true,
        })
    });
}

// Удаление из списка
function setDeleteButtonHandler() {
    // очень некрасиво, но пока так
    Array.from(document.getElementsByClassName("deleteTicker")).forEach(function (input) {
        input.addEventListener('click', function (e) {
            let button = e.target;
            let id = button.dataset.index;
            let status = button.dataset.status;
            button.style.display = 'none';
            let prevNode = button.previousElementSibling;
            prevNode.style.display = 'none';
            // только числа - заявка
            if (/^\d+$/.test(id) && confirm(`${status === 'progress' ? 'TakeProfit/StopLoss будет снят, Вы уверены?' : 'Заявка будет снята, Вы уверены?'}`)) {
                if (status === 'progress') port.postMessage({method: "cancelStop", params: id}); // takeprofit или stoploss
                else port.postMessage({method: "deleteOrder", params: id});
                // иначе уведомление
            } else if (id) port.postMessage({method: "unsubscribe", params: id});
            port.postMessage({method: "updateAlertPrices"});
        }, {
            once: true,
        });
    })
}

// Логика изменения при вводе данных в Онлайн заявки
function setChangeOrderHandler() {
    Array.from(document.getElementsByClassName("tickerOrderBuyPrice")).forEach(function (input) {
        input.addEventListener('input', function (e) {
            let input = e.target;
            if (input.value) {
                input.parentElement.parentElement.cells.item(3).getElementsByTagName('input')[0].value;
            }
        }, {
            once: true,
        });
    })
}

function create_portfolio_table(divId, data) {
    let old_table = document.getElementById(divId + '_table');
    let table = document.createElement('table');
    table.className = (old_table) ? old_table.className : 'alertPriceTable';
    table.id = divId + '_table';
    let tr = document.createElement('tr');
    let th1 = document.createElement('th');
    //th1.appendChild(document.createTextNode('название'));
    th1.className = 'sorting';
    let th2 = document.createElement('th');
    th2.innerHTML = 'цены брокера';
    th2.className = 'sorting';
    let th3 = document.createElement('th');
    th3.innerHTML = 'средняя цена прогноз';
    th3.className = 'sorting';
    let th4 = document.createElement('th');
    th4.appendChild(document.createTextNode('измн. за день'));
    th4.className = 'sorting';
    let th5 = document.createElement('th');
    th5.appendChild(document.createTextNode('кол-во'));
    th5.className = 'sorting';
    let th6 = document.createElement('th');
    th6.appendChild(document.createTextNode('текущая стоимость'));
    th6.className = 'sorting';
    let th7 = document.createElement('th');
    th7.appendChild(document.createTextNode('доход на тек. момент'));
    let th8 = document.createElement('th');
    th8.style.width = '40px';
    th7.className = 'sorting';

    /*
        let th9 = document.createElement('th');
        th9.appendChild(document.createTextNode('заметки'));
    */

    tr.appendChild(th1);
    tr.appendChild(th8);
    tr.appendChild(th2);
    tr.appendChild(th3);
    tr.appendChild(th4);
    tr.appendChild(th5);
    tr.appendChild(th6);
    tr.appendChild(th7);
    //tr.appendChild(th9);

    table.appendChild(tr);

    data.forEach(element => {
            if (element.holidayDescription) holidays.add(element.holidayDescription);
            let tr = document.createElement('tr');
            let td1 = document.createElement('td');
            td1.className = 'maxWidth';

            let img_status = '/icons/pre.png';
            let session_open = (element.symbol.marketStartTime || 'нет информации');
            let session_close = (element.symbol.marketEndTime || 'нет информации');
            if (element.symbol.premarketStartTime !== element.symbol.premarketEndTime) {
                session_open += ' премаркет с ' + element.symbol.premarketStartTime;
                session_close += ' премаркет до ' + element.symbol.premarketEndTime
            }
            let remain_time = '';
            if (element.exchangeStatus === 'Close') {
                img_status = '/icons/closed.png';
                remain_time = (element.instrumentStatusDesc ? element.instrumentStatusDesc+'\r\n' : '') + "Время до открытия " + msToTime(element.symbol.timeToOpen);
            } else if (element.exchangeStatus === 'Open') img_status = '/icons/open.png';
            if (element.instrumentStatusComment==='exchangeStatus_suspend') {
                img_status = '/icons/suspend.png';
            }
            let cached_element = listPrognosis && listPrognosis.filter(item => item?.ticker === element.symbol.ticker)[0];
            let feature_div = cached_element?.dividends ? cached_element.dividends[cached_element.dividends.length - 1] : undefined;
            let daysToDiv;
            if (feature_div && Date.now() <= new Date(feature_div.lastBuyDate + 'T23:59:59')) daysToDiv = parseInt((new Date(feature_div.lastBuyDate) - Date.now()) / (1000 * 60 * 60 * 24) + 1, 10);
            let div = feature_div && feature_div.yield ? `<a target="_blank" href="${SYMBOL_LINK.replace('${securityType}', element.symbol.securityType)}${element.symbol.ticker}/dividends/" title="Последняя дата (${new Date(feature_div.lastBuyDate).toLocaleDateString()} включительно) покупки для получения дивидендов, доход на одну акцию ${feature_div.yield.value}%">D${daysToDiv < 32 ? daysToDiv : ''}${daysToDiv === 0 ? '🚩' : ''}</a>` : '';

            let notes = element.notes && (element.notes.length > 0) ? '<span title="' + element.notes.map(elem => {
                return elem.text
            }).join('\n') + '">📝</span>' : '';

            let ls = '';
            if (element.symbol.longIsEnabled || element.symbol.shortIsEnabled) ls = `<span title="Long\Short">${(element.symbol.longIsEnabled ? 'L' : '') + '/' + (element.symbol.shortIsEnabled ? 'S' : '')}</span>`;

            let otc = element.symbol.isOTC ? '<span title="Внебиржевой инструмент\r\nДоступна только последняя цена, недоступна дневная доходность">👑</span>' : '';
            let etf = element.symbol.symbolType === 'ETF' ? '<span title="ETF">🗃️</span>' : '';
            let currency = element.symbol.symbolType === 'Currency' ? '<span title="Валюта">💰</span>' : '';
            let bond = element.symbol.symbolType === 'Bond' ? '<span title="Облигации">📒</span>' : '';
            let short = element.symbol.lotSize < 0 ? '<span title="Short">📉</span>' : '';
            let note = element.symbol.symbolType === 'Note' ? '<span title="Структурная нота">📚</span>' : '';
            let futures = element.symbol.symbolType === 'Futures' ? '<span title="Фьючерс">💸</span>' : '';
            let liquid = liquidList.positions ? liquidList.positions.filter(liquid => liquid.ticker === element.symbol.ticker).length > 0 ? '<span title="Входит в список ликвидных бумаг">💼</span>' : '' : '';
            let country = '';
            //if (otc === '' && etf === '' && bond === '' && currency === '') country = element.prices.buy.currency === 'RUB' ? '🇷🇺' : '🇺🇸';
            let mobile_alert = element.symbol.subscriptId ? `<span title="Уведомление добавлено на мобильном по цене ${element.subscriptPrice}">📳</span>` : '';
            let warning = element.contentMarker && element.contentMarker.recalibration ? '<span title="Есть негативные новости по инструменту"><a href="' + RECALIBRATION_LINK + element.symbol.ticker + '" target="_blank">💀</a></span>' : '';

            let prognosis_style = cached_element?.consensus && cached_element.consensus.recommendation === 'Покупать' ? 'onlineBuy' : 'onlineSell';
            let prognosis_link = cached_element?.consensus ? `<br><a class="${prognosis_style}" href="${PROGNOSIS_LINK.replace('${symbol}', cached_element.ticker).replace('${securityType}', element.symbol.securityType)}" target="_blank" title="Сводная рекомендация: ${cached_element.consensus.recommendation}">
                                ${cached_element.consensus.consensus.toLocaleString('ru-RU', {
                style: 'currency',
                currency: cached_element.consensus.currency,
                minimumFractionDigits: cached_element.consensus.consensus < 0.1 ? 4 : 2
            })}
                                </a><span class="percent" title="Прогнозируемое изменение с учетом текущей цены">
                                ${prognosis_style === 'onlineBuy' ? '+' : ''}${cached_element.consensus.price_change_rel.toFixed(2)} %
                                </span>` : '';
            td1.innerHTML = `<span class="pulseTicker" data-nav="${element.symbol.ticker}" title="Посмотреть пульс по инструменту ${element.symbol.showName}">${element.symbol.showName}</span><span class="pulseIcon">🔥</span>
            <br><img class="symbolStatus" alt="Статус биржи" 
        title="Биржа открыта с ${session_open}\r\nБиржа закрыта с ${session_close}\r\n${remain_time}" src="${img_status}">
        <span class="icon">${liquid}${otc}${etf}${currency}${bond}${note}${futures}</span>
        <a title="Открыть на странице брокера"  href="${SYMBOL_LINK.replace('${securityType}', element.symbol.securityType)}${element.symbol.ticker}" target="_blank"><strong class="ticker ${element.symbol.status === 'process' ? 'statusProcess' : ''}">${element.symbol.ticker}</strong></a>`;
            if (element.symbol.dayLow) {
                td1.appendChild(document.createElement("br"));
                td1.appendChild(drawDayProgress(element));
                td1.appendChild(document.createElement("br"));
                td1.appendChild(draw52Progress(element));
            }

            let td2 = document.createElement('td');
            if (element.prices) {
                td2.innerHTML = `<div data-last-ticker="${element.symbol.ticker}" class="onlineAverage" title="${element.symbol.isOTC ? 'Для внебиржевых бумаг выводит средняя цена между ценой покупки и продажи, обновляется брокером раз в час' : 'Последняя цена'}">${element.prices && Object.keys(element.prices).length ? element.prices?.last?.value : 'нет'}
                                ${element.symbol.isOTC && element.symbol.lastOTC ? `<span class="lastOTC" title="Цена получена со стороннего сервиса. Может не совпадать с ценой брокера, но наиболее близкая к рыночной, обновляется каждую минуту">${element.symbol.lastOTC}<sup>*</sup></span>` : ''}
                                </div>` +
                    (element.prices && element.prices.buy ? `<div data-buy-ticker="${element.symbol.ticker}" title="Цена покупки">
            <a class="onlineBuy" href="${SYMBOL_LINK.replace('${securityType}', element.symbol.securityType)}${element.symbol.ticker}/buy" target="_blank" title="Купить">${element.prices.buy ? element.prices.buy.value.toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: element.prices.buy.currency,
                        minimumFractionDigits: element.prices.buy.value < 0.1 ? 4 : 2
                    }) : ''}</a></div>` : '') +
                    (element.prices && element.prices.sell ? `<div data-sell-ticker="${element.symbol.ticker}"   title="Цена продажи">
            <a class="onlineSell" href="${SYMBOL_LINK.replace('${securityType}', element.symbol.securityType)}${element.symbol.ticker}/sell" target="_blank" title="Продать">${element.prices.sell ? element.prices.sell.value : ''}</a>
            </div>` : '');

            }
            let td3 = document.createElement('td');

            td3.width = '120';
            td3.align = 'left';
            let events_url = EVENTS_LINK.replace('${symbol}', element.symbol.ticker);
            if (element.symbol.averagePositionPrice.value === undefined || element.symbol.averagePositionPrice.value === 0)
                td3.innerHTML = `<div data-ticker="${element.symbol.ticker}">Ошибка у брокера</div>`;
            else
                td3.innerHTML = `<div data-ticker="${element.symbol.ticker}"><span class="tickerFilter" data-ticker="${element.symbol.ticker}" title="Средняя цена. Посмотреть транзакции">${element.symbol.averagePositionPrice.value.toLocaleString('ru-RU', {
                    style: 'currency',
                    currency: element.symbol.averagePositionPrice.currency,
                    minimumFractionDigits: element.symbol.averagePositionPrice.value < 0.1 ? 4 : 2
                })}</span>${prognosis_link}</div>`;

            td3.appendChild(drawPremiumConsensus(cached_element?.premium_consensus));
            td3.appendChild(drawPremiumConsensusFinn(cached_element?.finn_consensus));

            let td4 = document.createElement('td');
            if (element.prices) {
                td4.innerHTML = `<div data-daysum-ticker="${element.symbol.ticker}">${element.earnings ? element.earnings.absolute.value.toLocaleString('ru-RU', {
                    style: 'currency',
                    currency: element.earnings.absolute.currency,
                    minimumFractionDigits: Math.abs(element.earnings.absolute.value) < 1 ? 4 : 2
                }) : element.symbol.isOTC && element.symbol.absoluteOTC ? element.symbol.absoluteOTC.toLocaleString('ru-RU', {
                    style: 'currency',
                    currency: element.symbol.averagePositionPrice.currency,
                    minimumFractionDigits: element.symbol.absoluteOTC < 0.1 ? 4 : 2
                }) + '*' : ''}</div>
        <div data-daypercent-ticker="${element.symbol.ticker}"><strong>${!element.symbol.relativeOTC && element.earnings ? (element.earnings.relative * Math.sign(element.symbol.lotSize)).toLocaleString('ru-RU', {
                    style: 'percent',
                    maximumSignificantDigits: 2
                }) : element.symbol.isOTC && element.symbol.relativeOTC ? element.symbol.relativeOTC.toLocaleString('ru-RU', {
                    style: 'percent',
                    maximumSignificantDigits: 2
                }) + '*' : (element.symbol.expectedYieldPerDayRelative || 0).toLocaleString('ru-RU', {
                    style: 'percent',
                    maximumSignificantDigits: 2
                })}</strong></div>
        <div title="Доход за день, расчитывается на основе цены открытия">${element.earnings ? element.symbol.earningToday?.toLocaleString('ru-RU', {
                    style: 'currency',
                    currency: element.symbol.currentAmount.currency
                }) : element.symbol.isOTC && element.symbol.earningToday ? element.symbol.earningToday?.toLocaleString('ru-RU', {
                    style: 'currency',
                    currency: element.symbol.currentAmount.currency
                }) + '*' : ''}</div>`;

                if (element.symbol.isOTC) td4.className = (element.symbol.relativeOTC || element.symbol.earningToday) / 1 < 0 ? 'onlineSell' : 'onlineBuy';
                else td4.className = element.earnings ? element.earnings.absolute.value / 1 * (element.symbol.lotSize) < 0 ? 'onlineSell' : 'onlineBuy' : ''; // если lotSize < 0 то шорт

            }
            let td5 = document.createElement('td');

            td5.innerHTML = `<div data-ticker="${element.symbol.ticker}">${element.symbol.lotSize} ${element.symbol.blocked ? '<span title="Заблокировано">(🔒' + element.symbol.blocked + ')</span>' : ''}</div>`;

            let td6 = document.createElement('td');

            td6.innerHTML = `<div data-ticker="${element.symbol.ticker}">${element.symbol.currentAmount?.value?.toLocaleString('ru-RU', {
                style: 'currency',
                currency: element.symbol.currentAmount.currency
            })}</div>`;

            let td7 = document.createElement('td');
            if (element.prices) {
                if (element.symbol.expectedYield.value === 0 && element.symbol.status === 'process') {
                    td7.innerHTML = `<div data-ticker="${element.symbol.ticker}" title="Лимитная заявка">Еще не исполнена</div>`;
                    tr.className = 'process';
                } else {
                    if (element.symbol.lotSize < 0) tr.className = 'short';
                    td7.className = element.symbol.expectedYield.value / 1 < 0 ? 'onlineSell' : 'onlineBuy';

                    td7.innerHTML = `<div data-ticker="${element.symbol.ticker}">${element.symbol.expectedYield.value?.toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: element.symbol.expectedYield.currency
                    })}<br>${(element.symbol.expectedYieldRelative / 100).toLocaleString('ru-RU', {
                        style: 'percent',
                        maximumSignificantDigits: 2
                    })}</div>`;
                }
            }
            let td8 = document.createElement('td');
            //td8.style.whiteSpace = 'nowrap';
            td8.innerHTML = `${notes}${short}${warning}${div}${ls}`;
            tr.appendChild(td1);
            tr.appendChild(td8);
            tr.appendChild(td2);
            tr.appendChild(td3);
            tr.appendChild(td4);
            tr.appendChild(td5);
            tr.appendChild(td6);
            tr.appendChild(td7);
            table.appendChild(tr);
        }
    );
    if (holidays.size > 0) {
        document.getElementById('holidays').innerText = '🎈' + Array.from(holidays).join(' ');
        document.getElementById('holidays').title = 'Биржа не работает, ' + Array.from(holidays).join(' ');
    }
    document.getElementById(divId).innerText = '';

    document.getElementById(divId).appendChild(table);
    tinysort(table.querySelectorAll('tr')
        , {
            selector: 'td'
        });
}

// рендер таблицы заявок
function renderNotes(data) {
    let table = document.createElement('table');
    table.className = 'priceTable';
    let tr = document.createElement('tr');
    let th1 = document.createElement('th');
    th1.appendChild(document.createTextNode('название'));
    let th2 = document.createElement('th');
    th2.appendChild(document.createTextNode('заметка'));
    let th3 = document.createElement('th');
    th3.appendChild(document.createTextNode('дата'));
    tr.appendChild(th1);
    tr.appendChild(th2);
    tr.appendChild(th3);
    table.appendChild(tr);
    if (data && data.length > 0) {
        data.forEach(element => {
            let tr = document.createElement('tr');
            let td1 = document.createElement('td');
            td1.className = 'maxWidth tickerCol';
            td1.innerHTML = `${element.symbol.showName}<br><strong>${element.ticker}</strong>`;
            let td2 = document.createElement('td');
            td2.innerHTML = `<span id="note_${element.ticker}">${element.note}</span>`;
            td2.className = 'tickerCol';
            let td3 = document.createElement('td');
            td3.innerHTML = `<span id="date_${element.ticker}">${element.date}</span>`;
            td3.className = 'tickerCol';
            tr.appendChild(td1);
            tr.appendChild(td2);
            tr.appendChild(td3);
            tr.appendChild(td7);
            table.appendChild(tr);
        })
        document.getElementById('note_table').innerText = '';
        document.getElementById('note_table').appendChild(table);
    }
}

// рендер таблицы для заметок
function create_note_table(data) {
    let table = document.createElement('table');
    table.className = 'priceTable';
    let tr = document.createElement('tr');
    let th1 = document.createElement('th');
    th1.appendChild(document.createTextNode('название'));
    let th2 = document.createElement('th');
    th2.appendChild(document.createTextNode('последняя цена'));
    let th3 = document.createElement('th');
    th3.appendChild(document.createTextNode('заметка'));

    let th7 = document.createElement('th');
    tr.appendChild(th1);
    tr.appendChild(th2);
    tr.appendChild(th3);

    tr.appendChild(th7);
    table.appendChild(tr);
    if (data && data.length > 0) {
        data.forEach(function (element) {

            let tr = document.createElement('tr');
            let td1 = document.createElement('td');
            td1.className = 'maxWidth tickerCol';
            td1.innerHTML = `${element.symbol.showName}<br><strong>${element.symbol.ticker}</strong>`;
            let td2 = document.createElement('td');
            td2.innerHTML = `<span id="last_${element.symbol.ticker}">${element.prices?.last?.value}</span>${element.prices.last?.currency}`;
            td2.className = 'tickerCol';
            let td3 = document.createElement('td');
            //td3.innerHTML = element.prices.buy.value + element.prices.buy.currency + '<br>' + '<input class="tickerPrice buy" type="number" >';
            td3.innerHTML = `
            <input class="date" id="date_${element.symbol.ticker}" data-ticker="${element.symbol.ticker}" type="date" title="Дата когда будет выдано уведомление, можно оставить пустым">
            <input class="note" id="note_${element.symbol.ticker}" data-ticker="${element.symbol.ticker}" type="text" placeholder="введите текс заметки" required>
            `;

            td3.className = 'tickerCol';
            //let td4 = document.createElement('td');
            let td7 = document.createElement('td');
            td7.className = 'tickerCol';
            td7.innerHTML = `<input type="button" class="addNote" data-showname="${element.symbol.showName}" data-ticker="${element.symbol.ticker}" value="Добавить">`;
            tr.appendChild(td1);
            tr.appendChild(td2);
            tr.appendChild(td3);

            tr.appendChild(td7);
            table.appendChild(tr);
        })
    }
    document.getElementById('add_note_table').innerText = '';
    document.getElementById('add_note_table').appendChild(table);
    setAddButtonHandler();
}

// рендер таблицы с акциями для добавления
function create_table(data) {
    let table = document.createElement('table');
    table.className = 'priceTable';
    let tr = document.createElement('tr');
    let th1 = document.createElement('th');
    th1.appendChild(document.createTextNode('название'));
    let th2 = document.createElement('th');
    th2.appendChild(document.createTextNode('последняя цена'));
    let th3 = document.createElement('th');
    th3.appendChild(document.createTextNode('добавить уведомление'));

    let th7 = document.createElement('th');
    tr.appendChild(th1);
    tr.appendChild(th2);
    tr.appendChild(th3);

    tr.appendChild(th7);
    table.appendChild(tr);
    if (data && data.length > 0) {
        data.forEach(function (element) {

            let tr = document.createElement('tr');
            let td1 = document.createElement('td');
            td1.className = 'maxWidth';
            td1.innerHTML = `${element.symbol?.isOTC ? '<span title="Внебиржевой инструмент">👑</span>' : ''}${element.symbol.showName}<br><strong>${element.symbol.ticker}</strong>`;
            let td2 = document.createElement('td');
            td2.innerHTML = `<span id="last_${element.symbol.ticker}">${element.prices?.last?.value}</span>${element.prices?.last?.currency}`;
            td2.className = 'tickerCol';
            let td3 = document.createElement('td');
            //td3.innerHTML = element.prices.buy.value + element.prices.buy.currency + '<br>' + '<input class="tickerPrice buy" type="number" >';
            td3.innerHTML = `<input class="tickerPrice buy" id="buy_price_${element.symbol.ticker}" data-ticker="${element.symbol.ticker}" type="number" placeholder="цена" title="Введите цену, при достижении которой в браузер будет выдано уведомление&#013;Будет сравниваться с ценой покупки">
            составляет <strong><span id="percent_${element.symbol.ticker}"></span></strong>% от последней цены`;
            td3.className = 'tickerCol';
            //let td4 = document.createElement('td');
            let td7 = document.createElement('td');
            td7.className = 'tickerCol';
            td7.innerHTML = `<input type="button" class="addTicker" data-showname="${element.symbol.showName}" data-ticker="${element.symbol.ticker}" value="Добавить">`;
            tr.appendChild(td1);
            tr.appendChild(td2);
            tr.appendChild(td3);

            tr.appendChild(td7);
            table.appendChild(tr);
        })
    }
    document.getElementById('table').innerText = '';
    document.getElementById('table').appendChild(table);
    setAddButtonHandler();
}

// список для добавления онлайн заявок
function create_orders_table(data) {
    let table = document.createElement('table');
    table.className = 'priceTable';
    let tr = document.createElement('tr');
    let th1 = document.createElement('th');
    th1.appendChild(document.createTextNode('название'));
    let th2 = document.createElement('th');
    th2.appendChild(document.createTextNode('последняя'));
    let th3 = document.createElement('th');
    th3.appendChild(document.createTextNode('продажа'));
    let th4 = document.createElement('th');
    th4.appendChild(document.createTextNode('покупка'));
    let th5 = document.createElement('th');
    th5.appendChild(document.createTextNode('кол-во лотов'));
    tr.appendChild(th1);
    tr.appendChild(th2);
    tr.appendChild(th3);
    tr.appendChild(th4);
    tr.appendChild(th5);
    table.appendChild(tr);
    if (data && data.length > 0) {
        data.forEach(function (element) {

            let tr = document.createElement('tr');
            let td1 = document.createElement('td');
            td1.className = 'maxWidth';
            td1.innerHTML = `${element.symbol.showName}<br><strong>${element.symbol.ticker}</strong>`;
            let td2 = document.createElement('td');
            td2.appendChild(document.createTextNode(element.prices.last?.value + element.prices.last.currency));
            td2.className = 'tickerCol';
            let td3 = document.createElement('td');
            //td3.innerHTML = element.prices.buy.value + element.prices.buy.currency + '<br>' + '<input class="tickerPrice buy" type="number" >';
            td3.innerHTML = '<input class="tickerOrderBuyPrice buy" type="number" placeholder="продать >=">';
            td3.className = 'tickerCol';
            let td4 = document.createElement('td');
            //td4.innerHTML = element.prices.sell.value + element.prices.sell.currency + '<br>' + '<input class="tickerPrice sell" type="number">';
            td4.innerHTML = '<input class="tickerOrderSellPrice sell" type="number" placeholder="купить  <=">';
            td4.className = 'tickerCol';
            let td5 = document.createElement('td');
            td5.className = 'tickerCol';
            td5.innerHTML = `<input type="button" class="addTicker" data-showname="${element.symbol.showName}" data-ticker="${element.symbol.ticker}" value="Добавить">`;
            let td6 = document.createElement('td');
            td6.className = 'tickerCol';
            td6.innerHTML = '<input class="tickerQuantity" type="number" title="">';
            tr.appendChild(td1);
            tr.appendChild(td2);
            tr.appendChild(td3);
            tr.appendChild(td4);
            tr.appendChild(td6);
            tr.appendChild(td5);
            table.appendChild(tr);
        })
    }
    document.getElementById('order_table').innerText = '';
    document.getElementById('order_table').appendChild(table);
    setChangeOrderHandler();
}

// рендер таблицы с акциями ранее сохраненные
function create_alert_table(data_list) {

    let table;

    if (data_list) {
        table = document.createElement('table');
        table.className = 'alertPriceTable';
        let tr = document.createElement('tr');
        let th1 = document.createElement('th');
        th1.innerHTML = 'тикер';
        th1.className = 'sorting';
        //th1.appendChild(document.createTextNode('название'));
        let th2 = document.createElement('th');
        //th2.width = '110px';
        th2.innerHTML = 'цены брокера';
        th2.style = 'width:100px';
        th2.className = 'sorting';
        let th3 = document.createElement('th');
        th3.appendChild(document.createTextNode('измн. за день'));
        th3.style = 'width:100px';
        th3.className = 'sorting';
        let th4 = document.createElement('th');
        th4.appendChild(document.createTextNode('уведомления/заявки/takeProfit/stopLoss'));

        let th6 = document.createElement('th');
        th6.className = 'sorting';
        th6.appendChild(document.createTextNode('активно до'));
        let th7 = document.createElement('th');
        th7.className = 'sorting';
        let th8 = document.createElement('th');
        th8.appendChild(document.createTextNode('прогноз'));
        th8.style = 'width:110px';
        th8.className = 'sorting';
        th7.appendChild(document.createTextNode('до цели'));
        th1.dataset.columnName = 'ticker';
        tr.appendChild(th1);
        th2.dataset.columnName = 'last_price';
        tr.appendChild(th2);
        th8.dataset.columnName = 'prognosis';
        tr.appendChild(th8);
        th8.dataset.columnName = 'change';
        tr.appendChild(th3);
        tr.appendChild(th4);
        th8.dataset.columnName = 'before';
        tr.appendChild(th6);
        th8.dataset.columnName = 'opacity_rate';
        tr.appendChild(th7);
        table.appendChild(tr);
        let list_for_iteration = data_list;
        // каждому элементу в списке уведомлений выставляем из кеша прогноз, нужно для сортировки
        list_for_iteration.forEach(element => {
            element['prognosis'] = listPrognosis?.filter(item => item?.ticker === element.ticker)[0];
        })
        chrome.storage.sync.get([OPTION_SORT_BY], function (result) {
            switch (result[OPTION_SORT_BY]) {
                case 'ticker':
                    list_for_iteration = list_for_iteration?.sort((a, b) => a.ticker.localeCompare(b.ticker))
                    break;
                case 'last_price':
                    list_for_iteration = list_for_iteration?.sort((a, b) => a.online_average_price - b.online_average_price)
                    break;
                case 'prognosis':
                    list_for_iteration = list_for_iteration?.sort((a, b) => a.prognosis?.consensus?.price_change_rel - b.prognosis?.consensus?.price_change_rel)
                    break;
                case 'change':
                    list_for_iteration = list_for_iteration?.sort((a, b) => a.earnings?.relative - b.earnings?.relative)
                    break;
                case 'before':
                    list_for_iteration = list_for_iteration?.sort((a, b) => a.best_before.localeCompare(b.element.best_before))
                    break;
                case 'opacity_rate':
                default :
                    list_for_iteration = list_for_iteration?.sort((a, b) => Math.abs(a.opacity_rate) - Math.abs(b.opacity_rate));
            }

            list_for_iteration.forEach(element => {
                let opacity_rate = element.opacity_rate;
                // обнуляем онлайн цены полученные из Storage, если нет списка с ценами для рендера (раньше они хранились и обновлялись там)
                if (!data_list) {
                    element.online_average_price = 'Обновление';
                    element.online_buy_price = '';
                    element.currency = '';
                    element.online_sell_price = '';
                    element.earnings = undefined;
                } else element.online_buy_price = element.online_buy_price || element.online_average_price; // для внебиржевых нет цены покупки и продажи
                let cached_element = element.prognosis;
                let feature_div = cached_element?.dividends ? cached_element.dividends[cached_element.dividends.length - 1] : undefined;
                let daysToDiv;
                if (feature_div && Date.now() <= new Date(feature_div.lastBuyDate + 'T23:59:59')) daysToDiv = parseInt((new Date(feature_div.lastBuyDate) - Date.now()) / (1000 * 60 * 60 * 24) + 1, 10);
                let div = feature_div && feature_div.yield ? `<a target="_blank" href="${SYMBOL_LINK.replace('${securityType}', element.securityType)}${element.ticker}/dividends/" title="Последняя дата (${new Date(feature_div.lastBuyDate).toLocaleDateString()} включительно) покупки для получения дивидендов, доход на одну акцию ${feature_div.yield.value}%">D${daysToDiv < 32 ? daysToDiv : ''}${daysToDiv === 0 ? '🚩' : ''}</a>` : '';
                let notes = element.notes && (element.notes.length > 0) ? '<span title="' + element.notes.map(elem => {
                    return elem.text
                }).join('\n') + '">📝</span>' : '';
                let tr = document.createElement('tr');
                let td1 = document.createElement('td');
                td1.className = 'maxWidth';
                td1.innerHTML = `<span class="pulseTicker" data-nav="${element.ticker}" title="Посмотреть пульс по инструменту">${element.showName}</span><span class="pulseIcon">🔥</span><br>` +
                    div + notes +
                    //(element.orderId && !element.timeToExpire && !(element.status === 'New') ? '<span class="icon" title="takeProfit/stopLoss. Действует до срабатывания">🔔</span>' : '') +
                    (element.orderType === 'Limit' ? '<span class="icon" title="Лимитная завка. Автоматически снимается после закрытия биржи">🕑</span>' : (element.timeToExpire === 0 ? '<span class="icon" title="TakeProfit/StopLoss активно до срабатывания">♾️</span>' : '')) +
                    (element.isOTC ? '<span class="icon" title="Внебиржевой инструмент">👑</span>' : '') +
                    (element.isFavorite ? `<span class="icon" title="Было добавлено в избранное в мобильном приложение">⭐</span>` : '<span class="icon disabled" title="Не в избранном">⭐</span>') +

                    `<a title="Открыть на странице брокера"  href="${SYMBOL_LINK.replace('${securityType}', element.securityType)}${element.ticker}" target="_blank">
                        <strong>${element.ticker}</strong></a>`;

                let prognosis_style = cached_element && cached_element.consensus && cached_element.consensus.recommendation === 'Покупать' ? 'onlineBuy' : 'onlineSell';
                let prognosis_link = cached_element && cached_element.consensus ? `<a class="${prognosis_style}" href="${PROGNOSIS_LINK.replace('${symbol}', cached_element.ticker).replace('${securityType}', element.securityType)}" target="_blank" title="Сводная рекомендация: ${cached_element.consensus.recommendation}">
                                ${cached_element.consensus.consensus.toLocaleString('ru-RU', {
                    style: 'currency',
                    currency: cached_element.consensus.currency,
                    minimumFractionDigits: cached_element.consensus.consensus < 0.1 ? 4 : 2
                })}
                                </a><span class="percent" title="Прогнозируемое изменение с учетом текущей цены">
                                ${prognosis_style === 'onlineBuy' ? '+' : ''}${cached_element.consensus.price_change_rel.toFixed(2)} %
                                </span>` : '';
                let td2 = document.createElement('td');
                td2.innerHTML =
                    `<div style="float:left;margin-top: 5px" data-ticker="${element.ticker}" class="onlineAverage" title="Последняя цена">${element.online_average_price.toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: element.currency,
                        minimumFractionDigits: element.online_average_price < 0.1 ? 4 : 2
                    })}</div>
                    <div style="float:right;">
                    <div data-ticker="${element.ticker}" class="onlineBuy"  title="Цена покупки">
                    <a class="onlineBuy" href="${SYMBOL_LINK.replace('${securityType}', element.securityType)}${element.ticker}/buy" target="_blank" title="Купить">${element.online_buy_price}</a>
                    </div>
                    <div data-ticker="${element.ticker}" class="onlineSell"  title="Цена продажи">
                    <a class="onlineSell" href="${SYMBOL_LINK.replace('${securityType}', element.securityType)}${element.ticker}/sell" target="_blank" title="Продать">${element.online_sell_price}</a>
                    </div>
                    </div>`;
                let td8 = document.createElement('td');
                td8.innerHTML = prognosis_link;

                td8.appendChild(drawPremiumConsensus(cached_element?.premium_consensus));


                let td3 = document.createElement('td');
                td3.innerHTML = element.earnings ? `<div data-daysum-ticker="${element.ticker}">${element.earnings.absolute.value.toLocaleString('ru-RU', {
                    style: 'currency',
                    currency: element.earnings.absolute.currency,
                    minimumFractionDigits: Math.abs(element.earnings.absolute.value) < 0.1 ? 4 : 2
                })}</div>
                    <div data-daypercent-ticker="${element.ticker}"><strong>${element.earnings.relative.toLocaleString('ru-RU', {
                    style: 'percent',
                    maximumSignificantDigits: 2
                })}</strong></div>` : '';
                td3.className = element.earnings ? element.earnings.absolute.value / 1 < 0 ? 'onlineSell' : 'onlineBuy' : '';
                td3.align = 'right';
                let td4 = document.createElement('td');
                td4.innerHTML = `${element.sell_price ? `<strong title="Цена при достижении которой будет выведено уведомление с предложением продать">${element.sell_price}` : ''}</strong>`;
                td4.className = 'onlineSell';
                td4.align = 'right';
                if (element.orderId || element.subscriptPrice) { //StopLoss TakeProfit Subscriptions
                    td4.className = '';
                    td4.align = 'center';
                    let status = {
                        PartiallyFill: 'Частично исполненная заявка',
                        New: 'Заявка'
                    };
                    if (element.orderId) td4.innerHTML = `
                        <span class="subscribePrice">&nbsp;${element.sell_price || element.buy_price}</span><span data-index="${element.orderId}" data-status="${element.status}" title="Удалить заявку" class="deleteTicker close"></span> 
                        <strong title="${status[element.status] ? status[element.status] : element.orderType} ${element.ticker} по цене ${element.price || element.sell_price || element.buy_price} в количестве ${element.quantity}">&nbsp;${element.quantity} шт по цене ${element.price || element.sell_price || element.buy_price} ${element.quantityExecuted > 0 ? '(исполнено ' + element.quantityExecuted + ' шт)' : ''} на сумму ${((element.sell_price || element.buy_price) * element.quantity).toFixed(2)} счет ${element.brokerAccountType}</strong>`;
                    else td4.innerHTML = element.subscriptPrice?.map(elem =>
                        `<div class="subscribePrice"><div class="${elem.price < element.online_average_price ? 'red_border' : 'green_border'}">&nbsp;</div>&nbsp;${elem.price}
                            <span class="subscribePercent">&nbsp;${(100 - elem.price * 100 / element.online_average_price).toFixed(1)}%</span>
                        </div><span data-index="${elem.subscriptionId}" title="Удалить уведомление" class="deleteTicker close"></span>
                         `).join('');
                }

                let td6 = document.createElement('td');
                td6.className = '';
                let alert_date = new Date(Date.parse(element.best_before));
                if (element.orderId) {
                    td6.innerHTML = element.timeToExpire ? '<span title="заявка устанавливается до конца торгового дня, потом автоматически снимается">' + msToTime(element.timeToExpire) + '</span>'
                        : (element.status === 'progress' ? element.orderType :
                                (element.status === 'New' ? 'Заявка' : '')
                        );
                } else td6.innerHTML = element.best_before ? (alert_date.toLocaleDateString() + ' ' + alert_date.toLocaleTimeString())
                    : (element.favoriteList ? 'из списка избранного' : 'бессрочно');
                td6.align = 'center';
                if (element.orderId) {
                    if (element.operationType === 'Sell') tr.className = element.status === 'PartiallyFill' ? 'onlineSellPartial' : 'isOnlineOrderSell';
                    else tr.className = element.status === 'PartiallyFill' ? 'onlineBuyPartial' : 'isOnlineOrderBuy';
                }
                let td7 = document.createElement('td');
                td7.innerHTML = `<strong>${opacity_rate.toLocaleString('ru-RU', {
                    style: 'percent',
                    maximumSignificantDigits: 2
                })}</strong>`;
                td7.className = '';
                td7.align = 'center';
                /*                    let td8 = document.createElement('td');
                                    // hash for delete = ticker+sellprice+buyprice
                                    if (element.orderId && element.status || !element.orderId)
                                        td8.innerHTML = `<input class="deleteTicker" data-index="${element.orderId || (element.ticker + (element.sell_price || '0') + (element.buy_price || '0'))}" data-status="${element.status}" type="button" value="X" title="${element.orderId ? 'Снять заявку' : 'Удалить'}">`;
                                    else td8.innerHTML = '';*/
                tr.appendChild(td1);
                tr.appendChild(td2);
                tr.appendChild(td8);
                tr.appendChild(td3);
                tr.appendChild(td4);

                tr.appendChild(td6);
                tr.appendChild(td7);
                //tr.appendChild(td8);
                //tr.style.opacity = 1 - ((opacity_rate > 0.5) ? 0.5 : opacity_rate);

                table.appendChild(tr);
                //setRefreshHandler();
            });
            document.getElementById('alert_table').innerText = '';
            document.getElementById('alert_table').appendChild(table);
            setDeleteButtonHandler();
            setTickerPulseButton();
            setAlertSortButton();
        })
    } else {
        table = document.createElement('h5');
        table.innerText = 'Список для отслеживания пуст, добавьте, нажав "Добавить для отслеживания"';
        document.getElementById('alert_table').innerText = '';
        document.getElementById('alert_table').appendChild(table);
    }

}

// подгрузка списка акций по типу
document.getElementById('add_list_type').addEventListener('change', function (e) {
    document.getElementById('symbol_name').disabled = true;
    document.getElementById('symbol_name').value = '';
    switch (e.target.value) {
        case "2": // портфель
            document.getElementById('table').innerText = '';
            port.postMessage({method: "getListStock", params: 2});
            break;
        case "3": // избранное
            document.getElementById('table').innerText = '';
            port.postMessage({method: "getListStock", params: 3});
            break;
        case "1": // вручную
            document.getElementById('table').innerText = '';
            document.getElementById('symbol_name').disabled = false;
            break;
        default:
            document.getElementById('table').innerText = '';
            document.getElementById('symbol_name').disabled = true;
    }
});
document.getElementById('alert_list').addEventListener('change', function (e) {
    document.getElementById('price_table').style.display = 'none';
    document.getElementById('orders_table').style.display = 'none';
    document.getElementById('alert_table').style.display = 'block';
    document.getElementById('newtickers_table').style.display = 'none';
    document.getElementById('graphic_table').style.display = 'none';
    document.getElementById('news_table').style.display = 'none';
    document.getElementById('treemap_table').style.display = 'none';
    document.getElementById('notes_table').style.display = 'none';
    document.getElementById('operation_table').style.display = 'none';

});
document.getElementById('add_alert_list').addEventListener('change', function (e) {
    document.getElementById('alert_table').style.display = 'none';
    document.getElementById('orders_table').style.display = 'none';
    document.getElementById('newtickers_table').style.display = 'none';
    document.getElementById('price_table').style.display = 'block';
    document.getElementById('graphic_table').style.display = 'none';
    document.getElementById('news_table').style.display = 'none';
    document.getElementById('treemap_table').style.display = 'none';
    document.getElementById('notes_table').style.display = 'none';
    document.getElementById('operation_table').style.display = 'none';
});
document.getElementById('add_notes_list').addEventListener('change', function (e) {
    document.getElementById('alert_table').style.display = 'none';
    document.getElementById('orders_table').style.display = 'none';
    document.getElementById('notes_table').style.display = 'block';
    document.getElementById('graphic_table').style.display = 'none';
    document.getElementById('news_table').style.display = 'none';
    document.getElementById('treemap_table').style.display = 'none';
    document.getElementById('price_table').style.display = 'none';
    document.getElementById('newtickers_table').style.display = 'none';
    document.getElementById('operation_table').style.display = 'none';
});
document.getElementById('graphic').addEventListener('change', function (e) {
    document.getElementById('alert_table').style.display = 'none';
    document.getElementById('orders_table').style.display = 'none';
    document.getElementById('newtickers_table').style.display = 'none';
    document.getElementById('price_table').style.display = 'none';
    document.getElementById('graphic_table').style.display = 'block';
    document.getElementById('news_table').style.display = 'none';
    document.getElementById('treemap_table').style.display = 'none';
    document.getElementById('notes_table').style.display = 'none';
    document.getElementById('operation_table').style.display = 'none';
    // получаем список бумаг в портфеле
    let string_array_of_ticker = [];
    Array.from(document.getElementsByClassName("ticker")).forEach(input => {
        let name = input.innerText;
        name = name === 'TCS' ? 'LSIN:TCS' : name;
        string_array_of_ticker.push(name);
    });

    // общий список
    new TradingView.widget(
        {
            "width": "100%",
            "height": 610,
            "symbol": "LSIN:TCS",
            "interval": "D",
            "timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
            "theme": "Light",
            "style": "1",
            "locale": "ru",
            "toolbar_bg": "#f1f3f6",
            "enable_publishing": false,
            "hide_side_toolbar": true,
            "allow_symbol_change": true,
            "watchlist": string_array_of_ticker,
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
            "container_id": "tradingview_bbf09"
        }
    );
});

document.getElementById('news').addEventListener('change', function (e) {
    document.getElementById("news_table").innerHTML = ' <img src="css/loader.gif" alt="loading">';
    document.getElementById('alert_table').style.display = 'none';
    document.getElementById('price_table').style.display = 'none';
    document.getElementById('news_table').style.display = 'block';
    document.getElementById('graphic_table').style.display = 'none';
    document.getElementById('treemap_table').style.display = 'none';
    document.getElementById('notes_table').style.display = 'none';
    document.getElementById('newtickers_table').style.display = 'none';
    document.getElementById('operation_table').style.display = 'none';
    port.postMessage({method: "getNews", params: {nav_id: ''}});
});
document.getElementById('pulse').addEventListener('change', function (e) {
    document.getElementById("news_table").innerHTML = ' <img src="css/loader.gif" alt="loading">';
    document.getElementById('alert_table').style.display = 'none';
    document.getElementById('price_table').style.display = 'none';
    document.getElementById('news_table').style.display = 'block';
    document.getElementById('graphic_table').style.display = 'none';
    document.getElementById('treemap_table').style.display = 'none';
    document.getElementById('notes_table').style.display = 'none';
    document.getElementById('newtickers_table').style.display = 'none';
    document.getElementById('operation_table').style.display = 'none';
    port.postMessage({method: "getPulse", params: {nav_id: 61}});
});
document.getElementById('treemap').addEventListener('change', function (e) {
    document.getElementById('alert_table').style.display = 'none';
    document.getElementById('price_table').style.display = 'none';
    document.getElementById('treemap_table').style.display = 'block';
    document.getElementById("treemap_container").innerHTML = ' <img src="css/loader.gif" alt="loading">';
    document.getElementById('graphic_table').style.display = 'none';
    document.getElementById('news_table').style.display = 'none';
    document.getElementById('notes_table').style.display = 'none';
    document.getElementById('newtickers_table').style.display = 'none';
    document.getElementById('operation_table').style.display = 'none';
    let country = document.getElementById('add_treemap_type').value;
    let isOTC = document.getElementById('onlyOTC').value;
    port.postMessage({method: "getTreemap", country: country, isOTC: isOTC});
});
document.getElementById('treemap_update').addEventListener('click', function (e) {
    let country = document.getElementById('add_treemap_type').value;
    let isOTC = document.getElementById('onlyOTC').value;
    document.getElementById("treemap_container").innerHTML = ' <img src="css/loader.gif" alt="loading">';
    port.postMessage({method: "getTreemap", country: country, isOTC: isOTC});
});
document.getElementById('onlyOTC').addEventListener('change', function (e) {
    let isOTC = e.target.value;
    let country = document.getElementById('add_treemap_type').value;
    document.getElementById("treemap_container").innerHTML = ' <img src="css/loader.gif" alt="loading">';
    port.postMessage({method: "getTreemap", country: country, isOTC: isOTC});
});
document.getElementById('add_treemap_type').addEventListener('change', function (e) {
    document.getElementById("treemap_container").innerHTML = ' <img src="css/loader.gif" alt="loading">';
    let isOTC = document.getElementById('onlyOTC').value;
    port.postMessage({method: "getTreemap", country: e.target.value, isOTC: isOTC});
});

document.getElementById('newtickers').addEventListener('change', function (e) {
    document.getElementById('alert_table').style.display = 'none';
    document.getElementById('price_table').style.display = 'none';
    document.getElementById('treemap_table').style.display = 'none';
    document.getElementById('newtickers_table').style.display = 'block';
    document.getElementById('hideNewList').style.display = 'none';
    document.getElementById("newtickers_container").innerHTML = ' <img src="css/loader.gif" alt="loading">';
    document.getElementById('graphic_table').style.display = 'none';
    document.getElementById('news_table').style.display = 'none';
    document.getElementById('notes_table').style.display = 'none';
    document.getElementById('operation_table').style.display = 'none';
    port.postMessage({method: "getNewTickers"});
});
document.getElementById('hideNewList').addEventListener('click', function (e) {
    document.getElementById("newtickers_container").innerHTML = ' <img src="css/loader.gif" alt="loading">';
    port.postMessage({method: "cleanNewTickers"});
});
document.getElementById('operation_list').addEventListener('change', function (e) {
    document.getElementById('alert_table').style.display = 'none';
    document.getElementById('price_table').style.display = 'none';
    document.getElementById('treemap_table').style.display = 'none';
    document.getElementById('operation_table').style.display = 'block';
    document.getElementById('hideNewList').style.display = 'none';
    document.getElementById('graphic_table').style.display = 'none';
    document.getElementById('news_table').style.display = 'none';
    document.getElementById('notes_table').style.display = 'none';
    document.getElementById('newtickers_table').style.display = 'none';
    if (!document.getElementById('operation_date_from').value) {
        //document.getElementById('operation_date_from').valueAsDate = new Date();
        let d = new Date();
        d.setHours(0, 0, 0, 0);
        let dateFrom = d.toJSON();
        let dateToTime = new Date();
        dateToTime.setHours(23, 59, 59, 59);
        let dateTo = dateToTime.toJSON();
        port.postMessage({
            method: "getOperations",
            account: document.getElementById('operation_account').value || 'All',
            dateFrom: dateFrom,
            dateTo: dateTo,
            hideCommission: document.getElementById('operation_commission').checked,
            operationType: document.getElementById('operation_type').value
        })
    }
});

/*Array.from(document.getElementsByClassName('operation_table')).forEach(input => input.addEventListener('change', event => {
        document.getElementById("operation_container").innerHTML = '<img src="css/loader.gif" alt="loading">';
        let dateFrom = document.getElementById('operation_date_from').value ? (new Date(document.getElementById('operation_date_from').value)).toJSON() : (new Date()).toJSON();
        let dateTo = document.getElementById('operation_date_to').value ? (new Date(document.getElementById('operation_date_to').value)).toJSON() : (new Date()).toJSON();
        port.postMessage({
            method: "getOperations",
            account: document.getElementById('operation_account').value || 'All',
            dateFrom: dateFrom,
            dateTo: dateTo,
            hideCommission: document.getElementById('operation_commission').checked,
            operationType: document.getElementById('operation_type').value,
            ...(document.getElementById('ticker_name').value && {
                ticker: document.getElementById('ticker_name').value
            })
        })
    })
);*/

// подгрузка списка акций по названию
document.getElementById('symbol_name').addEventListener('input', function (e) {
    if (e.target.value) {
        throttle(port.postMessage({method: "getListStock", params: e.target.value}), 500);
    }
});

// подгрузка списка акций по названию
document.getElementById('symbol_name_for_note').addEventListener('input', function (e) {
    if (e.target.value) {
        throttle(port.postMessage({method: "getListStockForNote", params: e.target.value}), 500);
    }
});

// подгрузка списка акций по названию для онлайн заявок
document.getElementById('order_symbol_name').addEventListener('input', function (e) {
    if (e.target.value) {
        throttle(port.postMessage({method: "getListStockForOrder", params: e.target.value}), 500);
    }
});

// сохраняем применение косметического фильтра

/*
document.getElementById(OPTION_COSMETICS).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_COSMETICS]: e.target.checked}, function () {
        console.log('Cosmetic option set to ' + e.target.checked);
    })
});
*/

// подгружаем настройки
/*chrome.storage.sync.get([OPTION_COSMETICS], function (result) {
    console.log('get css filter option');
    document.getElementById(OPTION_COSMETICS).checked = result[OPTION_COSMETICS] === true;
});*/

// сохраняем применение Редиректа
document.getElementById(OPTION_REDIRECT).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_REDIRECT]: e.target.checked}, function () {
        console.log('Redirect option set to ' + e.target.checked);
    })
});

// подгружаем настройки
chrome.storage.sync.get([OPTION_REDIRECT], function (result) {
    console.log('get redirect option');
    document.getElementById(OPTION_REDIRECT).checked = result[OPTION_REDIRECT] === true;
});

// сохраняем применение Сессия
document.getElementById(OPTION_SESSION).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_SESSION]: e.target.checked}, function () {
        console.log('Redirect option set to ' + e.target.checked);
        document.getElementById(OPTION_ALERT).disabled = !e.target.checked;
        document.getElementById(OPTION_ALERT_TODAY).disabled = !e.target.checked;
        document.getElementById(OPTION_ALERT_TODAY_VALUE).disabled = !e.target.checked;
        document.getElementById(OPTION_ALERT_TODAY_PER_SYMBOL).disabled = !e.target.checked;
        document.getElementById(OPTION_ALERT_TODAY_VALUE_PER_SYMBOL).disabled = !e.target.checked;
    })
});

// подгружаем настройки
chrome.storage.sync.get([OPTION_SESSION], function (result) {
    console.log('get session option');
    document.getElementById(OPTION_SESSION).checked = result[OPTION_SESSION];
    document.getElementById(OPTION_ALERT).disabled = !result[OPTION_SESSION];
    document.getElementById(OPTION_ALERT_TODAY).disabled = !result[OPTION_SESSION];
    document.getElementById(OPTION_ALERT_TODAY_VALUE).disabled = !result[OPTION_SESSION];
    document.getElementById(OPTION_ALERT_TODAY_PER_SYMBOL).disabled = !result[OPTION_SESSION];
    document.getElementById(OPTION_ALERT_TODAY_VALUE_PER_SYMBOL).disabled = !result[OPTION_SESSION];
});

// сохраняем применение Покупка Продажа
document.getElementById(OPTION_ALERT).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_ALERT]: e.target.checked}, function () {
        console.log('Alert option set to ' + e.target.checked);
    })
});

// подгружаем настройки
chrome.storage.sync.get([OPTION_ALERT], function (result) {
    console.log('get alert option');
    document.getElementById(OPTION_ALERT).checked = result[OPTION_ALERT] === true;
});

// сохраняем применение Изменение цены за день
document.getElementById(OPTION_ALERT_TODAY).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_ALERT_TODAY]: e.target.checked}, function () {
        console.log('Alert_today option set to ' + e.target.checked);
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_ALERT_TODAY], function (result) {
    console.log('get alert_today option');
    document.getElementById(OPTION_ALERT_TODAY).checked = result[OPTION_ALERT_TODAY] === true;
});

// сохраняем величину уменьшения увеличения портфеля
document.getElementById(OPTION_ALERT_TODAY_VALUE).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_ALERT_TODAY_VALUE]: e.target.value}, function () {
        console.log('Alert_today_value option set to ' + e.target.value);
    });
    chrome.storage.local.set({[ALERT_TICKER_LIST]: {}}, () => {
        console.log('reset relative ');
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_ALERT_TODAY_VALUE], function (result) {
    console.log('get alert_today_value option');
    document.getElementById(OPTION_ALERT_TODAY_VALUE).value = result[OPTION_ALERT_TODAY_VALUE] || 2;
});

// сохраняем применение Изменение цены по бумаге за день
document.getElementById(OPTION_ALERT_TODAY_PER_SYMBOL).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_ALERT_TODAY_PER_SYMBOL]: e.target.checked}, function () {
        console.log('Alert_today_per_symbol option set to ' + e.target.checked);
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_ALERT_TODAY_PER_SYMBOL], function (result) {
    console.log('get Alert_today_per_symbol option');
    document.getElementById(OPTION_ALERT_TODAY_PER_SYMBOL).checked = result[OPTION_ALERT_TODAY_PER_SYMBOL] === true;
});


// сохраняем применение Изменение цены по бумаге за день
document.getElementById(OPTION_ALERT_ORDER_PER_SYMBOL).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_ALERT_ORDER_PER_SYMBOL]: e.target.checked}, function () {
        console.log('Alert_order_per_symbol option set to ' + e.target.checked);
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_ALERT_ORDER_PER_SYMBOL], function (result) {
    console.log('get Alert_order_per_symbol option');
    document.getElementById(OPTION_ALERT_ORDER_PER_SYMBOL).checked = result[OPTION_ALERT_ORDER_PER_SYMBOL] === true;
});


// сохраняем величину уменьшения увеличения по отдельной бумаге
document.getElementById(OPTION_ALERT_TODAY_VALUE_PER_SYMBOL).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_ALERT_TODAY_VALUE_PER_SYMBOL]: e.target.value}, function () {
        console.log('Alert_today_value_per_symbol option set to ' + e.target.value);
    });
    chrome.storage.local.set({[ALERT_TICKER_LIST]: {}}, () => {
        console.log('reset relative ');
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_ALERT_TODAY_VALUE_PER_SYMBOL], function (result) {
    console.log('get Alert_today_value_per_symbol option');
    document.getElementById(OPTION_ALERT_TODAY_VALUE_PER_SYMBOL).value = result[OPTION_ALERT_TODAY_VALUE_PER_SYMBOL] || 5;

});


// сохраняем величину уменьшения увеличения по отдельной бумаге
document.getElementById(OPTION_ALERT_ORDER_VALUE_PER_SYMBOL).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_ALERT_ORDER_VALUE_PER_SYMBOL]: e.target.value}, function () {
        console.log('Alert_order_value_per_symbol option set to ' + e.target.value);
    });
    chrome.storage.local.set({[ALERT_TICKER_LIST]: {}}, () => {
        console.log('reset relative ');
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_ALERT_ORDER_VALUE_PER_SYMBOL], function (result) {
    console.log('get Alert_order_value_per_symbol option');
    document.getElementById(OPTION_ALERT_ORDER_VALUE_PER_SYMBOL).value = result[OPTION_ALERT_ORDER_VALUE_PER_SYMBOL] || 1;
    chrome.storage.local.set({[ALERT_TICKER_LIST]: {}}, () => {
        console.log('reset relative ');
    })
});


// сохраняем применение Конвертировать в рубли
document.getElementById(OPTION_CONVERT_TO_RUB).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_CONVERT_TO_RUB]: e.target.checked}, function () {
        console.log('convert_to_rub option set to ' + e.target.checked);
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_CONVERT_TO_RUB], function (result) {
    console.log('get convert_to_rub option');
    document.getElementById(OPTION_CONVERT_TO_RUB).checked = result[OPTION_CONVERT_TO_RUB] === true;
});

// сохраняем применение Использовать Alpantage
document.getElementById(OPTION_ALPHAVANTAGE).addEventListener('change', function (e) {
    if (e.target.checked && !document.getElementById(OPTION_ALPHAVANTAGE_KEY).value) {
        alert('Сначала укажите ключ полученный с сайта FinnHUB');
        e.target.checked = false;
    } else
        chrome.storage.sync.set({[OPTION_ALPHAVANTAGE]: e.target.checked}, function () {
            console.log('alphavantage option set to ' + e.target.checked);
            document.getElementById(OPTION_FINN_ENABLED).disabled = !e.target.checked;
            document.getElementById(OPTION_FINN_GETLAST).disabled = !e.target.checked;
        })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_ALPHAVANTAGE], function (result) {
    console.log('get alphavantage option');
    document.getElementById(OPTION_ALPHAVANTAGE).checked = result[OPTION_ALPHAVANTAGE] === true;
    document.getElementById(OPTION_FINN_ENABLED).disabled = !result[OPTION_ALPHAVANTAGE] === true;
    document.getElementById(OPTION_FINN_GETLAST).disabled = !result[OPTION_ALPHAVANTAGE] === true;
});

// сохраняем применение  Alpantage key
document.getElementById(OPTION_ALPHAVANTAGE_KEY).addEventListener('input', function (e) {
    chrome.storage.sync.set({[OPTION_ALPHAVANTAGE_KEY]: e.target.value}, function () {
        console.log('alphavantage key option set to ' + e.target.value);
    })
});

// кнопка выход
document.getElementById("logout").addEventListener('click', function (e) {
    port.postMessage({method: "logout"});
    window.close();
});

// подгружаем настройки
chrome.storage.sync.get([OPTION_ALPHAVANTAGE_KEY], function (result) {
    console.log('get alphavantage key option');
    document.getElementById(OPTION_ALPHAVANTAGE_KEY).value = result[OPTION_ALPHAVANTAGE_KEY] || '';
});

// сохраняем применение в Пульс избпанное
document.getElementById(OPTION_FAVORITE).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_FAVORITE]: e.target.checked}, function () {
        console.log('favorite option set to ' + e.target.checked);
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_FAVORITE], function (result) {
    console.log('get favorite option');
    document.getElementById(OPTION_FAVORITE).checked = result[OPTION_FAVORITE] === true;
});

// сохраняем применение Добавление Избранного
document.getElementById(OPTION_FAVORITE_LIST).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_FAVORITE_LIST]: e.target.checked}, function () {
        console.log('add favorite option set to ' + e.target.checked);
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_FAVORITE_LIST], function (result) {
    console.log('get add favorite option');
    document.getElementById(OPTION_FAVORITE_LIST).checked = result[OPTION_FAVORITE_LIST] === true;
});

// сохраняем применение rifinitiv
document.getElementById(OPTION_RIFINITIV).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_RIFINITIV]: e.target.checked}, function () {
        console.log('add rifinitiv option set to ' + e.target.checked);
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_RIFINITIV], function (result) {
    console.log('get rifinitiv option');
    document.getElementById(OPTION_RIFINITIV).checked = result[OPTION_RIFINITIV] === true;
});

// сохраняем применение Finn
document.getElementById(OPTION_FINN_ENABLED).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_FINN_ENABLED]: e.target.checked}, function () {
        console.log('add finn option set to ' + e.target.checked);
        document.getElementById(OPTION_FINN_GETLAST).disabled = !e.target.checked;
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_FINN_ENABLED], function (result) {
    console.log('get finn option');
    document.getElementById(OPTION_FINN_ENABLED).checked = result[OPTION_FINN_ENABLED] === true;
    document.getElementById(OPTION_FINN_GETLAST).disabled = !result[OPTION_FINN_ENABLED];
});

// сохраняем применение Только один прогноз
document.getElementById(OPTION_FINN_GETLAST).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_FINN_GETLAST]: e.target.checked}, function () {
        console.log('add last month option set to ' + e.target.checked);
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_FINN_GETLAST], function (result) {
    console.log('get last month option');
    document.getElementById(OPTION_FINN_GETLAST).checked = result[OPTION_FINN_GETLAST] === true;
});

// сохраняем применение Виртуальная операция
document.getElementById(OPTION_MINUS_CURRENT_POS).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_MINUS_CURRENT_POS]: e.target.checked}, function () {
        console.log('add virtual operation option set to ' + e.target.checked);
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_MINUS_CURRENT_POS], function (result) {
    console.log('get virtual operation  option');
    document.getElementById(OPTION_MINUS_CURRENT_POS).checked = result[OPTION_MINUS_CURRENT_POS] === true;
});

// клик Сегодня в операциях
document.getElementById('today').addEventListener('click', function (input) {
    let dateFrom = new Date();
    let dateToTime = new Date();
    dateFrom.setHours(0, 0, 0, 0);
    dateToTime.setHours(23, 59, 59, 59);
    port.postMessage({
        method: "getOperations",
        account: document.getElementById('operation_account').value || 'All',
        dateFrom: dateFrom.toJSON(),
        dateTo: dateToTime.toJSON(),
        hideCommission: document.getElementById('operation_commission').checked,
        operationType: document.getElementById('operation_type').value,
        ticker: document.getElementById('ticker_name').value || ''
    })
})
// клик Фильтр в операциях
document.getElementById('filter_ticker').addEventListener('click', function (input) {
    let dateFrom = document.getElementById('operation_date_from').value ? (new Date(document.getElementById('operation_date_from').value)).toJSON() : '2015-03-01T00:00:00Z';
    let dateToTime = document.getElementById('operation_date_to').value ? new Date(document.getElementById('operation_date_to').value) : new Date();
    dateToTime.setHours(23, 59, 59, 59);
    let dateTo = dateToTime.toJSON();
    port.postMessage({
        method: "getOperations",
        account: document.getElementById('operation_account').value || 'All',
        dateFrom: dateFrom,
        dateTo: dateTo,
        hideCommission: document.getElementById('operation_commission').checked,
        operationType: document.getElementById('operation_type').value,
        ticker: document.getElementById('ticker_name').value || ''
    })
})

// запрашиваем права на выдачу уведомлений
if (window.Notification && Notification.permission !== "granted") {
    Notification.requestPermission(function (status) {
        if (Notification.permission !== status) {
            Notification.permission = status;
        }
    });
}
(function getAppVersion() {
    let manifestData = chrome.runtime.getManifest();
    document.getElementById('app_version').innerText = manifestData.version;
})();

//create_alert_table();

port.postMessage({method: "getSession"});
port.postMessage({method: "updateAlertPrices"});
port.postMessage({method: "getPortfolio"});
port.postMessage({method: "updateHeader"});
port.postMessage({method: "getUserInfo"});
port.postMessage({method: "getAvailableCashTCS"});
port.postMessage({method: "getAvailableCashBCS"});
port.postMessage({method: "getAvailableCashIIS"});
port.postMessage({method: "getVersionAPI"});
port.postMessage({method: "getLiquid"});
port.postMessage({method: "getPrognosis"});
port.postMessage({method: "getNews", params: {nav_id: ''}});


// запускаем фоновый пинг сервера + в нем все проверки
chrome.alarms.create("updatePortfolio", {
    delayInMinutes: INTERVAL_TO_CHECK,
    periodInMinutes: INTERVAL_TO_CHECK
});
chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === "updatePortfolio") {
        port.postMessage({method: "updateAlertPrices"});
        port.postMessage({method: "getPortfolio"});
        port.postMessage({method: "updateHeader"});
        port.postMessage({method: "getAvailableCashTCS"});
        port.postMessage({method: "getAvailableCashBCS"});
        port.postMessage({method: "getAvailableCashIIS"});
        port.postMessage({method: "getSession"});
        port.postMessage({method: "getLiquid"});
        port.postMessage({method: "getPrognosis"});
    }
});

let liquidList = {};
let listPrognosis = {};
let holidays = new Set();

(() => {
    // проверка настроек
    chrome.storage.sync.get([OPTION_ALPHAVANTAGE, OPTION_ALPHAVANTAGE_KEY], result => {
        if (result[OPTION_ALPHAVANTAGE] && result[OPTION_ALPHAVANTAGE_KEY].match('[A-Z0-9]{16}')) {
            document.getElementById('mainProperties').classList.add('blink_me');
            document.getElementById('mainProperties').title = 'Нужно поменять ключ к API';
            document.getElementById(OPTION_ALPHAVANTAGE_KEY).style.cssText = 'box-shadow: 0 0 3px #CC0000; margin: 10px';
        } else {
            document.getElementById('mainProperties').className = 'toggle';
            document.getElementById(OPTION_ALPHAVANTAGE_KEY).cssText = 'outline-color: inherit;';
            document.getElementById('mainProperties').title = 'Основные настройки.';
            document.getElementById(OPTION_ALPHAVANTAGE_KEY).style.cssText = '';
        }

    })
})()