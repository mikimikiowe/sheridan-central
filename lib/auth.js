// Demo sign-in: the browser sends X-User-Id and we look that user up.
// This is NOT real security (anyone can send any id). It only lets us enforce "own comments only".
import { getDb } from './db.js';

export async function currentUser(req) {
    const id = req.get('X-User-Id');
    if (!id) return null;
    const db = await getDb();
    return db.collection('users').findOne({ user_id: id });
}

export async function requireUser(req, res, next) {
    const me = await currentUser(req);
    if (!me) return res.status(401).json({ error: 'Please sign in first (missing or unknown X-User-Id).' });
    req.me = me;
    next();
}
