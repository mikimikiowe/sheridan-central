// Local entry point: `npm run dev` (or `node server.js`) starts the app on http://localhost:3000.
// The real app lives in api/index.js. It is exported here too, so Vercel can use either file as the entry point.
import app from './api/index.js';

export default app;
