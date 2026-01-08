// Scheduler.ts
import {CronJob, CronTime} from 'cron';
import findChannel, {findChannelsOfCategory} from "../helpers/findChannel";
import {config} from "../config";
import {findGuildRole} from "../helpers/findRole";
import {TextChannel} from "discord.js";
import {findApplicant} from "../commands/applicants/handleApplicant";

export type ReminderConfig = {
    id: 'inviteReminder' | 'waShtReminder';
    schedule: string;
    enabled: boolean;
    message: string;
};

class Scheduler {
    jobs: CronJob[] = [];
    inviteReminder: CronJob;
    waShtReminder: CronJob;
    inviteStaller: CronJob | undefined;
    applicantCleanup: CronJob;

    // store configs in memory
    private reminderConfigs: Record<ReminderConfig['id'], ReminderConfig> = {
        inviteReminder: {
            id: 'inviteReminder',
            schedule: '0 20 19 * * sun,thu',
            enabled: true,
            message: 'Raid invites will be going out in 20 minutes!',
        },
        waShtReminder: {
            id: 'waShtReminder',
            schedule: '0 20 17 * * sun,thu',
            enabled: true,
            message: 'Reminder: Make sure your **WeakAuras** and **Add-ons** are up-to-date and your sims are submitted to WoWAudit.'
        }
    };

    constructor() {
        const inviteCfg = this.reminderConfigs.inviteReminder;
        const waCfg = this.reminderConfigs.waShtReminder;

        this.inviteReminder = CronJob.from({
            cronTime: inviteCfg.schedule,
            onTick: () => {
                Scheduler.sendRaidReminder(this.reminderConfigs.inviteReminder.message);
            },
            start: false,
            name: 'Raid invites'
        });

        this.waShtReminder = CronJob.from({
            cronTime: waCfg.schedule,
            onTick: () => {
                Scheduler.sendRaidReminder(this.reminderConfigs.waShtReminder.message);
            },
            start: false,
            name: 'Update your shit'
        });

        this.applicantCleanup = CronJob.from({
            cronTime: '0 0 0 * * *',
            onTick: function () {
                Scheduler.deleteStaleApplicants()
            },
            name: 'Clean up applicants',
            start: false,
        })

        this.jobs.push(this.inviteReminder);
        this.jobs.push(this.waShtReminder);
        this.jobs.push(this.applicantCleanup);
    }

    // ---------- NEW: config accessors ----------

    getReminderConfigs(): ReminderConfig[] {
        return Object.values(this.reminderConfigs);
    }

    getReminderConfig(id: ReminderConfig['id']): ReminderConfig | undefined {
        return this.reminderConfigs[id];
    }

    updateReminderConfig(
        id: ReminderConfig['id'],
        patch: Partial<Omit<ReminderConfig, 'id'>>
    ): ReminderConfig | undefined {
        const current = this.reminderConfigs[id];
        if (!current) return;

        const updated: ReminderConfig = { ...current, ...patch };
        this.reminderConfigs[id] = updated;

        // apply to running cron
        if (id === 'inviteReminder') {
            this.applyConfigToJob(this.inviteReminder, updated);
        } else if (id === 'waShtReminder') {
            this.applyConfigToJob(this.waShtReminder, updated);
        }

        return updated;
    }

    private applyConfigToJob(job: CronJob, cfg: ReminderConfig) {
        // set schedule
        job.setTime(new CronTime(cfg.schedule));

        // start/stop based on enabled
        if (cfg.enabled) {
            if (!job.isActive) job.start();
        } else {
            if (job.isActive) job.stop();
        }

        // message is picked up via closure (inviteCfg / waCfg)
        // so we also need to update those objects:
        this.reminderConfigs[cfg.id].message = cfg.message;
    }

    // ---------- existing code below ----------

    async skipNext(nights: number = 1, skipMessage: boolean) {
        const dates = this.inviteReminder.nextDates(1 + nights);
        this.inviteReminder.stop();
        this.waShtReminder.stop();
        const nextRaid = dates[dates.length - 1];
        const date = `${nextRaid.monthShort} ${nextRaid.get("day")}`;

        if (!skipMessage) {
            const raidCancelled = CronJob.from(
                {
                    cronTime: '* * * * * *',
                    onTick: function () {
                        Scheduler.sendRaidReminder(`Sadly, raid has been cancelled. See y'all at ${date}`)
                    },
                    onComplete: null,
                    start: false,
                    name: 'Raid cancelled',
                }
            )

            await raidCancelled.fireOnTick();
            raidCancelled.start();
            raidCancelled.runOnce = true;
            // Just for safety
            raidCancelled.stop();
        }

        this.inviteStaller = CronJob.from(
            {
                cronTime: nextRaid.plus(6000),
                onTick: function () {
                    console.log('This should only happen once and fully stop the OG spam');
                },
                start: true,
                name: 'Next CRON time enabler'
            }
        )

        this.inviteStaller.addCallback(this.start.bind(this));
        this.inviteStaller.runOnce = true;
    }

    start() {
        this.jobs.forEach(job => {
            console.log('Starting: ', job.name);
            job.start()
        })
    }

    getInviteReminder() {
        return this.inviteReminder;
    }

    getInviteStaller() {
        return this.inviteStaller;
    }

    private static sendRaidReminder(message: string) {
        const channel = findChannel(config.INVITE_REMINDER_CHANNEL_NAME ?? '', config.SERVER_ID ?? '');
        if (!channel) {
            console.log(`${config.INVITE_REMINDER_CHANNEL_NAME} channel not found!`)
            return;
        }
        const role = findGuildRole(config.SERVER_ID ?? '', 'Raiders');

        channel.send(`${role} ${message}`);
    }

    private static deleteStaleApplicants() {
        const channels = findChannelsOfCategory('ꓮpplicants', config.SERVER_ID ?? '')
        if (!channels) {
            return;
        }
        const date = new Date();
        date.setDate(date.getDate() - 7);
        channels.each(channel => {
            channel = channel as TextChannel
            channel.messages.fetch().then(() => {
                console.log('Messages fetched')
                if (channel.lastMessage?.createdAt && channel.lastMessage.createdAt < date) {
                    console.log('Found stale message')
                    findApplicant(channel).then(applicant => {
                        let role = channel.guild.roles.cache.find(role => role.name === config.APPLICANT_ROLE_NAME)
                        if (!applicant || !role) {
                            return;
                        }
                        applicant.roles.remove(role);
                        channel.delete("Stale ticket");
                        console.log('Deleted stale ticket')
                    })
                }
            });
        })
    }
}

export default Scheduler;
