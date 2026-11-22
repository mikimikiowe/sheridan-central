import { h, icon } from '../dom.js';
import { getMe, patchMe } from '../api.js';
import { state, setUser } from '../state.js';
import { pageHeader } from '../components/header.js';
import { toggleSwitch } from '../components/switch.js';
import { showToast } from '../components/toast.js';

export async function renderProfile(root, { onBadges }) {
    root.replaceChildren(pageHeader('Profile'), h('div', { class: 'message' }, 'Loading…'));
    let me;
    try {
        me = await getMe(); state.me = me;
    } catch (error) {
        root.replaceChildren(pageHeader('Profile'), h('div', { class: 'message' }, h('h2', {}, "Couldn't load your profile"), h('p', {}, error.message),
            h('button', { class: 'btn primary', type: 'button', onClick: () => renderProfile(root, { onBadges }) }, 'Retry')));
        return;
    }
    const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
    const stat = (number, label, href) => h(href ? 'a' : 'div', { class: 'stat', href }, h('strong', {}, number), h('span', {}, label));

    root.replaceChildren(
        pageHeader('Profile'),
        h('div', { class: 'profile' },
            h('div', { class: 'big-avatar', style: `background:${me.avatar_color}` }, me.initials),
            h('h2', { class: 'profile-name' }, me.name),
            h('p', { class: 'profile-sub' }, [cap(me.role), me.program, me.campus].filter(Boolean).join(' · ')),
            h('div', { class: 'card stats' },
                stat(me.stats.followers, 'Followers'), stat(me.stats.following, 'Following'),
                stat(me.stats.subscribed, 'Subscribed', '#/profile/subscribed')),
            h('div', { class: 'card list-card' },
                h('div', { class: 'row' }, icon('bell'), h('span', { class: 'row-label' }, 'Notifications'),
                    toggleSwitch('Notifications', me.notifications_enabled, async (on) => {
                        try { await patchMe({ notifications_enabled: on }); state.me.notifications_enabled = on; onBadges?.(); }
                        catch (error) { showToast("Couldn't save that. Try again."); throw error; }
                    })),
                h('a', { class: 'row', href: '#/profile/settings' }, icon('lock'), h('span', { class: 'row-label' }, 'Account settings'), icon('next'))),
            h('button', { class: 'signout', type: 'button', onClick: () => { setUser(null); location.hash = '#/events'; location.reload(); } },
                icon('logout'), 'Sign out'),
            h('p', { class: 'fineprint' }, 'Demo sign-in: this picks a sample student and is not real security.')));
}
