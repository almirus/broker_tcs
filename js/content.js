// верхнее меню в шапке
document.addEventListener("DOMContentLoaded", function(event) {
    let menu_ul = document.getElementById('firstMenu');
    if (menu_ul) {
        let li = document.createElement("li");
        li.className = 'mine_menu';
        li.appendChild(document.createTextNode("<a href='https://www.tinkoff.ru/invest/broker_account/'>Инвестиции</a>"));
        menu_ul.appendChild(li);
    }
});
