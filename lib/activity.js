// "My Activity" and notifications. Both are worked out from the comments in the database,
// so nothing here is typed in by hand.
import { Router } from 'express';
import { getDb } from './db.js';
import { requireUser } from './auth.js';
import { enrichEvents } from './enrich.js';
import { authorOf } from './authors.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function activityRouter({ allEvents, isPast, todayIso }) {
    const router = Router();
    const eventById = () => new Map(allEvents().map(e => [e.id, e]));

    async function usersMap(db, ids) {
        const users = await db.collection('users').find({ user_id: { $in: [...new Set(ids)] } }).toArray();
        return new Map(users.map(u => [u.user_id, u]));
    }

    // ---------- My Activity: one item per event the user has commented on ----------
    router.get('/me/activity', requireUser, async (req, res) => {
        const db = await getDb();
        const meId = req.me.user_id;
        const mine = await db.collection('comments').find({ user_id: meId }).toArray();
        const eventIds = [...new Set(mine.map(c => c.event_id))];
        if (eventIds.length === 0) return res.json({ count: 0, new_replies: 0, items: [] });

        const everything = await db.collection('comments').find({ event_id: { $in: eventIds } }).sort({ created_at: 1 }).toArray();
        const seen = await db.collection('seen').find({ user_id: meId }).toArray();
        const seenAt = new Map(seen.map(s => [s.event_id, s.seen_at]));
        const users = await usersMap(db, everything.map(c => c.user_id));
        const events = eventById();

        const present = eventIds.map(id => events.get(id)).filter(Boolean); // events that have dropped out of the data can't be shown
        const enriched = await enrichEvents(present, meId);

        const items = enriched.map(event => {
            const thread = everything.filter(c => c.event_id === event.id);
            const latest = thread[thread.length - 1];
            const myLast = Math.max(...thread.filter(c => c.user_id === meId).map(c => +c.created_at));
            const readUpTo = Math.max(myLast, +(seenAt.get(event.id) || 0));
            const newReplies = thread.filter(c => c.user_id !== meId && +c.created_at > readUpTo).length;
            const parent = latest.parent_id && thread.find(c => c.comment_id === latest.parent_id);
            const verb = latest.user_id === meId ? 'you' : parent?.user_id === meId ? 'replied' : 'commented';
            return {
                event,
                commentCount: thread.length,
                latest: { comment_text: latest.comment_text, created_at: latest.created_at, verb,
                    author: authorOf(users.get(latest.user_id)) },
                hasNewReply: newReplies > 0,
                newReplies,
                latestAt: latest.created_at,
            };
        }).sort((a, b) => +b.latestAt - +a.latestAt);

        res.json({ count: items.length, new_replies: items.filter(i => i.hasNewReply).length, items });
    });

    // Opening a discussion marks its replies as seen
    router.put('/me/activity/:eventId/seen', requireUser, async (req, res) => {
        const db = await getDb();
        await db.collection('seen').updateOne(
            { user_id: req.me.user_id, event_id: req.params.eventId },
            { $set: { seen_at: new Date() } }, { upsert: true });
        res.status(204).end();
    });

    // ---------- Notifications ----------
    router.get('/me/notifications', requireUser, async (req, res) => {
        const db = await getDb();
        const meId = req.me.user_id;
        const readAt = +(req.me.notifications_read_at || 0);
        const events = eventById();

        const mine = await db.collection('comments').find({ user_id: meId }).toArray();
        const myIds = new Set(mine.map(c => c.comment_id));
        const myEventIds = [...new Set(mine.map(c => c.event_id))];

        const others = myEventIds.length
            ? await db.collection('comments').find({ event_id: { $in: myEventIds }, user_id: { $ne: meId } }).sort({ created_at: -1 }).limit(15).toArray()
            : [];
        const users = await usersMap(db, others.map(c => c.user_id));

        const items = others.filter(c => events.has(c.event_id)).map(c => {
            const isReply = c.parent_id && myIds.has(c.parent_id);
            return {
                id: c.comment_id, type: isReply ? 'reply' : 'comment',
                actor: authorOf(users.get(c.user_id)),
                event_id: c.event_id, event_title: events.get(c.event_id).title,
                created_at: c.created_at, unread: +c.created_at > readAt,
            };
        });

        // Reminders: saved events that start within the next 3 days
        const saves = await db.collection('saves').find({ user_id: meId, removed: { $ne: true } }).toArray();
        const today = todayIso();
        const inThreeDays = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
        for (const s of saves) {
            const e = events.get(s.event_id);
            if (!e || isPast(e) || e.start_date < today || e.start_date > inThreeDays) continue;
            const [y, m, d] = e.start_date.split('-').map(Number);
            const day = e.start_date === today ? 'today' : DAY_NAMES[new Date(y, m - 1, d).getDay()];
            items.push({ id: `reminder-${e.id}`, type: 'reminder', event_id: e.id, event_title: e.title,
                when: `starts ${day}${e.time ? ` at ${e.time}` : ''}`, created_at: s.created_at, unread: false });
        }

        const enabled = req.me.notifications_enabled !== false;
        res.json({ enabled, unread_count: enabled ? items.filter(i => i.unread).length : 0, items });
    });

    router.post('/me/notifications/read', requireUser, async (req, res) => {
        const db = await getDb();
        await db.collection('users').updateOne({ user_id: req.me.user_id }, { $set: { notifications_read_at: new Date() } });
        res.status(204).end();
    });

    return router;
}
