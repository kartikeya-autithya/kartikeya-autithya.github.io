# Yoga App - Chatbot Backend (Gemini)

This adds a small Node.js/Express backend so the Yoga Assistant chatbot
can call Google's Gemini API **without ever exposing an API key in the
browser**. Everything else in `yoga_app.html` (pose detection, workout
routines, calorie calculator, Yog Kriyas, audio, navigation, styling)
is unchanged.

## How to run it

```bash
cd server
npm install
```

Open `server/.env` and put your real Gemini API key in place of the
placeholder:

```
GEMINI_API_KEY=your-real-key-here
```

Get a key at: https://aistudio.google.com/apikey (free, no credit card
needed to start).

Then start the server:

```bash
npm start
```

Open your browser to:

```
http://localhost:3000
```

That's it — the server serves `yoga_app.html` itself, so the chatbot's
`/api/chat` calls are same-origin and there's nothing else to configure.

## Which Gemini model, and why

**Default: `gemini-3.6-flash`**

- Google closed `gemini-2.5-flash` to new users shortly after this project
  was first built (their API now returns a 404 pointing you to a newer
  model) — a good reminder that Gemini's free-tier lineup moves fast.
  `gemini-3.6-flash` is Google's own current recommendation as of this
  update.
- It's set via an environment variable (`GEMINI_MODEL` in `server/.env`),
  not hard-coded — if Google moves the free tier again, updating this
  one line (no code changes) is all it takes. If you ever see a 404
  mentioning a model name in your server logs, that's Gemini telling you
  directly what to switch `GEMINI_MODEL` to.

**Free tier limits** (subject to change on Google's end — check your
AI Studio dashboard for current numbers): Gemini's free tier
is rate-limited per minute and per day. If you hit the limit, Gemini
returns an error, which the server catches and turns into the generic
"temporarily unavailable" message — the request doesn't crash the app.

## Where your API key goes (and doesn't go)

- **Goes**: `server/.env` only, read once at server startup, used only
  inside `server.js` when calling Gemini.
- **Never goes**: into `yoga_app.html`, into any browser-visible code,
  into localStorage, into any error message sent back to the browser,
  or into your Git history (`.gitignore` excludes `server/.env`).

## What the assistant knows

Every chat request, the frontend builds a text summary of the app's
**own live data** — every pose and its difficulty/tip, every exercise
counter and its calorie-K value, and every preset routine's step list —
straight from the same JavaScript objects (`POSE_LIBRARY`,
`COUNTER_LIBRARY`, `ROUTINES`, etc.) the rest of the app already uses.
That summary is sent to the backend as `appContext` and included in the
system instruction, so nothing is duplicated by hand and the assistant
can't drift out of sync with the app's actual pose list. The system
instruction explicitly tells the model not to invent poses, routines,
or measurements beyond what's supplied.

If you're logged in as the app's "master" (Settings → "Are you my
master?"), you can also add free-text guidance in the chat screen's
"Specialize this assistant" box — that gets appended to the system
instruction for everyone using the same sync code.

## Security notes

- Request bodies are capped at 256kb (`express.json({ limit: "256kb" })`).
- `/api/chat` is rate-limited to 20 requests per 5 minutes per IP
  (`express-rate-limit`) — adjust `windowMs`/`max` in `server.js` as
  your real usage patterns emerge.
- Errors returned to the browser are always the same generic message;
  the real error (never including the API key) is only logged
  server-side via `console.error`.
- `server/.env` is git-ignored; `server/.env.example` is the template
  to commit instead.

## Project structure

```
yoga-project/
├── yoga_app.html        # frontend (unchanged except chatbot backend call)
├── server/
│   ├── server.js         # Express app + /api/chat + Gemini call
│   ├── package.json
│   ├── .env               # your real key (not committed)
│   └── .env.example       # template (safe to commit)
└── .gitignore
```
