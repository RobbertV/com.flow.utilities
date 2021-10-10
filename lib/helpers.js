exports.sleep = async function (ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

exports.hoursMinutes = function (uptime, i18n) {
    let s = parseInt(uptime);
    let m = Math.floor(s / 60);
    s = s % 60;
    let h = Math.floor(m / 60);
    m = m % 60;
    let d = Math.floor(h / 24);
    h = h % 24;
    h += d * 24;

    return `${h} ${i18n('helpers.hours')} ${m} ${i18n('helpers.minutes')}`;
};

exports.splitTime = function (uptime, i18n, log) {
    const numberOfHours = parseInt(uptime) / 3600;
    const days = Math.floor(numberOfHours / 24);
    const remainder = numberOfHours % 24;
    const hours = Math.floor(remainder);
    const minutes = Math.floor(60 * (remainder - hours));

    let dayString = '';
    let hourString = '';

    log('SplitTime', days, hours, minutes);
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

exports.formatToken = function (value) {
    return value
        .replace(/[^0-9A-Za-z]/g, '-')
        .replace(/-{2,}/g, '-')
        .toLowerCase();
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
