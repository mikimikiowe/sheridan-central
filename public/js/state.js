// Small shared state: who is signed in (demo), and which events the user pressed Register on.
function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage can be blocked: the app still works */ }
}

export const state = {
    // Demo sign-in: the signed-in student. (Not real security; see README.)
    // '' means "signed out" (null would fall back to the default student)
    userId: read('userId', 'u_srivera') || null,
    registered: new Set(read('registered', [])),
    events: [], // the feed's loaded events
    unread: 0, // unread notifications (drives the bell's pink dot)
    newReplies: 0, // threads with a new reply (drives the Activity tab's pink dot)
    me: null, // the signed-in user's profile (loaded at start-up)
    lastList: '#/events', // the last list screen visited, so Back from an event always has somewhere to go
    scroll: {}, // scroll position per screen, so Back returns you to where you were
};

export function setRegistered(id, on) {
    on ? state.registered.add(id) : state.registered.delete(id);
    write('registered', [...state.registered]);
}

// Sign in as a demo student (null = signed out)
export function setUser(id) {
    state.userId = id; state.me = null; state.unread = 0; state.newReplies = 0;
    write('userId', id || '');
}
