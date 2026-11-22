import { h, icon } from '../dom.js';
import { getEvent } from '../api.js';
import { state, setRegistered, goBack } from '../state.js';
import { badgeDate, dateText, timeText, whereText, priceText, isFree, isPast, relativeTime } from '../format.js';
import { poster } from '../components/poster.js';
import { saveToggle } from '../components/saveToggle.js';
import { avatarStack } from '../components/avatars.js';

export async function renderDetail(root, id) {
    root.replaceChildren(h('div', { class: 'message' }, 'Loading…'));
    root.dataset.event = id;
    let event;
    try {
        event = await getEvent(id);
    } catch (error) {
        root.replaceChildren(h('div', { class: 'message' },
            h('h2', {}, "Couldn't open this event"), h('p', {}, error.message),
            h('a', { class: 'btn primary', href: '#/events' }, 'Back to events')));
        return null;
    }
    const past = isPast(event);
    const where = whereText(event), time = timeText(event), price = priceText(event);

    // Back = the page you were on before
    const back = () => goBack(state.lastList || '#/events');

    const openDiscussion = () => { location.hash = `#/event/${encodeURIComponent(event.id)}/discussion`; };

    const hero = h('div', { class: 'hero' },
        poster(event),
        h('div', { class: 'hero-actions' },
            h('button', { class: 'round-btn', type: 'button', 'aria-label': 'Back', onClick: back }, icon('back')),
            h('div', { class: 'right' },
                // Jump straight to the discussion without scrolling to the bottom of the page
                h('button', { class: 'round-btn chat-btn', type: 'button', onClick: openDiscussion,
                    'aria-label': event.commentCount ? `Open discussion, ${event.commentCount} comments` : 'Open discussion' },
                    icon('message'), event.commentCount > 0 && h('span', { class: 'count-badge' }, event.commentCount > 99 ? '99+' : event.commentCount)),
                saveToggle(event, { large: true }))));

    const paragraphs = (event.description || event.excerpt || '').split(/\n{1,}/).map(p => p.trim()).filter(Boolean);

    const discussion = h('button', { class: 'discussion-card', type: 'button', onClick: openDiscussion },
        h('div', {},
            h('h3', {}, 'Open discussion'),
            h('div', { class: 'sub' }, event.commentCount
                ? `${event.commentCount} comment${event.commentCount === 1 ? '' : 's'} · latest ${relativeTime(event.latestCommentAt)}`
                : 'No comments yet. Start the conversation.'),
            avatarStack(event)),
        h('span', { class: 'chat' }, icon('message')));

    // Register: remembered on this device, opens the real registration page in a new tab
    const registerBtn = h('button', { class: 'btn primary', type: 'button', disabled: past });
    const paintRegister = () => {
        registerBtn.replaceChildren(...(past ? ['Event ended'] : state.registered.has(event.id) ? [icon('check'), 'Registered'] : ['Register']));
    };
    paintRegister();
    registerBtn.addEventListener('click', () => {
        if (!state.registered.has(event.id) && event.url) window.open(event.url, '_blank', 'noopener');
        setRegistered(event.id, !state.registered.has(event.id));
        paintRegister();
    });

    root.replaceChildren(
        hero,
        h('div', { class: 'sheet-body' },
            h('div', { class: 'eyebrow' }, event.source_name, isFree(event) && h('span', { class: 'tag-free' }, 'Free')),
            h('h1', { class: 'detail-title' }, event.title),
            h('dl', { class: 'info' },
                h('dt', {}, 'Date'), h('dd', {}, dateText(event)),
                time && [h('dt', {}, 'Time'), h('dd', {}, time)],
                where && [h('dt', {}, 'Where'), h('dd', {}, where)],
                price && [h('dt', {}, 'Price'), h('dd', {}, price)]),
            h('div', { class: 'description' }, paragraphs.map(p => h('p', {}, p))),
            discussion),
        h('div', { class: 'action-bar' },
            // Long organization names would be cramped, so they get a shorter label
            event.url && h('a', { class: 'btn outline', href: event.url, target: '_blank', rel: 'noopener' },
                h('span', { class: 'btn-label' }, event.source_name.length > 10 ? 'View event page' : `View on ${event.source_name}`), icon('external')),
            registerBtn));
    return event;
}
