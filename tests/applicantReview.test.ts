import assert from "node:assert/strict";
import { test } from "node:test";
import { ChannelType, Collection, OverwriteType, PermissionFlagsBits, PermissionsBitField } from "discord.js";

// Offline tests: no Discord connection or real credentials.
Object.assign(process.env, {DISCORD_TOKEN: "test", DISCORD_CLIENT_ID: "1", SERVER_ID: "1", APPLICANTS_CATEGORY_ID: "10", APPLICANT_ROLE_NAME: "Applicant", RAIDER_ROLE_NAME: "Raider"});
const service = require("../src/services/applicantReview") as typeof import("../src/services/applicantReview");
const command = require("../src/commands/applicants/review") as typeof import("../src/commands/applicants/review");
const button = require("../src/buttonInteractions/reviewApplicant") as typeof import("../src/buttonInteractions/reviewApplicant");

function memberOverwrite(id: string) {
    return {id, type: OverwriteType.Member, allow: new PermissionsBitField(PermissionFlagsBits.ViewChannel), deny: new PermissionsBitField()};
}

function fixture() {
    const calls: string[] = [];
    const applicantRole = {id: "20", name: "Applicant", editable: true};
    const raiderRole = {id: "21", name: "Raider", editable: true};
    const applicant: any = {
        id: "30", kickable: true,
        roles: {
            cache: new Collection([["20", applicantRole]]),
            remove: async () => { calls.push("remove"); applicant.roles.cache.delete("20"); },
            add: async () => { calls.push("add"); },
        },
        send: async (content: string) => { calls.push("dm"); assert.match(content, /declined for your application to RAVAGE/); },
        kick: async (reason: string) => { calls.push("kick"); assert.equal(reason, "Application declined"); },
    };
    const officer = {roles: {cache: new Collection([["40", {name: "Officer"}]])}};
    const channel: any = {
        id: "60", type: ChannelType.GuildText, parentId: "10",
        client: {user: {id: "99"}},
        permissionOverwrites: {cache: new Collection([["30", memberOverwrite("30")]])},
        messages: {fetch: async () => { assert.fail("Applicant review must not read channel messages"); }},
        permissionsFor: () => ({has: () => true}),
        delete: async (reason: string) => { calls.push("delete"); assert.equal(reason, "Applicant handled"); },
    };
    const guild: any = {
        id: "1", channels: {fetch: async () => channel},
        members: {
            fetch: async ({user, force}: any) => { assert.equal(force, true); return user === "40" ? officer : applicant; },
            fetchMe: async () => ({permissions: {has: () => true}}),
        },
        roles: {fetch: async () => {}, cache: new Collection([["20", applicantRole], ["21", raiderRole]])},
    };
    const context = {channelId: "60", applicantId: "30", officerId: "40"};
    const edits: any[] = [], replies: any[] = [];
    const interaction: any = {
        guild, channelId: "60", user: {id: "40"},
        customId: button.reviewButtonId(context, true), message: {flags: {has: (flag: string) => flag === "Ephemeral"}},
        deferReply: async (options: any) => { assert.equal(options.ephemeral, true); },
        deferUpdate: async () => {}, editReply: async (options: any) => { edits.push(options); },
        reply: async (options: any) => { replies.push(options); },
    };
    return {calls, applicant, officer, channel, guild, context, interaction, edits, replies, applicantRole, raiderRole};
}

test("command and button registration, no command arguments, IDs under 100 characters", () => {
    const {commands} = require("../src/commands");
    const {resolveButtonInteractionId, buttonInteractions} = require("../src/buttonInteractions");
    assert.deepEqual(Object.keys(commands).sort(), ["cancelraid", "deploy", "nextraid", "ping", "review"]);
    assert.deepEqual(command.data.toJSON().options, []);
    assert.equal(command.data.toJSON().dm_permission, false);
    assert.equal(buttonInteractions[resolveButtonInteractionId(fixture().interaction.customId)].execute, button.execute);
    const id = "9".repeat(20);
    assert.ok(button.reviewButtonId({channelId: id, applicantId: id, officerId: id}, true).length <= 100);
});

test("applicant identification ignores role overwrites, the bot and members without View Channel", () => {
    const f = fixture();
    f.channel.permissionOverwrites.cache.set("40", {...memberOverwrite("40"), type: OverwriteType.Role});
    f.channel.permissionOverwrites.cache.set("99", memberOverwrite("99"));
    f.channel.permissionOverwrites.cache.set("31", {...memberOverwrite("31"), allow: new PermissionsBitField()});
    f.channel.permissionOverwrites.cache.set("32", {...memberOverwrite("32"), deny: new PermissionsBitField(PermissionFlagsBits.ViewChannel)});
    assert.equal(service.findChannelApplicantId(f.channel), "30");
});

test("missing applicant channel permissions produce an ephemeral error", async () => {
    const f = fixture(); f.channel.permissionOverwrites.cache.clear();
    await command.execute(f.interaction);
    assert.match(f.edits[0].content, /No applicant could be identified/);
    assert.deepEqual(f.calls, []);
});

test("review shows applicant and both buttons without requiring any messages", async () => {
    const f = fixture();
    await command.execute(f.interaction);
    const ui = f.edits[0];
    assert.equal(ui.content, "Review applicant <@30>");
    assert.equal(ui.embeds, undefined);
    assert.deepEqual(ui.components[0].toJSON().components.map((item: any) => item.label), ["Accept", "Decline"]);
    assert.deepEqual(f.calls, []);
});

test("multiple explicit member permissions are rejected instead of guessing the applicant", async () => {
    const f = fixture(); f.channel.permissionOverwrites.cache.set("31", memberOverwrite("31"));
    await command.execute(f.interaction);
    assert.match(f.edits[0].content, /Multiple members/);
    assert.deepEqual(f.calls, []);
});

for (const type of [ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.GuildVoice, ChannelType.GuildAnnouncement, ChannelType.GuildForum]) {
    test(`unsupported channel type ${type} is rejected`, async () => {
        const f = fixture(); f.channel.type = type;
        await command.execute(f.interaction);
        assert.match(f.edits[0].content, /normal text channel/);
        assert.deepEqual(f.calls, []);
    });
}

test("DM usage fails gracefully and ephemerally", async () => {
    const f = fixture(); f.interaction.guild = null;
    await command.execute(f.interaction);
    assert.match(f.edits[0].content, /in the server/);
});

for (const roleName of ["GM", "Assistant GM", "Officers"]) {
    test(`${roleName} alone does not authorize a review`, async () => {
        const f = fixture(); f.officer.roles.cache.set("40", {name: roleName});
        await command.execute(f.interaction);
        assert.match(f.edits[0].content, /Only members with the Officer role/);
        assert.deepEqual(f.calls, []);
    });
}

test("wrong category is rejected despite its name", async () => {
    const f = fixture(); f.channel.parentId = "99"; f.channel.parent = {name: "Applicants"};
    await command.execute(f.interaction);
    assert.match(f.edits[0].content, /configured Applicants category/);
});

for (const accepted of [true, false]) {
    test(`${accepted ? "accept" : "decline"} works without channel messages, preserves side effects and removes buttons`, async () => {
        const f = fixture(); f.interaction.customId = button.reviewButtonId(f.context, accepted);
        await button.execute(f.interaction);
        assert.deepEqual(f.calls, accepted ? ["remove", "add", "delete"] : ["remove", "dm", "kick", "delete"]);
        assert.equal(f.edits[0].content, `${accepted ? "Accepted" : "Declined"} <@30>\n\nHandled by <@40>`);
        assert.deepEqual(f.edits[0].components, []);
    });
}

test("closed DMs do not prevent decline", async () => {
    const f = fixture(); f.applicant.send = async () => { f.calls.push("dm"); throw new Error("DM closed"); };
    await service.processApplicantDecision(f.guild, f.context, false);
    assert.deepEqual(f.calls, ["remove", "dm", "kick", "delete"]);
});

test("double clicks, two officers and another channel cannot race; stale panels cannot repeat", async () => {
    const f = fixture(); let release!: () => void;
    const gate = new Promise<void>(resolve => {release = resolve;});
    f.guild.channels.fetch = async () => { await gate; return f.channel; };
    const first = service.processApplicantDecision(f.guild, f.context, true);
    for (const context of [f.context, {...f.context, officerId: "41"}, {...f.context, channelId: "61"}, {...f.context, applicantId: "31"}]) {
        await assert.rejects(service.processApplicantDecision(f.guild, context, false), /already being handled/);
    }
    release(); await first;
    await assert.rejects(service.processApplicantDecision(f.guild, f.context, false), /already been handled/);
    assert.deepEqual(f.calls, ["remove", "add", "delete"]);
});

const invalidStates: Record<string, (f: ReturnType<typeof fixture>) => void> = {
    "removed Officer role": f => { f.officer.roles.cache.clear(); },
    "moved channel": f => { f.channel.parentId = "99"; },
    "missing applicant assignment": f => { f.channel.permissionOverwrites.cache.clear(); },
    "changed applicant assignment": f => { f.channel.permissionOverwrites.cache = new Collection([["31", memberOverwrite("31")]]); },
    "ambiguous applicant assignment": f => { f.channel.permissionOverwrites.cache.set("31", memberOverwrite("31")); },
    "handled applicant": f => { f.applicant.roles.cache.clear(); },
    "missing Applicant role": f => { f.guild.roles.cache.delete("20"); },
    "missing Raider role": f => { f.guild.roles.cache.delete("21"); },
    "unmanageable role": f => { f.applicantRole.editable = false; },
    "missing channel permissions": f => { f.channel.permissionsFor = () => ({has: () => false}); },
};
for (const [name, mutate] of Object.entries(invalidStates)) {
    test(`button revalidates ${name}`, async () => {
        const f = fixture(); mutate(f);
        await button.execute(f.interaction);
        assert.deepEqual(f.calls, []);
        assert.deepEqual(f.edits[0].components, []);
        assert.doesNotMatch(f.edits[0].content, /^Accepted/);
    });
}

test("non-kickable applicant cannot be declined and loses no roles", async () => {
    const f = fixture(); f.applicant.kickable = false;
    await assert.rejects(service.processApplicantDecision(f.guild, f.context, false), /permissions or role hierarchy/);
    assert.deepEqual(f.calls, []);
});

for (const [code, expected] of [[10007, /no longer in the guild/], [10003, /channel no longer exists/], [50013, /missing Discord/], [50001, /missing Discord/], [500, /Discord API error/]] as const) {
    test(`Discord API error ${code} is shown on the ephemeral panel`, async () => {
        const f = fixture();
        const fetchMember = f.guild.members.fetch;
        f.guild.members.fetch = async (options: any) => {
            if (options.user === f.context.applicantId) throw {code};
            return fetchMember(options);
        };
        await button.execute(f.interaction);
        assert.match(f.edits[0].content, expected);
        assert.deepEqual(f.edits[0].components, []);
        assert.deepEqual(f.calls, []);
    });
}

test("another officer, wrong channel, malformed ID or public panel cannot use the buttons", async () => {
    for (const mutate of [
        (f: any) => { f.interaction.user.id = "41"; },
        (f: any) => { f.interaction.channelId = "61"; },
        (f: any) => { f.interaction.customId = "review:bad"; },
        (f: any) => { f.interaction.customId = "review:a:60:50:30:40"; },
        (f: any) => { f.interaction.message.flags.has = () => false; },
    ]) {
        const f = fixture(); mutate(f); await button.execute(f.interaction);
        assert.equal(f.replies[0].ephemeral, true);
        assert.deepEqual(f.calls, []); assert.deepEqual(f.edits, []);
    }
});

test("partial failure avoids cleanup and repeated side effects", async () => {
    const f = fixture();
    f.applicant.roles.add = async () => { f.calls.push("add"); throw {code: 50013}; };
    await assert.rejects(service.processApplicantDecision(f.guild, f.context, true), /Some changes may already have completed/);
    await assert.rejects(service.processApplicantDecision(f.guild, f.context, true), /already been handled/);
    assert.deepEqual(f.calls, ["remove", "add"]);
});

test("failed preflight releases locks so corrected review can proceed", async () => {
    const f = fixture(); f.channel.parentId = "99";
    await assert.rejects(service.processApplicantDecision(f.guild, f.context, true));
    f.channel.parentId = "10";
    await service.processApplicantDecision(f.guild, f.context, true);
    assert.deepEqual(f.calls, ["remove", "add", "delete"]);
});
