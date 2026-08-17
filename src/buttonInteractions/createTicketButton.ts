import {
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChannelType,
    GuildMember, InteractionReplyOptions,
    PermissionsBitField, Role, TextChannel
} from "discord.js";
import { BUTTON_IDS, CATEGORY_NAMES, ROLE_NAMES } from "../constants/guild";
import { config } from "../config";
import {findRole} from "../helpers/findRole";
import { findOrCreateCategory } from "../services/findOrCreateCategory";

export async function execute(interaction: ButtonInteraction) {
    if (!interaction.guild) {
        return interaction.reply('How...?');
    }

    await interaction.deferReply({ephemeral: true});

    const rolesToFind = [ROLE_NAMES.officer];
    const roles: Role[] = [];

    const channelPrefix = interaction.customId === BUTTON_IDS.createApplyTicket ? 'applicant' : 'ticket';
    const categoryName = interaction.customId === BUTTON_IDS.createApplyTicket ? CATEGORY_NAMES.applicants : CATEGORY_NAMES.tickets;

    const applicantRole = interaction.guild.roles.cache.find(role => role.name === config.APPLICANT_ROLE_NAME);
    const channelManager = interaction.guild.channels
    const category = await findOrCreateCategory(
        channelManager,
        categoryName,
        categoryName === CATEGORY_NAMES.tickets ? applicantRole?.id : undefined
    )

    const member = interaction.member as GuildMember

    const ticketName = formatTicketName(member.displayName, channelPrefix);

    let channelExist = channelManager.cache.filter(channel => channel.name === ticketName).first();
    if (channelExist) {
        return sendAutoDeleteEphemeral(interaction, {
            content: `You're not allowed to create multiple tickets within one minute. Use the one you already have open. see ${channelExist}`,
            ephemeral: true
        }, 30000);
    }

    try {
        rolesToFind.forEach(role => {
            roles.push(findRole(role, interaction));
        })
    } catch (e: any) {
        return sendAutoDeleteEphemeral(interaction, {content: e.message, ephemeral: true});
    }

    const permissions = [{
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
    }, {
        id: member.id,
        allow: [PermissionsBitField.Flags.ViewChannel]
    }];

    roles.forEach(role => {
        permissions.push({
            id: role.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
        });
    })

    const channel = await interaction.guild.channels.create({
        type: ChannelType.GuildText,
        name: ticketName,
        parent: category?.id,
        permissionOverwrites: permissions
    })


    await addArchiveButton(channel, roles, interaction.customId !== BUTTON_IDS.createApplyTicket);
    await sendAutoDeleteEphemeral(interaction, {
        content: `Your ticket has been created. ${channel}`,
        ephemeral: true
    });

    return;
}

async function sendAutoDeleteEphemeral(interaction: ButtonInteraction, options: string | InteractionReplyOptions, delay: number = 7500): Promise<void> {
    if (interaction.deferred || interaction.replied) {
        if (typeof options === "string") {
            await interaction.editReply(options);
        } else {
            const {ephemeral, flags, ...editOptions} = options;
            await interaction.editReply(editOptions);
        }
    } else {
        await interaction.reply(options);
    }

    setTimeout(async () => {
        try {
            await interaction.deleteReply();
        } catch (error) {
            console.error("Failed to remove ephemeral message:", error);
        }
    }, delay);
}

async function addArchiveButton(channel: TextChannel, roles: Role[], includeButton: boolean): Promise<void> {
    const createTicketButton = new ButtonBuilder()
        .setCustomId(BUTTON_IDS.archiveTicket)
        .setLabel('Close ticket ✅')
        .setStyle(ButtonStyle.Success);
    let roleTxt = "";
    for (let i = 0; i < roles.length; i++) {
        if (i > 0) {
            roleTxt += " ";
        }
        roleTxt += roles[i].toString();
    }

    const content = includeButton ? `${roleTxt}\n\nHeya, let us know what is on your mind. \nOne of us will be with you soon\n\u200B` :
        `${roleTxt}\n\nThank you for applying to RAVAGE. Please introduce yourself (Main Class/Spec), detail your raiding experience and provide any relevant logs below + any additional info you think is relevant! 
        
An officer will respond to your application within 24 hours!`;
    const components = includeButton ? [{"type": 1, "components": [createTicketButton.toJSON()]}] : [];
    await channel.send({content, components});
}

function formatTicketName(displayName: string, channelPrefix: string): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

    const date = new Date();
    const dayNumber = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();

    let minutes = date.getMinutes() > 0 && date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    if (date.getMinutes() === 0) {
        minutes = '00'
    }

    return `${channelPrefix}-${displayName}-${months[date.getMonth()]}-${dayNumber}-${date.getHours()}H${minutes}M`.toLowerCase()
}

