import { h } from '../dom.js';
import { getUsers } from '../api.js';
import { setUser } from '../state.js';
import { pageHeader } from '../components/header.js';

// Demo sign-in: pick a sample student. (This is NOT real security: anyone could pick anyone.)
export async function renderSignIn(root, { onDone }) {
    const list = h('div', { class: 'card list-card' }, h('div', { class: 'message' }, 'Loading…'));
    root.replaceChildren(pageHeader('Sheridan Central'),
        h('div', { class: 'settings' },
            h('h2', { class: 'signin-title' }, 'Choose a demo student'),
            h('p', { class: 'fineprint left' }, 'This is a demo sign-in for testing comments. It is not real security.'),
            list));
    try {
        const users = await getUsers();
        list.replaceChildren(...users.map(u => h('button', { class: 'row source-row', type: 'button',
            onClick: () => { setUser(u.user_id); onDone(); } },
            h('span', { class: 'avatar big', style: `background:${u.avatar_color}` }, u.initials),
            h('span', { class: 'row-text' }, h('span', { class: 'row-label' }, u.name),
                h('span', { class: 'row-sub' }, [u.role === 'organizer' ? 'Organizer' : 'Student', u.program].filter(Boolean).join(' · '))))));
    } catch (error) {
        list.replaceChildren(h('div', { class: 'message' }, h('p', {}, error.message),
            h('button', { class: 'btn primary', type: 'button', onClick: () => renderSignIn(root, { onDone }) }, 'Retry')));
    }
}
