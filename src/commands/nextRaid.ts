import {CommandInteraction, SlashCommandBuilder} from "discord.js";
import botVars from "../bot";

export const data = new SlashCommandBuilder()
    .setName('nextraid')
    .setDescription('Returns the next raid date');

export async function execute(interaction: CommandInteraction) {
    const nextRaidDate = determineNextRaid();
    await interaction.reply(`The next raid will be on the ${nextRaidDate}`);
}

function determineNextRaid() {
    const invReminder = botVars.scheduler.getInviteReminder();
    const date = invReminder.isActive ? invReminder.nextDate() : botVars.scheduler.getInviteStaller()?.nextDate();
    if (!date) {
        throw Error("Ah oh spaghetti-o, this should never happen. Couldn't fetch date for next raid");
    }
    const day = getDateOrdinal(date.get("day"));
    const month = date.monthLong;
    return `${day} of ${month}`;
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