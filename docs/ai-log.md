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

## Milestones 4 and 5: app shell, feed and event detail (real data only)
- **Asked:** build the V3 feed and event detail from the real backend data (no placeholder events), and re-scrape so the events are current.
- **Claude produced:**
  - Copied Rita's scraper (`collector/`, `collect.py`) and ran it: 29 upcoming events from 6 sources. Removed its copy-to-`frontend/` step, which this repo doesn't have.
  - Removed the made-up demo events; the seed script now attaches sample comments to real events.
  - Backend: events now include `commentCount`, `commenters`, `isSaved`, and derived `campus` / `time_of_day` (`lib/enrich.js`); save/unsave routes (`lib/saves.js`).
  - Front-end in `public/`: design tokens, router, tab bar, feed with working filter chips, event detail with the Open discussion card, Register and View on source buttons. Everything on screen comes from the API.
- **Checked:** `/api/events` returns counts for the seeded events; rendered both screens in headless Chrome. Not yet checked on a real phone.
- **Student to check:** open http://localhost:3000, filter the feed, open an event, press Save and reload.
- **Known gaps:** the Discussion, Saved, Activity and Profile screens are placeholders until later milestones. Campus is guessed from the venue text, so some events have no campus.

## Milestones 6 and 7: discussion sheet and saved events, plus UI fixes
- **Asked:** make every button work and connect the pages (Back from an event was failing), show saved events on the Saved screen, turn the filters into a drop-down, fit images to their containers, rename the title to "Sheridan Central", then continue with each page.
- **Claude produced:**
  - Back now always returns to the list you came from (Events or Saved) and restores your scroll position.
  - Filters are a drop-down (Campus / Time of day / When) with removable chips for the active ones.
  - Poster images show the whole picture over a blurred copy of itself, so nothing is cropped.
  - Saved screen (from Figma node 75:2112): remove with Undo, "Clear past events", Ended badge, empty state. New backend routes `GET /api/me/saves`, `DELETE /api/me/saves?past=true`, `GET /api/me`, `GET /api/users`.
  - Discussion sheet: read (oldest first, "Show N earlier comments"), create, reply, edit your own, delete your own with a confirmation dialog, toasts, loading / empty / error states.
- **Checked:** a scripted browser test clicked through all of it (30 checks, all passing). The test found a real bug (the filter drop-down closed itself as it opened), which was then fixed. Not yet tried on a real phone.
- **Student to check:** post, edit and delete a comment yourself, and try the drop-down on your phone.
- **Known gaps:** Activity, Profile (and its sub-screens), Notifications and the Share sheet are still to build. The bell shows a "coming soon" message.

## Milestones 8 and 9: Activity, Profile, Notifications, shared header
- **Asked:** fix containers that look wrong, fill in Notifications, Activity and Profile, and keep the top header in the same place on every screen.
- **Claude produced:**
  - Fixed the squashed (oval) close button on the discussion sheet and removed its stray focus ring.
  - One shared sticky header component, so the title is at the same position on Events, Saved, Activity and Profile (measured identical: 72px tall, title 20px from the top) and stays pinned while scrolling.
  - Activity (threads you have commented on, latest comment, "new reply" pill, Event details / Open), a Notifications panel (replies, comments on your threads, reminders for saved events starting soon, Mark all read), Profile, Account settings (editable name / program / year / campus, privacy switch), Subscribed (the 6 real sources with upcoming counts, saved per user) and a demo sign-in picker for Sign out.
  - New backend routes: `/api/me/activity`, `/api/me/notifications`, `PATCH /api/me`, `/api/me/subscriptions`, and a "seen" marker so opening a thread clears its new-reply flag.
- **Checked:** the scripted browser test now has 53 checks, all passing. It found three real bugs that were fixed: the filter drop-down closing itself, Sign out not signing out, and "Mark all read" bringing the dot back.
- **Student to check:** look at each screen on your phone; turn "Show my name on comments" off and see what others see.
- **Known gaps:** Followers / Following are fixed demo numbers; "Password" and "Who can follow me" show a "not available in the demo" message; the Share sheet from Figma is not built (Share uses the phone's own share menu or copies the link).

## Round 3 adjustments
- **Asked:** notification panel should pop (no slide); Back should always go to the previous page; explain the "three dots" button; Clear past events on Saved; on cards with no image put the wording above the graphics; "Show my name on comments" off should make comments Anonymous; add an Organization filter.
- **Claude produced:**
  - Notification panel and its backdrop no longer animate.
  - Back (event page, Settings, Subscribed, closing the discussion) now uses the real browser history, with a fallback if the app has no earlier page.
  - Saved events keep a copy ("snapshot") so a finished event still shows as "Ended" after the scraper drops it. "Clear past events" is always visible, and removing or clearing is reversible, so Undo works even for finished events.
  - Poster titles are drawn above the decorative circles.
  - Anonymous means anonymous everywhere (card avatars, comments, notifications, Activity); the YOU badge still marks your own comment, and the composer says "Posting as Anonymous".
  - Filters now include Organization (the 6 real sources).
- **Checked:** the scripted browser test now has 73 checks, all passing on the final run.
- **Honest notes:** while testing, an earlier broken run of my test script (a) switched the demo user's "Show my name on comments" setting, (b) deleted the seeded organizer reply on the Cozy Scavenger Hunt thread, and (c) the cleanup removed one stray comment ("hhhh") that looked like a manual test comment. I restored (a) and (b) and told the student about (c).

## Round 4: Back after refresh, chat button
- **Asked:** Back still not going back properly; replace the share icon with the chat icon that opens the discussion.
- **Claude produced:** Back now asks the browser (Navigation API, with a fallback) whether an earlier page exists, so it keeps working after a refresh instead of falling back to Events; the browser's own scroll restoration is turned off in favour of ours. The share icon on the event page is replaced by a chat button with the comment count, which opens the discussion directly.
- **Checked:** 79 scripted checks pass, including refreshing an event page and then pressing Back (returns to Events, or to Saved if you came from Saved). The chat-button change first broke event pages (a function used before it was defined); the test caught it and it was fixed before reporting.
- **Honest note:** I could not reproduce the student's original Back problem exactly, so the refresh case is my best explanation, not a confirmed cause.

## Round 5: Back and Chat were secretly pressing Save
- **Asked:** the chat button must only open the discussion, never change Save.
- **Cause (found by measuring what a tap actually hits):** the Save button has an invisible oversized tap area. On the event page the button was positioned so that area stretched across the whole row of top buttons, so tapping Back or Chat really tapped Save. This also explains the earlier "Back toggles Save" report.
- **Fix:** one CSS line so the tap area stays around the Save button itself.
- **Checked:** with the old CSS, Back and Chat both hit "save-toggle"; with the fix each hits itself. New tests cover this and that opening/closing chat leaves Save unchanged on the page and on the server. 83/83 pass.

## Round 6: small polish
- Notification rows now show only the sentence and the time (event title removed from the subtext).
- Event page action bar: "View on {organization}" wrapped onto three lines. Both buttons are now single-line; names longer than 10 characters use "View event page". Tested every organization at 320, 360, 390 and 430px wide, in both the Register and Registered states (no wrapping or clipping). Full suite still passes.

## Deployment prep
- `server.js` now also exports the app so Vercel can use either file as its entry point (local `npm run dev` still works).
- Added `.github/workflows/collect.yml`: re-scrapes all six sources daily (about 6 AM Toronto time) and commits `data/events.json`, which also triggers a Vercel redeploy. It can be run by hand from the Actions tab. YAML checked; the scraper was dry-run locally. The workflow itself has not run on GitHub yet.
