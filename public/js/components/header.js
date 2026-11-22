import { h, icon } from '../dom.js';
import { state, goBack } from '../state.js';

// The header used by every screen, so the title always sits in exactly the same place.
// It stays at the top while the page scrolls. `right` goes on the right, `back` adds a back arrow,
// and `below` (like the filter row) sits under the title inside the same sticky block.
export function pageHeader(title, { right, back, below } = {}) {
    return h('div', { class: 'header-wrap' },
        h('div', { class: 'screen-header' },
            h('div', { class: 'header-left' },
                back && h('button', { class: 'back-link', type: 'button', 'aria-label': 'Back', onClick: () => goBack(back) }, icon('back')),
                h('h1', { class: 'screen-title' }, title)),
            right),
        below);
}

// Bell button with a pink dot when there are unread notifications. Opens the notifications panel.
export function bellButton(onClick) {
    return h('button', { class: 'round-btn bell', type: 'button', 'aria-label': 'Notifications', onClick },
        icon('bell'), h('span', { class: 'bell-dot', hidden: state.unread === 0 }));
}
