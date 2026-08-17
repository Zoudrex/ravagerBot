import { Events, type Client } from "discord.js";
import type { AppContext } from "../app/context";
import { handleInteractionCreate } from "./interactionCreate";
import { registerLifecycleHandlers } from "./lifecycle";
import { handleReady } from "./ready";

export function registerEventHandlers(client: Client, context: AppContext): void {
    client.once(Events.ClientReady, async () => {
        try {
            await handleReady(client, context.scheduler);
        } catch (error) {
            console.error("Failed to initialize bot after ready:", error);
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        await handleInteractionCreate(interaction);
    });

    registerLifecycleHandlers(client);
}
