import { CronJob, CronTime } from 'cron';
import findChannel from '../helpers/findChannel';
import { config } from '../config';
import { findGuildRole } from '../helpers/findRole';
import ReminderConfigStore from '../services/ReminderConfigStore';
import RaidReminderGate from '../services/RaidReminderGate';

export type ReminderId = 'inviteReminder' | 'waShtReminder';

export type ReminderConfig = {
    id: ReminderId;
    schedule: string;
    enabled: boolean;
    message: string;
};

type ReminderConfigMap = Record<ReminderId, ReminderConfig>;
type ReminderJobMap = Record<ReminderId, CronJob>;

class Scheduler {
    private readonly reminderConfigStore = new ReminderConfigStore();
    private readonly raidReminderGate = new RaidReminderGate();

    private readonly defaultReminderConfigs: ReminderConfigMap = {
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
            message: 'Reminder: Make sure your **Add-ons** are up-to-date and your **UI** is functional!',
        },
    };

    private reminderConfigs: ReminderConfigMap;
    private reminderJobs: ReminderJobMap;

    inviteStaller: CronJob | undefined;

    constructor() {
        this.reminderConfigs = this.reminderConfigStore.load(this.defaultReminderConfigs);

        this.reminderJobs = {
            inviteReminder: this.createReminderJob('inviteReminder', 'Raid invites'),
            waShtReminder: this.createReminderJob('waShtReminder', 'Update your shit'),
        };
    }

    private createReminderJob(id: ReminderId, name: string): CronJob {
        const cfg = this.reminderConfigs[id];

        return CronJob.from({
            cronTime: cfg.schedule,
            onTick: () => {
                const currentConfig = this.reminderConfigs[id];
                void this.sendRaidReminder(currentConfig.message);
            },
            start: false,
            name,
        });
    }

    getReminderConfigs(): ReminderConfig[] {
        return Object.values(this.reminderConfigs);
    }

    getReminderConfig(id: ReminderId): ReminderConfig {
        return this.reminderConfigs[id];
    }

    hasReminderConfig(id: string): id is ReminderId {
        return id in this.reminderConfigs;
    }

    updateReminderConfig(
        id: ReminderId,
        patch: Partial<Omit<ReminderConfig, 'id'>>
    ): ReminderConfig {
        const current = this.reminderConfigs[id];
        const updated: ReminderConfig = { ...current, ...patch, id };

        if (patch.schedule !== undefined) {
            new CronTime(patch.schedule);
        }

        this.reminderConfigs[id] = updated;
        this.applyReminderConfig(id);
        this.reminderConfigStore.save(this.reminderConfigs);

        return updated;
    }

    private applyReminderConfig(id: ReminderId): void {
        const cfg = this.reminderConfigs[id];
        const job = this.reminderJobs[id];

        job.stop();
        job.setTime(new CronTime(cfg.schedule));

        if (cfg.enabled) {
            job.start();
        }
    }

    start(): void {
        for (const id of Object.keys(this.reminderJobs) as ReminderId[]) {
            const cfg = this.reminderConfigs[id];
            const job = this.reminderJobs[id];

            console.log('Starting:', job.name);

            if (cfg.enabled) {
                job.start();
            }
        }
    }

    getInviteReminder(): CronJob {
        return this.reminderJobs.inviteReminder;
    }

    getInviteStaller(): CronJob | undefined {
        return this.inviteStaller;
    }

    async skipNext(nights: number = 1, skipMessage: boolean): Promise<void> {
        const dates = this.reminderJobs.inviteReminder.nextDates(1 + nights);

        this.reminderJobs.inviteReminder.stop();
        this.reminderJobs.waShtReminder.stop();

        const nextRaid = dates[dates.length - 1];
        const date = `${nextRaid.monthShort} ${nextRaid.get('day')}`;

        if (!skipMessage) {
            const raidCancelled = CronJob.from({
                cronTime: '* * * * * *',
                onTick: () => {
                    void this.sendRaidReminder(`Sadly, raid has been cancelled. See y'all at ${date}`, false);
                },
                onComplete: null,
                start: false,
                name: 'Raid cancelled',
            });

            await raidCancelled.fireOnTick();
            raidCancelled.start();
            raidCancelled.runOnce = true;
            raidCancelled.stop();
        }

        this.inviteStaller = CronJob.from({
            cronTime: nextRaid.plus(6000),
            onTick: () => {
                console.log('This should only happen once and fully stop the OG spam');
            },
            start: true,
            name: 'Next CRON time enabler',
        });

        this.inviteStaller.addCallback(() => {
            for (const id of ['inviteReminder', 'waShtReminder'] as ReminderId[]) {
                if (this.reminderConfigs[id].enabled) {
                    this.reminderJobs[id].start();
                }
            }
        });

        this.inviteStaller.runOnce = true;
    }

    private async sendRaidReminder(message: string, validateRaidStatus: boolean = true): Promise<void> {
        try {
            if (validateRaidStatus) {
                const today = getLocalDateString(new Date());
                const shouldSend = await this.raidReminderGate.shouldSendReminder(today);

                if (!shouldSend) {
                    return;
                }
            }

            const channel = findChannel(config.INVITE_REMINDER_CHANNEL_NAME ?? '', config.SERVER_ID);
            if (!channel) {
                console.log(`${config.INVITE_REMINDER_CHANNEL_NAME} channel not found!`);
                return;
            }

            if (!config.RAIDER_ROLE_NAME) {
                console.log('Raider role name not configured!');
                return;
            }

            const role = findGuildRole(config.SERVER_ID, config.RAIDER_ROLE_NAME);
            await channel.send(`${role} ${message}`);
        } catch (error) {
            console.error('Failed to send raid reminder:', error);
        }
    }
}

function getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export default Scheduler;
