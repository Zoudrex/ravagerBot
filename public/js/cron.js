export const DAY_OPTIONS = [
    { key: 'sun', label: 'Sun' },
    { key: 'mon', label: 'Mon' },
    { key: 'tue', label: 'Tue' },
    { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' },
    { key: 'fri', label: 'Fri' },
    { key: 'sat', label: 'Sat' }
];

export const REMINDER_TITLES = {
    inviteReminder: 'Raid invite reminder',
    waShtReminder: 'WeakAura / WoWAudit reminder'
};

export function leftPadTwo(number) {
    const n = Number(number) || 0;
    return n < 10 ? '0' + n : String(n);
}

/**
 * Parse a cron string in the format: "0 <minute> <hour> * * <days>"
 */
export function parseCronSchedule(schedule) {
    console.log(schedule);
    if (!schedule || typeof schedule !== 'string') {
        return { hour: 19, minute: 0, days: ['sun', 'thu'] };
    }
    const parts = schedule.trim().split(/\s+/);
    if (parts.length < 6) {
        return { hour: 19, minute: 0, days: ['sun', 'thu'] };
    }
    const minute = Number(parts[1]) || 0;
    const hour = Number(parts[2]) || 0;
    const days = parts[5] === '*' ? [] : parts[5].split(',').map(d => d.toLowerCase());
    return { hour, minute, days };
}

/**
 * Build a cron string (server TZ) from hour/minute and selected day keys.
 */
export function buildCronSchedule(hour, minute, selectedDays) {
    if (!Array.isArray(selectedDays) || selectedDays.length === 0) {
        throw new Error('Select at least one day');
    }
    const dayOfWeek = selectedDays.join(',');
    return `0 ${minute} ${hour} * * ${dayOfWeek}`;
}
