import { h, icon } from '../dom.js';
import { state } from '../state.js';

const TABS = [
    { label: 'Events', href: '#/events', icon: 'calendar', match: /^#\/(events|event\/)/ },
    { label: 'Saved', href: '#/saved', icon: 'bookmark', match: /^#\/saved/ },
    { label: 'Activity', href: '#/activity', icon: 'message', match: /^#\/activity/, dot: () => state.newReplies > 0 },
    { label: 'Profile', href: '#/profile', icon: 'user', match: /^#\/profile/ },
];

export function renderTabBar(hash) {
    // No tabs while signed out
    if (!state.userId) { document.getElementById('tabbar').replaceChildren(); return; }
    document.getElementById('tabbar').replaceChildren(...TABS.map(tab =>
        h('a', { class: 'tab', href: tab.href, 'aria-current': tab.match.test(hash) ? 'page' : null },
            h('span', { class: 'pill' }, icon(tab.icon), tab.dot?.() && h('span', { class: 'tab-dot', 'aria-label': 'New reply' })), tab.label)));
}
