import {
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle, CategoryChannel,
    ChannelType,
    GuildChannelManager,
    GuildMember, InteractionReplyOptions, MessagePayload,
    PermissionsBitField, Role, TextChannel
} from "discord.js";
import {findRole} from "../helpers/findRole";

export async function execute(interaction: ButtonInteraction, additionalRoles: string[]) {
    if (!interaction.guild) {
        return interaction.reply('How...?');
    }

    const rolesToFind = ["TicketOfficer", ...additionalRoles];
    const roles: Role[] = [];

    const channelManager = interaction.guild.channels
    const category = await findCategory(channelManager)

    const member = interaction.member as GuildMember
    const ticketName = formatTicketName(member.displayName);

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
        return interaction.reply({content: e.message, ephemeral: true});
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

    await addArchiveButton(channel, roles);
    await sendAutoDeleteEphemeral(interaction, {
        content: `Your ticket has been created. ${channel}`,
        ephemeral: true
    });

    return;
}

async function sendAutoDeleteEphemeral(interaction: ButtonInteraction, options: string | MessagePayload | InteractionReplyOptions, delay: number = 7500): Promise<void> {
    const deleteEphemeral = await interaction.reply(options);
    setTimeout(async () => {
        try {
            await deleteEphemeral.delete();
        } catch (error) {
            console.error("Failed to remove ephemeral message:", error);
        }
    }, delay);
}

async function addArchiveButton(channel: TextChannel, roles: Role[]): Promise<void> {
    const createTicketButton = new ButtonBuilder()
        .setCustomId('archiveTicket')
        .setLabel('Close ticket ✅')
        .setStyle(ButtonStyle.Success);
    let roleTxt = "";
    for (let i = 0; i < roles.length; i++) {
        if (i > 0) {
            roleTxt += " ";
        }
        roleTxt += roles[i].toString();
    }

    await channel.send({
        content: `${roleTxt}\n\nHeya, let us know what is on your mind. \nOne of us will be with you soon\n\u200B`,
        components: [{"type": 1, "components": [createTicketButton.toJSON()]}]
    });
}

function formatTicketName(displayName: string): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

    const date = new Date();
    const dayNumber = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();

    let minutes = date.getMinutes() > 0 && date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    if (date.getMinutes() === 0) {
        minutes = '00'
    }

    return `ticket-${displayName}-${months[date.getMonth()]}-${dayNumber}-${date.getHours()}H${minutes}M`.toLowerCase()
}

async function findCategory(channelManager: GuildChannelManager): Promise<CategoryChannel> {
    const categoryName = 'tickets';
    let category = channelManager.cache
        .filter(val => val.name === categoryName && val.type === ChannelType.GuildCategory)
        .first() as CategoryChannel

    // In case the category doesn't exist, create it.
    if (!category) {
        category = await channelManager.create({
            type: ChannelType.GuildCategory,
            name: categoryName,
            position: 0
        })
    }

    return category;
}