import { h, icon } from '../dom.js';

// "Delete this comment?" confirmation. Resolves true (Delete) or false (Cancel / scrim / Esc).
// Focus starts on Cancel, Tab stays inside the dialog, and focus goes back to where it was.
export function confirmDelete({ quote, eventTitle }) {
    return new Promise(resolve => {
        const returnTo = document.activeElement;
        const done = (answer) => { scrim.remove(); document.removeEventListener('keydown', onKey, true); returnTo?.focus?.(); resolve(answer); };

        const cancel = h('button', { class: 'btn outline grow', type: 'button', onClick: () => done(false) }, 'Cancel');
        const del = h('button', { class: 'btn danger grow', type: 'button', onClick: () => done(true) }, 'Delete');
        const dialog = h('div', { class: 'dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'dlg-title', 'aria-describedby': 'dlg-text' },
            h('div', { class: 'dialog-icon' }, icon('trash')),
            h('h2', { id: 'dlg-title' }, 'Delete this comment?'),
            h('p', { id: 'dlg-text' }, `Your comment will be permanently removed from the ${eventTitle} discussion. This can't be undone.`),
            h('blockquote', {}, `“${quote}”`),
            h('div', { class: 'dialog-actions' }, cancel, del));
        const scrim = h('div', { class: 'dialog-scrim', onClick: (e) => { if (e.target === scrim) done(false); } }, dialog);

        function onKey(e) {
            if (e.key === 'Escape') { e.stopPropagation(); done(false); }
            if (e.key === 'Tab') { // keep focus inside the dialog
                e.preventDefault();
                (document.activeElement === cancel ? del : cancel).focus();
            }
        }
        document.addEventListener('keydown', onKey, true);
        document.getElementById('overlay-root').append(scrim);
        cancel.focus();
    });
}
