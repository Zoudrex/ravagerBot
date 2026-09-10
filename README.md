# Applicant reviews

Use `/review` with no arguments in a normal text channel under the Applicants
category. Only members with the configured `Officer` role (`ROLE_NAMES.officer`
in `src/constants/guild.ts`) can open a review or use its Accept / Decline buttons.
Other staff roles alone do not grant access.

Set `APPLICANTS_CATEGORY_ID` in `.env` (or `.env.dev`) to the ID of the existing
Applicants category created by `/deploy`. Review authorization uses this ID.
If a destructive deployment recreates the category, update the ID and restart.
`APPLICANT_ROLE_NAME` and `RAIDER_ROLE_NAME` still configure decision roles.

Enable **Message Content Intent** in the Discord Developer Portal for the bot
(and obtain approval if Discord requires it). The bot now requests this intent
to read deployed messages for the admin panel. It also needs View Channel, Read Message History,
Manage Roles, Kick Members and Manage Channels, with its role above the roles
and members it manages.

The ephemeral review panel shows the applicant and Accept / Decline buttons.
The applicant is identified by the channel's explicit member permission granting
View Channel, which is created when they open an application ticket. No message
needs to have been posted, and `/review` does not read channel messages. Missing
or ambiguous member permissions produce an error instead of selecting someone
arbitrarily. A decision requires the member to still have the Applicant role.
Acceptance removes
Applicant, adds Raider, and deletes the channel. Decline removes Applicant, sends
the existing standard decline DM, kicks the member, and deletes the channel.
There is no custom decline-reason input. Channel deletion preserves the existing
workflow's cleanup behavior.

Buttons belong to the Officer who opened the review. Each click rechecks their
role, channel, applicant assignment and applicant membership. The Applicant role is
the pending state; removing it prevents stale reviews from repeating decisions,
including after restarts. In-process locks protect concurrent decisions for the
same applicant or channel. Run one bot instance, as configured in
`ecosystem.config.js`; multiple replicas would need a shared lock/state store.
After a partial Discord failure, check roles, membership and channel manually
before retrying because some actions may already have completed.

Restart/redeploy after configuration changes. Startup bulk-registers the guild
slash commands, installing `/review` and removing obsolete command entries.
No separate command registration script is required.

Run `npm test` for offline review tests and `npx tsc --noEmit` to type-check.
The `build` script also restarts PM2; use the type-check command to validate
without deploying.

## Admin panel: Channel messages

The admin panel has separate **Raid reminders** and **Channel messages** tabs.
The latter edits the ticket welcome message and the guild application message
published by `/deploy`. Choose **Save and update Discord** to persist the text
and edit the existing bot message in place. Message buttons and existing embed
suppression are preserved; edits do not send mention notifications. Text supports
Discord Markdown and must be nonblank and at most 2,000 characters.

Saved content and Discord guild/channel/message IDs live in
`data/deployed-messages.json`, using the same local file storage pattern as
reminders. Keep this file with the server's persistent data and backups.
Future `/deploy` runs use the saved content and record the replacement message IDs.
No new environment variables or slash-command registrations are needed for this tab.
Rebuild/restart the bot to load the new API and refresh the browser for the tab.

Existing deployments are discovered automatically on first use by channel/category
name, bot author and the existing Create ticket / Apply button. Their current text
is adopted into storage; running `/deploy` again is not needed to begin editing.
After discovery the stored IDs continue working if a channel is renamed.
Ambiguous matches are reported instead of editing an arbitrary message.

If Discord rejects an update, the edited text stays saved on the server and the
panel offers **Retry Discord update**. A missing message/channel requires `/deploy`
to publish the saved text. Edits from a stale browser session are rejected with a
reload message. Saves and deployments are serialized within the existing single
bot process. The new API uses the admin panel's existing access arrangement.
