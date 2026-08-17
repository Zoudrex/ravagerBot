import {config} from "../config";

type WowAuditRaid = {
    date?: string;
    start?: string;
    start_time?: string;
    starts_at?: string;
    status?: string;
};

type RaidStatus = 'planned' | 'locked' | 'cancelled' | 'deleted' | 'missing' | 'unknown';

const WOWAUDIT_API_BASE_URL = 'https://wowaudit.com';

export default class WowAuditClient {
    async getRaidStatusForDate(date: string): Promise<RaidStatus> {
        if (!config.WOWAUDIT_API_KEY) {
            console.warn('WOWAUDIT_API_KEY is not configured; raid reminders will be sent without WoWAudit validation.');
            return 'unknown';
        }

        const response = await fetch(`${WOWAUDIT_API_BASE_URL}/v1/raids`, {
            headers: {
                Authorization: `Bearer ${config.WOWAUDIT_API_KEY}`,
                'X-API-Key': config.WOWAUDIT_API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error(`WoWAudit returned ${response.status} ${response.statusText}`);
        }

        const raids = this.extractRaids(await response.json());
        const raid = raids.find(item => this.getRaidDate(item) === date);

        if (!raid) {
            return 'missing';
        }

        const status = this.normalizeStatus(raid.status);

        if (status === 'planned') {
            return 'planned';
        }

        if (status === 'locked') {
            return 'locked';
        }

        if (status === 'cancelled') {
            return 'cancelled';
        }

        if (status === 'deleted') {
            return 'deleted';
        }

        return 'unknown';
    }

    private normalizeStatus(status?: string): string | undefined {
        return status?.trim().toLowerCase();
    }

    private extractRaids(payload: unknown): WowAuditRaid[] {
        if (Array.isArray(payload)) {
            return payload as WowAuditRaid[];
        }

        if (payload && typeof payload === 'object') {
            const maybePayload = payload as {data?: unknown; raids?: unknown};

            if (Array.isArray(maybePayload.raids)) {
                return maybePayload.raids as WowAuditRaid[];
            }

            if (Array.isArray(maybePayload.data)) {
                return maybePayload.data as WowAuditRaid[];
            }
        }

        return [];
    }

    private getRaidDate(raid: WowAuditRaid): string | undefined {
        const rawDate = raid.date ?? raid.start ?? raid.start_time ?? raid.starts_at;

        if (!rawDate) {
            return undefined;
        }

        return rawDate.slice(0, 10);
    }
}
