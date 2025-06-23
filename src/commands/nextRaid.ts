import {CommandInteraction, SlashCommandBuilder} from "discord.js";
import determineNextRaid from "../helpers/dateFormatter";

export const data = new SlashCommandBuilder()
    .setName('nextraid')
    .setDescription('Returns the next raid date');

export async function execute(interaction: CommandInteraction) {
    const nextRaidDate = determineNextRaid();
    await interaction.reply({content:`# Next Raid\n**Date**: ${nextRaidDate.date}\n**Pulling at**: ${nextRaidDate.pullTime} ST\n**Invites at**: ${nextRaidDate.inviteTime} ST`, ephemeral: true});
}