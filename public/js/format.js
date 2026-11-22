// Turns raw event data into the text the screens show.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "2026-12-04" -> a Date at local midnight (new Date("2026-12-04") would shift by timezone)
export function parseDay(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const short = (iso) => { const d = parseDay(iso); return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`; };

export const isPast = (e) => (e.end_date || e.start_date) < todayIso();
export const isOngoing = (e) => e.start_date < todayIso() && (e.end_date || e.start_date) >= todayIso();

// The date we show on the badge: the start, or today if the event is already under way
export function badgeDate(e) {
    const d = parseDay(isOngoing(e) ? todayIso() : e.start_date);
    return { month: MONTHS[d.getMonth()], day: d.getDate() };
}

export function dateText(e) {
    if (isOngoing(e)) return `Ongoing · until ${short(e.end_date)}`;
    if (e.end_date && e.end_date > e.start_date) return `${short(e.start_date)} – ${short(e.end_date)}`;
    return short(e.start_date);
}

export const timeText = (e) => e.time || null;

export function priceText(e) {
    if (e.price && e.price !== 'Free') return e.price;
    if (e.price === 'Free' || (e.categories || []).includes('FREE')) return 'Free';
    return null; // unknown: the screen leaves the row out rather than guess
}
export const isFree = (e) => priceText(e) === 'Free';

export const whereText = (e) => e.venue || e.address?.venue || null;

// "Tue, Dec 1 · 11:00 AM" for cards
export function whenLine(e) {
    const date = isOngoing(e) ? `Ongoing · until ${short(e.end_date)}` : short(e.start_date);
    return e.time ? `${date} · ${e.time}` : date;
}

export function relativeTime(iso) {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return 'Yesterday';
    const d = new Date(iso);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// Sort key: soonest first (an ongoing event counts as starting today)
export const sortKey = (e) => (isOngoing(e) ? todayIso() : e.start_date) + (e.time_24h || '99:99');

// Does the event touch the current Mon-Sun week?
export function isThisWeek(e) {
    const now = parseDay(todayIso());
    const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return e.start_date <= iso(sunday) && (e.end_date || e.start_date) >= todayIso();
}
