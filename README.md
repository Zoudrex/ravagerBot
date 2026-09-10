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
to read application messages. It also needs View Channel, Read Message History,
Manage Roles, Kick Members and Manage Channels, with its role above the roles
and members it manages.

The ephemeral preview shows the latest non-bot, non-system message, its author,
and a link to the original. Its author is the applicant, regardless of the ticket's
member permission overwrite. A decision requires the author to still have the
Applicant role. Previewing does not edit the source message. Acceptance removes
Applicant, adds Raider, and deletes the channel. Decline removes Applicant, sends
the existing standard decline DM, kicks the member, and deletes the channel.
There is no custom decline-reason input. Channel deletion preserves the existing
workflow's cleanup behavior.

Buttons belong to the Officer who opened the preview. Each click rechecks their
role, channel, source message and applicant membership. The Applicant role is
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
