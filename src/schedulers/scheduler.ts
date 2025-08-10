import {CronJob} from 'cron';
import findChannel, {findChannelsOfCategory} from "../helpers/findChannel";
import {config} from "../config";
import {findGuildRole} from "../helpers/findRole";
import {TextChannel} from "discord.js";
import {findApplicant} from "../commands/applicants/handleApplicant";


class Scheduler {
    jobs: CronJob[] = [];
    inviteReminder: CronJob;
    inviteStaller: CronJob | undefined;
    waShtReminder: CronJob;
    applicantCleanup: CronJob;

    constructor() {
        this.inviteReminder = CronJob.from({
            cronTime: '0 20 19 * * 0,1,4',
            onTick: function () {
                Scheduler.sendRaidReminder('Raid invites will be going out in 20 minutes!')
            },
            start: false,
            name: 'Raid invites'
        });

        this.waShtReminder = CronJob.from({
            cronTime: '0 20 17 * * 0,1,4',
            onTick: function () {
                Scheduler.sendRaidReminder('Reminder: Make sure your WeakAuras are up-to-date and your sims are submitted to WoWAudit.')
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

        // this.jobs.push(this.inviteReminder);
        // this.jobs.push(this.waShtReminder);
        this.jobs.push(this.applicantCleanup);
    }

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