// an empty array means the browser's default locale — which is what we want
// you can use this to quickly check out different locales
const LOCALES = [];

// e.g. 11 Feb 2022
const dayMonthYear = new Intl.DateTimeFormat(LOCALES, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
});

// e.g. 11 Feb 2022, 16:08
const dayMonthYearHourMinutes = new Intl.DateTimeFormat(LOCALES, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});

// e.g. 11 Feb
const dayMonth = new Intl.DateTimeFormat(LOCALES, {
    month: 'short',
    day: 'numeric',
});

// e.g. 11 Feb, 16:08
const dayMonthHourMinutes = new Intl.DateTimeFormat(LOCALES, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});

// e.g. 16:08
const hourMinutes = new Intl.DateTimeFormat(LOCALES, {
    hour: 'numeric',
    minute: '2-digit',
});

// return a human-friendly string representation of a datetime
// if the flag is set, always include the time
export const dateToString = function (datetime, includeHourMinutes = false) {
    const now = new Date();

    if (datetime.getFullYear() == now.getFullYear()) {
        if (
            datetime.getMonth() == now.getMonth() &&
            datetime.getDate() == now.getDate()
        ) {
            return hourMinutes.format(datetime);
        } else {
            if (includeHourMinutes) {
                return dayMonthHourMinutes.format(datetime);
            } else {
                return dayMonth.format(datetime);
            }
        }
    } else {
        if (includeHourMinutes) {
            return dayMonthYearHourMinutes.format(datetime);
        } else {
            return dayMonthYear.format(datetime);
        }
    }
};
