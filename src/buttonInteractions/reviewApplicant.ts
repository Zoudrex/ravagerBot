import { ButtonInteraction } from "discord.js";
import { processApplicantDecision, ReviewContext, reviewErrorMessage } from "../services/applicantReview";

export function reviewButtonId(context: ReviewContext, accepted: boolean): string {
    // Four snowflakes plus the prefix/decision/separators fit within 100 characters.
    return `review:${accepted ? "a" : "d"}:${context.channelId}:${context.messageId}:${context.applicantId}:${context.officerId}`;
}

export async function execute(interaction: ButtonInteraction): Promise<void> {
    const match = /^review:([ad]):(\d{1,20}):(\d{1,20}):(\d{1,20}):(\d{1,20})$/.exec(interaction.customId);
    if (!match || !interaction.guild || match[2] !== interaction.channelId || match[5] !== interaction.user.id || !interaction.message.flags.has("Ephemeral")) {
        await interaction.reply({content: "This review is invalid or belongs to another Officer. Run /review yourself.", ephemeral: true});
        return;
    }
    await interaction.deferUpdate();
    const context: ReviewContext = {channelId: match[2], messageId: match[3], applicantId: match[4], officerId: match[5]};
    try {
        await processApplicantDecision(interaction.guild, context, match[1] === "a");
        await interaction.editReply({
            content: `${match[1] === "a" ? "Accepted" : "Declined"} <@${context.applicantId}>\n\nHandled by <@${context.officerId}>`,
            embeds: [], components: [], allowedMentions: {parse: []},
        });
    } catch (error) {
        console.error("Error processing applicant review:", error);
        await interaction.editReply({content: reviewErrorMessage(error), embeds: [], components: [], allowedMentions: {parse: []}});
    }
}
