# GalaxyPick

A Samsung Galaxy phone recommender. Answer a few guided questions — or just describe what
you want in your own words — and get matched against Samsung India's lineup, with specs,
store links and an ecommerce-style product page.

Two ways in:

- **Wizard** — persona → needs → budget → preferences → recommendations, scored against a
  21-phone catalog.
- **Galaxy AI chat** — a Gemini-backed assistant that asks what you need and answers with
  in-line product cards.

FastAPI + React + MongoDB. Runs locally on macOS, Linux or Windows.

## Requirements

| | |
|---|---|
| Python | 3.11+ (developed on 3.14) |
| Node.js | 20 LTS |
| Yarn | 1.x — **not npm** (see below) |
| MongoDB | 6.x, local, no auth |
| Gemini API key | free tier is fine — [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

Only the chat needs a Gemini key. The wizard, catalog and product pages work without one.

## Setup

Nothing is bundled and there is no Docker setup. From a fresh clone:

**1. MongoDB and Node**

```bash
# macOS
brew install node mongodb-community@6.0
brew services start mongodb-community@6.0

# Windows
winget install OpenJS.NodeJS.LTS
winget install MongoDB.Server        # runs as a service
```

Mongo needs no seeding — the catalog is a Python list, and the one collection
(`chat_messages`) is created on first write.

**2. Backend**

```bash
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
```

On Windows the venv interpreter is `.venv\Scripts\python.exe`.

**3. Frontend**

```bash
cd frontend
corepack enable      # yarn
yarn install
```

**Yarn, not npm** — `package.json` relies on a `resolutions` block that npm ignores.

**4. Environment**

Both `.env` files are gitignored and won't come with a clone. Create them:

`backend/.env`

```ini
MONGO_URL=mongodb://localhost:27017
DB_NAME=galaxypick
CORS_ORIGINS=*
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
```

`frontend/.env`

```ini
REACT_APP_BACKEND_URL=http://localhost:8001
PORT=3000
```

`server.py` reads `MONGO_URL` and `DB_NAME` at import and exits without them.

## Running

Two processes; neither starts the other. On Windows the interpreter is
`.venv\Scripts\python.exe`.

```bash
# terminal 1 — from backend/
./.venv/bin/python -m uvicorn server:app --host 127.0.0.1 --port 8001

# terminal 2 — from frontend/
yarn start
```

Open <http://localhost:3000>.

> **The backend does not auto-reload.** It runs without `--reload`, so any edit to
> `server.py`, `phones.py` or `backend/.env` needs a manual restart. The frontend does
> hot-reload.

Health check: <http://127.0.0.1:8001/api/health> reports the model and LLM key-pool state.

## Tests

```bash
cd backend
./.venv/bin/python -m pytest          # as configured
./.venv/bin/python -m pytest -n 0     # serial
```

`pytest.ini` pins `-n 2 --dist loadscope` and asks that `addopts` be left alone. For a
serial run use `-n 0`; `-p no:xdist` errors, because addopts still passes `-n`.

The suite is mostly **contract tests**, and they earn their place. Most of this app's real
bugs came from two copies of the same truth drifting apart — a preference chip whose id no
phone carried, a chat prompt still offering discontinued phones — and none of them raised
an error. They just quietly stopped working. So the tests read the frontend's ids straight
out of the JSX and assert they line up with the catalog. The Gemini key-pool tests run
against fakes, so the suite never spends API quota.

## Configuration

### Gemini

Never hardcode a model; it comes from `GEMINI_MODEL` and models get retired.

**Free-tier quota is small, per-model and per-day** — some models allow only ~20
requests/day, after which chat returns `429 RESOURCE_EXHAUSTED`. Chat calls cost real
quota, so avoid casual test messages.

Set **`GEMINI_API_KEYS`** (comma-separated) to fail over automatically when a key runs
out:

```ini
GEMINI_API_KEYS=key_from_project_a,key_from_project_b,key_from_project_c
```

On a 429 the pool cools that key for 15 minutes and advances to the next. **This only
helps if each key belongs to a different Google Cloud project** — quota is billed per
project, so several keys from one project share a single bucket and die together. Billing
removes the caps entirely and makes the pool unnecessary. `GEMINI_API_KEY` still works;
`GEMINI_API_KEYS` takes precedence.

### API

| Endpoint | |
|---|---|
| `GET /api/phones`, `/api/phones/{id}` | the catalog |
| `POST /api/recommend` | scores persona/needs/budget/preferences |
| `POST /api/chat` | Galaxy AI, streams SSE |
| `GET /api/chat/{session_id}/history` | replayed conversation |
| `GET /api/buy-links/{id}` | store links |
| `GET /api/location` | country/currency from IP |
| `GET /api/health` | model + key-pool state |

## How matching works

`backend/phones.py` is the source of truth — a plain Python list, not database-backed.
Each phone carries `match_tags`, and the wizard posts bare strings that are matched
against them.

- **Needs and persona are soft.** They rank what's left (+12 per tag hit, capped at 60).
- **Preferences and budget are hard.** They filter. Additive scoring can't express "must
  have an S-Pen" — a phone without one must never surface, however well it scores
  elsewhere.
- **Zero results is a valid answer.** No Samsung has an S-Pen under ₹75,000, so the app
  says exactly that, names the cheapest phone that *would* qualify, and offers to drop the
  one filter actually blocking the search rather than all of them. It never quietly
  relaxes a constraint you set.

Some tags (`compact`, `large_screen`, `latest`, `5g`) are derived from `specs.display` and
`year` rather than hand-written, so they can't drift out of sync with the specs.

## What's real and what isn't

Honest about its own seams:

**Real** — all 21 phones, their prices, specs and launch dates are researched from Samsung
India and Samsung Newsroom, and every product image is an official Samsung render served
locally from `frontend/public/phones/`. Match percentages are computed from your actual
answers.

**Not real** — **reviews are hardcoded**: the same `4.6` rating, `2,345 reviews` and
histogram appear on every product page, there is no reviews backend, and "Write a Review"
validates your input, says it was submitted for moderation, and throws it away. **Store
links are Google searches**, not real product pages.

Prices are street prices from a July 2026 snapshot and nothing re-verifies them, so they
will go stale.

## Project layout

```
backend/
  server.py            all routes (/api), Gemini chat, key pool
  phones.py            the catalog + match_score() — source of truth
  tests/               contract tests + key-pool tests
frontend/
  public/phones/       official Samsung product renders
  src/pages/           one file per route
  src/context/         wizard state (in-memory only)
  src/components/ui/   shadcn scaffold — mostly unused
```

Wizard state is in-memory, so deep-linking to `/recommendations` without walking the
wizard gives you an empty page.

## Known rough edges

- **CRA is deprecated.** `react-scripts@5.0.1` is the last release and causes the webpack
  deprecation warnings on boot. Vite is the migration path.
- **Most frontend dependencies are unused.** 45 of 46 shadcn/ui components are dead code —
  they pull in all 27 Radix packages for one toast. `framer-motion`, `recharts`, `zod`,
  `swr`, `lodash`, `date-fns` and `dayjs` are never imported. (`requirements.txt` on the
  backend has been trimmed to what's actually imported.)
- The catalog isn't exhaustive — the A36, A26, S25 FE and S24 are missing.

`CLAUDE.md` has the deeper engineering notes and the traps worth knowing before changing
anything.
