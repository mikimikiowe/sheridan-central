import { h, icon } from '../dom.js';
import { saveEvent, unsaveEvent } from '../api.js';
import { showToast } from './toast.js';

// Bookmark button. Updates instantly, then tells the server; undoes itself if that fails.
export function saveToggle(event, { large = false } = {}) {
    const btn = h('button', { class: `save-toggle${large ? ' large' : ''}`, type: 'button' }, icon('bookmark'));
    const paint = () => {
        btn.setAttribute('aria-pressed', String(Boolean(event.isSaved)));
        btn.setAttribute('aria-label', event.isSaved ? `Remove ${event.title} from saved` : `Save ${event.title}`);
    };
    paint();
    btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // don't also open the card
        const wanted = !event.isSaved;
        event.isSaved = wanted; paint();
        try {
            await (wanted ? saveEvent(event.id) : unsaveEvent(event.id));
        } catch (error) {
            event.isSaved = !wanted; paint();
            showToast("Couldn't update your saved events. Try again.");
        }
    });
    return btn;
}
