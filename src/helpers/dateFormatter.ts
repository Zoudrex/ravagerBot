import botVars from "../bot";

export default function determineNextRaid() {
    const invReminder = botVars.scheduler.getInviteReminder();
    const dateScheduler = invReminder.isActive ? invReminder : botVars.scheduler.getInviteStaller();
    if (!dateScheduler) {
        throw Error("Ah oh spaghetti-o, this should never happen. Couldn't fetch date for next raid");
    }

    let date = dateScheduler.nextDate();
    const day = getDateOrdinal(date.get("day"));
    const month = date.monthLong;
    date = date.plus({minutes: 20}); // Reminder is 20 minutes before invites
    const inviteTime = date.toFormat('HH:mm');
    date = date.plus({minutes: 20}); //
    const pullTime = date.toFormat('HH:mm');

    return {date: `${day} of ${month}`, inviteTime, pullTime};
}

/**
 * Yanks apparently can't read dd/MM
 */
function getDateOrdinal(day: number) {
    let suffix = 'th';
    if (day % 10 === 1 && day !== 11) {
        suffix = 'st';
    } else if (day % 10 === 2 && day !== 12) {
        suffix = 'nd';
    } else if (day % 10 === 3 && day !== 13) {
        suffix = 'rd';
    }

    return day + suffix;
}