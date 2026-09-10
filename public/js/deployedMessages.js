export function renderDeployedMessages(container, messages, onSave) {
    container.replaceChildren();
    for (const message of messages) {
        const card = document.createElement('section');
        card.className = 'card channel-message';
        // Only static markup is interpolated; saved text is assigned with .value.
        card.innerHTML = `
            <div class="header-row"><h3 class="title"></h3><a class="message-link" target="_blank" rel="noopener noreferrer" hidden>View in Discord ↗</a></div>
            <div class="field"><label></label><textarea maxlength="2000" rows="10" spellcheck="true"></textarea></div>
            <div class="message-help"><span>Discord Markdown supported · Buttons stay unchanged</span><span class="character-count"></span></div>
            <div class="button-row"><span class="status" role="status" aria-live="polite"></span><button class="save-button">Save and update Discord</button></div>
        `;
        card.querySelector('h3').textContent = message.title;
        const input = card.querySelector('textarea');
        input.id = `deployed-message-${message.id}`;
        input.value = message.content;
        const label = card.querySelector('label');
        label.htmlFor = input.id;
        label.textContent = `Message in #${message.channelName}`;
        const status = card.querySelector('.status');
        const counter = card.querySelector('.character-count');
        const save = card.querySelector('button');
        const link = card.querySelector('a');
        let saved = message;
        let saving = false;

        const setStatus = (text, kind = '') => {
            status.textContent = text;
            status.className = `status ${kind}`;
        };
        const refresh = () => {
            const dirty = input.value !== saved.content;
            const valid = input.value.trim().length > 0 && input.value.length <= 2000;
            counter.textContent = `${input.value.length.toLocaleString()} / 2,000`;
            save.disabled = saving || !valid || (!dirty && saved.synced);
            save.textContent = saving ? 'Saving…' : !dirty && !saved.synced ? 'Retry Discord update' : 'Save and update Discord';
            link.hidden = !saved.url;
            if (saved.url) link.href = saved.url;
        };
        setStatus(saved.status, saved.synced ? 'ok' : '');
        refresh();
        input.addEventListener('input', () => {
            refresh();
            setStatus(!input.value.trim() ? 'Message cannot be blank.' : input.value !== saved.content ? 'Unsaved changes' : saved.status);
        });
        save.addEventListener('click', async () => {
            if (saving || save.disabled) return;
            saving = true;
            input.disabled = true;
            refresh();
            setStatus('Saving and updating Discord…');
            try {
                saved = await onSave(message.id, input.value, saved.content);
                setStatus(saved.status, saved.synced ? 'ok' : 'error');
            } catch (error) {
                setStatus(error.message || 'Could not save this message. Please retry.', 'error');
            } finally {
                saving = false;
                input.disabled = false;
                refresh();
            }
        });
        container.append(card);
    }
}
