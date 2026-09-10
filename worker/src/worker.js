/**
 * strava-manager-proxy
 *
 * A small Cloudflare Worker that stands between the static frontend
 * (GitHub Pages / Cloudflare Pages) and the Strava API.
 *
 * Why this exists: Strava's OAuth token exchange requires a client
 * secret, and static hosts can't keep a secret hidden. This worker
 * holds the secret, performs the OAuth dance, stores the resulting
 * refresh token in KV, and proxies API calls — refreshing the access
 * token automatically when it expires. Every request from the frontend
 * must include the shared APP_SECRET so random visitors can't use your
 * Strava account through the worker.
 *
 * Routes:
 *   GET  /login?secret=...        -> redirect to Strava's OAuth screen
 *   GET  /callback?code=...       -> Strava redirects here after consent
 *   GET  /api/status              -> { connected: boolean }
 *   GET  /api/athlete             -> Strava athlete profile (incl. gear)
 *   GET  /api/activities?page=&per_page=  -> paginated activity list
 *   PUT  /api/activities/:id      -> update name/description/gear/etc.
 *   POST /api/logout              -> forget stored tokens
 */

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API = "https://www.strava.com/api/v3";
const TOKEN_KEY = "athlete-tokens";

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.FRONTEND_URL || "*",
    "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-App-Secret",
  };
}

function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}

function checkSecret(request, env) {
  const header = request.headers.get("X-App-Secret");
  return header && header === env.APP_SECRET;
}

async function getTokens(env) {
  const raw = await env.TOKENS.get(TOKEN_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function saveTokens(env, tokens) {
  await env.TOKENS.put(TOKEN_KEY, JSON.stringify(tokens));
}

/** Returns a valid access token, refreshing via Strava if it's expired. */
async function getValidAccessToken(env) {
  const tokens = await getTokens(env);
  if (!tokens) return null;

  const now = Math.floor(Date.now() / 1000);
  if (tokens.expires_at && tokens.expires_at > now + 60) {
    return tokens.access_token;
  }

  const resp = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!resp.ok) return null;
  const refreshed = await resp.json();
  await saveTokens(env, refreshed);
  return refreshed.access_token;
}

async function handleLogin(request, env) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== env.APP_SECRET) {
    return new Response("Invalid app secret", { status: 401 });
  }

  const redirectUri = `${url.origin}/callback`;
  const authUrl = new URL(STRAVA_AUTH_URL);
  authUrl.searchParams.set("client_id", env.STRAVA_CLIENT_ID);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("approval_prompt", "auto");
  authUrl.searchParams.set(
    "scope",
    "activity:read_all,activity:write,profile:read_all"
  );

  return Response.redirect(authUrl.toString(), 302);
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(`Strava authorization failed: ${error}`, {
      status: 400,
    });
  }
  if (!code) {
    return new Response("Missing code", { status: 400 });
  }

  const resp = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    return new Response(`Token exchange failed: ${text}`, { status: 502 });
  }

  const tokens = await resp.json();
  await saveTokens(env, tokens);

  return Response.redirect(env.FRONTEND_URL, 302);
}

async function handleStatus(request, env) {
  const tokens = await getTokens(env);
  return json({ connected: !!tokens }, 200, env);
}

async function handleLogout(request, env) {
  await env.TOKENS.delete(TOKEN_KEY);
  return json({ ok: true }, 200, env);
}

async function handleAthlete(request, env) {
  const accessToken = await getValidAccessToken(env);
  if (!accessToken) return json({ error: "Not connected" }, 401, env);

  const resp = await fetch(`${STRAVA_API}/athlete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await resp.json();
  return json(data, resp.status, env);
}

async function handleActivities(request, env) {
  const accessToken = await getValidAccessToken(env);
  if (!accessToken) return json({ error: "Not connected" }, 401, env);

  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";
  const perPage = url.searchParams.get("per_page") || "30";

  const stravaUrl = new URL(`${STRAVA_API}/athlete/activities`);
  stravaUrl.searchParams.set("page", page);
  stravaUrl.searchParams.set("per_page", perPage);

  const resp = await fetch(stravaUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await resp.json();
  return json(data, resp.status, env);
}

async function handleUpdateActivity(request, env, activityId) {
  const accessToken = await getValidAccessToken(env);
  if (!accessToken) return json({ error: "Not connected" }, 401, env);

  const body = await request.json();
  // Only forward the fields Strava's update endpoint accepts.
  const allowed = [
    "name",
    "type",
    "sport_type",
    "description",
    "gear_id",
    "trainer",
    "commute",
    "hide_from_home",
  ];
  const payload = {};
  for (const key of allowed) {
    if (key in body) payload[key] = body[key];
  }

  const resp = await fetch(`${STRAVA_API}/activities/${activityId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  return json(data, resp.status, env);
}

async function handleKudos(request, env, activityId) {
  const accessToken = await getValidAccessToken(env);
  if (!accessToken) return json({ error: "Not connected" }, 401, env);

  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";
  const perPage = url.searchParams.get("per_page") || "50";

  const stravaUrl = new URL(`${STRAVA_API}/activities/${activityId}/kudos`);
  stravaUrl.searchParams.set("page", page);
  stravaUrl.searchParams.set("per_page", perPage);

  const resp = await fetch(stravaUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await resp.json();
  return json(data, resp.status, env);
}

async function handleComments(request, env, activityId) {
  const accessToken = await getValidAccessToken(env);
  if (!accessToken) return json({ error: "Not connected" }, 401, env);

  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";
  const perPage = url.searchParams.get("per_page") || "50";

  const stravaUrl = new URL(`${STRAVA_API}/activities/${activityId}/comments`);
  stravaUrl.searchParams.set("page", page);
  stravaUrl.searchParams.set("per_page", perPage);

  const resp = await fetch(stravaUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await resp.json();
  return json(data, resp.status, env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }

    // Public routes (no APP_SECRET header check — they use it as a query
    // param / are Strava redirecting the browser directly).
    if (url.pathname === "/login") return handleLogin(request, env);
    if (url.pathname === "/callback") return handleCallback(request, env);

    // Everything else requires the shared app secret header.
    if (!checkSecret(request, env)) {
      return json({ error: "Unauthorized" }, 401, env);
    }

    if (url.pathname === "/api/status") return handleStatus(request, env);
    if (url.pathname === "/api/logout" && request.method === "POST")
      return handleLogout(request, env);
    if (url.pathname === "/api/athlete") return handleAthlete(request, env);
    if (url.pathname === "/api/activities")
      return handleActivities(request, env);

    const activityMatch = url.pathname.match(/^\/api\/activities\/(\d+)$/);
    if (activityMatch && request.method === "PUT") {
      return handleUpdateActivity(request, env, activityMatch[1]);
    }

    const kudosMatch = url.pathname.match(/^\/api\/activities\/(\d+)\/kudos$/);
    if (kudosMatch && request.method === "GET") {
      return handleKudos(request, env, kudosMatch[1]);
    }

    const commentsMatch = url.pathname.match(
      /^\/api\/activities\/(\d+)\/comments$/
    );
    if (commentsMatch && request.method === "GET") {
      return handleComments(request, env, commentsMatch[1]);
    }

    return json({ error: "Not found" }, 404, env);
  },
};
