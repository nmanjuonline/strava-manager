# Activity Log — Strava activity manager

A small two-part app for browsing and editing your Strava activities:

- **`frontend/`** — a React app (static, deployable to GitHub Pages or
  Cloudflare Pages) that lists your activities with pagination and lets
  you edit name, description, gear (dropdown), sport type, and the
  commute/trainer flags.
- **`worker/`** — a Cloudflare Worker that holds your Strava app's
  client secret, handles the OAuth login, and proxies API calls. This
  exists because GitHub Pages / Cloudflare Pages are static hosts and
  can't safely hide a secret — the worker is the only piece that needs
  one.

Both pieces talk over plain HTTPS, so you can host the frontend on
GitHub Pages while the worker runs on Cloudflare, or put both on
Cloudflare — your choice.

## 1. Create a Strava API application

1. Go to <https://www.strava.com/settings/api> and create an application
   (or use one you already have).
2. Note the **Client ID** and **Client Secret**.
3. Leave "Authorization Callback Domain" as your worker's domain —
   you'll fill in the exact value once you know your worker's URL (step
   2 below gives you `<something>.workers.dev`, or your own domain if
   you set one up). It only needs the domain, not the full path.

## 2. Deploy the worker

```bash
cd worker
npm install -g wrangler   # if you don't have it already
wrangler login

# Create the KV namespace that stores your Strava refresh token
wrangler kv namespace create TOKENS
# Copy the returned "id" into wrangler.toml under kv_namespaces
```

Edit `worker/wrangler.toml`:
- `STRAVA_CLIENT_ID` → your Strava app's Client ID
- `FRONTEND_URL` → where the frontend will live, e.g.
  `https://yourusername.github.io/strava-manager` (no trailing slash)
- the KV `id` from the command above

Then set the two secrets (never stored in the repo):

```bash
wrangler secret put STRAVA_CLIENT_SECRET
# paste your Strava app's Client Secret when prompted

wrangler secret put APP_SECRET
# make up a password — this gates who can drive your Strava account
# through the worker. Keep it private.
```

Deploy it:

```bash
wrangler deploy
```

This prints your worker's URL, something like
`https://strava-manager-proxy.yoursubdomain.workers.dev`.

Now go back to your Strava API application settings and set the
**Authorization Callback Domain** to that host (without `https://`),
e.g. `strava-manager-proxy.yoursubdomain.workers.dev`.

## 3. Configure and run the frontend

```bash
cd frontend
cp .env.example .env
# edit .env, set VITE_WORKER_URL to the worker URL from step 2
npm install
npm run dev      # local dev server
# or
npm run build    # produces frontend/dist, ready to deploy
```

On first load, the app asks for the **app password** you set as
`APP_SECRET`. It's stored in your browser's localStorage and sent with
every request so the worker knows it's really you. After entering it,
click "Connect to Strava" to run through Strava's OAuth consent screen
once — after that, the worker keeps your session alive by refreshing
tokens automatically.

## 4. Deploy the frontend

### Option A — GitHub Pages

A ready-made workflow is included at
`.github/workflows/deploy-pages.yml`. To use it:

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages** and set the source to "GitHub
   Actions".
3. In **Settings → Secrets and variables → Actions → Variables**, add a
   repository variable `VITE_WORKER_URL` set to your worker's URL.
4. Push to `main` (or run the workflow manually) — it builds
   `frontend/` and publishes `frontend/dist` to Pages.

### Option B — Cloudflare Pages

1. In the Cloudflare dashboard, create a Pages project connected to
   this repo.
2. Set the build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `frontend`
3. Add an environment variable `VITE_WORKER_URL` set to your worker's
   URL.
4. Deploy.

Either way, once the frontend is live, make sure `FRONTEND_URL` in
`worker/wrangler.toml` matches that exact URL and re-run
`wrangler deploy` if you change it (it's used for CORS and for where
the worker redirects you after login).

## How editing works

The edit form updates fields via Strava's activity update endpoint:
name, description, gear (chosen from a dropdown built from your bikes
and shoes on file with Strava), sport type, and the commute/trainer
toggles. Gear and sport type use dropdowns so you can't type something
Strava won't accept.

## Notes

- This is built for a single Strava account (yours). The worker only
  ever stores one set of tokens in KV.
- Pagination uses Strava's `page`/`per_page` query params. Strava
  doesn't return a total count, so "Next" is enabled as long as the
  current page came back full.
- If you ever want to revoke access, click "Disconnect" in the app, or
  revoke the app from your Strava settings directly.
