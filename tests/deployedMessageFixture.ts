import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { ChannelType, Collection } from 'discord.js';
import { DEPLOYED_MESSAGES, deployedMessageIds } from '../src/constants/deployedMessages';
import DeployedMessageStore from '../src/services/DeployedMessageStore';
import { DeployedMessageService } from '../src/services/DeployedMessageService';

export function deployedMessageFixture() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ravager-deployed-messages-'));
    const file = path.join(directory, 'messages.json');
    const store = new DeployedMessageStore(file);
    const service = new DeployedMessageService(store);
    const edits: any[] = [];
    const channels = new Collection<string, any>();
    const messages: Record<string, any> = {};
    for (const [index, id] of deployedMessageIds.entries()) {
        const definition = DEPLOYED_MESSAGES[id];
        const channelId = String(10 + index);
        const message: any = {
            id: String(20 + index), channelId, guildId: '1', author: {id: '2'},
            content: definition.content, url: `https://discord.com/channels/1/${channelId}/${20 + index}`,
            components: [{components: [{customId: definition.buttonId}]}], flags: 4,
            edit: async (payload: any) => { edits.push({id, payload}); message.content = payload.content; return message; },
        };
        messages[id] = message;
        const history = new Collection([[message.id, message]]);
        channels.set(channelId, {
            id: channelId, type: ChannelType.GuildText, name: definition.channelName,
            parent: {name: definition.categoryName}, history,
            messages: {fetch: async (options: any) => {
                if (!options.message) return history;
                if (!history.has(options.message)) throw {code: 10008};
                assert.equal(options.force, true);
                return history.get(options.message);
            }},
        });
    }
    const guild: any = {id: '1', client: {user: {id: '2'}}, channels: {
        cache: channels,
        fetch: async (id?: string) => id ? channels.get(id) ?? null : channels,
    }};
    return {file, directory, store, service, guild, channels, messages, edits, cleanup: () => {
        assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep));
        fs.rmSync(directory, {recursive: true, force: true});
    }};
}
