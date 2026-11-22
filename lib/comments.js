// The comments API (the graded CRUD feature): Create, Read, Update, Delete.
// Who is acting comes from the X-User-Id header. This is a demo sign-in, NOT real security.
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { getDb } from './db.js';
import { checkCommentText } from './validate.js';

// `eventExists(id)` is passed in by api/index.js so this file doesn't need to know where events live.
export function commentsRouter(eventExists) {
    const router = Router();

    // ---- helpers ----

    // Attach the author's details so the front-end can draw a comment without a second request.
    function shape(comment, usersById, me) {
        const author = usersById.get(comment.user_id);
        return {
            comment_id: comment.comment_id,
            event_id: comment.event_id,
            user_id: comment.user_id,
            comment_text: comment.comment_text,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            parent_id: comment.parent_id ?? null,
            author: author
                ? { name: author.name, initials: author.initials, role: author.role, avatar_color: author.avatar_color }
                : { name: 'Unknown', initials: '?', role: 'student', avatar_color: '#6B7280' },
            is_mine: Boolean(me) && comment.user_id === me.user_id,
            is_edited: comment.updated_at > comment.created_at,
        };
    }

    async function usersFor(db, comments) {
        const ids = [...new Set(comments.map(c => c.user_id))];
        const users = await db.collection('users').find({ user_id: { $in: ids } }).toArray();
        return new Map(users.map(u => [u.user_id, u]));
    }

    // Looks up the signed-in demo user. Reads work without one; writes need one.
    async function currentUser(req) {
        const id = req.get('X-User-Id');
        if (!id) return null;
        const db = await getDb();
        return db.collection('users').findOne({ user_id: id });
    }

    async function requireUser(req, res, next) {
        const me = await currentUser(req);
        if (!me) return res.status(401).json({ error: 'Please sign in first (missing or unknown X-User-Id).' });
        req.me = me;
        next();
    }

    // ---- READ: list an event's comments, oldest first ----
    router.get('/events/:eventId/comments', async (req, res) => {
        const db = await getDb();
        const me = await currentUser(req);
        const { eventId } = req.params;
        const filter = { event_id: eventId };

        // ?before=<ISO date> lets "Show N earlier comments" load older ones
        if (req.query.before) {
            const before = new Date(req.query.before);
            if (Number.isNaN(before.getTime())) return res.status(400).json({ error: 'before must be an ISO date.' });
            filter.created_at = { $lt: before };
        }
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

        const total = await db.collection('comments').countDocuments({ event_id: eventId });
        // Take the newest `limit` comments, then flip them back to oldest-first for display
        const newest = await db.collection('comments').find(filter).sort({ created_at: -1 }).limit(limit).toArray();
        const comments = newest.reverse();
        const usersById = await usersFor(db, comments);

        res.json({ comments: comments.map(c => shape(c, usersById, me)), total });
    });

    // ---- CREATE ----
    router.post('/events/:eventId/comments', requireUser, async (req, res) => {
        const { eventId } = req.params;
        if (!eventExists(eventId)) return res.status(404).json({ error: 'Event not found.' });

        const checked = checkCommentText(req.body?.comment_text);
        if (checked.error) return res.status(400).json({ error: checked.error });

        const db = await getDb();

        // Optional reply: the parent must be a top-level comment on the same event
        let parentId = null;
        if (req.body?.parent_id) {
            const parent = await db.collection('comments').findOne({ comment_id: req.body.parent_id });
            if (!parent || parent.event_id !== eventId || parent.parent_id) {
                return res.status(400).json({ error: 'You can only reply to a top-level comment on this event.' });
            }
            parentId = parent.comment_id;
        }

        const now = new Date();
        const comment = {
            comment_id: randomUUID(),
            event_id: eventId,
            user_id: req.me.user_id, // always from the header, never from the request body
            comment_text: checked.text,
            created_at: now,
            updated_at: now,
            parent_id: parentId,
        };
        await db.collection('comments').insertOne(comment);
        res.status(201).json(shape(comment, new Map([[req.me.user_id, req.me]]), req.me));
    });

    // Finds a comment and makes sure the signed-in user owns it. Returns the comment, or sends the error.
    async function loadOwnComment(req, res) {
        const db = await getDb();
        const comment = await db.collection('comments').findOne({ comment_id: req.params.commentId });
        if (!comment) { res.status(404).json({ error: 'Comment not found.' }); return null; }
        if (comment.user_id !== req.me.user_id) {
            res.status(403).json({ error: 'You can only change your own comments.' });
            return null;
        }
        return comment;
    }

    // ---- UPDATE (own comments only) ----
    router.patch('/comments/:commentId', requireUser, async (req, res) => {
        const comment = await loadOwnComment(req, res);
        if (!comment) return;

        const checked = checkCommentText(req.body?.comment_text);
        if (checked.error) return res.status(400).json({ error: checked.error });

        const db = await getDb();
        const updated_at = new Date();
        await db.collection('comments').updateOne(
            { comment_id: comment.comment_id },
            { $set: { comment_text: checked.text, updated_at } }
        );
        const updated = { ...comment, comment_text: checked.text, updated_at };
        res.json(shape(updated, new Map([[req.me.user_id, req.me]]), req.me));
    });

    // ---- DELETE (own comments only; the app asks "Are you sure?" before calling this) ----
    router.delete('/comments/:commentId', requireUser, async (req, res) => {
        const comment = await loadOwnComment(req, res);
        if (!comment) return;
        const db = await getDb();
        await db.collection('comments').deleteOne({ comment_id: comment.comment_id });
        res.status(204).end();
    });

    return router;
}
