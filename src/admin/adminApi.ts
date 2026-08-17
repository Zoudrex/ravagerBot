import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import Scheduler, { ReminderConfig } from '../schedulers/scheduler';
const publicDir = path.join(process.cwd(), 'public');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static(publicDir));

app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

let started = false;

export function startAdminApi(scheduler: Scheduler) {
    if (started) {
        return;
    }

    started = true;

    app.get('/api/reminders', (_req, res) => {
        const data = scheduler.getReminderConfigs();
        const serverTimeZone =
            process.env.SERVER_TZ ||
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            'UTC';

        res.json({ reminders: data, serverTimeZone });
    });

    app.put('/api/reminders/:id', (req, res) => {
        const id = req.params.id as ReminderConfig['id'];
        const patch = req.body as Partial<Omit<ReminderConfig, 'id'>>;

        if (!scheduler.hasReminderConfig(id)) {
            return res.status(404).json({ error: 'Unknown reminder id' });
        }

        try {
            const updated = scheduler.updateReminderConfig(id, patch);
            return res.json(updated);
        } catch (error) {
            console.error(`Failed to update reminder ${id}:`, error);
            return res.status(400).json({ error: 'Invalid reminder configuration' });
        }
    });

    const port = Number(process.env.ADMIN_PORT) || 3000;
    app.listen(port, () => {
        console.log(`Admin UI listening on http://localhost:${port}`);
    });
}
