import { h, icon } from '../dom.js';
import { getSubscriptions, subscribe, unsubscribe } from '../api.js';
import { pageHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';

const initialsOfName = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

export async function renderSubscribed(root) {
    const list = h('div', { class: 'card list-card sources' });
    root.replaceChildren(pageHeader('Subscribed', { back: '#/profile' }), h('div', { class: 'settings' }, list));
    list.replaceChildren(h('div', { class: 'message' }, 'Loading…'));
    try {
        const sources = await getSubscriptions();
        const row = (s) => {
            const bell = h('button', { class: 'bell-toggle', type: 'button' }, icon('bell'));
            const paint = () => {
                bell.setAttribute('aria-pressed', String(s.subscribed));
                bell.setAttribute('aria-label', `${s.subscribed ? 'Unsubscribe from' : 'Subscribe to'} ${s.name}`);
            };
            paint();
            bell.addEventListener('click', async () => {
                s.subscribed = !s.subscribed; paint();
                try { await (s.subscribed ? subscribe(s.source) : unsubscribe(s.source)); }
                catch { s.subscribed = !s.subscribed; paint(); showToast("Couldn't update that. Try again."); }
            });
            return h('div', { class: 'row source-row' },
                h('span', { class: 'avatar big', style: `background:${s.color}` }, initialsOfName(s.name)),
                h('span', { class: 'row-text' }, h('span', { class: 'row-label' }, s.name),
                    h('span', { class: 'row-sub' }, `${s.blurb ? s.blurb + ' · ' : ''}${s.upcoming} upcoming`)),
                bell);
        };
        list.replaceChildren(...sources.map(row));
    } catch (error) {
        list.replaceChildren(h('div', { class: 'message' }, h('h2', {}, "Couldn't load sources"), h('p', {}, error.message),
            h('button', { class: 'btn primary', type: 'button', onClick: () => renderSubscribed(root) }, 'Retry')));
    }
}
