import { h, icon } from '../dom.js';
import { badgeDate, whenLine, whereText } from '../format.js';
import { poster } from './poster.js';
import { saveToggle } from './saveToggle.js';
import { avatarStack } from './avatars.js';

// mode "saved": the bookmark becomes an X (remove) button and finished events get an "Ended" badge.
export function eventCard(event, { onRemove } = {}) {
    const { month, day } = badgeDate(event);
    const where = whereText(event);
    const open = () => { location.hash = `#/event/${encodeURIComponent(event.id)}`; };

    const corner = onRemove
        ? h('button', { class: 'save-toggle remove', type: 'button', 'aria-label': `Remove ${event.title} from saved`,
            onClick: (e) => { e.stopPropagation(); onRemove(event); } }, icon('x'))
        : saveToggle(event);

    return h('article', { class: `card${event.isPast ? ' past' : ''}`, onClick: open },
        poster(event,
            h('div', { class: 'date-badge' }, h('span', { class: 'm' }, month), h('span', { class: 'd' }, day)),
            event.isPast && h('span', { class: 'ended-badge' }, 'Ended'),
            corner),
        h('div', { class: 'card-body' },
            h('div', { class: 'eyebrow' }, event.source_name),
            h('h2', { class: 'card-title' }, event.title),
            h('div', { class: 'meta-row' }, icon('calendar'), whenLine(event)),
            where && h('div', { class: 'meta-row' }, icon('pin'), where),
            h('div', { class: 'card-foot' },
                avatarStack(event),
                h('span', { class: 'count' }, event.commentCount
                    ? `${event.commentCount} comment${event.commentCount === 1 ? '' : 's'}` : 'No comments yet'),
                h('button', { class: 'btn primary small', type: 'button', onClick: (e) => { e.stopPropagation(); open(); } }, 'Details'))));
}
