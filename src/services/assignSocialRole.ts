import type { Client, GuildMember } from "discord.js";
import { config } from "../config";
import { ROLE_NAMES } from "../constants/guild";

export async function assignSocialRoleToExistingMembers(client: Client): Promise<void> {
    try {
        const guild = client.guilds.cache.get(config.SERVER_ID) ?? await client.guilds.fetch(config.SERVER_ID);

        await guild.roles.fetch();
        const socialRole = guild.roles.cache.find(role => role.name === ROLE_NAMES.social);

        if (!socialRole) {
            console.warn(`${ROLE_NAMES.social} role could not be found in ${guild.name}.`);
            return;
        }

        const members = await guild.members.fetch();
        const membersWithoutSocial = members.filter(member =>
            !member.user.bot && !member.roles.cache.has(socialRole.id)
        );

        console.log(`Assigning ${ROLE_NAMES.social} role to ${membersWithoutSocial.size} members.`);

        for (const member of membersWithoutSocial.values()) {
            await assignSocialRole(member, socialRole.id);
        }
    } catch (error) {
        console.error(`Failed to run ${ROLE_NAMES.social} role startup sync:`, error);
    }
}

async function assignSocialRole(member: GuildMember, roleId: string): Promise<void> {
    try {
        await member.roles.add(roleId, "Startup sync: ensure existing members have Social role");
    } catch (error) {
        console.error(`Failed to assign Social role to ${member.user.tag} (${member.id}):`, error);
    }
}
