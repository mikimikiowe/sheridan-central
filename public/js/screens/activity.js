import { h } from '../dom.js';
import { getActivity } from '../api.js';
import { state } from '../state.js';
import { relativeTime } from '../format.js';
import { pageHeader, bellButton } from '../components/header.js';
import { avatarStack } from '../components/avatars.js';
import { openNotifications } from '../components/notifications.js';

// "LATEST · M. OLARTE REPLIED · 2H AGO"
function latestLabel(latest) {
    const who = latest.verb === 'you' ? 'YOU' : `${latest.author.name.toUpperCase()} ${latest.verb === 'replied' ? 'REPLIED' : 'COMMENTED'}`;
    return `LATEST · ${who} · ${relativeTime(latest.created_at).toUpperCase()}`;
}

export async function renderActivity(root, { onBadges }) {
    const list = h('div', { class: 'cards' });
    root.replaceChildren(pageHeader('My Activity', { right: bellButton(() => openNotifications({ onChange: onBadges })) }), list);

    list.replaceChildren(h('div', { class: 'skeleton card-sk short' }));
    try {
        const data = await getActivity();
        state.newReplies = data.new_replies; onBadges?.();
        if (data.items.length === 0) {
            list.replaceChildren(h('div', { class: 'message' }, h('h2', {}, 'No discussions yet'),
                h('p', {}, 'Comment on an event and your conversations will show up here.'),
                h('a', { class: 'btn primary', href: '#/events' }, 'Browse events')));
            return;
        }
        list.replaceChildren(...data.items.map(item => h('article', { class: 'card activity-card' },
            h('div', { class: 'activity-top' },
                h('h2', { class: 'activity-title' }, item.event.title),
                item.hasNewReply && h('span', { class: 'pill-new' }, `${item.newReplies} new repl${item.newReplies === 1 ? 'y' : 'ies'}`)),
            h('div', { class: 'activity-meta' }, avatarStack(item.event),
                h('span', { class: 'count' }, `${item.commentCount} comment${item.commentCount === 1 ? '' : 's'}`)),
            h('div', { class: 'latest' },
                h('div', { class: 'latest-label' }, latestLabel(item.latest)),
                h('p', {}, item.latest.comment_text)),
            h('div', { class: 'activity-actions' },
                h('a', { class: 'btn outline small', href: `#/event/${encodeURIComponent(item.event.id)}` }, 'Event details'),
                h('a', { class: 'btn primary small', href: `#/event/${encodeURIComponent(item.event.id)}/discussion` }, 'Open')))));
    } catch (error) {
        list.replaceChildren(h('div', { class: 'message' }, h('h2', {}, "Couldn't load your activity"), h('p', {}, error.message),
            h('button', { class: 'btn primary', type: 'button', onClick: () => renderActivity(root, { onBadges }) }, 'Retry')));
    }
}
