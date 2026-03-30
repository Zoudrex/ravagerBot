import fs from 'node:fs';
import path from 'node:path';
import type { ReminderConfig, ReminderId } from '../schedulers/scheduler';

type ReminderConfigMap = Record<ReminderId, ReminderConfig>;

export default class ReminderConfigStore {
    private readonly filePath: string;

    constructor(filePath?: string) {
        this.filePath = filePath ?? path.resolve(process.cwd(), 'data', 'reminder-configs.json');
    }

    load(defaultConfigs: ReminderConfigMap): ReminderConfigMap {
        try {
            if (!fs.existsSync(this.filePath)) {
                this.ensureDirectoryExists();

                const clonedDefaults = structuredClone(defaultConfigs);
                this.save(clonedDefaults);

                return clonedDefaults;
            }

            const raw = fs.readFileSync(this.filePath, 'utf-8');
            const parsed = JSON.parse(raw) as Partial<ReminderConfigMap>;

            return {
                inviteReminder: {
                    ...defaultConfigs.inviteReminder,
                    ...parsed.inviteReminder,
                    id: 'inviteReminder',
                },
                waShtReminder: {
                    ...defaultConfigs.waShtReminder,
                    ...parsed.waShtReminder,
                    id: 'waShtReminder',
                },
            };
        } catch (error) {
            console.error('Failed to load reminder configs, falling back to defaults.', error);
            return structuredClone(defaultConfigs);
        }
    }

    save(configs: ReminderConfigMap): void {
        this.ensureDirectoryExists();

        const tempPath = `${this.filePath}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(configs, null, 2), 'utf-8');
        fs.renameSync(tempPath, this.filePath);
    }

    private ensureDirectoryExists(): void {
        const dir = path.dirname(this.filePath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}