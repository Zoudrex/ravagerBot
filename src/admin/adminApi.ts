import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { scheduler } from '../schedulers/schedulerInstance';
import { ReminderConfig } from '../schedulers/scheduler';

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/api/reminders', (_req, res) => {
    res.json(scheduler.getReminderConfigs());
});

app.put('/api/reminders/:id', (req, res) => {
    const id = req.params.id as ReminderConfig['id'];
    const patch = req.body as Partial<Omit<ReminderConfig, 'id'>>;
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
