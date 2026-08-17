import type { Client } from "discord.js";
import { startAdminApi } from "../admin/adminApi";
import { deployCommands } from "../commands/deploy-commands";
import { config } from "../config";
import { assignSocialRoleToExistingMembers } from "../services/assignSocialRole";
import type Scheduler from "../schedulers/scheduler";

export async function handleReady(client: Client, scheduler: Scheduler): Promise<void> {
    scheduler.start();
    startAdminApi(scheduler);
    await refreshBotCommands();
    await assignSocialRoleToExistingMembers(client);
    console.log("Discord bot is ready!");
}

async function refreshBotCommands(): Promise<void> {
    await deployCommands({ guildId: config.SERVER_ID });
}
