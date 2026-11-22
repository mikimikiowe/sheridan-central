// Saving (bookmarking) events. PUT and DELETE are safe to repeat.
import { Router } from 'express';
import { getDb } from './db.js';
import { requireUser } from './auth.js';
import { enrichEvents } from './enrich.js';

// allEvents() returns every known event (including finished ones); isPast(event) says if it has ended.
export function savesRouter({ allEvents, isPast }) {
    const router = Router();
    const findEvent = id => allEvents().find(e => e.id === id);
    // The scraper only keeps upcoming events, so a finished event disappears from the data.
    // We keep a copy ("snapshot") of each saved event so it can still show as "Ended".
    const resolve = save => findEvent(save.event_id) || save.snapshot || null;

    // The user's saved events, newest save first, with comment counts and an isPast flag
    router.get('/me/saves', requireUser, async (req, res) => {
        const db = await getDb();
        const saves = await db.collection('saves').find({ user_id: req.me.user_id, removed: { $ne: true } }).sort({ created_at: -1 }).toArray();
        const rows = saves.map(save => ({ save, event: resolve(save) })).filter(r => r.event);
        // Older saves have no snapshot yet: add one while the event is still in the data
        await Promise.allSettled(rows.filter(r => !r.save.snapshot && findEvent(r.save.event_id))
            .map(r => db.collection('saves').updateOne({ _id: r.save._id }, { $set: { snapshot: r.event } })));
        const enriched = await enrichEvents(rows.map(r => r.event), req.me.user_id);
        const events = enriched.map((e, i) => ({ ...e, savedAt: rows[i].save.created_at, isPast: isPast(e) }));
        res.json({ count: events.length, events });
    });

    router.put('/me/saves/:eventId', requireUser, async (req, res) => {
        const db = await getDb();
        const key = { user_id: req.me.user_id, event_id: req.params.eventId };
        const event = findEvent(req.params.eventId);
        const existing = await db.collection('saves').findOne(key);
        // A finished event is no longer in the data, but a save we already hold (e.g. for Undo) can come back
        if (!event && !existing?.snapshot) return res.status(404).json({ error: 'Event not found.' });
        await db.collection('saves').updateOne(key, {
            $setOnInsert: { created_at: new Date() },
            $set: { removed: false, ...(event ? { snapshot: event } : {}) },
        }, { upsert: true });
        res.status(204).end();
    });

    router.delete('/me/saves/:eventId', requireUser, async (req, res) => {
        const db = await getDb();
        // Soft removal: keep the row (and its snapshot) so Undo works even for a finished event
        await db.collection('saves').updateOne({ user_id: req.me.user_id, event_id: req.params.eventId }, { $set: { removed: true } });
        res.status(204).end();
    });

    // "Clear past events": removes every saved event that has finished. Returns the ids so Undo can put them back.
    router.delete('/me/saves', requireUser, async (req, res) => {
        if (req.query.past !== 'true') return res.status(400).json({ error: 'Use ?past=true to clear finished events.' });
        const db = await getDb();
        const saves = await db.collection('saves').find({ user_id: req.me.user_id, removed: { $ne: true } }).toArray();
        const ids = saves.filter(s => { const e = resolve(s); return !e || isPast(e); }).map(s => s.event_id);
        if (ids.length) await db.collection('saves').updateMany({ user_id: req.me.user_id, event_id: { $in: ids } }, { $set: { removed: true } });
        res.json({ removed: ids.length, event_ids: ids });
    });

    return router;
}
