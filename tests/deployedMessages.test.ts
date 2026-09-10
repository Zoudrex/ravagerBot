import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { ChannelType, Collection, Message } from 'discord.js';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { DEPLOYED_MESSAGES, DeployedMessageId, validateDeployedContent } from '../src/constants/deployedMessages';
import DeployedMessageStore from '../src/services/DeployedMessageStore';
import { DeployedMessageService } from '../src/services/DeployedMessageService';
import { createDeployedMessageRouter } from '../src/admin/deployedMessageApi';
import { deployedMessageFixture } from './deployedMessageFixture';

test('default texts fit Discord limits; first load adopts existing deployed messages without posting', async t => {
    const f = deployedMessageFixture(); t.after(f.cleanup);
    for (const definition of Object.values(DEPLOYED_MESSAGES)) validateDeployedContent(definition.content);
    f.messages.apply.content = 'Manually edited guild announcement';
    const views = await f.service.list(f.guild);
    assert.equal(views.length, 2);
    assert.equal(views[1].content, f.messages.apply.content);
    assert.ok(views.every(view => view.synced && view.url));
    assert.deepEqual(f.edits, []);
    assert.equal(new DeployedMessageStore(f.file).load().apply?.target?.messageId, '21');
});

test('saving edits the same message, keeps controls/flags, and survives a service restart', async t => {
    const f = deployedMessageFixture(); t.after(f.cleanup);
    const [original] = await f.service.list(f.guild);
    const components = f.messages.tickets.components;
    const result = await f.service.update(f.guild, 'tickets', 'New **welcome** text', original.content);
    assert.equal(result.synced, true);
    assert.deepEqual(f.edits, [{id: 'tickets', payload: {content: 'New **welcome** text', allowedMentions: {parse: []}}}]);
    assert.equal(f.messages.tickets.components, components);
    assert.equal(f.messages.tickets.flags, 4);
    const restarted = new DeployedMessageService(new DeployedMessageStore(f.file));
    assert.equal(restarted.getContent('tickets'), 'New **welcome** text');
    assert.equal((await restarted.list(f.guild))[0].synced, true);
});

test('tracked IDs work after a channel rename and saved text is not overwritten by Discord drift', async t => {
    const f = deployedMessageFixture(); t.after(f.cleanup);
    await f.service.list(f.guild);
    f.channels.get('10').name = 'renamed';
    f.messages.tickets.content = 'External edit';
    const [view] = await f.service.list(f.guild);
    assert.equal(view.content, DEPLOYED_MESSAGES.tickets.content);
    assert.equal(view.synced, false);
    const result = await f.service.update(f.guild, 'tickets', 'Desired text', view.content);
    assert.equal(result.synced, true);
    assert.equal(f.edits.length, 1);
});

test('failed Discord edit retains server text and can be retried without creating a post', async t => {
    const f = deployedMessageFixture(); t.after(f.cleanup);
    const [original] = await f.service.list(f.guild);
    const edit = f.messages.tickets.edit;
    f.messages.tickets.edit = async () => { throw {code: 50013}; };
    const result = await f.service.update(f.guild, 'tickets', 'Saved despite outage', original.content);
    assert.equal(result.synced, false);
    assert.match(result.status, /Saved on server.*permissions/);
    assert.equal(new DeployedMessageStore(f.file).load().tickets?.content, 'Saved despite outage');
    assert.deepEqual(f.edits, []);
    f.messages.tickets.edit = edit;
    assert.equal((await f.service.update(f.guild, 'tickets', result.content, result.content)).synced, true);
    assert.equal(f.edits.length, 1);
});

test('missing/deleted deployments keep saved text for the next deploy', async t => {
    const f = deployedMessageFixture(); t.after(f.cleanup);
    await f.service.list(f.guild);
    f.channels.clear();
    const result = await f.service.update(f.guild, 'tickets', 'Future deployment', DEPLOYED_MESSAGES.tickets.content);
    assert.equal(result.synced, false);
    assert.match(result.status, /Saved on server.*Run \/deploy/);
    assert.equal(f.service.getContent('tickets'), 'Future deployment');
    assert.equal(f.edits.length, 0);
});

test('legacy discovery ignores other authors, bot posts without matching buttons and other channels', async t => {
    const f = deployedMessageFixture(); t.after(f.cleanup);
    const history = f.channels.get('10').history;
    history.set('30', {...f.messages.tickets, id: '30', author: {id: '99'}});
    history.set('31', {...f.messages.tickets, id: '31', components: []});
    f.channels.set('99', {...f.channels.get('10'), id: '99', name: 'unrelated'});
    assert.equal((await f.service.list(f.guild))[0].synced, true);
    assert.equal(f.store.load().tickets?.target?.messageId, '20');
});

test('legacy discovery paginates beyond 100 unrelated posts', async t => {
    const f = deployedMessageFixture(); t.after(f.cleanup);
    let page = 0;
    f.channels.get('10').messages.fetch = async (options: any) => {
        if (page++ === 0) return new Collection(Array.from({length: 100}, (_, i) => [String(100 + i), {...f.messages.tickets, id: String(100 + i), components: []}]));
        assert.equal(options.before, '100');
        return new Collection([['20', f.messages.tickets]]);
    };
    assert.equal((await f.service.list(f.guild))[0].synced, true);
    assert.equal(page, 2);
});

test('ambiguous legacy messages and replaced tracked controls are never edited', async t => {
    const f = deployedMessageFixture(); t.after(f.cleanup);
    f.channels.get('10').history.set('30', {...f.messages.tickets, id: '30'});
    let result = await f.service.update(f.guild, 'tickets', 'Desired', DEPLOYED_MESSAGES.tickets.content);
    assert.equal(result.synced, false);
    assert.match(result.status, /Multiple matching/);
    f.channels.get('10').history.delete('30');
    await f.service.list(f.guild);
    f.messages.tickets.components = [];
    result = await f.service.update(f.guild, 'tickets', 'Desired again', 'Desired');
    assert.equal(result.synced, false);
    assert.match(result.status, /expected bot controls/);
    assert.deepEqual(f.edits, []);
});

test('invalid content never changes storage or Discord', async t => {
    const f = deployedMessageFixture(); t.after(f.cleanup);
    for (const content of ['', '   ', 'a'.repeat(2001), null, 42]) {
        assert.throws(() => f.service.update(f.guild, 'tickets', content as string, DEPLOYED_MESSAGES.tickets.content), /1–2,000/);
    }
    assert.deepEqual(f.store.load(), {});
    assert.deepEqual(f.edits, []);
});

test('concurrent stale saves conflict instead of silently overwriting; other message state survives', async t => {
    const f = deployedMessageFixture(); t.after(f.cleanup);
    await f.service.list(f.guild);
    const first = f.service.update(f.guild, 'tickets', 'First edit', DEPLOYED_MESSAGES.tickets.content);
    const second = f.service.update(f.guild, 'tickets', 'Stale edit', DEPLOYED_MESSAGES.tickets.content);
    await first;
    await assert.rejects(second, /another session/);
    assert.equal(f.service.getContent('tickets'), 'First edit');
    assert.equal(f.store.load().apply?.target?.messageId, '21');
    assert.equal(f.edits.length, 1);
});

test('admin update waits for deployment and uses the newly tracked message', async t => {
    const f = deployedMessageFixture(); t.after(f.cleanup);
    await f.service.list(f.guild);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const deployment = f.service.exclusive(async () => {
        await gate;
        const newMessage = {...f.messages.tickets, id: '77'};
        f.channels.get('10').history.clear();
        f.channels.get('10').history.set('77', newMessage);
        f.service.remember('tickets', newMessage);
    });
    const update = f.service.update(f.guild, 'tickets', 'New content', DEPLOYED_MESSAGES.tickets.content);
    assert.deepEqual(f.edits, []);
    release(); await deployment;
    assert.equal((await update).synced, true);
    assert.equal(f.store.load().tickets?.target?.messageId, '77');
});

test('corrupt storage fails closed and filesystem write failures do not edit Discord', async t => {
    const f = deployedMessageFixture(); t.after(f.cleanup);
    fs.writeFileSync(f.file, '{broken');
    await assert.rejects(f.service.list(f.guild));
    assert.equal(fs.readFileSync(f.file, 'utf8'), '{broken');
    fs.writeFileSync(f.file, '{}');
    t.mock.method(f.store, 'save', () => { throw new Error('Disk full'); });
    await assert.rejects(f.service.update(f.guild, 'tickets', 'Lost?', DEPLOYED_MESSAGES.tickets.content), /Disk full/);
    assert.deepEqual(f.edits, []);
});

test('HTTP API lists messages, validates input, saves, reports conflicts and returns partial sync status', async t => {
    const f = deployedMessageFixture(); t.after(f.cleanup);
    const app = express(); app.use(express.json());
    app.use('/api/deployed-messages', createDeployedMessageRouter(f.service, async () => f.guild));
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    t.after(() => { server.closeAllConnections(); server.close(); });
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/deployed-messages`;
    const data = await (await fetch(base)).json() as any;
    assert.equal(data.messages.length, 2);
    const put = (id: string, content: unknown, expectedContent: unknown) => fetch(`${base}/${id}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({content, expectedContent}),
    });
    assert.equal((await put('unknown', 'x', '')).status, 404);
    assert.equal((await put('tickets', ' ', data.messages[0].content)).status, 400);
    assert.equal((await put('tickets', 'x', null)).status, 400);
    const saved = await put('tickets', 'HTTP edit', data.messages[0].content);
    assert.equal(saved.status, 200);
    assert.equal((await saved.json() as any).synced, true);
    assert.equal((await put('tickets', 'stale', data.messages[0].content)).status, 409);
    f.messages.tickets.edit = async () => { throw {code: 50013}; };
    const partial = await put('tickets', 'Persisted edit', 'HTTP edit');
    assert.equal(partial.status, 200);
    const pending = await partial.json() as any;
    assert.equal(pending.content, 'Persisted edit');
    assert.equal(pending.synced, false);
});

test('/deploy sends saved templates, retains buttons and records both new message IDs', async t => {
    Object.assign(process.env, {DISCORD_TOKEN: 'test', DISCORD_CLIENT_ID: '1', SERVER_ID: '1', APPLICANT_ROLE_NAME: 'Applicant'});
    const {execute} = await import('../src/commands/deployChannels');
    const {deployedMessageService} = await import('../src/services/DeployedMessageService');
    const sent: any[] = [], remembered: any[] = [];
    const created: any[] = [];
    t.mock.method(deployedMessageService, 'getContent', (id: DeployedMessageId) => `Saved ${id} text`);
    t.mock.method(deployedMessageService, 'remember', (id: DeployedMessageId, message: Message) => { remembered.push({id, message}); });
    const guild: any = {id: '1', roles: {cache: new Collection([['3', {id: '3', name: 'Applicant'}]])}, channels: {
        cache: new Collection(),
        create: async (options: any) => {
            created.push(options);
            const channel = {id: String(100 + created.length), ...options, send: async (payload: any) => {
                const message = {id: String(200 + sent.length), guildId: '1', channelId: channel.id, content: payload.content,
                    suppressEmbeds: async (suppressed: boolean) => { assert.equal(suppressed, true); }};
                sent.push({payload, message}); return message;
            }};
            return channel;
        },
    }};
    const replies: any[] = [];
    const interaction: any = {guild, member: {roles: {cache: new Collection([['4', {name: 'Officer'}]])}},
        client: {user: {id: '2'}}, options: {getBoolean: () => false},
        deferReply: async (options: any) => {assert.equal(options.ephemeral, true);},
        editReply: async (reply: any) => {replies.push(reply);},
    };
    await execute(interaction);
    assert.deepEqual(sent.map(entry => entry.payload.content), ['Saved apply text', 'Saved tickets text']);
    assert.deepEqual(sent.map(entry => entry.payload.components[0].components[0].custom_id), ['createApplyTicket', 'createTicket']);
    assert.deepEqual(remembered.map(entry => entry.id), ['apply', 'tickets']);
    assert.equal(created.filter(entry => entry.type === ChannelType.GuildText).length, 2);
    assert.equal(replies[0].content, 'Ticket channel created');

    // A bad storage file must be detected before destructive deployment begins.
    t.mock.method(deployedMessageService, 'getContent', () => {throw new Error('Invalid storage');});
    created.length = 0;
    await execute(interaction);
    assert.equal(created.length, 0);
    assert.match(replies[1].content, /could not be created/);
});
