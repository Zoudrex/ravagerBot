import * as createTicket from "./createTicketButton";
import * as archiveTicket from "./archiveTicket";
import { BUTTON_IDS } from "../constants/guild";
import type { ButtonInteractionHandler } from "../interactions/types";

const buttonInteractionAliases: Record<string, string> = {
    [BUTTON_IDS.createApplyTicket]: BUTTON_IDS.createTicket,
};

export const buttonInteractions: Record<string, ButtonInteractionHandler> = {
    createTicket,
    archiveTicket,
};

export function resolveButtonInteractionId(customId: string): string {
    return buttonInteractionAliases[customId] ?? customId;
}
