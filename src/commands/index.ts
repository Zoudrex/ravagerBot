import * as ping from "./ping";
import * as deploy from "./deployChannels"
import * as cancelraid from "./cancelRaid"
import * as nextraid from "./nextRaid"
import * as review from "./applicants/review"
import type { SlashCommand } from "../interactions/types";

const commandList: SlashCommand[] = [
    ping,
    deploy,
    cancelraid,
    nextraid,
    review
];

export const commands: Record<string, SlashCommand> = Object.fromEntries(
    commandList.map(command => [command.data.name, command])
);
