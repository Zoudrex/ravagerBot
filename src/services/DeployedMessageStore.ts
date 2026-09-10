import fs from 'node:fs';
import path from 'node:path';
import { DeployedMessageId, deployedMessageIds, validateDeployedContent } from '../constants/deployedMessages';

export type DeployedMessageTarget = { guildId: string; channelId: string; messageId: string };
export type StoredDeployedMessage = { content: string; target?: DeployedMessageTarget };
export type DeployedMessageState = Partial<Record<DeployedMessageId, StoredDeployedMessage>>;

export default class DeployedMessageStore {
    constructor(private readonly filePath = path.resolve(process.cwd(), 'data', 'deployed-messages.json')) {}

    load(): DeployedMessageState {
        if (!fs.existsSync(this.filePath)) return {};
        // Fail closed on corrupt storage; never silently replace saved text.
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid deployed message storage.');
        const state: DeployedMessageState = {};
        for (const id of deployedMessageIds) {
            const entry = parsed[id];
            if (entry === undefined) continue;
            validateDeployedContent(entry?.content);
            if (entry.target && ['guildId', 'channelId', 'messageId'].some(key =>
                typeof entry.target[key] !== 'string' || !/^\d{1,20}$/.test(entry.target[key]))) {
                throw new Error('Invalid deployed message target.');
            }
            state[id] = {content: entry.content, ...(entry.target ? {target: entry.target} : {})};
        }
        return state;
    }

    save(state: DeployedMessageState): void {
        fs.mkdirSync(path.dirname(this.filePath), {recursive: true});
        const tempPath = `${this.filePath}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf8');
        fs.renameSync(tempPath, this.filePath);
    }
}
