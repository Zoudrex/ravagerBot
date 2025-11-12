import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { scheduler } from '../schedulers/schedulerInstance';
import { ReminderConfig } from '../schedulers/scheduler';
const publicDir = path.join(process.cwd(), 'public');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static(publicDir));

app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// adminApi.ts (GET /api/reminders)
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
    console.log(patch);
    const updated = scheduler.updateReminderConfig(id, patch);
    if (!updated) {
        return res.status(404).json({ error: 'Unknown reminder id' });
    }
    res.json(updated);
});

export function startAdminApi() {
    const port = Number(process.env.ADMIN_PORT) || 3000;
    app.listen(port, () => {
        console.log(`Admin UI listening on http://localhost:${port}`);
    });
}
