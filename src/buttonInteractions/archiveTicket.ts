import {ButtonInteraction, ChannelType, GuildBasedChannel, GuildMember, TextChannel} from "discord.js";

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