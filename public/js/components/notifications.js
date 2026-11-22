import { h, icon } from '../dom.js';
import { getNotifications, markNotificationsRead } from '../api.js';
import { state } from '../state.js';
import { relativeTime } from '../format.js';

// The dropdown notifications panel. Everything in it comes from /api/me/notifications.
export async function openNotifications({ onChange } = {}) {
    const overlay = document.getElementById('overlay-root');
    const close = () => { scrim.remove(); panel.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const go = (hash) => { close(); location.hash = hash; };

    const panel = h('section', { class: 'notif-panel', role: 'dialog', 'aria-label': 'Notifications' });
    const scrim = h('div', { class: 'notif-scrim', onClick: close });
    overlay.replaceChildren(scrim, panel);
    document.addEventListener('keydown', onKey);

    let data = null;
    const markAll = async () => {
        data.items.forEach(i => { i.unread = false; }); data.unread_count = 0;
        state.unread = 0; paint();
        document.querySelectorAll('.bell-dot').forEach(dot => { dot.hidden = true; }); // hide the dot right away
        try { await markNotificationsRead(); } catch { /* the dots will correct themselves on the next refresh */ }
        onChange?.(); // only after the server has saved it, or the refresh would bring the dot back
    };

    function row(item) {
        const sentence = item.type === 'reminder'
            ? [h('strong', {}, item.event_title), ` ${item.when}`]
            : [h('strong', {}, item.actor.name), item.type === 'reply' ? ' replied to your comment' : ` commented in ${item.event_title}`];
        const sub = item.type === 'reminder' ? 'Reminder'
            : item.type === 'reply' ? `${item.event_title} · ${relativeTime(item.created_at)}` : relativeTime(item.created_at);
        return h('button', { class: `notif-row${item.unread ? ' unread' : ''}`, type: 'button',
            onClick: () => go(`#/event/${encodeURIComponent(item.event_id)}${item.type === 'reminder' ? '' : '/discussion'}`) },
            item.type === 'reminder'
                ? h('span', { class: 'avatar big cal' }, icon('calendar'))
                : h('span', { class: 'avatar big', style: `background:${item.actor.avatar_color}` }, item.actor.initials),
            h('span', { class: 'notif-text' }, h('span', { class: 'notif-line' }, sentence), h('span', { class: 'notif-sub' }, sub)),
            item.unread && h('span', { class: 'unread-dot', 'aria-label': 'Unread' }));
    }

    function paint() {
        const body = !data ? [h('div', { class: 'notif-empty' }, 'Loading…')]
            : data.error ? [h('div', { class: 'notif-empty' }, data.error)]
            : !data.enabled ? [h('div', { class: 'notif-empty' }, 'Notifications are turned off. You can turn them on in Profile.')]
            : data.items.length === 0 ? [h('div', { class: 'notif-empty' }, "You're all caught up.")]
            : data.items.map(row);
        panel.replaceChildren(
            h('header', { class: 'notif-head' }, h('h2', {}, 'Notifications'),
                data?.items?.some(i => i.unread) && h('button', { class: 'link-btn', type: 'button', onClick: markAll }, 'Mark all read')),
            h('div', { class: 'notif-list' }, body),
            h('button', { class: 'notif-foot', type: 'button', onClick: () => go('#/activity') }, 'View my activity'));
    }

    paint();
    try { data = await getNotifications(); } catch (error) { data = { error: error.message }; }
    paint();
}
