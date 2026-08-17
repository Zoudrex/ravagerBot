import {
    CategoryChannel,
    ChannelType,
    GuildChannelManager,
    PermissionsBitField,
} from "discord.js";

export async function findOrCreateCategory(
    channelManager: GuildChannelManager,
    categoryName: string,
    hiddenRoleId?: string
): Promise<CategoryChannel> {
    let category = channelManager.cache
        .filter(val => val.name === categoryName && val.type === ChannelType.GuildCategory)
        .first() as CategoryChannel | undefined;

    if (!category) {
        category = await channelManager.create({
            type: ChannelType.GuildCategory,
            name: categoryName,
            position: 0,
            permissionOverwrites: hiddenRoleId ? [{
                id: hiddenRoleId,
                deny: [PermissionsBitField.Flags.ViewChannel],
            }] : undefined
        });
    } else if (hiddenRoleId) {
        await category.permissionOverwrites.edit(hiddenRoleId, {
            ViewChannel: false,
        });
    }

    return category;
}
