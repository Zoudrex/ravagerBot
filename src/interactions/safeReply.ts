import type {
    ButtonInteraction,
    ChatInputCommandInteraction,
    InteractionReplyOptions,
    MessagePayload,
} from "discord.js";

type RepliableInteraction = ChatInputCommandInteraction | ButtonInteraction;

export async function safeReply(
    interaction: RepliableInteraction,
    options: string | MessagePayload | InteractionReplyOptions
): Promise<void> {
    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(options);
            return;
        }

        await interaction.reply(options);
    } catch (error) {
        console.error("Failed to send interaction response:", error);
    }
}

export async function safeErrorReply(
    interaction: RepliableInteraction,
    actionName: string
): Promise<void> {
    await safeReply(interaction, {
        content: `Something went wrong while running ${actionName}.`,
        ephemeral: true,
    });
}
