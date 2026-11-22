// Who the demo users are, the signed-in user's profile and settings, and which sources they follow.
import { Router } from 'express';
import { getDb } from './db.js';
import { requireUser } from './auth.js';
import { initialsOf } from './authors.js';

const CAMPUSES = ['Trafalgar', 'HMC', 'Davis'];
const publicUser = ({ _id, notifications_read_at, ...user }) => user;

// Short descriptions of each scraped source (the names and counts come from the real data)
const SOURCE_BLURBS = {
    ssu: 'Student union', clubs: 'Clubs & societies', edge: 'Entrepreneurship',
    sheridan: 'College events', theatre: 'Theatre Sheridan shows', radio: 'Campus radio',
};
const COLORS = ['#7C3AED', '#D6247A', '#0E9F6E', '#1B8FD9', '#F59E0B', '#0E7FA0'];

export function meRouter({ allEvents, isPast }) {
    const router = Router();

    // The demo sign-in picker uses this list
    router.get('/users', async (req, res) => {
        const db = await getDb();
        const users = await db.collection('users').find({}).toArray();
        res.json(users.map(publicUser));
    });

    // Followers / following are fixed demo numbers (real follows are out of scope); subscribed is real
    router.get('/me', requireUser, async (req, res) => {
        const db = await getDb();
        const subscribed = await db.collection('subscriptions').countDocuments({ user_id: req.me.user_id });
        res.json({
            ...publicUser(req.me),
            email: `${req.me.user_id.replace(/^u_/, '')}@example.com`, // demo address (no real emails are stored)
            notifications_enabled: req.me.notifications_enabled !== false,
            stats: { followers: 8, following: 6, subscribed },
        });
    });

    // Account settings
    router.patch('/me', requireUser, async (req, res) => {
        const body = req.body || {};
        const set = {};
        if ('name' in body) {
            const name = String(body.name).trim();
            if (name.length < 1 || name.length > 40) return res.status(400).json({ error: 'Name must be 1 to 40 characters.' });
            set.name = name; set.initials = initialsOf(name);
        }
        for (const [key, max] of [['program', 60], ['year', 30]]) {
            if (key in body) {
                const value = String(body[key]).trim();
                if (value.length > max) return res.status(400).json({ error: `${key} must be at most ${max} characters.` });
                set[key] = value;
            }
        }
        if ('campus' in body) {
            if (!CAMPUSES.includes(body.campus)) return res.status(400).json({ error: `Campus must be one of: ${CAMPUSES.join(', ')}.` });
            set.campus = body.campus;
        }
        for (const key of ['show_name_on_comments', 'notifications_enabled']) {
            if (key in body) {
                if (typeof body[key] !== 'boolean') return res.status(400).json({ error: `${key} must be true or false.` });
                set[key] = body[key];
            }
        }
        if (Object.keys(set).length === 0) return res.status(400).json({ error: 'Nothing to update.' });
        const db = await getDb();
        await db.collection('users').updateOne({ user_id: req.me.user_id }, { $set: set });
        const updated = await db.collection('users').findOne({ user_id: req.me.user_id });
        res.json(publicUser(updated));
    });

    // Sources the user follows. The list of sources and their event counts come from the real event data.
    router.get('/me/subscriptions', requireUser, async (req, res) => {
        const db = await getDb();
        const mine = new Set((await db.collection('subscriptions').find({ user_id: req.me.user_id }).toArray()).map(s => s.source));
        const sources = new Map();
        for (const e of allEvents()) {
            const s = sources.get(e.source) || { source: e.source, name: e.source_name, upcoming: 0 };
            if (!isPast(e)) s.upcoming += 1;
            sources.set(e.source, s);
        }
        const list = [...sources.values()].map((s, i) => ({
            ...s, blurb: SOURCE_BLURBS[s.source] || '', color: COLORS[i % COLORS.length], subscribed: mine.has(s.source),
        }));
        res.json(list);
    });

    router.put('/me/subscriptions/:source', requireUser, async (req, res) => {
        if (!allEvents().some(e => e.source === req.params.source)) return res.status(404).json({ error: 'Unknown source.' });
        const db = await getDb();
        await db.collection('subscriptions').updateOne({ user_id: req.me.user_id, source: req.params.source },
            { $setOnInsert: { created_at: new Date() } }, { upsert: true });
        res.status(204).end();
    });

    router.delete('/me/subscriptions/:source', requireUser, async (req, res) => {
        const db = await getDb();
        await db.collection('subscriptions').deleteOne({ user_id: req.me.user_id, source: req.params.source });
        res.status(204).end();
    });

    return router;
}
