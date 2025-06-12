import {
    CommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder,
    GuildMember,
} from 'discord.js';

import botVars from "../bot";

export const data = new SlashCommandBuilder()
    .setName('cancelraid')
    .setDescription('Cancels the upcoming raid based on the running CRON')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(option =>
        option
            .setName('nightcount')
            .setDescription('How many nights to skip | Default: 1')
    )
    .addBooleanOption(option =>
        option
            .setName('skipmessage')
            .setDescription('Should the raid cancelled message be skipped | Default: false')
    );

export async function execute(interaction: CommandInteraction) {
    const member = interaction.member as GuildMember;
    const allowedRoles = ['GM', 'Assistant GM', 'Officer', 'Officers'];
    const intersection = member.roles.cache.filter(role => allowedRoles.includes(role.name));
    if (!interaction.guild || intersection.size === 0) {
        return interaction.reply(`You're not allowed to do this.`);
    }
    console.log('Going to cancel');

    const nightCount = interaction.options.getInteger('nightcount') ?? 1;
    const skipMessage = interaction.options.getBoolean('skipmessage') ?? false;
    await botVars.scheduler.skipNext(+nightCount, skipMessage);
    const content = skipMessage ? 'All good, skipped the next raid' : 'All good, skipped the next raid and posted a message';
    await interaction.reply({content, ephemeral: true});
}