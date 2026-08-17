import {
    GuildMember,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
    OverwriteType,
    Role,
    ChatInputCommandInteraction
} from "discord.js";
import {config} from "../../config";
import { CATEGORY_NAMES, STAFF_ROLES } from "../../constants/guild";

export const data = new SlashCommandBuilder()
    .setName('handleapplicant')
    .setDescription('Handles the applicant of the currently open ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(option =>
        option
            .setName('accept')
            .setDescription('True to accept, false to deny')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('message')
            .setDescription('Message that is sent to the applicant when denied')
            .setRequired(false)
    )

export async function execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const intersection = member.roles.cache.filter(role => STAFF_ROLES.includes(role.name));
    if (!interaction.guild || intersection.size === 0) {
        return interaction.reply(`You're not allowed to do this.`);
    }
    await interaction.deferReply({ephemeral: true});
    const applicantHandled = await handleApplicant(interaction);
    if (!applicantHandled) {
        await interaction.editReply({content: "This command can only be ran in an applicant channel"});
    }
}

export async function findApplicant(channel: TextChannel) {
    const memberOverwrite = channel.permissionOverwrites.cache.find(
        (overwrite) => overwrite.type === OverwriteType.Member
    );

    if (!memberOverwrite) return false;

    await channel.guild.members.fetch();
    return channel.guild.members.cache.get(memberOverwrite.id) || false;
}

async function handleApplicant(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        return false;
    }

    const channel = interaction.channel as TextChannel;
    if (channel.parent?.name !== CATEGORY_NAMES.applicants) {
        return false;
    }
    // Find the applicant for the channel the interaction happened in
    const applicant = await findApplicant(channel);
    if (!applicant) {
        console.log("Couldn't find applicant");
        await interaction.editReply("done");
        await channel.delete("Applicant no longer exists");
        return true;
    }

    const accepted = interaction.options.getBoolean("accept");
    const message = interaction.options.getString("message");
    await interaction.guild.roles.fetch()
    const raiderRole = interaction.guild?.roles.cache.find(role => role.name === config.RAIDER_ROLE_NAME);
    const applicantRole = interaction.guild?.roles.cache.find(role => role.name === config.APPLICANT_ROLE_NAME);

    if (!applicantRole) {
        await interaction.editReply("Applicant role could not be found. No changes were made.");
        return true;
    }

    if (accepted && !raiderRole) {
        await interaction.editReply("Raider role could not be found. No changes were made.");
        return true;
    }

    try {
        await applicant.roles.remove(applicantRole);

        if (accepted && raiderRole) {
            await applicant.roles.add(raiderRole);
        }

        if (!accepted) {
            const baseMessage = 'Hi, I\'m sorry to inform you that you\'ve been declined for your application to RAVAGE.';

            try {
                await applicant.send(message ? `${baseMessage} Reason: ${message}` : baseMessage);
            } catch (error) {
                console.warn(`Could not DM declined applicant ${applicant.id}:`, error);
            }

            await applicant.kick('Application declined');
        }

        await interaction.editReply("done");
        await channel.delete("Applicant handled");
    } catch (error) {
        console.error(`Failed to handle applicant ${applicant.id}:`, error);
        await interaction.editReply("Something went wrong while handling this applicant. No channel cleanup was performed.");
    }

    return true;
}
