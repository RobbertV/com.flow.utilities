exports.sleep = async function (ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

exports.calculateDuration = function(startDate, endDate, i18n, log) {
    const diffInMilliseconds = Math.abs((endDate - startDate) / 1000);
    
    log('[calculateDuration] - diffInMilliseconds -', diffInMilliseconds);

    const numberOfHours = parseInt(diffInMilliseconds) / 3600;
    const days = Math.floor(numberOfHours / 24);
    const remainder = numberOfHours % 24;
    const hours = Math.floor(remainder);
    const minutes = Math.floor(60 * (remainder - hours));

    let dayString = '';
    let hourString = '';

    log(`[calculateDuration] - days: ${days} - hours: ${hours} - minutes: ${minutes}`);

    if (days > 1) {
        dayString = `${days} ${i18n('helpers.days')} `;
    }
    if (days === 1) {
        dayString = `${days} ${i18n('helpers.day')} `;
    }
    if (hours > 0) {
        hourString = `${hours} ${i18n('helpers.hours')} `;
    }
    return `${dayString}${hourString}${minutes} ${i18n('helpers.minutes')}`;
};

exports.calculateComparison = function(start, end) {
    const comparison = parseFloat(end) - parseFloat(start);
    return comparison ? comparison.toFixed(2) : 0;
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

    return calculationResult.toFixed(4);
};

exports.formatToken = function (value) {
    return value
        .replace(/[^0-9A-Za-z]/g, '-')
        .replace(/-{2,}/g, '-')
        .toLowerCase();
};
