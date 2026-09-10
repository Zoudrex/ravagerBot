import { fetchReminders, updateReminder, fetchDeployedMessages, updateDeployedMessage } from './api.js?v=admin-ui-v3';
import { renderReminderList } from './ui.js?v=admin-ui-v2';
import { renderDeployedMessages } from './deployedMessages.js?v=admin-ui-v3';

let messagesLoaded = false;
let messagesLoading = false;

async function loadMessages() {
    if (messagesLoaded || messagesLoading) return;
    messagesLoading = true;
    const container = document.getElementById('deployed-messages');
    container.textContent = 'Loading channel messages…';
    try {
        const { messages } = await fetchDeployedMessages();
        renderDeployedMessages(container, messages, updateDeployedMessage);
        messagesLoaded = true;
    } catch (error) {
        console.error(error);
        container.textContent = error.message || 'Failed to load channel messages.';
        const retry = document.createElement('button');
        retry.className = 'save-button';
        retry.textContent = 'Retry loading';
        retry.addEventListener('click', () => { void loadMessages(); });
        container.append(document.createElement('br'), retry);
    } finally {
        messagesLoading = false;
    }
}

const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(selected) {
    for (const tab of tabs) {
        const active = tab === selected;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    }
    if (selected.id === 'messages-tab') void loadMessages();
}
tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
        if (event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length];
        if (event.key === 'Home') next = tabs[0];
        if (event.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        event.preventDefault();
        selectTab(next);
        next.focus();
    });
});

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
