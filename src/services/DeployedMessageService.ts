import { ChannelType, Guild, Message } from 'discord.js';
import { DEPLOYED_MESSAGES, DeployedMessageId, deployedMessageIds, validateDeployedContent } from '../constants/deployedMessages';
import DeployedMessageStore, { StoredDeployedMessage } from './DeployedMessageStore';

export class DeployedMessageConflict extends Error {}

export type DeployedMessageView = {
    id: DeployedMessageId;
    title: string;
    channelName: string;
    content: string;
    synced: boolean;
    status: string;
    url?: string;
};

export class DeployedMessageService {
    private pending: Promise<unknown> = Promise.resolve();

    constructor(private readonly store = new DeployedMessageStore()) {}

    // Serialize /deploy and admin operations so a save cannot race channel
    // recreation or overwrite another message's stored configuration.
    async exclusive<T>(action: () => Promise<T>): Promise<T> {
        const result = this.pending.then(action);
        this.pending = result.catch(() => {});
        return result;
    }

    getContent(id: DeployedMessageId): string {
        return this.store.load()[id]?.content ?? DEPLOYED_MESSAGES[id].content;
    }

    // Called within the deployment lock after Discord successfully sends a message.
    remember(id: DeployedMessageId, message: Message): void {
        const state = this.store.load();
        state[id] = {content: message.content, target: {guildId: message.guildId!, channelId: message.channelId, messageId: message.id}};
        this.store.save(state);
    }

    list(guild: Guild): Promise<DeployedMessageView[]> {
        return this.exclusive(async () => {
            const views: DeployedMessageView[] = [];
            for (const id of deployedMessageIds) {
                const state = this.store.load();
                const entry = state[id];
                try {
                    const message = await this.findMessage(guild, id, entry);
                    // Adopt existing deployed text on first use, including manual
                    // Discord edits. Subsequent loads preserve the saved template.
                    const content = entry?.content ?? message.content;
                    validateDeployedContent(content);
                    state[id] = {content, target: {guildId: guild.id, channelId: message.channelId, messageId: message.id}};
                    this.store.save(state);
                    views.push(this.view(id, content, message.content === content, message.url));
                } catch (error) {
                    console.error(`Failed to load deployed message ${id}:`, error);
                    views.push(this.view(id, entry?.content ?? DEPLOYED_MESSAGES[id].content, false, undefined, this.syncError(error)));
                }
            }
            return views;
        });
    }

    update(guild: Guild, id: DeployedMessageId, content: string, expectedContent: string): Promise<DeployedMessageView> {
        validateDeployedContent(content);
        return this.exclusive(async () => {
            const state = this.store.load();
            const entry = state[id];
            if ((entry?.content ?? DEPLOYED_MESSAGES[id].content) !== expectedContent) {
                throw new DeployedMessageConflict('This message was changed in another session. Reload the page before saving.');
            }
            // Persist first: a temporary Discord failure must not lose the edit.
            state[id] = { ...entry, content };
            this.store.save(state);
            try {
                const message = await this.findMessage(guild, id, entry);
                // Omit components/embeds/flags to preserve existing controls and
                // application-message link suppression. Never send a replacement.
                await message.edit({content, allowedMentions: {parse: []}});
                state[id] = {content, target: {guildId: guild.id, channelId: message.channelId, messageId: message.id}};
                this.store.save(state);
                return this.view(id, content, true, message.url);
            } catch (error) {
                console.error(`Saved deployed message ${id}, but could not synchronize Discord:`, error);
                return this.view(id, content, false, undefined, `Saved on server. ${this.syncError(error)}`);
            }
        });
    }

    private view(id: DeployedMessageId, content: string, synced: boolean, url?: string, status?: string): DeployedMessageView {
        return {id, title: DEPLOYED_MESSAGES[id].title, channelName: DEPLOYED_MESSAGES[id].channelName,
            content, synced, url, status: status ?? (synced ? 'Saved and up to date in Discord.' : 'Saved text differs from Discord. Save to update the message.')};
    }

    private matches(message: Message, id: DeployedMessageId, guild: Guild): boolean {
        return message.author.id === guild.client.user!.id && message.components.some(row =>
            'components' in row && row.components.some(component =>
                'customId' in component && component.customId === DEPLOYED_MESSAGES[id].buttonId));
    }

    private async findMessage(guild: Guild, id: DeployedMessageId, entry?: StoredDeployedMessage): Promise<Message> {
        if (entry?.target?.guildId === guild.id) {
            try {
                const channel = await guild.channels.fetch(entry.target.channelId, {force: true});
                if (channel?.type === ChannelType.GuildText) {
                    const message = await channel.messages.fetch({message: entry.target.messageId, force: true});
                    if (!this.matches(message, id, guild)) throw new Error('The tracked message no longer has the expected bot controls. Run /deploy to recreate it.');
                    return message;
                }
            } catch (error) {
                if (![10003, 10008].includes((error as {code: number}).code)) throw error;
            }
        }

        // Migration for messages posted before IDs were stored. Match the bot,
        // deployed channel/category and exact button; never edit arbitrary posts.
        const channels = await guild.channels.fetch();
        const matches: Message[] = [];
        for (const channel of channels.values()) {
            if (channel?.type !== ChannelType.GuildText || channel.name !== DEPLOYED_MESSAGES[id].channelName ||
                channel.parent?.name !== DEPLOYED_MESSAGES[id].categoryName) continue;
            let before: string | undefined;
            while (true) {
                const messages = await channel.messages.fetch({limit: 100, before});
                matches.push(...messages.filter(message => this.matches(message, id, guild)).values());
                if (matches.length > 1) throw new Error('Multiple matching deployed messages were found. Resolve the duplicate channels/messages before saving.');
                if (messages.size < 100) break;
                const oldest = [...messages.keys()].reduce((a, b) => BigInt(a) < BigInt(b) ? a : b);
                if (oldest === before) break;
                before = oldest;
            }
        }
        if (!matches[0]) throw new Error('No deployed message found. Run /deploy to publish the saved text.');
        return matches[0];
    }

    private syncError(error: unknown): string {
        const code = (error as {code?: number} | null)?.code;
        if (code === 50001 || code === 50013) return 'Discord update unavailable: check the bot’s channel access and message permissions, then retry.';
        if (error instanceof Error && !code) return error.message;
        return 'Discord update failed. Check the bot connection and retry.';
    }
}

export const deployedMessageService = new DeployedMessageService();
