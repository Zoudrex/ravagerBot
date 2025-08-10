import {
    CommandInteraction,
    GuildMember,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
    OverwriteType, Guild, Role, ChatInputCommandInteraction
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
    .addStringOption(option =>
        option
            .setName('message')
            .setDescription('Message that is sent to the applicant when denied')
            .setRequired(false)
    )

export async function execute(interaction: ChatInputCommandInteraction) {
    console.log("executing");
    const member = interaction.member as GuildMember;
    const allowedRoles = ['GM', 'Assistant GM', 'Recruitment'];
    const intersection = member.roles.cache.filter(role => allowedRoles.includes(role.name));
    if (!interaction.guild || intersection.size === 0) {
        return interaction.reply(`You're not allowed to do this.`);
    }
    await interaction.deferReply({ ephemeral: true });
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
    const channel = interaction.channel as TextChannel;
    if (channel.parent?.name !== "ꓮpplicants") {
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
    await interaction.guild?.roles.fetch()
    const raiderRole = interaction.guild?.roles.cache.find(role => role.name === config.RAIDER_ROLE_NAME);
    const applicantRole = interaction.guild?.roles.cache.find(role => role.name === config.APPLICANT_ROLE_NAME) as Role;
    console.log("Removing applicant");
    await applicant.roles.remove(applicantRole);
    if (accepted && raiderRole) {
        console.log("Assigning raider");
        await applicant.roles.add(raiderRole);
    }

    if (!accepted) {
        const baseMessage = 'Hi, I\'m sorry to inform you that you\'ve been declined for your application to RAVAGE.';
        await applicant.send(message ? baseMessage + 'Reason: ' + message : baseMessage);
        await applicant.kick();
    }

    console.log("All done, deleting channel");
    await interaction.editReply("done");
    await channel.delete("Applicant no longer exists");
    return true;
}