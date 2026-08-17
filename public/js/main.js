import { fetchReminders, updateReminder } from './api.js?v=admin-ui-v2';
import { renderReminderList } from './ui.js?v=admin-ui-v2';

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
