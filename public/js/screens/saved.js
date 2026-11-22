import { h, icon } from '../dom.js';
import { getSaves, saveEvent, clearPastSaves } from '../api.js';
import { state } from '../state.js';
import { unsaveEvent } from '../api.js';
import { eventCard } from '../components/eventCard.js';
import { showToast } from '../components/toast.js';
import { pageHeader } from '../components/header.js';

export async function renderSaved(root) {
    const list = h('div', { class: 'cards' });
    const clearBtn = h('button', { class: 'btn outline small', type: 'button' }, 'Clear past events');
    let events = [];

    root.replaceChildren(pageHeader('Saved events', { right: clearBtn }), list);

    function paint() {
        if (events.length === 0) {
            list.replaceChildren(h('div', { class: 'message empty' },
                h('div', { class: 'empty-icon' }, icon('bookmark')),
                h('h2', {}, 'No saved events'),
                h('a', { class: 'btn primary', href: '#/events' }, 'Browse events')));
            return;
        }
        list.replaceChildren(...events.map(e => eventCard(e, { onRemove: remove })));
    }

    // Remove with Undo: the card disappears at once, and Undo saves it again
    async function remove(event) {
        events = events.filter(e => e.id !== event.id);
        paint();
        try {
            await unsaveEvent(event.id);
        } catch (error) {
            showToast("Couldn't remove it. Try again.");
            return load();
        }
        showToast('Removed from saved', { action: { label: 'Undo', onClick: async () => {
            try { await saveEvent(event.id); } catch { showToast("Couldn't undo. Try again."); }
            load();
        } } });
    }

    clearBtn.addEventListener('click', async () => {
        try {
            const { removed, event_ids } = await clearPastSaves();
            if (!removed) return showToast('No past events to clear');
            events = events.filter(e => !event_ids.includes(e.id));
            paint();
            showToast(`${removed} past event${removed === 1 ? '' : 's'} cleared`, { action: { label: 'Undo', onClick: async () => {
                await Promise.allSettled(event_ids.map(saveEvent));
                load();
            } } });
        } catch (error) {
            showToast("Couldn't clear past events. Try again.");
        }
    });

    async function load() {
        list.replaceChildren(h('div', { class: 'skeleton card-sk' }));
        try {
            events = (await getSaves()).events;
            paint();
            window.scrollTo(0, state.scroll['#/saved'] || 0);
        } catch (error) {
            list.replaceChildren(h('div', { class: 'message' },
                h('h2', {}, "Couldn't load saved events"), h('p', {}, error.message),
                h('button', { class: 'btn primary', type: 'button', onClick: load }, 'Retry')));
        }
    }
    load();
}
