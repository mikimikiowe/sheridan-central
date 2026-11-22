// Saving (bookmarking) events. PUT and DELETE are safe to repeat.
import { Router } from 'express';
import { getDb } from './db.js';
import { requireUser } from './auth.js';
import { enrichEvents } from './enrich.js';

// allEvents() returns every known event (including finished ones); isPast(event) says if it has ended.
export function savesRouter({ allEvents, isPast }) {
    const router = Router();
    const findEvent = id => allEvents().find(e => e.id === id);

    // The user's saved events, newest save first, with comment counts and an isPast flag
    router.get('/me/saves', requireUser, async (req, res) => {
        const db = await getDb();
        const saves = await db.collection('saves').find({ user_id: req.me.user_id }).sort({ created_at: -1 }).toArray();
        const byId = new Map(allEvents().map(e => [e.id, e]));
        // A saved event that has dropped out of the data completely can't be shown, so skip it
        const rows = saves.map(s => ({ save: s, event: byId.get(s.event_id) })).filter(r => r.event);
        const enriched = await enrichEvents(rows.map(r => r.event), req.me.user_id);
        const events = enriched.map((e, i) => ({ ...e, savedAt: rows[i].save.created_at, isPast: isPast(e) }));
        res.json({ count: events.length, events });
    });

    router.put('/me/saves/:eventId', requireUser, async (req, res) => {
        if (!findEvent(req.params.eventId)) return res.status(404).json({ error: 'Event not found.' });
        const db = await getDb();
        await db.collection('saves').updateOne(
            { user_id: req.me.user_id, event_id: req.params.eventId },
            { $setOnInsert: { created_at: new Date() } },
            { upsert: true }
        );
        res.status(204).end();
    });

    router.delete('/me/saves/:eventId', requireUser, async (req, res) => {
        const db = await getDb();
        await db.collection('saves').deleteOne({ user_id: req.me.user_id, event_id: req.params.eventId });
        res.status(204).end();
    });

    // "Clear past events": removes every saved event that has finished. Returns the ids so Undo can put them back.
    router.delete('/me/saves', requireUser, async (req, res) => {
        if (req.query.past !== 'true') return res.status(400).json({ error: 'Use ?past=true to clear finished events.' });
        const db = await getDb();
        const saves = await db.collection('saves').find({ user_id: req.me.user_id }).toArray();
        const ids = saves.filter(s => { const e = findEvent(s.event_id); return !e || isPast(e); }).map(s => s.event_id);
        if (ids.length) await db.collection('saves').deleteMany({ user_id: req.me.user_id, event_id: { $in: ids } });
        res.json({ removed: ids.length, event_ids: ids });
    });

    return router;
}
