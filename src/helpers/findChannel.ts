import botVars from "../bot";
import {TextChannel} from "discord.js";

/**
 * Finds a channel within the specified guild (based on guildId) based on their name.
 * Future possibility: Whenever deploying via /deploy, make it look for a channel that is specified by the user deploying it.
 * Store that in a DB but aint nobody got time for that.
 * @param channelName
 * @param guildId
 */
export default function findChannel(channelName: string, guildId: string) {
    // Ain't nobody got time for that.
    if (channelName === '' || guildId === '') {
        return false;
    }

    return (botVars.client
        .channels
        .cache
        .filter(channel => channel.type === 0 && channel.guildId === guildId && channel.name === channelName)
        .first() as TextChannel) ?? false;
}