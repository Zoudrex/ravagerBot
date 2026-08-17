import { setAppContext } from "./app/context";
import { config } from "./config";
import { createClient } from "./discord/createClient";
import { registerEventHandlers } from "./events";
import Scheduler from "./schedulers/scheduler";

const client = createClient();
const scheduler = new Scheduler();

const context = { client, scheduler };

setAppContext(context);
registerEventHandlers(client, context);

client.login(config.DISCORD_TOKEN).catch((error) => {
    console.error("Failed to login to Discord:", error);
    process.exit(1);
});
