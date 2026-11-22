// Creates the demo users, demo comments and indexes in MongoDB Atlas.
// Run with: npm run seed   (safe to run again: it wipes and re-creates the demo data)
import { readFileSync } from 'node:fs';
import { getDb, closeDb } from '../lib/db.js';

const users = [
    { user_id: 'u_srivera', name: 'S. Rivera', initials: 'SR', role: 'student', program: 'Interaction Design', year: '2nd year', campus: 'Trafalgar', avatar_color: '#0E7FA0', show_name_on_comments: true },
    { user_id: 'u_apatel',  name: 'A. Patel',  initials: 'AP', role: 'student',   program: 'Computer Science', year: '3rd year', campus: 'Trafalgar', avatar_color: '#7C3AED', show_name_on_comments: true },
    { user_id: 'u_molarte', name: 'M. Olarte', initials: 'MO', role: 'organizer', program: 'Student Life',     year: '',         campus: 'Trafalgar', avatar_color: '#D6247A', show_name_on_comments: true },
    { user_id: 'u_jchen',   name: 'J. Chen',   initials: 'JC', role: 'student',   program: 'Game Design',      year: '1st year', campus: 'Davis',     avatar_color: '#0E9F6E', show_name_on_comments: true },
    { user_id: 'u_rsingh',  name: 'R. Singh',  initials: 'RS', role: 'student',   program: 'Business',         year: '2nd year', campus: 'HMC',       avatar_color: '#F59E0B', show_name_on_comments: true },
];

// minutes ago -> Date, so the sample comments always look recent
const ago = (min) => new Date(Date.now() - min * 60_000);

// Attach the sample comments to REAL upcoming events from data/events.json
// (no made-up events). We pick a spread of sources so several cards have discussions.
const file = JSON.parse(readFileSync(new URL('../data/events.json', import.meta.url), 'utf-8'));
const today = new Date().toISOString().slice(0, 10);
const upcoming = file.events.filter(e => (e.end_date || e.start_date) >= today && e.start_date >= today);
const pick = (source, n = 0) => upcoming.filter(e => e.source === source)[n];
const [eventA, eventB, eventC, eventD] = [pick('clubs', 0), pick('ssu', 0), pick('theatre', 0), pick('clubs', 1)];

const comments = [
    // Event A: a thread with an organizer reply
    { id: 'c_seed_1', event: eventA, user: 'u_apatel',  text: 'Is this open to everyone, or do I need to sign up first?', ago: 60 * 26 },
    { id: 'c_seed_2', event: eventA, user: 'u_molarte', text: 'Everyone is welcome! Just show up, no sign-up needed.', ago: 60 * 24, parent: 'c_seed_1' },
    { id: 'c_seed_3', event: eventA, user: 'u_jchen',   text: 'Looking forward to this one, anyone going together?', ago: 60 * 5 },
    { id: 'c_seed_4', event: eventA, user: 'u_rsingh',  text: 'First time going. Is it beginner friendly?', ago: 90 },
    // Event B: an accessibility question from the signed-in demo student
    { id: 'c_seed_5', event: eventB, user: 'u_srivera', text: 'Is the space wheelchair accessible?', ago: 60 * 3 },
    { id: 'c_seed_6', event: eventB, user: 'u_molarte', text: 'Yes, the venue has step-free access and quiet seating.', ago: 40, parent: 'c_seed_5' },
    // Events C and D: shorter discussions
    { id: 'c_seed_7', event: eventC, user: 'u_jchen',   text: 'Are student tickets available?', ago: 60 * 8 },
    { id: 'c_seed_8', event: eventD, user: 'u_rsingh',  text: 'What time should I arrive?', ago: 25 },
].filter(c => c.event) // skip if the data has no such event
 .map(c => ({
    comment_id: c.id, event_id: c.event.id, user_id: c.user, comment_text: c.text,
    created_at: ago(c.ago), updated_at: ago(c.ago), parent_id: c.parent ?? null,
}));

const db = await getDb();

await db.collection('users').deleteMany({});
await db.collection('comments').deleteMany({});
await db.collection('users').insertMany(users);
await db.collection('comments').insertMany(comments);

// Indexes make lookups fast; the unique ones also prevent duplicates.
await db.collection('users').createIndex({ user_id: 1 }, { unique: true });
await db.collection('comments').createIndex({ comment_id: 1 }, { unique: true });
await db.collection('comments').createIndex({ event_id: 1, created_at: 1 });
await db.collection('comments').createIndex({ user_id: 1, created_at: -1 });
await db.collection('saves').createIndex({ user_id: 1, event_id: 1 }, { unique: true });

console.log(`Seeded ${users.length} users and ${comments.length} comments into "${db.databaseName}".`);
await closeDb();
