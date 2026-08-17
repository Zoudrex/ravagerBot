import type { Client } from "discord.js";
import type Scheduler from "../schedulers/scheduler";

export type AppContext = {
    client: Client;
    scheduler: Scheduler;
};

let appContext: AppContext | undefined;

export function setAppContext(context: AppContext): void {
    appContext = context;
}

export function getAppContext(): AppContext {
    if (!appContext) {
        throw new Error("App context has not been initialized yet.");
    }

    return appContext;
}

export function getClient(): Client {
    return getAppContext().client;
}

export function getScheduler(): Scheduler {
    return getAppContext().scheduler;
}
