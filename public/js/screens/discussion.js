// The discussion bottom sheet: Read, Create, Update and Delete comments on one event.
import { h, icon } from '../dom.js';
import { getComments, postComment, patchComment, deleteComment, markSeen } from '../api.js';
import { state, canGoBack } from '../state.js';
import { relativeTime, dateText } from '../format.js';
import { showToast } from '../components/toast.js';
import { confirmDelete } from '../components/dialog.js';

const MAX = 500;
const PAGE = 50;

export async function openDiscussion(event, { onBadges } = {}) {
    const overlay = document.getElementById('overlay-root');
    document.body.classList.add('sheet-open');

    // ---- what this sheet is showing ----
    let comments = [];       // loaded so far, oldest first
    let total = 0;           // all comments on this event
    let status = 'loading';  // loading | ready | error
    let errorText = '';
    let editing = null;      // the comment being edited
    let replyTo = null;      // the comment being replied to
    let menuFor = null;      // comment id whose "..." menu is open
    let busy = false;

    const me = state.me || { name: 'You', initials: 'ME', avatar_color: '#0E7FA0' };
    const postingAs = () => (state.me?.show_name_on_comments === false ? 'Anonymous' : me.name);
    const detailHash = `#/event/${encodeURIComponent(event.id)}`;
    const close = () => {
        // If we opened the sheet from this event's page, step back to it; otherwise swap this entry for the event page
        if (canGoBack() && state.cameFrom === detailHash) history.back();
        else { state.replaceNext = true; location.replace(detailHash); }
    };

    // ---- page pieces ----
    const title = h('h2', { id: 'sheet-title' });
    const list = h('div', { class: 'sheet-list' });
    const input = h('input', { class: 'composer-input', type: 'text', maxlength: MAX, autocomplete: 'off', enterkeyhint: 'send' });
    const sendBtn = h('button', { class: 'send-btn', type: 'button', 'aria-label': 'Send' }, icon('send'));
    const banner = h('div', { class: 'composer-banner' });
    const meta = h('div', { class: 'composer-meta' });
    const closeBtn = h('button', { class: 'round-btn small', type: 'button', 'aria-label': 'Close discussion', onClick: close }, icon('x'));

    const sheet = h('section', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title' },
        h('div', { class: 'grab' }),
        h('header', { class: 'sheet-head' },
            h('div', {}, title, h('p', { class: 'sub' }, `${event.title} · ${dateText(event)}`)),
            closeBtn),
        list,
        h('footer', { class: 'composer' }, banner, meta, h('div', { class: 'composer-row' }, input, sendBtn)));
    const scrim = h('div', { class: 'sheet-scrim', onClick: close });
    overlay.replaceChildren(scrim, sheet);

    // ---- drawing ----
    const badge = (c) => c.is_mine ? h('span', { class: 'role you' }, 'YOU')
        : h('span', { class: `role ${c.author.role === 'organizer' ? 'organizer' : 'student'}` }, c.author.role.toUpperCase());

    function commentEl(c, isReply) {
        const el = h('article', { class: `comment${isReply ? ' reply' : ''}${editing?.comment_id === c.comment_id ? ' editing' : ''}`, dataset: { id: c.comment_id } },
            h('span', { class: 'avatar big', style: `background:${c.author.avatar_color}` }, c.author.initials),
            h('div', { class: 'c-main' },
                h('div', { class: 'c-head' },
                    h('span', { class: 'c-name' }, c.author.name), badge(c),
                    h('span', { class: 'c-time' }, relativeTime(c.created_at) + (c.is_edited ? ' · edited' : '')),
                    c.is_mine && h('button', { class: 'c-more', type: 'button', 'aria-label': 'Comment options', 'aria-haspopup': 'menu',
                        'aria-expanded': String(menuFor === c.comment_id),
                        onClick: (e) => { e.stopPropagation(); menuFor = menuFor === c.comment_id ? null : c.comment_id; paintList(); } }, icon('more'))),
                h('p', { class: 'c-text' }, c.comment_text), // text only: user words are never treated as HTML
                !isReply && h('button', { class: 'c-reply', type: 'button', onClick: () => startReply(c) }, 'Reply')));
        if (menuFor === c.comment_id) {
            el.append(h('div', { class: 'menu', role: 'menu' },
                h('button', { role: 'menuitem', type: 'button', onClick: () => startEdit(c) }, icon('pencil'), 'Edit comment'),
                h('button', { role: 'menuitem', type: 'button', class: 'danger', onClick: () => removeComment(c) }, icon('trash'), 'Delete comment')));
        }
        return el;
    }

    // Top-level comments in time order, each followed by its replies
    function ordered() {
        const ids = new Set(comments.map(c => c.comment_id));
        const top = comments.filter(c => !c.parent_id || !ids.has(c.parent_id)); // a reply whose parent is gone counts as top-level
        return top.flatMap(c => [[c, false], ...comments.filter(r => r.parent_id === c.comment_id).map(r => [r, true])]);
    }

    function paintList() {
        title.textContent = `Discussion (${total})`;
        if (status === 'loading') {
            list.replaceChildren(...[0, 1, 2].map(() => h('div', { class: 'skeleton comment-sk' })));
        } else if (status === 'error') {
            list.replaceChildren(h('div', { class: 'message' }, h('h2', {}, "Couldn't load comments"), h('p', {}, errorText),
                h('button', { class: 'btn primary', type: 'button', onClick: load }, 'Retry')));
        } else if (comments.length === 0) {
            list.replaceChildren(h('div', { class: 'message' }, h('div', { class: 'empty-icon' }, icon('message')),
                h('h2', {}, 'No comments yet'), h('p', {}, 'Be the first to ask a question or share a thought.')));
        } else {
            const earlier = total - comments.length;
            list.replaceChildren(
                ...(earlier > 0 ? [h('button', { class: 'earlier', type: 'button', onClick: loadEarlier }, `Show ${earlier} earlier comment${earlier === 1 ? '' : 's'}`)] : []),
                ...ordered().map(([c, isReply]) => commentEl(c, isReply)));
        }
        paintComposer();
    }

    function paintComposer() {
        const text = input.value;
        const typing = text.length > 0 || document.activeElement === input;
        input.placeholder = editing ? '' : replyTo ? `Reply to ${replyTo.author.name}…`
            : comments.length === 0 && status === 'ready' ? 'Start the conversation…' : 'Ask a question or add a comment';
        sendBtn.disabled = busy || text.trim().length === 0;
        sendBtn.classList.toggle('ready', !sendBtn.disabled);
        sendBtn.setAttribute('aria-label', editing ? 'Save changes' : 'Send');

        banner.replaceChildren(...(editing
            ? [h('span', {}, 'Editing comment'), h('button', { class: 'x-small', type: 'button', 'aria-label': 'Cancel editing', onClick: cancelEdit }, icon('x'))]
            : replyTo ? [h('span', {}, `Replying to ${replyTo.author.name}`), h('button', { class: 'x-small', type: 'button', 'aria-label': 'Cancel reply', onClick: cancelReply }, icon('x'))] : []));
        banner.hidden = !editing && !replyTo;
        meta.replaceChildren(...(typing && !editing ? [h('span', {}, `Posting as ${postingAs()}`), h('span', {}, `${text.length} / ${MAX}`)] : []));
        meta.hidden = !(typing && !editing);
    }

    // ---- reading ----
    async function load() {
        status = 'loading'; paintList();
        try {
            const data = await getComments(event.id, { limit: PAGE });
            comments = data.comments; total = data.total; status = 'ready';
            paintList();
            list.scrollTop = list.scrollHeight; // open at the newest comments
        } catch (error) {
            status = 'error'; errorText = error.message; paintList();
        }
    }

    async function loadEarlier() {
        try {
            const data = await getComments(event.id, { limit: PAGE, before: comments[0].created_at });
            const keep = list.scrollHeight - list.scrollTop; // keep what you were reading in place
            comments = [...data.comments, ...comments]; total = data.total;
            paintList();
            list.scrollTop = list.scrollHeight - keep;
        } catch (error) {
            showToast("Couldn't load earlier comments. Try again.");
        }
    }

    // ---- creating and updating ----
    function startReply(c) { cancelEdit(true); replyTo = c; menuFor = null; paintList(); input.focus(); }
    function cancelReply() { replyTo = null; paintComposer(); }
    function startEdit(c) {
        menuFor = null; replyTo = null; editing = c;
        input.value = c.comment_text;
        paintList(); input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    }
    function cancelEdit(silent) {
        if (!editing) return;
        editing = null; input.value = '';
        if (!silent) paintList();
    }

    async function submit() {
        const text = input.value.trim();
        if (!text || busy) return;
        busy = true; paintComposer();
        try {
            if (editing) {
                // Show the new text straight away; put the old text back if the server says no
                const target = editing, before = { ...target };
                Object.assign(target, { comment_text: text, updated_at: new Date().toISOString(), is_edited: true });
                editing = null; input.value = ''; paintList();
                try {
                    Object.assign(target, await patchComment(target.comment_id, text));
                    paintList(); showToast('Comment updated');
                } catch (error) {
                    Object.assign(target, before); paintList();
                    showToast(error.message || "Couldn't update your comment. Try again.");
                }
            } else {
                const created = await postComment(event.id, text, replyTo?.comment_id);
                comments.push(created); total += 1;
                input.value = ''; replyTo = null; paintList();
                list.querySelector(`[data-id="${created.comment_id}"]`)?.scrollIntoView({ block: 'nearest' });
                showToast('Comment posted');
            }
        } catch (error) {
            showToast(error.message || "Couldn't post your comment. Try again.");
        } finally {
            busy = false; paintComposer();
        }
    }

    // ---- deleting (after "Are you sure?") ----
    async function removeComment(c) {
        menuFor = null; paintList();
        const confirmed = await confirmDelete({ quote: c.comment_text, eventTitle: event.title });
        if (!confirmed) return;
        const index = comments.indexOf(c);
        comments = comments.filter(x => x !== c); total -= 1; // vanishes straight away
        if (editing === c) cancelEdit(true);
        paintList();
        try {
            await deleteComment(c.comment_id);
            showToast('Comment deleted');
        } catch (error) {
            comments.splice(index, 0, c); total += 1; paintList(); // put it back
            showToast(error.message || "Couldn't delete the comment. Try again.");
        }
    }

    // ---- wiring ----
    input.addEventListener('input', paintComposer);
    input.addEventListener('focus', paintComposer);
    input.addEventListener('blur', paintComposer);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    sendBtn.addEventListener('click', submit);

    // Tapping anywhere else closes an open "..." menu
    sheet.addEventListener('click', (e) => { if (menuFor && !e.target.closest('.menu, .c-more')) { menuFor = null; paintList(); } });

    // Esc closes the menu, then the sheet. Tab stays inside the sheet.
    const onKey = (e) => {
        if (!sheet.isConnected) return document.removeEventListener('keydown', onKey);
        if (document.querySelector('.dialog-scrim')) return; // the dialog handles its own keys
        if (e.key === 'Escape') { menuFor ? (menuFor = null, paintList()) : close(); }
        if (e.key === 'Tab') {
            const focusable = [...sheet.querySelectorAll('button:not([disabled]), input')].filter(el => !el.closest('[hidden]'));
            if (!focusable.length) return;
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    };
    document.addEventListener('keydown', onKey);

    paintList();
    sheet.tabIndex = -1; sheet.focus(); // focus the sheet itself (not the close button, which would show a focus ring)
    await load();
    markSeen(event.id).then(() => onBadges?.()).catch(() => {}); // opening a thread clears its "new reply" flag
}
