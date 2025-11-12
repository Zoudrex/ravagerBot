import { DAY_OPTIONS, REMINDER_TITLES, leftPadTwo, parseCronSchedule, buildCronSchedule } from './cron.js';
import { convertServerToClientTime, convertClientToServerTime, getOffsetMinutesForTimeZone } from './tz.js';

export function renderReminderList(reminders, serverTimeZone, onSave) {
    const container = document.getElementById('reminders');
    container.innerHTML = '';

    const serverOffsetMinutes = getOffsetMinutesForTimeZone(serverTimeZone, new Date());

    reminders.forEach(reminder => {
        const parsed = parseCronSchedule(reminder.schedule);
        const localTime = convertServerToClientTime(parsed.hour, parsed.minute, serverOffsetMinutes);
        const timeValue = `${leftPadTwo(localTime.hour)}:${leftPadTwo(localTime.minute)}`;
        const selectedDaySet = new Set(parsed.days);
        const title = REMINDER_TITLES[reminder.id] || 'Reminder';

        const section = document.createElement('section');
        section.className = 'card';
        section.dataset.id = reminder.id;

        const daysMarkup = DAY_OPTIONS.map(d => {
            const checked = selectedDaySet.has(d.key) ? 'checked' : '';
            return `<label><input type="checkbox" data-day="${d.key}" ${checked}> ${d.label}</label>`;
        }).join('');

        section.innerHTML = `
      <div class="header-row">
        <div class="title">${title}</div>
        <label><input type="checkbox" data-field="enabled" ${reminder.enabled ? 'checked' : ''}> Enabled</label>
      </div>

      <div class="form-row">
        <div class="field">
          <label>Time</label>
          <input type="time" data-field="time" value="${timeValue}">
        </div>
        <div class="field">
          <label>Days</label>
          <div class="days">${daysMarkup}</div>
        </div>
      </div>

      <div class="field">
        <label>Message</label>
        <textarea data-field="message">${reminder.message || ''}</textarea>
      </div>

      <div class="button-row">
        <button class="save-button">Save</button>
        <span class="status"></span>
      </div>
    `;

        const saveButton = section.querySelector('.save-button');
        const statusElement = section.querySelector('.status');

        saveButton.addEventListener('click', async () => {
            statusElement.textContent = '';
            statusElement.className = 'status';

            try {
                const enabled = section.querySelector('input[data-field="enabled"]').checked;
                const timeInput = section.querySelector('input[data-field="time"]').value;
                const message = section.querySelector('textarea[data-field="message"]').value;
                const selectedDays = Array.from(
                    section.querySelectorAll('input[type="checkbox"][data-day]:checked')
                ).map(el => el.getAttribute('data-day'));

                if (!/^\d{2}:\d{2}$/.test(timeInput)) {
                    throw new Error('Invalid time');
                }
                if (selectedDays.length === 0) {
                    throw new Error('Select at least one day');
                }

                const [localHour, localMinute] = timeInput.split(':').map(Number);
                const serverTime = convertClientToServerTime(localHour, localMinute, serverOffsetMinutes);
                const schedule = buildCronSchedule(serverTime.hour, serverTime.minute, selectedDays);

                await onSave(reminder.id, { enabled, message, schedule });
                statusElement.textContent = 'Saved';
                statusElement.classList.add('ok');
            } catch (error) {
                statusElement.textContent = error.message || 'Error';
                statusElement.classList.add('error');
            }
        });

        container.appendChild(section);
    });
}
