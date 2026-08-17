import {
    ButtonInteraction,
    CategoryChannel,
    CategoryChildChannel,
    ChannelType, Collection,
    GuildMember,
    Message,
    TextChannel
} from "discord.js";
import { CATEGORY_NAMES } from "../constants/guild";

export async function execute(interaction: ButtonInteraction) {
    if (!interaction.guild || !interaction.channel) {
        return interaction.reply('How...? How are you clicking a button outside of the server..?');
    }

    await interaction.deferReply({ephemeral: true});

    const channel = interaction.channel as TextChannel;
    let category = interaction.guild.channels.cache.find(
        val => val.name === CATEGORY_NAMES.ticketArchive && val.type === ChannelType.GuildCategory
    ) as CategoryChannel | undefined;
    const categoryName = CATEGORY_NAMES.ticketArchive;

    // In case the category doesn't exist, create it.
    if (!category) {
        category = await interaction.guild.channels.create({
            type: ChannelType.GuildCategory,
            name: categoryName,
            position: 9999 // always at the bottom
        })
    }

    if (category.children.cache.size >= 40) {
        await deleteOldestTicket(category.children.cache);
    }

    const member = interaction.member as GuildMember
    const botMessagesWithComponents = await findBotComponentMessages(channel, interaction.client.user?.id);

    const editResults = await Promise.allSettled(botMessagesWithComponents.map(message =>
        message.edit({content: `This ticket has been closed by ${member}.`, components: []})
    ));

    editResults
        .filter(result => result.status === "rejected")
        .forEach(result => console.warn("Failed to edit archived ticket message:", result.reason));

    await channel.setParent(category, {lockPermissions: false});
    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {SendMessages: false})

    return interaction.editReply({content: `Y E E T`})
}

async function deleteOldestTicket(tickets: Collection<string, CategoryChildChannel>) {
    const reduced = tickets.reduce((min, item) =>
        BigInt(item.id) < BigInt(min.id) ? item : min
    );

    await reduced.delete();
}

async function findBotComponentMessages(channel: TextChannel, botId?: string): Promise<Message[]> {
    if (!botId) {
        return [];
    }

    const matches: Message[] = [];
    let before: string | undefined;

    do {
        const messages = await channel.messages.fetch({limit: 100, before});

        messages
            .filter(message => message.author.id === botId && message.components.length > 0)
            .each(message => matches.push(message));

        before = messages.last()?.id;

        if (matches.length > 0 || messages.size < 100) {
            break;
        }
    } while (before);

    return matches;
}
