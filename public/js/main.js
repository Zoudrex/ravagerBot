import { fetchReminders, updateReminder } from './api.js';
import { renderReminderList } from './ui.js';

async function bootstrap() {
    try {
        const { reminders, serverTimeZone } = await fetchReminders();
        const effectiveServerTz =
            serverTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        renderReminderList(reminders, effectiveServerTz, async (id, payload) => {
            await updateReminder(id, payload);
        });
    } catch (error) {
        console.error(error);
        const container = document.getElementById('reminders');
        container.textContent = 'Failed to load reminders.';
    }
}

bootstrap();
