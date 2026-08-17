import type { Interaction } from "discord.js";
import { routeInteraction } from "../interactions/interactionRouter";

export async function handleInteractionCreate(interaction: Interaction): Promise<void> {
    await routeInteraction(interaction);
}
