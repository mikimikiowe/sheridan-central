// Connects to MongoDB Atlas.
// The client is kept in a module-level variable so that, on Vercel, repeated
// requests reuse one connection instead of opening a new one every time.
import { MongoClient } from 'mongodb';

let client = null;

export async function getDb() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is not set. Add it to your .env file (see .env.example).');
    }
    if (!client) {
        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
    }
    return client.db(process.env.MONGODB_DB || 'sheridan_events');
}

export async function closeDb() {
    if (client) await client.close();
    client = null;
}
