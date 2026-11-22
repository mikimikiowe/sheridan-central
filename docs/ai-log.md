# AI use log

A running record of what was asked of Claude Code, what it produced, and what the student checked or changed. Kept honest and specific for the process doc.

## Before the handoff
- **Asked:** connect the folder to GitHub; create a mobile-sized `index.html`; copy the backend from the Project 1 repo.
- **Claude produced:** the phone-style app shell, a copy of the backend and `data/events.json`, and a route to serve the page.
- **Student checked:** opened `localhost:3000` and saw the page and the JSON API.

## Milestone 1: restructure without changing behaviour
- **Asked:** follow the handoff file, starting by moving the Express app to `api/index.js`.
- **Claude produced:** moved `backend/` into the handoff layout (`server.js`, `api/index.js`, `public/index.html`, `vercel.json`), pointed the data path at `data/events.json`, served `public/` as static files, and limited Vercel rewrites to `/api/*`.
- **Checked:** `localhost:3000/` returns the page (200) and `/api/events/today` still returns events.
- **Student to check:** reload `http://localhost:3000` and confirm it looks the same.

## Milestone 2: database connection
- **Asked:** connect to a free MongoDB Atlas database and seed demo data.
- **Claude produced:** `lib/db.js` (cached connection), `scripts/seed.js` (5 demo users, 6 demo comments incl. organizer replies, indexes), `.env.example`, and `npm run seed` / `npm run dev` scripts.
- **Student did:** created the Atlas account and cluster, and put the connection string in `.env`.
- **Student to check:** after `npm run seed`, view the `users` and `comments` collections in Atlas.

## Milestone 3: comments API (the graded CRUD)
- **Asked:** build Create / Read / Update / Delete for comments with ownership rules.
- **Claude produced:** `lib/comments.js` (4 routes), `lib/validate.js` (trim, 1-500 chars), CORS + JSON body + error handling in `api/index.js`, and `data/demo-events.json` (3 demo events so the seed comments have events to belong to).
- **Checked:** ran 11 curl requests, including 403 for editing/deleting someone else's comment. Results are in `docs/api-check.md`.
- **Student to check:** re-run the curl examples in `docs/api-check.md` and look at the `comments` collection in Atlas.
