import type { Interaction } from "discord.js";
import { buttonInteractions, resolveButtonInteractionId } from "../buttonInteractions";
import { commands } from "../commands";
import { safeErrorReply } from "./safeReply";

export async function routeInteraction(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) {
        const command = commands[interaction.commandName];

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing /${interaction.commandName}:`, error);
            await safeErrorReply(interaction, `/${interaction.commandName}`);
        }

        return;
    }

    if (interaction.isButton()) {
        const customId = resolveButtonInteractionId(interaction.customId);
        const buttonInteraction = buttonInteractions[customId];

        if (!buttonInteraction) {
            console.error(`No button interaction matching ${interaction.customId} was found.`);
            return;
        }

        try {
            await buttonInteraction.execute(interaction);
        } catch (error) {
            console.error(`Error executing button ${interaction.customId}:`, error);
            await safeErrorReply(interaction, interaction.customId);
        }
    }
}
