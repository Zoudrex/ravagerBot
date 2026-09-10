import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { findChannelApplicantId, getReviewChannel, reviewErrorMessage } from "../../services/applicantReview";
import { reviewButtonId } from "../../buttonInteractions/reviewApplicant";

export const data = new SlashCommandBuilder()
    .setName("review")
    .setDescription("Review the applicant in this channel with Accept or Decline")
    .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ephemeral: true});
    try {
        const channel = await getReviewChannel(interaction.guild, interaction.channelId, interaction.user.id);
        const applicantId = findChannelApplicantId(channel);
        const context = {channelId: channel.id, applicantId, officerId: interaction.user.id};
        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(reviewButtonId(context, true)).setLabel("Accept").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(reviewButtonId(context, false)).setLabel("Decline").setStyle(ButtonStyle.Danger),
        );
        await interaction.editReply({
            content: `Review applicant <@${applicantId}>`,
            components: [buttons], allowedMentions: {parse: []},
        });
    } catch (error) {
        console.error("Error opening applicant review:", error);
        await interaction.editReply({content: reviewErrorMessage(error), embeds: [], components: []});
    }
}
