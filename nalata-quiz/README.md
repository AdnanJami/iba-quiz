# na lata — quiz app

A small, minimalist, timed multiple-choice quiz app.

- **Backend:** TypeScript + Node.js + Express
- **Storage of question banks:** SQLite (`better-sqlite3`) — each exam's full
  template JSON (as produced by `html_to_json.py --template`) is stored as a
  single row
- **Results:** graded server-side, then cached in the browser's
  `localStorage` so a visitor can close the tab and come back to see their
  last score, or retake the test
- **Design:** floral funky neo-brutalist — thick borders, hard offset
  shadows, chunky rounded type — using the palette `#00007c` / `#fc6b15` /
  `#f36c72` / `#eae5df`

## Quick start

```bash
npm install        # installs deps and auto-seeds the DB (see postinstall)
npm run dev         # start in dev mode (tsx, auto-restarts on change)
# or, for a production-style run:
npm run build
npm start
```

Then open `http://localhost:3000`.

A demo exam (`data/templates/ed09-review-exam.json`, 30 questions, 25-minute
timer) is included and gets seeded automatically.

## Adding your own exam

1. Run `html_to_json.py` in `--template` mode on a Capstone-style exam HTML
   export to produce a template JSON (question bank + answer key, no
   submission-specific data):

   ```bash
   python html_to_json.py my-exam.html data/templates/my-exam.json --template
   ```

2. Drop the resulting file into `data/templates/`.
3. Run `npm run seed` (safe to re-run any time — it upserts by filename slug).
4. Refresh the home page; the new exam appears as a card.

Each template JSON must at minimum contain a `questions` array where every
question has `question_id`, `question_text`, `options` (each with `label`,
`text`, `is_correct`), and `correct_answer`. `exam_summary.exam_title` and
`exam_summary.duration` (e.g. `"25 minutes"`) drive the card title and timer.

## How it works

- `GET /api/exams` — list of exams (title, question count, duration).
- `GET /api/exams/:id` — a **sanitized** exam for taking the test: no
  `correct_answer`, `is_correct`, or `explanation` is sent to the browser
  until after submission.
- `POST /api/exams/:id/submit` — grades `{ answers: { [question_id]:
  selectedLabel } }` against the stored template and returns a full
  breakdown (now including the answer key and explanations). The client
  saves this response into `localStorage` under `nalata:result:<examId>`.
- Visiting a test again with an existing cached result redirects straight to
  the result page; the **Retake** button clears that cached result and
  starts a fresh attempt.

**Scoring** is intentionally simple and generic: +1 point per correct
answer, 0 for wrong or unattempted, no negative marking — since a reusable
template doesn't carry a specific negative-marking scheme. If you want to
replicate a specific exam's negative marking, adjust `gradeAttempt()` in
`src/grading.ts`.

## Project layout

```
src/
  types.ts          shared TS types (template schema + API payloads)
  db.ts             SQLite setup + accessors
  grading.ts         sanitize-for-client / grade-a-submission logic
  seed.ts            loads data/templates/*.json into SQLite
  server.ts          Express app entrypoint
  routes/exams.ts    API routes
public/
  index.html          exam list
  exam.html           timed test-taking page
  result.html         score + answer review page
  css/style.css       neo-brutalist design system
  js/                 api client, localStorage cache, countdown timer,
                      SVG doodles, and per-page render logic
data/
  templates/*.json    exam question banks (source of truth for seeding)
  app.db              SQLite database (generated, gitignored)
```

## Notes

- No build framework / bundler — plain HTML + vanilla JS on the frontend,
  kept intentionally small.
- `localStorage` is per-browser, per-origin. Results won't follow a user
  across devices or browsers — that's by design, per the "browser cache"
  requirement.
- Timer auto-submits whatever has been answered when it hits zero.
