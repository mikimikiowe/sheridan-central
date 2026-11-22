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
