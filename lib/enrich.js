// Works out extra fields the app needs, from the real event data and the database.
import { getDb } from './db.js';
import { authorOf } from './authors.js';

// ---- derived from the scraped event itself (no database) ----

// The scraped events have no campus field, so read it from the venue / address text.
export function campusOf(event) {
    const text = `${event.venue || ''} ${event.address?.venue || ''}`.toLowerCase();
    if (/trafalgar|\btraf\b/.test(text)) return 'Trafalgar';
    if (/hazel|mccallion|\bhmc\b/.test(text)) return 'HMC';
    if (/davis|\bdav\b/.test(text)) return 'Davis';
    if (/all campuses/.test(text)) return 'All campuses';
    if (/online/.test(text) || event.is_online) return 'Online';
    return null; // unknown: such events just don't match a campus filter
}

export function timeOfDayOf(event) {
    const hour = parseInt((event.time_24h || '').slice(0, 2), 10);
    if (Number.isNaN(hour)) return null;
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
}

export function withDerivedFields(event) {
    return { ...event, campus: campusOf(event), time_of_day: timeOfDayOf(event) };
}

// ---- from the database: comment counts, who commented, and what the user saved ----

// One aggregation for all events (not one query per event).
export async function enrichEvents(events, userId) {
    const result = events.map(e => ({
        ...e, commentCount: 0, latestCommentAt: null, commenters: [], commenterCount: 0, isSaved: false,
    }));
    if (result.length === 0) return result;

    try {
        const db = await getDb();
        const ids = result.map(e => e.id);

        const groups = await db.collection('comments').aggregate([
            { $match: { event_id: { $in: ids } } },
            { $sort: { created_at: -1 } },
            { $group: { _id: '$event_id', count: { $sum: 1 }, latest: { $first: '$created_at' }, users: { $push: '$user_id' } } },
        ]).toArray();

        const allUserIds = [...new Set(groups.flatMap(g => g.users))];
        const users = await db.collection('users').find({ user_id: { $in: allUserIds } }).toArray();
        const usersById = new Map(users.map(u => [u.user_id, u]));
        const byEvent = new Map(groups.map(g => [g._id, g]));

        const saved = userId
            ? new Set((await db.collection('saves').find({ user_id: userId, event_id: { $in: ids }, removed: { $ne: true } }).toArray()).map(s => s.event_id))
            : new Set();

        for (const e of result) {
            const g = byEvent.get(e.id);
            if (g) {
                const distinct = [...new Set(g.users)]; // newest commenter first
                e.commentCount = g.count;
                e.latestCommentAt = g.latest;
                e.commenterCount = distinct.length;
                e.commenters = distinct.slice(0, 3).map(id => usersById.get(id)).filter(Boolean)
                    .map(u => { const a = authorOf(u); return { initials: a.initials, avatar_color: a.avatar_color }; });
            }
            e.isSaved = saved.has(e.id);
        }
    } catch (error) {
        // If the database is down the events still show, just without counts
        console.error('Could not load comment counts:', error.message);
    }
    return result;
}
