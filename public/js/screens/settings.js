import { h, icon } from '../dom.js';
import { getMe, patchMe } from '../api.js';
import { state } from '../state.js';
import { pageHeader } from '../components/header.js';
import { toggleSwitch } from '../components/switch.js';
import { showToast } from '../components/toast.js';

const CAMPUSES = ['Trafalgar', 'HMC', 'Davis'];

export async function renderSettings(root) {
    root.replaceChildren(pageHeader('Account settings', { back: '#/profile' }), h('div', { class: 'message' }, 'Loading…'));
    let me;
    try { me = await getMe(); state.me = me; } catch (error) {
        root.replaceChildren(pageHeader('Account settings', { back: '#/profile' }), h('div', { class: 'message' }, h('h2', {}, "Couldn't load settings"), h('p', {}, error.message),
            h('button', { class: 'btn primary', type: 'button', onClick: () => renderSettings(root) }, 'Retry')));
        return;
    }
    let editingKey = null;
    const page = h('div', { class: 'settings' });
    root.replaceChildren(pageHeader('Account settings', { back: '#/profile' }), page);

    // A row you can tap to change. It opens into a small editor with Save and Cancel.
    function editableRow(label, key, { choices, max } = {}) {
        if (editingKey !== key) {
            return h('button', { class: 'row', type: 'button', onClick: () => { editingKey = key; paint(); } },
                h('span', { class: 'row-label' }, label), h('span', { class: 'row-value' }, me[key] || 'Not set'), icon('next'));
        }
        const field = choices
            ? h('select', { class: 'field', 'aria-label': label }, choices.map(c => h('option', { value: c, selected: c === me[key] }, c)))
            : h('input', { class: 'field', type: 'text', maxlength: max, value: me[key] || '', 'aria-label': label });
        const save = async () => {
            const value = field.value.trim();
            if (key === 'name' && !value) return showToast('Please enter a name.');
            try {
                me = { ...me, ...(await patchMe({ [key]: value })) };
                state.me = me; editingKey = null; paint(); showToast('Saved');
            } catch (error) { showToast(error.message); }
        };
        field.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { editingKey = null; paint(); } });
        setTimeout(() => field.focus(), 0);
        return h('div', { class: 'row editing' },
            h('span', { class: 'row-label' }, label), field,
            h('div', { class: 'edit-actions' },
                h('button', { class: 'btn outline small', type: 'button', onClick: () => { editingKey = null; paint(); } }, 'Cancel'),
                h('button', { class: 'btn primary small', type: 'button', onClick: save }, 'Save')));
    }

    const unavailable = (what) => () => showToast(`${what} isn't available in the demo.`);

    function paint() {
        page.replaceChildren(
            h('h3', { class: 'group-title' }, 'Profile'),
            h('div', { class: 'card list-card' },
                editableRow('Name', 'name', { max: 40 }), editableRow('Program', 'program', { max: 60 }),
                editableRow('Year', 'year', { max: 30 }), editableRow('Home campus', 'campus', { choices: CAMPUSES })),
            h('h3', { class: 'group-title' }, 'Account'),
            h('div', { class: 'card list-card' },
                h('div', { class: 'row' }, h('span', { class: 'row-label' }, 'Student email'), h('span', { class: 'row-value' }, me.email)),
                h('button', { class: 'row', type: 'button', onClick: unavailable('Changing your password') },
                    h('span', { class: 'row-label' }, 'Password'), h('span', { class: 'row-value' }, 'Change'), icon('next'))),
            h('h3', { class: 'group-title' }, 'Privacy'),
            h('div', { class: 'card list-card' },
                h('div', { class: 'row' }, h('span', { class: 'row-label' }, 'Show my name on comments'),
                    toggleSwitch('Show my name on comments', me.show_name_on_comments !== false, async (on) => {
                        try { me = { ...me, ...(await patchMe({ show_name_on_comments: on })) }; state.me = me; }
                        catch (error) { showToast("Couldn't save that. Try again."); throw error; }
                    })),
                h('button', { class: 'row', type: 'button', onClick: unavailable('This setting') },
                    h('span', { class: 'row-label' }, 'Who can follow me'), h('span', { class: 'row-value' }, 'Everyone'), icon('next'))));
    }
    paint();
}
