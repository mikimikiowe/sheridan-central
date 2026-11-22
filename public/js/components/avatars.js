import { h } from '../dom.js';

// Overlapping initials circles, plus "+N" for the other people who commented.
export function avatarStack(event) {
    const shown = event.commenters || [];
    const extra = (event.commenterCount || 0) - shown.length;
    return h('div', { class: 'avatars', 'aria-hidden': 'true' },
        shown.map(u => h('span', { class: 'avatar', style: `background:${u.avatar_color}` }, u.initials)),
        extra > 0 && h('span', { class: 'avatar more' }, `+${extra}`));
}
