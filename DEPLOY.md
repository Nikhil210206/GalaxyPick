# Deploying GalaxyPick (free, one Vercel project)

| | | |
|---|---|---|
| Database | **MongoDB Atlas** M0 | free forever, 512MB |
| Frontend + Backend | **one Vercel project** | Hobby, free |

The frontend and backend deploy together as a single Vercel project using
[Services](https://vercel.com/docs/services) — [`vercel.json`](vercel.json) at the repo
root declares both, and one top-level rewrite sends `/api/*` to the FastAPI backend while
everything else goes to the React frontend. Because they share one domain, there's no
CORS to configure and no backend URL to bake into the frontend build — the frontend calls
a **relative** `/api`, which lands on the same origin either way.

> **This uses Vercel's Services feature, currently Beta.** It's schema-valid and the
> officially documented shape for exactly this case (one Python API + one JS frontend in a
> repo), but it's newer than a plain two-project setup. If you hit something that looks
> like a platform bug rather than a config mistake, the fallback is two ordinary Vercel
> projects (Root Directory `backend` and `frontend`, each with its own `vercel.json`) — an
> earlier revision of this repo did exactly that; see commit `135cb65` in git history.

Do the steps in order — each produces a value the next needs.

---

## 1. MongoDB Atlas

Mongo only stores chat history, so M0 is plenty.

1. Create a free **M0** cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Database Access** → add a user with **Read and write to any database**. Save the
   password.
3. **Network Access** → **Allow access from anywhere** (`0.0.0.0/0`).

   > Not optional. Vercel functions have **dynamic outbound IPs** — a specific-IP
   > allowlist fails intermittently or entirely. A connection that hangs and then times
   > out, rather than failing immediately, is the signature of this.

4. **Connect → Drivers → Python**, copy the SRV string, substitute the real password.
   **URL-encode any special characters** (`@` → `%40`, `#` → `%23`) or the URI silently
   fails to parse.

---

## 2. Import the project — once

**New Project** → import this repo. Leave **Root Directory as the repository root** — do
not point it at `backend` or `frontend`. Vercel reads `vercel.json`'s `services` block and
builds both from there; no per-service dashboard setting is needed.

Environment variables (set once, shared by both services):

| Name | Value |
|---|---|
| `MONGO_URL` | the Atlas SRV string from step 1 |
| `DB_NAME` | `galaxypick` |
| `GEMINI_API_KEYS` | your keys, comma-separated, no spaces |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` |

**Don't set `CORS_ORIGINS` or `REACT_APP_BACKEND_URL`.** Same-origin means the browser
never sends a cross-origin request, so CORS is irrelevant here, and the frontend's API
base already falls back to a relative `/api` when the variable is absent — setting either
one adds a value to keep in sync for no benefit.

Deploy.

---

## 3. Verify

```
https://<project>.vercel.app/api/          -> {"message":"GalaxyPick API is running"}
https://<project>.vercel.app/api/health    -> keys_configured: 4
https://<project>.vercel.app/api/phones    -> 21 phones
```

`/api/health` costs no Gemini quota — check it first.

Then in the browser: landing page loads, `/models` shows 21 phones with images, walk the
wizard through to recommendations. **Deep-link `/models` directly and refresh** — it must
not 404 (that's what the frontend service's SPA rewrite is for). Send **one** chat
message — free Gemini quota is per project per day and small.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| 500 on every route, `MONGO_URL is not set` | Env var missing on the project. It's read at import, so the whole backend fails, not just chat. |
| Chat 500s, `command insert requires authentication` | `MONGO_URL` has no credentials, or the Atlas user lacks read/write. |
| Chat times out / server selection error | Atlas **Network Access** isn't `0.0.0.0/0`. |
| Chat cuts off mid-sentence | `functions.server.py.maxDuration` in `vercel.json` isn't applying — confirm the file is at the **repo root**, not inside `backend/`. |
| Every `/api/*` call 404s | The backend service isn't matching. Confirm `vercel.json`'s `services.backend.entrypoint` is `server:app` and `root` is `backend/`. |
| `/models` 404s on refresh | The frontend service's nested `rewrites` (SPA fallback) is missing from `vercel.json`, or its `root` isn't `frontend/`. |
| API calls hit `localhost:8001` or literally `undefined/api` | `frontend/.env` (local-only, gitignored) has a stale `REACT_APP_BACKEND_URL` baked into a build. Not a deploy issue — this only happens if you build locally and serve that build. |
| Chat returns the friendly error, log shows 429 | Daily Gemini quota exhausted on every key. Check `/api/health` for cooling keys. |

## Known limits of this setup

- **The key pool's cooldown is in-memory.** Serverless has no persistent process, so the
  15-minute cooldown doesn't survive between invocations. Failover still works — rotation
  happens inside a single request — but each cold start retries an exhausted key first.
  That costs latency, not quota (a 429 isn't billed). Move the cooldown into Mongo if it
  ever matters.
- **Rotation only multiplies quota across separate Google Cloud projects.** Keys minted in
  one project share one bucket and exhaust together.
- **Vercel Hobby is for non-commercial use.** A portfolio is fine.
- **Services is Beta.** See the note at the top of this file.
