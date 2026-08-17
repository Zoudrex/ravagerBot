import type { Client } from "discord.js";

export function registerLifecycleHandlers(client: Client): void {
    client.on("shardDisconnect", (event, shardId) => {
        console.warn(`Shard ${shardId} disconnected (code ${event.code})`);
    });

    client.on("shardError", (error, shardId) => {
        console.error(`Shard ${shardId} error:`, error);
    });

    client.on("invalidated", () => {
        console.error("Bot session invalidated. Restarting...");
        process.exit(1);
    });

    client.on("disconnect", () => {
        console.warn("Bot disconnected. Exiting for restart...");
        process.exit(1);
    });

    setInterval(() => {
        if (!client.isReady()) {
            console.error("Bot not ready. Restarting...");
            process.exit(1);
        }
    }, 5 * 60 * 1000);
}
