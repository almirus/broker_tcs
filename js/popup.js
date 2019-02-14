'use strict';

import { port } from "/js/constants.mjs";
import {MainProperties} from "./background.js";

MainProperties.getSession();

port.postMessage({method: "updatePopup"});

port.onMessage.addListener(function(msg) {
    chrome.extension.getBackgroundPage().console.log("Popup - message received " + JSON.stringify(msg));
    switch (msg.result) {
        case 'updatePopup':
            document.getElementById('timestamp').innerText=msg.timestamp;
            document.getElementById('sum').innerText = msg.totalAmountPortfolio.toLocaleString('ru-RU', {
                style: 'currency',
                currency: 'RUB'
            });
            if (msg.expectedYield>0)document.getElementById('all').classList.add("positive");
            else document.getElementById('all').classList.add("negative");
            document.getElementById('earnedAll').innerText=msg.expectedYield.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' });
            document.getElementById('earnedAllPercent').innerText=msg.expectedYieldRelative.toLocaleString('ru-RU', { style: 'percent', minimumFractionDigits:2 });

            if (msg.expectedYieldPerDay>0)document.getElementById('day').classList.add("positive");
            else document.getElementById('day').classList.add("negative");
            document.getElementById('earnedToday').innerText=msg.expectedYieldPerDay.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' });
            document.getElementById('earnedTodayPercent').innerText=msg.expectedYieldPerDayRelative.toLocaleString('ru-RU', { style: 'percent', minimumFractionDigits:2 });

            break;
    }

});
