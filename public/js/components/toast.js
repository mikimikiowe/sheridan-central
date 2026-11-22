import { h } from '../dom.js';

let timer;
// A short message at the bottom. With `action` it becomes a snackbar with an Undo-style button.
export function showToast(message, { action, duration } = {}) {
    const root = document.getElementById('toast-root');
    const toast = h('div', { class: `toast${action ? ' with-action' : ''}`, role: 'status' },
        h('span', {}, message),
        action && h('button', { class: 'toast-action', type: 'button', onClick: () => { hideToast(); action.onClick(); } }, action.label));
    root.replaceChildren(toast);
    clearTimeout(timer);
    timer = setTimeout(hideToast, duration || (action ? 5000 : 2500));
}

export function hideToast() {
    clearTimeout(timer);
    document.getElementById('toast-root').replaceChildren();
}
