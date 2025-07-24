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
    ButtonStyle, GuildMember, Interaction, Role,
} from 'discord.js';
import {config} from "../config";

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
            if (val.name === 'ꓮpply' && val.type === ChannelType.GuildText) {
                val.delete();
            }
        })

        const channelGeneral = await interaction.guild.channels.create({
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

        const applicantRole = interaction.guild.roles.cache.find(role => role.name === config.APPLICANT_ROLE_NAME);
        if (applicantRole) {
            await createApplicantChannel(interaction);
        }


        const createTicketButton = new ButtonBuilder()
            .setCustomId('createTicket')
            .setLabel('Create a ticket 💌')
            .setStyle(ButtonStyle.Secondary);

        await channelGeneral.send(
            {
                content: '🎟️ Got Questions? Need Help? 🎟️ \n' +
                    '\n' +
                    'Hey there! 👋 \nIf you have any questions or need assistance, don\'t hesitate to reach out! \n\n',
                components: [
                    {
                        "type": 1,
                        "components": [
                            createTicketButton.toJSON()
                        ]
                    }
                ]
            }
        );

        return interaction.reply({content: `Ticket channel created`, ephemeral: true});
    } catch (error) {
        console.error('Error creating channel:', error);
        return interaction.reply({
            content: "Your channel could not be created! Please check if the bot has the necessary permissions!",
            ephemeral: true
        });
    }
}

async function createApplicantChannel(interaction: CommandInteraction) {
    const applicantRole = interaction.guild?.roles.cache.find(role => role.name === config.APPLICANT_ROLE_NAME);
    if (!applicantRole) {
        console.log('Applicant role does not exist');
        return;
    }

    const channelApply = await interaction.guild?.channels.create({
        name: 'ꓮpply',
        type: ChannelType.GuildText,
        permissionOverwrites: [{
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
        }, {
            id: interaction.client.user?.id,
            allow: PermissionFlagsBits.SendMessages
        }, {
            id: applicantRole.id,
            allow: PermissionFlagsBits.ViewChannel
        }]
    }) as TextChannel;

    const createApplyButton = new ButtonBuilder()
        .setCustomId('createApplyTicket')
        .setLabel('Apply now')
        .setStyle(ButtonStyle.Success);


    const msg = await channelApply.send(
        {
            content: "Welcome to RAVAGE Gaming's Discord. \n" +
                "\n" +
                "We are a CE WoW guild based on the Draenor Server\n" +
                "\n" +
                "Raid Days: Thursday & Sunday 20:00 - 23:00 Servertime (We raid Monday 20:00 - 23:00ST for the first 4 weeks of the tier) \n" +
                "\n" +
                "After CE we aim to keep raid days down to just Thursday 20:00 - 23:00 \n" +
                "\n" +
                "Aberrus: 9/9 M - Rank: 904\n" +
                "Amirdrassil: 9/9M - Rank: 770\n" +
                "Nerub-ar Palace 8/8M -  Rank: 596\n" +
                "Liberation of the Undermined 8/8M -  Rank: 753\n" +
                "\n" +
                "You can find us on: \n" +
                "[Raider.io](https://raider.io/guilds/eu/draenor/RAVAGE)\n" +
                "[WarcraftLogs](https://www.warcraftlogs.com/guild/id/789457)\n" +
                "[WoWProgress](https://www.wowprogress.com/guild/eu/draenor/RAVAGE)\n" +
                "\n" +
                "If interested in applying to the guild or connecting with our recruitment officers please click the apply button below!\n\n\n\n" +
                " ",
            components: [
                {
                    "type": 1,
                    "components": [
                        createApplyButton.toJSON()
                    ]
                }
            ]
        }
    )
    await msg.suppressEmbeds(true);
}