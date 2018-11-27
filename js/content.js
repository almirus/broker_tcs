function loadCSS(file='styles') {
    let link = document.createElement("link");
    link.href = chrome.extension.getURL('css/' + file + '.css');
    link.id = file;
    link.type = "text/css";
    link.rel = "stylesheet";
    document.getElementsByTagName("html")[0].appendChild(link);
    console.log('TCS Broker extension apply css filter');
}

function unloadCSS(file='styles') {
    let cssNode = document.getElementById(file);
    cssNode && cssNode.parentNode.removeChild(cssNode);
    console.log('TCS Broker extension disable css filter');

}

chrome.storage.sync.get(['cosmetic'], function(result) {
    if (result.cosmetic) loadCSS();
    else unloadCSS();
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
    for (let key in changes) {
        let storageChange = changes[key];
        if (key==='cosmetic')
            if (storageChange.newValue) loadCSS();
            else unloadCSS();
    }
});