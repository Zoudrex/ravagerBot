import {CommandInteraction, PermissionFlagsBits, SlashCommandBuilder} from "discord.js";
import botVars from "../bot";
export const data = new SlashCommandBuilder()
    .setName('nextraid')
    .setDescription('Returns the next raid date');
export async function execute(interaction: CommandInteraction) {
    const nextRaidDate = determineNextRaid();
    await interaction.reply(`The next raid is at: ${nextRaidDate}`);
}

function determineNextRaid() {
    const invReminder = botVars.scheduler.getInviteReminder();
    if (invReminder.isActive) {
        return botVars.scheduler.getInviteReminder().nextDate().toFormat("dd/MM");
    } else {
        return botVars.scheduler.getInviteStaller()?.nextDate().toFormat("dd/MM");
    }
}