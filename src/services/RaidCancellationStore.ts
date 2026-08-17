import fs from 'node:fs';
import path from 'node:path';

type CancellationState = {
    skippedRaidDates: string[];
};

type StoredCancellationState = Partial<CancellationState> & {
    cancelledRaidDates?: unknown;
};

export default class RaidCancellationStore {
    private readonly filePath: string;

    constructor(filePath?: string) {
        this.filePath = filePath ?? path.resolve(process.cwd(), 'data', 'raid-cancellations.json');
    }

    isCancelled(date: string): boolean {
        return this.load().skippedRaidDates.includes(date);
    }

    markCancelled(date: string): void {
        const state = this.load();

        if (state.skippedRaidDates.includes(date)) {
            return;
        }

        this.save({
            skippedRaidDates: [...state.skippedRaidDates, date],
        });
    }

    private load(): CancellationState {
        try {
            if (!fs.existsSync(this.filePath)) {
                return {skippedRaidDates: []};
            }

            const raw = fs.readFileSync(this.filePath, 'utf-8');
            const parsed = JSON.parse(raw) as StoredCancellationState;

            return {
                skippedRaidDates: Array.isArray(parsed.skippedRaidDates)
                    ? parsed.skippedRaidDates
                    : Array.isArray(parsed.cancelledRaidDates)
                    ? parsed.cancelledRaidDates
                    : [],
            };
        } catch (error) {
            console.error('Failed to load raid cancellation state.', error);
            return {skippedRaidDates: []};
        }
    }

    private save(state: CancellationState): void {
        const dir = path.dirname(this.filePath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {recursive: true});
        }

        const tempPath = `${this.filePath}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
        fs.renameSync(tempPath, this.filePath);
    }
}
