import { ChannelType, Guild, Message, PermissionFlagsBits, TextChannel } from "discord.js";
import { config } from "../config";
import { ROLE_NAMES } from "../constants/guild";

export class ApplicantReviewError extends Error {}

export type ReviewContext = {
    channelId: string;
    messageId: string;
    applicantId: string;
    officerId: string;
};

export async function getReviewChannel(guild: Guild | null, channelId: string, officerId: string): Promise<TextChannel> {
    if (!guild) throw new ApplicantReviewError("Use /review in an applicant text channel in the server.");
    const officer = await guild.members.fetch({user: officerId, force: true});
    if (!officer.roles.cache.some(role => role.name === ROLE_NAMES.officer)) {
        throw new ApplicantReviewError("Only members with the Officer role can review applicants.");
    }
    if (!config.APPLICANTS_CATEGORY_ID) {
        throw new ApplicantReviewError("APPLICANTS_CATEGORY_ID is not configured. Ask the bot administrator to set it.");
    }
    const channel = await guild.channels.fetch(channelId, {force: true});
    if (!channel) throw new ApplicantReviewError("The applicant channel no longer exists; this review is stale.");
    if (channel.type !== ChannelType.GuildText || channel.parentId !== config.APPLICANTS_CATEGORY_ID) {
        throw new ApplicantReviewError("Use /review in a normal text channel under the configured Applicants category. Threads are not supported.");
    }
    return channel;
}

export async function findLatestUserMessage(channel: TextChannel): Promise<Message | undefined> {
    let before: string | undefined;
    while (true) {
        const messages = await channel.messages.fetch({limit: 100, before});
        // Sort explicitly: correctness must not depend on cache insertion order.
        const sorted = [...messages.values()].sort((a, b) => a.id === b.id ? 0 : BigInt(a.id) > BigInt(b.id) ? -1 : 1);
        const message = sorted.find(item => !item.author.bot && !item.system);
        if (message) return message;
        if (messages.size < 100) return undefined;
        const oldest = sorted[sorted.length - 1]?.id;
        if (!oldest || oldest === before) return undefined;
        before = oldest;
    }
}

// Discord's Applicant role is the authoritative pending state. Locks cover the
// read/check/write sequence for this bot's single process (see ecosystem.config.js).
const inProgress = new Set<string>();

export async function processApplicantDecision(guild: Guild, context: ReviewContext, accepted: boolean): Promise<void> {
    const keys = [`${guild.id}:member:${context.applicantId}`, `${guild.id}:channel:${context.channelId}`];
    if (keys.some(key => inProgress.has(key))) {
        throw new ApplicantReviewError("This applicant or channel is already being handled. Wait for that review to finish.");
    }
    keys.forEach(key => inProgress.add(key));
    try {
        const channel = await getReviewChannel(guild, context.channelId, context.officerId);
        const message = await channel.messages.fetch({message: context.messageId, force: true});
        if (message.channelId !== context.channelId || message.author.id !== context.applicantId || message.author.bot || message.system) {
            throw new ApplicantReviewError("The original message no longer matches this review. Run /review again.");
        }
        const applicant = await guild.members.fetch({user: context.applicantId, force: true});
        await guild.roles.fetch();
        const applicantRole = guild.roles.cache.find(role => role.name === config.APPLICANT_ROLE_NAME);
        const raiderRole = guild.roles.cache.find(role => role.name === config.RAIDER_ROLE_NAME);
        if (!applicantRole) throw new ApplicantReviewError("Applicant role could not be found. No changes were made.");
        if (!applicant.roles.cache.has(applicantRole.id)) {
            throw new ApplicantReviewError("This applicant has already been handled or no longer has the Applicant role. No changes were made.");
        }
        if (accepted && !raiderRole) throw new ApplicantReviewError("Raider role could not be found. No changes were made.");

        const bot = await guild.members.fetchMe({force: true});
        if (!bot.permissions.has(PermissionFlagsBits.ManageRoles) || !applicantRole.editable ||
            (accepted && !raiderRole!.editable) || (!accepted && !applicant.kickable) ||
            !channel.permissionsFor(bot)?.has(PermissionFlagsBits.ManageChannels)) {
            throw new ApplicantReviewError("The bot is missing permissions or role hierarchy access to handle this applicant and delete the channel. No changes were made.");
        }

        // Shared applicant business logic: role changes, best-effort decline DM,
        // kick on decline, then remove the completed applicant channel.
        try {
            await applicant.roles.remove(applicantRole);
            if (accepted && raiderRole) await applicant.roles.add(raiderRole);
            if (!accepted) {
                const baseMessage = "Hi, I'm sorry to inform you that you've been declined for your application to RAVAGE.";
                try {
                    await applicant.send(baseMessage);
                } catch (error) {
                    console.warn(`Could not DM declined applicant ${applicant.id}:`, error);
                }
                await applicant.kick("Application declined");
            }
            await channel.delete("Applicant handled");
        } catch (error) {
            console.error(`Failed to handle applicant ${applicant.id}:`, error);
            // Do not roll back the pending role: repeating a partially completed
            // kick/DM/role change can duplicate side effects after an API failure.
            throw new ApplicantReviewError("Something went wrong while handling this applicant. Some changes may already have completed. Ask an administrator to check their roles, membership and channel before retrying.");
        }
    } finally {
        keys.forEach(key => inProgress.delete(key));
    }
}

export function reviewErrorMessage(error: unknown): string {
    if (error instanceof ApplicantReviewError) return error.message;
    const code = (error as {code?: number} | null)?.code;
    if (code === 10007) return "The member is no longer in the guild. This review cannot proceed.";
    if (code === 10008) return "The original message no longer exists. Run /review again.";
    if (code === 10003) return "The applicant channel no longer exists; the applicant may already have been handled.";
    if (code === 50001 || code === 50013) return "The bot is missing Discord access or permissions for this review.";
    return "A Discord API error occurred while reviewing this applicant. Try /review again.";
}
