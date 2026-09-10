import { Router } from 'express';
import type { Guild } from 'discord.js';
import { isDeployedMessageId, validateDeployedContent } from '../constants/deployedMessages';
import { DeployedMessageConflict, DeployedMessageService } from '../services/DeployedMessageService';

export function createDeployedMessageRouter(service: DeployedMessageService, getGuild: () => Promise<Guild>): Router {
    const router = Router();
    router.get('/', async (_req, res) => {
        try {
            res.json({messages: await service.list(await getGuild())});
        } catch (error) {
            console.error('Failed to load deployed messages:', error);
            res.status(503).json({error: 'Could not load channel messages. Check the bot connection and server storage, then reload.'});
        }
    });
    router.put('/:id', async (req, res) => {
        const id = req.params.id;
        if (!isDeployedMessageId(id)) return res.status(404).json({error: 'Unknown channel message.'});
        const {content, expectedContent} = req.body ?? {};
        try {
            validateDeployedContent(content);
            if (typeof expectedContent !== 'string') throw new Error('Reload the message before saving.');
        } catch (error) {
            return res.status(400).json({error: (error as Error).message});
        }
        try {
            return res.json(await service.update(await getGuild(), id, content, expectedContent));
        } catch (error) {
            console.error(`Failed to save deployed message ${id}:`, error);
            if (error instanceof DeployedMessageConflict) return res.status(409).json({error: error.message});
            return res.status(503).json({error: 'Could not save this message. Check the bot connection and server storage, then retry.'});
        }
    });
    return router;
}
