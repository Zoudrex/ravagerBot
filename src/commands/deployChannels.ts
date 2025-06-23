// Create a channel, response on an emoji reaction in a different channel use time/userId to create 8-char hash.
// Use this hash to create ticket-<hash>, permissions should be officer/ticket handlers only + the person that created the ticket.
// Ticket should close after 48h on inactivity. No message can be sent or deleted.
// Rework permissions in Discord so not every-fucking-body is an admin.
// Don't want officers to hide shit.

import {
    CommandInteraction,
    TextChannel,
    PermissionFlagsBits,
    ChannelType,
    SlashCommandBuilder,
    ButtonBuilder,
    ButtonStyle, GuildMember,
} from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('deploy')
    .setDescription('Create a ticket channel where only the bot can post messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
    const member = interaction.member as GuildMember;
    const allowedRoles = ['GM', 'Assistant GM', 'Officer', 'Officers'];
    const intersection = member.roles.cache.filter(role => allowedRoles.includes(role.name));

    if (!interaction.guild || intersection.size === 0) {
        return interaction.reply(`You're not allowed to do this.`);
    }

    try {
        // Re-deploy, mostly for dev testing, cba deleting the channel manually each time
        interaction.guild.channels.cache.each(val => {
            if (val.name === 'ꓔickets' && val.type === ChannelType.GuildText) {
                val.delete();
            }
            return false;
        })

        const channel = await interaction.guild.channels.create({
            name: 'ꓔickets',
            type: ChannelType.GuildText,
            permissionOverwrites: [{
                id: interaction.guild.id,
                deny: PermissionFlagsBits.SendMessages
            }, {
                id: interaction.client.user?.id,
                allow: PermissionFlagsBits.SendMessages
            }]
        }) as TextChannel;

        const createTicketButton = new ButtonBuilder()
            .setCustomId('createTicket')
            .setLabel('Create a ticket 💌')
            .setStyle(ButtonStyle.Secondary);
        //
        // const createRaidTicketButton = new ButtonBuilder()
        //     .setCustomId('createRaidTicket')
        //     .setLabel('Raid ⚔')
        //     .setStyle(ButtonStyle.Secondary);

        await channel.send(
            {
                content: '#### 🎟️ Got Questions? Need Help? 🎟️ \n' +
                    '\n' +
                    'Hey there! 👋 \nIf you have any questions or need assistance, don\'t hesitate to reach out! \n\n',
                components: [
                    {
                        "type": 1,
                        "components": [
                            createTicketButton.toJSON()
                            // createRaidTicketButton.toJSON()
                        ]
                    }
                ]
            }
        );

        return interaction.reply({content: `Ticket channel created: ${channel}`, ephemeral: true});
    } catch (error) {
        console.error('Error creating channel:', error);
        return interaction.reply({
            content: "Your channel could not be created! Please check if the bot has the necessary permissions!",
            ephemeral: true
        });
    }
}