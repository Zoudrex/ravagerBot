/**
 * Minutes east of UTC for the current browser.
 */
export function getClientOffsetMinutes() {
    // Date.getTimezoneOffset() returns minutes west of UTC, so invert the sign.
    return -new Date().getTimezoneOffset();
}

/**
 * Resolve minutes east of UTC for a given IANA time zone.
 * Tries shortOffset first, then falls back to a robust calculation.
 */
export function getOffsetMinutesForTimeZone(timeZone, date = new Date()) {
    try {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone,
            timeZoneName: 'shortOffset'
        }).formatToParts(date);
        const name = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+0';
        const match = name.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
        if (match) {
            const hours = parseInt(match[1], 10);
            const minutes = match[2] ? parseInt(match[2], 10) : 0;
            return hours * 60 + minutes;
        }
    } catch (_) {
        // Ignore and use fallback below.
    }

    // Fallback method (works on all modern browsers, including Safari)
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const map = Object.fromEntries(formatter.formatToParts(date).map(x => [x.type, x.value]));
    const asUTC = Date.UTC(
        Number(map.year),
        Number(map.month) - 1,
        Number(map.day),
        Number(map.hour),
        Number(map.minute),
        Number(map.second)
    );
    return Math.round((asUTC - date.getTime()) / 60000);
}

function normalizeMinutes(totalMinutes) {
    const day = 1440;
    return ((totalMinutes % day) + day) % day;
}

/**
 * Convert a server time (hour/minute in server TZ) to client-local time.
 */
export function convertServerToClientTime(serverHour, serverMinute, serverOffsetMinutes) {
    const clientOffset = getClientOffsetMinutes();
    const offsetDelta = clientOffset - serverOffsetMinutes;
    const total = normalizeMinutes(serverHour * 60 + serverMinute + offsetDelta);
    return { hour: Math.floor(total / 60), minute: total % 60 };
}

/**
 * Convert a client-local time back to server time (hour/minute in server TZ).
 */
export function convertClientToServerTime(clientHour, clientMinute, serverOffsetMinutes) {
    const clientOffset = getClientOffsetMinutes();
    const offsetDelta = clientOffset - serverOffsetMinutes;
    const total = normalizeMinutes(clientHour * 60 + clientMinute - offsetDelta);
    return { hour: Math.floor(total / 60), minute: total % 60 };
}
