# Deploying GalaxyPick (free)

Three free services, no credit card:

| | | |
|---|---|---|
| Database | **MongoDB Atlas** M0 | free forever, 512MB |
| Backend | **Vercel** (Python runtime) | Hobby, free |
| Frontend | **Vercel** (Create React App) | Hobby, free |

The repo deploys as **two separate Vercel projects** from the same GitHub repo, each with
a different Root Directory. That's deliberate: Vercel auto-detects a FastAPI `app` only in
`app.py` / `index.py` / `server.py` / `main.py` / `wsgi.py` / `asgi.py` at the *project*
root (or in `src/`, `app/`, `api/`). Pointing a project's root at `backend/` puts
`server.py` exactly where Vercel looks.

Do the steps in this order — each one produces a value the next needs.

---

## 1. MongoDB Atlas

Mongo only stores chat history, so M0 is plenty.

1. Create a free **M0** cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Database Access** → add a user with **Read and write to any database**. Save the
   password.
3. **Network Access** → **Allow access from anywhere** (`0.0.0.0/0`).

   > This is not optional. Vercel functions have **dynamic outbound IPs**, so an
   > allowlist of specific addresses will fail intermittently or entirely. If chat times
   > out with a server-selection error, this is almost always why.

4. **Connect → Drivers → Python** and copy the SRV string. It looks like:

   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

   Replace `<password>` with the real one, and **URL-encode any special characters**
   (`@` → `%40`, `#` → `%23`, `/` → `%2F`). An un-encoded password silently breaks the
   URI parse.

---

## 2. Backend project

**New Project** → import this repo → then, before deploying:

| Setting | Value |
|---|---|
| **Root Directory** | `backend` |
| Framework Preset | leave as detected (FastAPI / Other) |

Environment variables:

| Name | Value |
|---|---|
| `MONGO_URL` | the Atlas SRV string from step 1 |
| `DB_NAME` | `galaxypick` |
| `CORS_ORIGINS` | `*` — tightened in step 4 |
| `GEMINI_API_KEYS` | your keys, comma-separated, no spaces |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` |

Deploy, then check:

```
https://<backend>.vercel.app/api/          -> {"message":"GalaxyPick API is running"}
https://<backend>.vercel.app/api/health    -> keys_configured: 4
https://<backend>.vercel.app/api/phones    -> 21 phones
```

`/api/health` costs no Gemini quota, so it's the safe first check.

Already configured for you in `backend/vercel.json` and `backend/.python-version`:
`maxDuration: 60` (the default is **10s**, which would cut a streaming chat reply off
mid-sentence), tests excluded from the bundle, and Python pinned to 3.12.

---

## 3. Frontend project

**New Project** → import the **same repo** again → before deploying:

| Setting | Value |
|---|---|
| **Root Directory** | `frontend` |
| Framework Preset | Create React App |

Environment variable:

| Name | Value |
|---|---|
| `REACT_APP_BACKEND_URL` | `https://<backend>.vercel.app` — no trailing slash |

> **CRA bakes `REACT_APP_*` in at build time, not runtime.** Changing this variable later
> does nothing until you **redeploy**. If the deployed site can't reach the API, check
> this first — the built bundle may still contain `http://localhost:8001`.

The frontend appends `/api` itself, so the value is the bare origin.

Deploy, then open the URL. The landing page, `/models` and the wizard should all work.

---

## 4. Lock down CORS

Back in the **backend** project → Environment Variables:

| Name | Value |
|---|---|
| `CORS_ORIGINS` | `https://<frontend>.vercel.app` |

**Redeploy the backend** for it to take effect.

> Must match the browser's origin exactly: scheme included, **no trailing slash**. Leaving
> it as `*` means any site can call your API and burn your Gemini quota.

If you also want preview deployments to work, add their origin comma-separated —
`CORS_ORIGINS` is split on commas.

---

## 5. Verify

- Landing page loads, `/models` shows 21 phones with images.
- Walk the wizard → recommendations appear.
- Deep-link `https://<frontend>.vercel.app/models` and hit refresh — it must not 404
  (that's what `frontend/vercel.json`'s rewrite is for).
- Send **one** chat message. Keep it to one: free Gemini quota is per project per day and
  small.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| 500 on every route, `MONGO_URL is not set` | Env var missing on the backend project. It's read at import, so the whole app fails, not just chat. |
| Chat 500s, `command insert requires authentication` | `MONGO_URL` has no credentials, or the Atlas user lacks read/write. |
| Chat times out / server selection error | Atlas **Network Access** isn't `0.0.0.0/0`. |
| Chat cuts off mid-sentence | `maxDuration` isn't applied — confirm `backend/vercel.json` shipped and the function key matches the entrypoint (`server.py`). |
| Frontend loads, API calls fail with CORS | `CORS_ORIGINS` doesn't exactly match the frontend origin, or the backend wasn't redeployed after changing it. |
| Frontend calls `localhost:8001` in production | `REACT_APP_BACKEND_URL` was set after the build. Redeploy. |
| `/models` 404s on refresh | `frontend/vercel.json` rewrite missing, or Root Directory isn't `frontend`. |
| Chat returns the friendly error, log shows 429 | Daily Gemini quota exhausted on every key. Check `/api/health` for cooling keys. |

## Known limits of this setup

- **The key pool's cooldown is in-memory.** Serverless has no persistent process, so the
  15-minute cooldown doesn't survive between invocations. Failover still works — rotation
  happens inside a single request — but each cold start retries an exhausted key first.
  That costs a round-trip, not quota (a 429 isn't billed). Move the cooldown into Mongo if
  it ever matters.
- **Rotation only multiplies quota across separate Google Cloud projects.** Keys minted in
  one project share one bucket and exhaust together.
- **Vercel Hobby is for non-commercial use.** A portfolio is fine.
