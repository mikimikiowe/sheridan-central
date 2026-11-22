// Vercel runs one function per file in api/. This catch-all file receives every /api/... address
// (for example /api/events/today) with its original path, and hands it to the same Express app
// that api/index.js serves for plain /api. Not used when running locally.
export { default } from './index.js';
