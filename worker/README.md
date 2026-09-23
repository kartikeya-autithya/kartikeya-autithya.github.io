# Yoga Assistant - Cloudflare Worker

This is the backend for the Yoga Assistant chatbot, replacing the old
Express server. It's a single-file Worker with zero npm dependencies -
it calls Gemini's REST API directly with `fetch()`.

All commands below are run **from this `worker/` directory**, unless
noted otherwise.

## 1. Install the Cloudflare CLI (Wrangler)

```bash
cd ~/yoga-project/worker
npm install -g wrangler
```

Check it installed:

```bash
wrangler --version
```

## 2. Log in to Cloudflare

```bash
wrangler login
```

This opens your browser to authorize Wrangler against your (free)
Cloudflare account. If you don't have an account yet, sign up first at
https://dash.cloudflare.com/sign-up - no credit card needed for the
Workers Free plan.

## 3. Edit `wrangler.jsonc` with your GitHub username

Open `wrangler.jsonc` and replace `MY_GITHUB_USERNAME` in the
`ALLOWED_ORIGIN` value with your real GitHub username, e.g.:

```jsonc
"ALLOWED_ORIGIN": "https://dineshsomething.github.io"
```

This is what the Worker checks incoming requests against for CORS - it
must match your GitHub Pages URL exactly (no trailing slash).

## 4. Set your Gemini API key as a secret

```bash
wrangler secret put GEMINI_API_KEY
```

This prompts you to paste the key interactively - it is **never**
typed as a command argument, so it never ends up in your shell history
or anywhere on disk in plain text. Get a free key first at
https://aistudio.google.com/apikey if you don't have one.

## 5. Deploy the Worker

```bash
wrangler deploy
```

Wrangler prints a URL at the end, looking like:

```
https://yoga-assistant-worker.YOUR-SUBDOMAIN.workers.dev
```

**Copy this exact URL** - you'll paste it (with `/api/chat` appended)
into `index.html`'s `WORKER_URL` constant in the next phase (see the
main project README).

## 6. Test the deployed Worker directly

```bash
curl -X POST https://yoga-assistant-worker.YOUR-SUBDOMAIN.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is Tadasana?","history":[]}'
```

You should get back JSON like `{"reply":"..."}`. If you get a CORS
error instead - that's expected here, since `curl` isn't a browser and
doesn't send an `Origin` header the way GitHub Pages will. This test
just confirms the Worker and Gemini connection both work.

## Redeploying after changes

Any time you edit `worker.js` or `wrangler.jsonc`, run `wrangler deploy`
again to push the update. Secrets (`GEMINI_API_KEY`) persist across
redeploys - you don't need to set it again unless you want to change it.

## Free tier limits (Cloudflare Workers)

- 100,000 requests/day, 10ms CPU time per request - generously more
  than a small personal app needs.
- Past that, requests fail until the daily quota resets (no automatic
  charge - you'd have to deliberately upgrade to a paid plan).
- The in-memory rate limiter in `worker.js` (20 requests/5 min per IP)
  is a soft, per-isolate speed bump on top of this, not a hard global
  guarantee - it resets whenever Cloudflare spins up a fresh isolate.
