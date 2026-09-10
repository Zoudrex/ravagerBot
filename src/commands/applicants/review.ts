import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { findLatestUserMessage, getReviewChannel, reviewErrorMessage } from "../../services/applicantReview";
import { reviewButtonId } from "../../buttonInteractions/reviewApplicant";

export const data = new SlashCommandBuilder()
    .setName("review")
    .setDescription("Review the latest applicant message with Accept or Decline")
    .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ephemeral: true});
    try {
        const channel = await getReviewChannel(interaction.guild, interaction.channelId, interaction.user.id);
        const message = await findLatestUserMessage(channel);
        if (!message) {
            await interaction.editReply("No suitable user-authored message was found in this applicant channel.");
            return;
        }
        const context = {channelId: channel.id, messageId: message.id, applicantId: message.author.id, officerId: interaction.user.id};
        // Up to 4,000 characters for premium users; split longer content without
        // losing the author's message or exceeding Discord embed limits.
        const content = message.content || "(No text content; view the original message for attachments.)";
        const embeds = [new EmbedBuilder().setDescription(content.slice(0, 4096))];
        if (content.length > 4096) embeds.push(new EmbedBuilder().setDescription(content.slice(4096, 5500)));
        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(reviewButtonId(context, true)).setLabel("Accept").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(reviewButtonId(context, false)).setLabel("Decline").setStyle(ButtonStyle.Danger),
        );
        await interaction.editReply({
            content: `Review applicant <@${message.author.id}>\n\n[View original message](${message.url})`,
            embeds, components: [buttons], allowedMentions: {parse: []},
        });
    } catch (error) {
        console.error("Error opening applicant review:", error);
        await interaction.editReply({content: reviewErrorMessage(error), embeds: [], components: []});
    }
}
