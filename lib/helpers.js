exports.sleep = async function (ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

exports.hoursMinutes = function(uptime, i18n){
    let s = parseInt(uptime);
    let m = Math.floor(s / 60);
    s = s % 60;
    let h = Math.floor(m / 60);
    m = m % 60;
    let d = Math.floor(h / 24);
    h = h % 24;
    h += d * 24;

    return `${h} ${i18n("helpers.hours")} - ${m} ${i18n("helpers.minutes")}`;
}

exports.splitTime = function(uptime, i18n){
    const numberOfHours = parseInt(uptime) / 3600;
    const Days = Math.floor(numberOfHours/24);
    const Remainder = numberOfHours % 24;
    const Hours = Math.floor(Remainder);
    const Minutes = Math.floor(60*(Remainder-Hours));
    return `${Days} ${i18n("helpers.days")} - ${Hours} ${i18n("helpers.hours")} - ${Minutes} ${i18n("helpers.minutes")}`;
}