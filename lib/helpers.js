exports.sleep = async function (ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

exports.variableAutoComplete = function (ctx, query, all = false) {
    let variables = ctx.appSettings.VARIABLES.map((c) => ({ name: c }));
    if (all) variables = [{ name: ctx.homey.__('helpers.all') }, ...variables];
    return variables.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
};

exports.calculateDuration = function (startDate, endDate, numberResult = false, i18n, log) {
    const diffInSeconds = Math.abs((endDate - startDate) / 1000);

    log('[calculateDuration] - diffInSeconds -', diffInSeconds);

    const numberOfHours = parseInt(diffInSeconds) / 3600;
    const days = Math.floor(numberOfHours / 24);
    const remainder = numberOfHours % 24;
    const hours = Math.floor(remainder);
    const minutes = Math.floor(60 * (remainder - hours));
    const seconds = Math.floor(diffInSeconds);

    log(`[calculateDuration] - days: ${days} - hours: ${hours} - minutes: ${minutes} - seconds: ${seconds}`);

    if (numberResult) {
        return seconds;
    }

    if (!days && !hours && !minutes) {
        return `${this.singleOrPluralTime(i18n, seconds, 'second')}`;
    }

    let TimeString = '';
    TimeString += days ? `${this.singleOrPluralTime(i18n, days, 'day')} ` : '';
    TimeString += hours ? `${this.singleOrPluralTime(i18n, hours, 'hour')} ` : '';
    TimeString += this.singleOrPluralTime(i18n, minutes, 'minute');

    return TimeString.trim();
};

exports.convertNumber = function (number, decimals) {
    return number ? Number(number.toFixed(decimals)) : 0;
};

exports.calculateComparison = function (start, end) {
    const comparison = parseFloat(end) - parseFloat(start);
    return comparison ? Number(comparison.toFixed(2)) : 0;
};

exports.calculationType = function (calcType, value1, value2) {
    calculationResult = 0;

    if (calcType === '+') {
        calculationResult = value1 + value2;
    }
    if (calcType === '-') {
        calculationResult = value1 - value2;
    }
    if (calcType === '*') {
        calculationResult = value1 * value2;
    }
    if (calcType === '/') {
        calculationResult = value1 / value2;
    }

    return Number(calculationResult.toFixed(4));
};

exports.convertText = function (type, text) {
    let convertText = text;

    if (type === 'lowercase') {
        convertText = convertText.toLowerCase();
    }
    if (type === 'uppercase') {
        convertText = convertText.toUpperCase();
    }
    if (type === 'capitalizeFirstLetter') {
        convertText = capitalizeFirstLetter(convertText);
    }
    if (type === 'titleCase') {
        convertText = titleCase(convertText);
    }

    return convertText;
};

exports.formatToken = function (value) {
    return value
        .replace(/[^0-9A-Za-z]/g, '-')
        .replace(/-{2,}/g, '-')
        .toLowerCase();
};

singleOrPluralTime = function (i18n, number, type) {
    if (number === 1) {
        return `${number} ${i18n(`helpers.${type}`)}`;
    }

    return `${number} ${i18n(`helpers.${type}s`)}`;
};

capitalizeFirstLetter = function (string) {
    var splitStr = string.toLowerCase();
    return splitStr.charAt(0).toUpperCase() + splitStr.slice(1);
};

titleCase = function (string) {
    var splitStr = string.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
    }
    return splitStr.join(' ');
};

 