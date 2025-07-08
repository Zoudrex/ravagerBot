import {
    ButtonInteraction,
    CategoryChildChannel,
    ChannelType, Collection,
    GuildBasedChannel,
    GuildMember,
    TextChannel
} from "discord.js";

const monthMap: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    june: 5,
    july: 6,
    aug: 7,
    sept: 8,
    oct: 9,
    nov: 10,
    dec: 11,
};

interface ParsedTicket {
    id: CategoryChildChannel;
    date: Date;
}

export async function execute(interaction: ButtonInteraction) {
    if (!interaction.guild || !interaction.channel) {
        return interaction.reply('How...? How are you clicking a button outside of the server..?');
    }

    const channel = interaction.channel as TextChannel;
    let category: GuildBasedChannel | null = null;
    const categoryName = 'ticket-archive'
    interaction.guild.channels.cache.each(val => {
        if (val.name === categoryName && val.type === ChannelType.GuildCategory) {
            category = val;
            return true;
        }
    })

    // In case the category doesn't exist, create it.
    if (!category) {
        category = await interaction.guild.channels.create({
            type: ChannelType.GuildCategory,
            name: categoryName,
            position: 9999 // always at the bottom
        })
    }

    if(category.children.cache.size >= 50) {
        await deleteOldestTicket(category.children.cache);
    }

    const member = interaction.member as GuildMember
    channel.messages.cache.each(message => {
        if (message.author.bot){
            message.edit({content: `This ticket has been closed by ${member}.`, components: []})
        }
    })
    await channel.setParent(category, {lockPermissions: false});
    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { SendMessages: false })

    return interaction.reply({content: `Y E E T`, ephemeral: true})
}

async function deleteOldestTicket(tickets: Collection<string, CategoryChildChannel>) {
    const parsedTickets: ParsedTicket[] = [];
    tickets.each(ticket => {
        parsedTickets.push({
            id: ticket,
            date: parseDateFromTicket(ticket.name)
        })
        console.log(parsedTickets);
    })

    parsedTickets.sort((ticket1, ticket2) => ticket1.date.getTime() - ticket2.date.getTime());
    await parsedTickets[0].id.delete();
}

function parseDateFromTicket(ticket: string): Date {
    // Match the last part of the string: {month}-{day}-{hour}h{minute}m
    const regex = /([a-z]{3,4})-(\d{1,2})-(\d{1,2})h(\d{1,2})m$/i;
    const match = ticket.match(regex);

    if (!match) throw Error("no match found, shouldn't happen");

    const [, monthStr, dayStr, hourStr, minuteStr] = match;
    const month = monthMap[monthStr.toLowerCase()];

    const day = parseInt(dayStr, 10);
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    const year = new Date().getFullYear(); // Or use a different strategy
    console.log(year, month, day, hour, minute);
    return new Date(year, month, day, hour, minute);
}