import {
    CommandInteraction,
    GuildMember,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
    OverwriteType, Guild, Role
} from "discord.js";
import {config} from "../../config";

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

export async function execute(interaction: CommandInteraction) {
    console.log("executing");
    const member = interaction.member as GuildMember;
    const allowedRoles = ['GM', 'Assistant GM', 'Recruitment'];
    const intersection = member.roles.cache.filter(role => allowedRoles.includes(role.name));
    if (!interaction.guild || intersection.size === 0) {
        return interaction.reply(`You're not allowed to do this.`);
    }

    const applicantHandled = await handleApplicant(interaction);
    if (!applicantHandled) {
        console.log("DId not get handled", applicantHandled);
        await interaction.reply({content: "This command can only be ran in an applicant channel", ephemeral: true});
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

async function handleApplicant(interaction: CommandInteraction) {
    const channel = interaction.channel as TextChannel;
    if (channel.parent?.name !== "ꓮpplicants") {
        return false;
    }
    // Find the applicant for the channel the interaction happened in
    const applicant = await findApplicant(channel);
    if (!applicant) {
        console.log("Couldn't find applicant");
        await interaction.reply({content: "done", ephemeral: true});
        await channel.delete("Applicant no longer exists");
        return true;
    }

    // @ts-ignore
    const accepted = interaction.options.getBoolean("accept");
    await interaction.guild?.roles.fetch()
    const raiderRole = interaction.guild?.roles.cache.find(role => role.name === config.RAIDER_ROLE_NAME);
    const applicantRole = interaction.guild?.roles.cache.find(role => role.name === config.APPLICANT_ROLE_NAME) as Role;
    console.log("Removing applicant");
    applicant.roles.remove(applicantRole);
    if (accepted && raiderRole) {
        console.log("Assigning raider");
        applicant.roles.add(raiderRole);
    }

    console.log("All done, deleting channel");
    await interaction.reply({content: "done", ephemeral: true});
    await channel.delete("Applicant no longer exists");
    return true;
}