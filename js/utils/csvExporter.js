function convertToCSV(objArray) {
    let array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    let str = '';
    for (let i = 0; i < array.length; i++) {
        let line = '';
        for (let index in array[i]) {
            if ('' !== line) line += ',';
            line += array[i][index];
        }
        str += line + '\r\n';
    }
    return str;
}

export function exportCSVFile(headers, items, fileTitle, postfix, collapse = false) {
    items = filterData(items, fileTitle, postfix, collapse);
    if (headers) {
        items.unshift(headers);
    }
    let jsonObject = JSON.stringify(items);
    let csv = convertToCSV(jsonObject);
    let exportedFilename = fileTitle + '_' + postfix + '.csv' || 'export.csv';
    let blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    let link = document.createElement("a");
    if (link.download !== undefined) {
        let url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", exportedFilename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function filterData(items, account = 'Tinkoff', currency, collapse) {
    let result = [];
    if (!collapse) {
        let accountData = items.filter(item =>
            item.accountType === account
            && (item.status === 'done' || item.status === 'progress')
            && (item.quantity > 0)
            && (currency === 'all' ? true : item.currency === currency)
        );
        accountData.forEach(item => {
            result.push({
                isin: item.isin,
                symbol: item.ticker === 'TCS' ? 'TCSq' : item.ticker,
                commission: Math.abs(item.commission || 0),
                date: new Intl.DateTimeFormat('en-US').format(new Date(item.date)),
                type: item.operationType.toLowerCase() === 'buywithcard' ? 'buy' : item.operationType.toLowerCase(),
                price: item.price,
                currency: item.currency,
                amount: item.quantity,
            })
        })
    } else {
        let accountData = items.filter(item =>
            currency === 'all' ? true : item.symbol.averagePositionPrice.currency === currency
        );
        accountData.forEach(item => {
            result.push({
                isin: item.symbol.isin,
                symbol: item.symbol.ticker === 'TCS' ? 'TCSq' : item.symbol.ticker,
                commission: 0,
                date: new Intl.DateTimeFormat('en-US').format(new Date(new Date().setDate(new Date().getDate() - 1))),
                type: 'buy',
                price: item.symbol.averagePositionPrice.value,
                currency: item.symbol.averagePositionPrice.currency,
                amount: item.symbol.lotSize,
            })
        });
    }
    return result;
}