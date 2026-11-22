// Starts the app and switches screens when the # part of the address changes.
import { renderTabBar } from './components/tabBar.js';
import { renderFeed } from './screens/feed.js';
import { renderDetail } from './screens/detail.js';
import { renderSaved } from './screens/saved.js';
import { renderActivity } from './screens/activity.js';
import { renderProfile } from './screens/profile.js';
import { renderSettings } from './screens/settings.js';
import { renderSubscribed } from './screens/subscribed.js';
import { renderSignIn } from './screens/signin.js';
import { openDiscussion } from './screens/discussion.js';
import { getMe, getEvent, getActivity, getNotifications } from './api.js';
import { state } from './state.js';

const app = document.getElementById('app');
const overlay = document.getElementById('overlay-root');
let previousHash = null;
let routeNumber = 0; // lets us ignore a slow screen if you've already moved on

// Who is signed in (the discussion sheet says "Posting as ..."). The app works without it.
let meReady = state.userId ? getMe().then(me => { state.me = me; }).catch(() => {}) : Promise.resolve();

// The pink dots: unread notifications (bell) and threads with a new reply (Activity tab)
function paintBadges() {
    document.querySelectorAll('.bell-dot').forEach(dot => { dot.hidden = state.unread === 0; });
    renderTabBar(location.hash || '#/events');
}
async function refreshBadges() {
    if (!state.userId) return;
    const [notes, activity] = await Promise.allSettled([getNotifications(), getActivity()]);
    if (notes.status === 'fulfilled') state.unread = notes.value.unread_count;
    if (activity.status === 'fulfilled') state.newReplies = activity.value.new_replies;
    paintBadges();
}

async function route() {
    const hash = location.hash || '#/events';
    const myRoute = ++routeNumber;
    const isDiscussion = /^#\/event\/[^/]+\/discussion$/.test(hash);

    // Remember where you were scrolled, and which list you came from
    if (previousHash && !previousHash.endsWith('/discussion')) state.scroll[previousHash] = window.scrollY;
    if (/^#\/(events|saved|activity|profile)/.test(hash)) state.lastList = hash;
    previousHash = hash;

    overlay.replaceChildren();
    document.body.classList.remove('sheet-open');
    renderTabBar(hash);

    // Signed out: pick a demo student first
    if (!state.userId) {
        window.scrollTo(0, 0); delete app.dataset.event;
        renderSignIn(app, { onDone: () => { meReady = getMe().then(me => { state.me = me; }).catch(() => {}); location.hash = '#/events'; route(); } });
        return;
    }
    refreshBadges();

    let match;
    if (isDiscussion) {
        // The event page stays visible behind the sheet
        match = hash.match(/^#\/event\/([^/]+)\/discussion$/);
        const id = decodeURIComponent(match[1]);
        let event = null;
        if (app.dataset.event === id && app.querySelector('.sheet-body')) {
            event = await getEvent(id).catch(() => null);
        }
        if (!event) { window.scrollTo(0, 0); event = await renderDetail(app, id); }
        await meReady;
        if (myRoute !== routeNumber || !event) return;
        openDiscussion(event, { onBadges: refreshBadges });
        return;
    }

    window.scrollTo(0, 0);
    const keepEvent = (match = hash.match(/^#\/event\/([^/]+)$/));
    if (!keepEvent) delete app.dataset.event;

    if (keepEvent) renderDetail(app, decodeURIComponent(match[1]));
    else if (hash === '#/saved') renderSaved(app);
    else if (hash === '#/activity') renderActivity(app, { onBadges: paintBadges });
    else if (hash === '#/profile/settings') renderSettings(app);
    else if (hash === '#/profile/subscribed') renderSubscribed(app);
    else if (hash.startsWith('#/profile')) renderProfile(app, { onBadges: refreshBadges });
    else renderFeed(app, { onBadges: refreshBadges });
}

window.addEventListener('hashchange', route);
route();
