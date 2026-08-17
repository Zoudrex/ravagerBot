import { startAdminApi } from "../admin/adminApi";
import { deployCommands } from "../commands/deploy-commands";
import { config } from "../config";
import type Scheduler from "../schedulers/scheduler";

export async function handleReady(scheduler: Scheduler): Promise<void> {
    scheduler.start();
    startAdminApi(scheduler);
    await refreshBotCommands();
    console.log("Discord bot is ready!");
}

async function refreshBotCommands(): Promise<void> {
    await deployCommands({ guildId: config.SERVER_ID });
}
