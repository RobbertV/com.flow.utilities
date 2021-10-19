exports.sleep = async function (ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

exports.variableAutoComplete = function (ctx, query, all = false) {
    let variables = ctx.appSettings.VARIABLES.map((c) => ({ name: c }));
    if(all) variables = [{name: ctx.homey.__('helpers.all')}, ...variables]
    return variables.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
};

exports.calculateDuration = function (startDate, endDate, i18n, log) {
    const diffInSeconds = Math.abs((endDate - startDate) / 1000);

    log('[calculateDuration] - diffInSeconds -', diffInSeconds);

    const numberOfHours = parseInt(diffInSeconds) / 3600;
    const days = Math.floor(numberOfHours / 24);
    const remainder = numberOfHours % 24;
    const hours = Math.floor(remainder);
    const minutes = Math.floor(60 * (remainder - hours));
    const seconds = Math.floor(diffInSeconds);

    let dayString = '';
    let hourString = '';

    log(`[calculateDuration] - days: ${days} - hours: ${hours} - minutes: ${minutes} - seconds: ${seconds}`);

    if (days > 1) {
        dayString = `${days} ${i18n('helpers.days')} `;
    }
    if (days === 1) {
        dayString = `${days} ${i18n('helpers.day')} `;
    }
    if (hours > 0) {
        hourString = `${hours} ${i18n('helpers.hours')} `;
    }

    if (!minutes) {
        return `${seconds} ${i18n('helpers.seconds')}`;
    }

    return `${dayString}${hourString}${minutes} ${i18n('helpers.minutes')}`;
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

exports.formatToken = function (value) {
    return value
        .replace(/[^0-9A-Za-z]/g, '-')
        .replace(/-{2,}/g, '-')
        .toLowerCase();
};

