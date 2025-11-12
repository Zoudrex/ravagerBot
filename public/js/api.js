export async function fetchReminders() {
    const response = await fetch('/api/reminders');
    if (!response.ok) {
        throw new Error('Failed to load reminders');
    }
    const data = await response.json();

    // Support both array and { reminders, serverTimeZone }
    if (Array.isArray(data)) {
        return {
            reminders: data,
            serverTimeZone: 'UTC'
        };
    }

    return {
        reminders: data.reminders || [],
        serverTimeZone: data.serverTimeZone || 'UTC'
    };
}

export async function updateReminder(reminderId, payload) {
    const response = await fetch(`/api/reminders/${reminderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let message = 'Failed to save';
        try {
            const body = await response.json();
            if (body && body.error) message = body.error;
        } catch (_) { /* ignore */ }
        throw new Error(message);
    }
}
