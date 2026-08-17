import { DAY_OPTIONS, REMINDER_TITLES, leftPadTwo, parseCronSchedule, buildCronSchedule } from './cron.js?v=admin-ui-v2';
import { convertServerToClientTime, convertClientToServerTime, getOffsetMinutesForTimeZone } from './tz.js?v=admin-ui-v2';

const AUTO_SAVE_DELAY_MS = 2000;

export function renderReminderList(reminders, serverTimeZone, onSave) {
    const container = document.getElementById('reminders');
    container.innerHTML = '';

    const serverOffsetMinutes = getOffsetMinutesForTimeZone(serverTimeZone, new Date());
    const reminderViewModels = reminders.map(reminder => toReminderViewModel(reminder, serverOffsetMinutes));
    const sharedDays = getSharedRaidDays(reminderViewModels);

    container.innerHTML = `
      <section class="card">
        <div class="header-row">
          <div class="title">Raid days</div>
        </div>
        <div class="days">${renderDays(sharedDays)}</div>
      </section>

      <div class="reminder-list">
        ${reminderViewModels.map(renderReminder).join('')}
      </div>

      <div class="button-row sticky-actions">
        <span class="status"></span>
        <button class="save-button" disabled>Save</button>
      </div>
    `;

    const saveButton = container.querySelector('.save-button');
    const statusElement = container.querySelector('.status');
    let savedState = serializeState(readFormState(container, reminderViewModels));
    let autoSaveTimer;
    let saving = false;

    const markChanged = () => {
        window.clearTimeout(autoSaveTimer);
        updateSaveState();

        if (!isDirty()) {
            return;
        }

        statusElement.textContent = 'Unsaved changes';
        statusElement.className = 'status';
        autoSaveTimer = window.setTimeout(() => {
            void saveAll();
        }, AUTO_SAVE_DELAY_MS);
    };

    const isDirty = () => serializeState(readFormState(container, reminderViewModels)) !== savedState;

    const updateSaveState = () => {
        saveButton.disabled = saving || !isDirty();
    };

    const saveAll = async () => {
        window.clearTimeout(autoSaveTimer);

        if (saving || !isDirty()) {
            updateSaveState();
            return;
        }

        saving = true;
        saveButton.disabled = true;
        statusElement.textContent = 'Saving...';
        statusElement.className = 'status';

        try {
            const state = readFormState(container, reminderViewModels);
            const payloads = buildPayloads(state, serverOffsetMinutes);

            await Promise.all(payloads.map(payload => onSave(payload.id, payload.data)));

            savedState = serializeState(state);
            statusElement.textContent = 'Saved';
            statusElement.classList.add('ok');
        } catch (error) {
            statusElement.textContent = error.message || 'Error';
            statusElement.classList.add('error');
        } finally {
            saving = false;
            updateSaveState();
        }
    };

    container.addEventListener('input', markChanged);
    container.addEventListener('change', markChanged);
    saveButton.addEventListener('click', () => {
        void saveAll();
    });
}

function toReminderViewModel(reminder, serverOffsetMinutes) {
    const parsed = parseCronSchedule(reminder.schedule);
    const localTime = convertServerToClientTime(parsed.hour, parsed.minute, serverOffsetMinutes);

    return {
        ...reminder,
        parsed,
        timeValue: `${leftPadTwo(localTime.hour)}:${leftPadTwo(localTime.minute)}`,
        title: REMINDER_TITLES[reminder.id] || 'Reminder',
    };
}

function getSharedRaidDays(reminders) {
    return reminders.find(reminder => reminder.parsed.days.length > 0)?.parsed.days || ['sun', 'thu'];
}

function renderDays(selectedDays) {
    const selectedDaySet = new Set(selectedDays);

    return DAY_OPTIONS.map(day => {
        const checked = selectedDaySet.has(day.key) ? 'checked' : '';
        return `<label><input type="checkbox" data-day="${day.key}" ${checked}> ${day.label}</label>`;
    }).join('');
}

function renderReminder(reminder) {
    return `
      <section class="card" data-id="${reminder.id}">
        <div class="header-row">
          <div class="title">${reminder.title}</div>
          <label><input type="checkbox" data-field="enabled" ${reminder.enabled ? 'checked' : ''}> Enabled</label>
        </div>

        <div class="form-row">
          <div class="field">
            <label>Time</label>
            <input type="time" data-field="time" value="${reminder.timeValue}">
          </div>
        </div>

        <div class="field">
          <label>Message</label>
          <textarea data-field="message">${reminder.message || ''}</textarea>
        </div>
      </section>
    `;
}

function readFormState(container, reminders) {
    const selectedDays = Array.from(
        container.querySelectorAll('input[type="checkbox"][data-day]:checked')
    ).map(el => el.getAttribute('data-day'));

    return {
        selectedDays,
        reminders: reminders.map(reminder => {
            const section = container.querySelector(`[data-id="${reminder.id}"]`);

            return {
                id: reminder.id,
                enabled: section.querySelector('input[data-field="enabled"]').checked,
                time: section.querySelector('input[data-field="time"]').value,
                message: section.querySelector('textarea[data-field="message"]').value,
            };
        }),
    };
}

function buildPayloads(state, serverOffsetMinutes) {
    if (state.selectedDays.length === 0) {
        throw new Error('Select at least one raid day');
    }

    return state.reminders.map(reminder => {
        if (!/^\d{2}:\d{2}$/.test(reminder.time)) {
            throw new Error('Invalid time');
        }

        const [localHour, localMinute] = reminder.time.split(':').map(Number);
        const serverTime = convertClientToServerTime(localHour, localMinute, serverOffsetMinutes);

        return {
            id: reminder.id,
            data: {
                enabled: reminder.enabled,
                message: reminder.message,
                schedule: buildCronSchedule(serverTime.hour, serverTime.minute, state.selectedDays),
            },
        };
    });
}

function serializeState(state) {
    return JSON.stringify({
        selectedDays: [...state.selectedDays].sort(),
        reminders: state.reminders,
    });
}
