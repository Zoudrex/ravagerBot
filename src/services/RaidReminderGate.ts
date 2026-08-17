import RaidCancellationStore from "./RaidCancellationStore";
import WowAuditClient from "./WowAuditClient";

export default class RaidReminderGate {
    private readonly wowAuditClient = new WowAuditClient();
    private readonly cancellationStore = new RaidCancellationStore();

    async shouldSendReminder(date: string): Promise<boolean> {
        if (this.cancellationStore.isCancelled(date)) {
            console.log(`Raid reminder skipped; ${date} is cached as cancelled.`);
            return false;
        }

        try {
            const status = await this.wowAuditClient.getRaidStatusForDate(date);

            if (status === 'planned' || status === 'locked') {
                return true;
            }

            if (status === 'cancelled' || status === 'deleted') {
                this.cancellationStore.markCancelled(date);
                console.log(`Raid reminder skipped; WoWAudit says ${date} is ${status}.`);
                return false;
            }

            if (status === 'missing') {
                console.log(`Raid reminder skipped; WoWAudit has no raid for ${date}.`);
                return false;
            }

            console.warn(`WoWAudit raid status for ${date} was unknown; sending reminder.`);
            return true;
        } catch (error) {
            console.error(`Failed to check WoWAudit raid status for ${date}; sending reminder.`, error);
            return true;
        }
    }
}
