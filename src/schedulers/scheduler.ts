import {CronJob} from 'cron';
import findChannel from "../helpers/findChannel";
import {config} from "../config";
import {findGuildRole} from "../helpers/findRole";

class Scheduler {
    jobs: CronJob[] = [];
    inviteReminder: CronJob;
    inviteStaller: CronJob | undefined;
    waShtReminder: CronJob;

    constructor() {
        this.inviteReminder = CronJob.from({
            cronTime: '0 20 19 * * 0,4',
            onTick: function () {
                Scheduler.sendRaidReminder('Raid invites will be going out in 20 minutes!')
            },
            onComplete: null,
            start: false,
            name: 'Raid invites'
        });

        // 0 40 17 * * 0,4
        this.waShtReminder = CronJob.from({
            cronTime: '0 20 17 * * 0,4',
            onTick: function () {
                Scheduler.sendRaidReminder('Make sure to submit your sim to Wowaudit and update your weakauras before raid!')
            },
            onComplete: null,
            start: false,
            name: 'Update your shit'
        });

        this.jobs.push(this.inviteReminder);
        this.jobs.push(this.waShtReminder);
    }

    async skipNext(nights: number = 1, skipMessage: boolean) {
        const dates = this.inviteReminder.nextDates(1 + nights);
        this.inviteReminder.stop();
        this.waShtReminder.stop();
        const nextRaid = dates[dates.length - 1];
        const date = nextRaid.toFormat("dd/MM");

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


        // This cronjob is a way to re-start the original cron so the process can resume as normal after a cancelled raid
        this.inviteStaller = CronJob.from(
            {
                cronTime: nextRaid.plus(6000), // Delay it by an hour in case same stick funsies
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
        // Find the channel
        const channel = findChannel(config.INVITE_REMINDER_CHANNEL_NAME ?? '', config.SERVER_ID ?? '');
        if (!channel) {
            console.log(`${config.INVITE_REMINDER_CHANNEL_NAME} channel not found!`)
            return;
        }
        const role = findGuildRole(config.SERVER_ID ?? '', 'Raiders');

        channel.send(`${role} ${message}`);
    }
}

export default Scheduler;