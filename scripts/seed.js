// Creates the demo users, demo comments and indexes in MongoDB Atlas.
// Run with: npm run seed   (safe to run again: it wipes and re-creates the demo data)
import { getDb, closeDb } from '../lib/db.js';

const users = [
    { user_id: 'u_srivera', name: 'S. Rivera', initials: 'SR', role: 'student', program: 'Interaction Design', year: '2nd year', campus: 'Trafalgar', avatar_color: '#0E7FA0', show_name_on_comments: true },
    { user_id: 'u_apatel',  name: 'A. Patel',  initials: 'AP', role: 'student',   program: 'Computer Science', year: '3rd year', campus: 'Trafalgar', avatar_color: '#7C3AED', show_name_on_comments: true },
    { user_id: 'u_molarte', name: 'M. Olarte', initials: 'MO', role: 'organizer', program: 'Student Life',     year: '',         campus: 'Trafalgar', avatar_color: '#D6247A', show_name_on_comments: true },
    { user_id: 'u_jchen',   name: 'J. Chen',   initials: 'JC', role: 'student',   program: 'Game Design',      year: '1st year', campus: 'Davis',     avatar_color: '#0E9F6E', show_name_on_comments: true },
    { user_id: 'u_rsingh',  name: 'R. Singh',  initials: 'RS', role: 'student',   program: 'Business',         year: '2nd year', campus: 'HMC',       avatar_color: '#F59E0B', show_name_on_comments: true },
];

// minutes ago -> Date, so the demo comments always look recent
const ago = (min) => new Date(Date.now() - min * 60_000);

const comments = [
    { comment_id: 'c_seed_1', event_id: 'sample-hackville', user_id: 'u_apatel',  comment_text: 'Is this open to first-years with no coding experience?', created_at: ago(60 * 26) },
    { comment_id: 'c_seed_2', event_id: 'sample-hackville', user_id: 'u_molarte', comment_text: 'Yes! We run beginner workshops on Friday night and mentors are on site all weekend.', created_at: ago(60 * 24), parent_id: 'c_seed_1' },
    { comment_id: 'c_seed_3', event_id: 'sample-hackville', user_id: 'u_jchen',   comment_text: 'Looking for two teammates, I do art and level design.', created_at: ago(60 * 5) },
    { comment_id: 'c_seed_4', event_id: 'sample-hackville', user_id: 'u_rsingh',  comment_text: 'Do we need to bring our own laptop?', created_at: ago(90) },
    { comment_id: 'c_seed_5', event_id: 'sample-social-battery', user_id: 'u_srivera', comment_text: 'Is the space wheelchair accessible?', created_at: ago(60 * 3) },
    { comment_id: 'c_seed_6', event_id: 'sample-social-battery', user_id: 'u_molarte', comment_text: 'Yes, the HMC Student Centre has step-free access and quiet seating.', created_at: ago(40), parent_id: 'c_seed_5' },
].map(c => ({ parent_id: null, ...c, updated_at: c.created_at }));

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
