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
    let accountData = items.filter(item =>
        item.accountType === account
        && (item.status === 'done' || item.status === 'progress')
        && (item.quantity > 0)
        && (currency === 'all' ? true : item.currency === currency)
    );
    let result = [];
    accountData.forEach(item => {
        result.push({
            symbol: item.ticker === 'TCS' ? 'TCSq' : item.ticker,
            isin: item.isin,
            commission: Math.abs(item.commission || 0),
            date: new Intl.DateTimeFormat('en-US').format(new Date(item.date)),
            type: item.operationType.toLowerCase() === 'buywithcard' ? 'buy' : item.operationType.toLowerCase(),
            price: item.price,
            currency: item.currency,
            amount: item.quantity,
        })
    });
    if (collapse) {
        // нужно отфильтровать пары покупка - продажа
        result.forEach((item, index, object) => {
            let amount = item.amount;
            let date = item.date;
            let price = item.price;
            let fundedCount = 0;
            object.slice(index,1);
            for (let i = index; i < result.length; i++) {
                if (item.symbol === result[i].symbol) {
                    fundedCount++;
                    date = result[i].date;
                    if (item.type === 'buy') amount += result[i].amount;
                    else amount -= result[i].amount;
                    price += result[i].price;
                    object.slice(i,1);
                }
            }
            price = price / (fundedCount || 1);
            result[index].price=price;
            result[index].date=date;
            result[index].amount=amount;
            // тут в stack все операции по одному инструменту
        })
    }
    return result;
}