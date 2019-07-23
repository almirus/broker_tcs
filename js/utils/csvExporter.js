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

export function exportCSVFile(headers, items, fileTitle) {
    items = filterData(items, fileTitle);
    if (headers) {
        items.unshift(headers);
    }
    let jsonObject = JSON.stringify(items);
    let csv = convertToCSV(jsonObject);
    let exportedFilename = fileTitle + '.csv' || 'export.csv';
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

function filterData(items, account = 'Tinkoff') {
    let accountData = items.filter(item => item.accountType === account && (item.status === 'done' || item.status === 'progress') && item.quantity > 0);
    let result = [];
    accountData.forEach(item => {
        result.push({
            symbol: item.ticker,
            isin: item.isin,
            commission: Math.abs(item.commission),
            date: new Intl.DateTimeFormat('en-US').format(new Date(item.date)),
            type: item.operationType.toLowerCase() === 'buywithcard' ? 'buy' : item.operationType.toLowerCase(),
            price: item.price,
            currency: item.currency,
            amount: item.quantity,
        })
    });
    return result;
}