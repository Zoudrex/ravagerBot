// Create a channel, response on an emoji reaction in a different channel use time/userId to create 8-char hash.
// Use this hash to create ticket-<hash>, permissions should be officer/ticket handlers only + the person that created the ticket.
// Ticket should close after 48h on inactivity. No message can be sent or deleted.
// Rework permissions in Discord so not every-fucking-body is an admin.
// Don't want officers to hide shit.

import {
    ChatInputCommandInteraction,
    CategoryChannel,
    TextChannel,
    PermissionFlagsBits,
    ChannelType,
    SlashCommandBuilder,
    ButtonBuilder,
    ButtonStyle, GuildMember,
} from 'discord.js';
import {config} from "../config";
import { BUTTON_IDS, CATEGORY_NAMES, CHANNEL_NAMES, STAFF_ROLES } from "../constants/guild";
import { findOrCreateCategory } from "../services/findOrCreateCategory";
import { deployedMessageService } from '../services/DeployedMessageService';

const CATEGORIES_TO_DELETE: readonly string[] = [
    CATEGORY_NAMES.tickets,
    CATEGORY_NAMES.applicants,
    CATEGORY_NAMES.ticketArchive,
];

export const data = new SlashCommandBuilder()
    .setName('deploy')
    .setDescription('Create a ticket channel where only the bot can post messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(option =>
        option
            .setName('destructive')
            .setDescription('Delete managed ticket categories before deploying | Default: false')
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const intersection = member.roles.cache.filter(role => STAFF_ROLES.includes(role.name));

    if (!interaction.guild || intersection.size === 0) {
        return interaction.reply(`You're not allowed to do this.`);
    }

    await interaction.deferReply({ephemeral: true});
    const guild = interaction.guild;

    try {
        return await deployedMessageService.exclusive(async () => {
            // Read storage before deleting channels, so invalid saved data fails safely.
            deployedMessageService.getContent('tickets');
            deployedMessageService.getContent('apply');
            const destructive = interaction.options.getBoolean('destructive') ?? false;

            if (destructive) {
                await deleteManagedCategories(interaction);
            } else {
                await deleteManagedDeployChannels(interaction);
            }

            const applicantRole = guild.roles.cache.find(role => role.name === config.APPLICANT_ROLE_NAME);
            const ticketCategory = await findOrCreateCategory(
                guild.channels,
                CATEGORY_NAMES.tickets,
                applicantRole?.id
            );
            const applicantCategory = await findOrCreateCategory(
                guild.channels,
                CATEGORY_NAMES.applicants
            );
            const ticketChannelPermissionOverwrites = [{
                id: guild.id,
                deny: PermissionFlagsBits.SendMessages
            }, {
                id: interaction.client.user?.id,
                allow: PermissionFlagsBits.SendMessages
            }];

            if (applicantRole) {
                ticketChannelPermissionOverwrites.push({
                    id: applicantRole.id,
                    deny: PermissionFlagsBits.ViewChannel,
                });
            }

            const channelGeneral = await guild.channels.create({
                name: CHANNEL_NAMES.tickets,
                type: ChannelType.GuildText,
                parent: ticketCategory.id,
                permissionOverwrites: ticketChannelPermissionOverwrites
            }) as TextChannel;

            if (applicantRole) {
                await createApplicantChannel(interaction, applicantCategory);
            }


            const createTicketButton = new ButtonBuilder()
                .setCustomId(BUTTON_IDS.createTicket)
                .setLabel('Create a ticket 💌')
                .setStyle(ButtonStyle.Secondary);

            const ticketMessage = await channelGeneral.send(
                {
                    content: deployedMessageService.getContent('tickets'),
                    allowedMentions: {parse: []},
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

            deployedMessageService.remember('tickets', ticketMessage);
            return interaction.editReply({content: destructive ? `Ticket channel recreated after destructive cleanup` : `Ticket channel created`});
        });
    } catch (error) {
        console.error('Error creating channel:', error);
        return interaction.editReply({
            content: "Your channel could not be created! Please check if the bot has the necessary permissions!",
        });
    }
}

async function deleteManagedDeployChannels(interaction: ChatInputCommandInteraction): Promise<void> {
    const channelsToDelete = interaction.guild!.channels.cache.filter(val =>
        val.type === ChannelType.GuildText &&
        (val.name === CHANNEL_NAMES.tickets || val.name === CHANNEL_NAMES.apply)
    );

    await Promise.all(channelsToDelete.map(channel => channel.delete()));
}

async function deleteManagedCategories(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.guild!.channels.fetch();

    const categories = interaction.guild!.channels.cache.filter(channel =>
        channel.type === ChannelType.GuildCategory &&
        CATEGORIES_TO_DELETE.includes(channel.name)
    ) as Map<string, CategoryChannel>;

    for (const category of categories.values()) {
        await deleteCategoryWithChildren(category);
    }
}

async function deleteCategoryWithChildren(category: CategoryChannel): Promise<void> {
    for (const child of category.children.cache.values()) {
        await child.delete();
    }

    await category.delete();
}

async function createApplicantChannel(interaction: ChatInputCommandInteraction, category: CategoryChannel) {
    const applicantRole = interaction.guild?.roles.cache.find(role => role.name === config.APPLICANT_ROLE_NAME);
    if (!applicantRole) {
        console.log('Applicant role does not exist');
        return;
    }

    const channelApply = await interaction.guild?.channels.create({
        name: CHANNEL_NAMES.apply,
        type: ChannelType.GuildText,
        parent: category.id,
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
        .setCustomId(BUTTON_IDS.createApplyTicket)
        .setLabel('Apply now')
        .setStyle(ButtonStyle.Success);


    const msg = await channelApply.send(
        {
            content: deployedMessageService.getContent('apply'),
            allowedMentions: {parse: []},
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
    deployedMessageService.remember('apply', msg);
    await msg.suppressEmbeds(true);
}
