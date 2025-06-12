import {BaseInteraction} from "discord.js";
import botVars from "../bot";

/**
 * @returns false whenever provided roleName cannot be found.
 */
export function findRole(roleName: string, interaction: BaseInteraction) {
    const role = interaction.guild?.roles.cache.filter(role => role.name === roleName).first() ?? false;
    if(!role){
        throw Error(`${roleName} could not be found, contact Zoudrex. This shouldn't happen`);
    }

    return role;
}

export function findGuildRole(guildId: string, roleName: string) {
    const guild = botVars.client.guilds.cache.get(guildId);
    if(!guild) {
        throw Error(`The guild cannot be found ${guildId}`);
    }

    const role = guild.roles.cache.filter(role => role.name.toLowerCase() === roleName.toLowerCase()).first();
    if(!role) {
        throw Error(`${roleName} could not be found in ${guild.name}`);
    }

    return role;
}