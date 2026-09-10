import { BUTTON_IDS, CATEGORY_NAMES, CHANNEL_NAMES } from './guild';

export const DEPLOYED_MESSAGES = {
    tickets: {
        title: 'Ticket welcome message',
        channelName: CHANNEL_NAMES.tickets,
        categoryName: CATEGORY_NAMES.tickets,
        buttonId: BUTTON_IDS.createTicket,
        content: '🎟️ Got Questions? Need Help? 🎟️ \n' +
            '\n' +
            'Hey there! 👋 \nIf you have any questions or need assistance, don\'t hesitate to reach out! \n\n',
    },
    apply: {
        title: 'Guild application message',
        channelName: CHANNEL_NAMES.apply,
        categoryName: CATEGORY_NAMES.applicants,
        buttonId: BUTTON_IDS.createApplyTicket,
        content: "Welcome to RAVAGE Gaming's Discord. \n" +
            "\n" +
            "We are a CE WoW guild based on the Draenor Server\n" +
            "\n" +
            "Raid Days: Thursday & Sunday 20:00 - 23:00 Servertime (We raid Monday 20:00 - 23:00ST for the first 4 weeks of the tier) \n" +
            "\n" +
            "After CE we aim to keep raid days down to just Thursday 20:00 - 23:00 \n" +
            "\n" +
            "**Dragonflight**\n" +
            "Aberrus: 9/9M - Rank: 904\n" +
            "Amirdrassil: 9/9M - Rank: 770\n" +
            "\n" +
            "**The War Within**\n" +
            "Nerub-ar Palace: 8/8M - Rank: 596\n" +
            "Liberation of the Undermined: 8/8M - Rank: 753\n" +
            "Manaforge Omega: 8/8M - Rank: 591\n" +
            "\n" +
            "**Midnight**\n" +
            "VS/DR/MQD: 9/9M - Rank: 513\n" +
            "\n" +
            "You can find us on: \n" +
            "[Raider.io](https://raider.io/guilds/eu/draenor/RAVAGE)\n" +
            "[WarcraftLogs](https://www.warcraftlogs.com/guild/id/789457)\n" +
            "[WoWProgress](https://www.wowprogress.com/guild/eu/draenor/RAVAGE)\n" +
            "\n" +
            "If interested in applying to the guild or connecting with our officers please click the apply button below!\n\n\n\n" +
            " ",
    },
} as const;

export type DeployedMessageId = keyof typeof DEPLOYED_MESSAGES;
export const deployedMessageIds = Object.keys(DEPLOYED_MESSAGES) as DeployedMessageId[];

export function isDeployedMessageId(id: string): id is DeployedMessageId {
    return Object.prototype.hasOwnProperty.call(DEPLOYED_MESSAGES, id);
}

export function validateDeployedContent(content: unknown): asserts content is string {
    if (typeof content !== 'string' || !content.trim() || content.length > 2000) {
        throw new Error('Message text must contain 1–2,000 characters and cannot be blank.');
    }
}
