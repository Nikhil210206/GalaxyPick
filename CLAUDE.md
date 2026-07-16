# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

GalaxyPick — a Samsung Galaxy phone recommender. A user either walks a wizard
(persona → needs → budget → preferences → recommendations) or chats with "Galaxy AI",
and gets phone suggestions that link through to an ecommerce-style product page.

FastAPI backend + Create React App (craco) frontend + MongoDB. It runs locally as two
processes; chat is the Google Gemini API directly, with no wrapper in between.

## Commands

Backend and frontend run as two processes. Neither is started by the other.

The venv interpreter differs by platform: `.venv/bin/python` on macOS/Linux,
`.venv/Scripts/python.exe` on Windows. Paths below use the POSIX form.

```bash
# Backend — from backend/
./.venv/bin/python -m uvicorn server:app --host 127.0.0.1 --port 8001

# Frontend — from frontend/
yarn start                     # CRA dev server on :3000, hot reloads

# Backend tests (see pytest.ini warning below)
cd backend && ./.venv/bin/python -m pytest
./.venv/bin/python -m pytest -n 0            # serial run
./.venv/bin/python -m pytest tests/test_x.py::TestClass::test_name
```

**The backend does not auto-reload.** It is run without `--reload`, so any edit to
`server.py`, `phones.py`, or `backend/.env` requires killing and restarting uvicorn.
The frontend does hot-reload.

`backend/pytest.ini` carries an explicit instruction not to modify `addopts` (it must stay
`-n 2 --dist loadscope`). Run serially with `-n 0` — `-p no:xdist` errors, because addopts
still passes `-n`. `pytest` and `pytest-xdist` are not in requirements.txt; install them
into the venv.

`tests/test_wizard_contract.py` guards the wizard's worst failure mode (see below): it
reads ids and filters straight out of the JSX and asserts they line up with the catalog —
every option id exists, every preference can actually exclude something, every `series`
has a filter chip, and `SYSTEM_PROMPT` lists exactly the catalog. `tests/test_key_pool.py`
covers Gemini key rotation against fakes, so it never spends quota.

These tests read the frontend from the backend suite on purpose. Each one exists because
two copies of the same truth silently drifted apart; they are the only thing that notices.

## Setting up on a fresh machine

Nothing here is installed by default; there is no Docker setup.

1. **Node.js** (LTS) and **MongoDB Server**. Mongo listens on `localhost:27017` with no
   auth, and the app seeds nothing — the catalog is a Python list, and `chat_messages`
   is created on first write.
   - macOS: `brew install node mongodb-community@6.0` then
     `brew services start mongodb-community@6.0`
   - Windows: `winget install OpenJS.NodeJS.LTS` and `winget install MongoDB.Server`
     (runs as a Windows service)
2. **Yarn, not npm.** `package.json` uses a `resolutions` block, which npm ignores.
   Use corepack: `corepack enable`. On Windows that can fail with EPERM (it writes to
   `C:\Program Files\nodejs`) — then use
   `corepack enable --install-directory <writable dir>` and put that dir on PATH.
3. **Python venv** in `backend/.venv` (see the requirements.txt warning below).
4. **Both `.env` files are gitignored and will not come with a clone** — recreate them
   (see below). The Gemini key in particular has to be carried over by hand.

### requirements.txt

`pip install -r requirements.txt` works and lists exactly what `server.py` and `phones.py`
import, deliberately unpinned.

It is kept that way on purpose. An earlier revision pinned `fastapi==0.110.1` /
`uvicorn==0.25.0`, which failed to resolve on Python 3.14 and dragged an unrelated
`litellm` wheel off a third-party asset host; it also listed ~20 packages the app never
imports (boto3, passlib, pandas, four auth libraries for an app with no auth) while
omitting `httpx`, which the code does import. If you add a dependency, add it because
something imports it.

## Environment

`backend/.env`:

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=galaxypick
CORS_ORIGINS=*
GEMINI_API_KEY=          # from https://aistudio.google.com/apikey
GEMINI_API_KEYS=         # optional: comma-separated, fails over on quota (see below)
GEMINI_MODEL=gemini-3.1-flash-lite
```

`frontend/.env`:

```
REACT_APP_BACKEND_URL=http://localhost:8001
PORT=3000
```

`server.py` reads `MONGO_URL` and `DB_NAME` at import time and crashes without them.
`REACT_APP_BACKEND_URL` must point at the backend port; the frontend appends `/api`.

## Gemini

Never hardcode a model — it comes from `GEMINI_MODEL`, and models get retired.

- `gemini-2.5-flash` and `gemini-2.5-flash-lite` return **"no longer available to new
  users"** on a freshly issued key. `gemini-2.0-flash`/`-lite` report a free-tier limit
  of **0**. Don't reach for these.
- **Free-tier quota is per model, per day, and small** — `gemini-3.5-flash` allows only
  20 requests/day. Hitting it returns 429 `RESOURCE_EXHAUSTED`. Switching `GEMINI_MODEL`
  to another model gives a fresh bucket; billing removes the caps.
- **`GEMINI_API_KEYS` (comma-separated) rotates keys on 429.** `GeminiKeyPool` in
  `server.py` hands out the current key, and on quota exhaustion cools it for 15 min and
  advances to the next. Quota is per **Google Cloud project** — keys minted in one
  project share one bucket and exhaust together, so rotation only buys headroom across
  *separate projects*. `GEMINI_API_KEY` still works and wins nothing; `GEMINI_API_KEYS`
  takes precedence. `GET /api/health` reports pool state using key suffixes only —
  never log or return a whole key.
- **Rotation can only happen before the first chunk is streamed.** A retry after any
  text has reached the client would duplicate it — this is why the retry guard is
  `code in RETRIABLE_STATUS and not full`. Preserve that if you touch the chat loop.
- **Chat calls cost the user real quota. Do not send test messages casually.** Exercise
  the UI without sending chat messages where possible; a handful of test conversations
  can exhaust a day's allowance.
- `thinking_budget=0` is set deliberately: Gemini 3.x spends ~1,450 thinking tokens per
  turn by default — more than the answer — for no quality gain on this workload. It
  halves token cost but does **not** help with the requests/day cap.
- The SDK's async streaming needs `async for chunk in await client.aio.models.generate_content_stream(...)`
  — it's a coroutine returning an async iterator.

## Architecture

### Backend (`backend/server.py`, single file)

All routes live under an `/api` prefix (`api_router`). **`phones.py` is the source of
truth for the 21-phone catalog** — it is a plain Python list, not database-backed.
MongoDB stores only `chat_messages`.

**`price_inr` holds the street/effective price in India** (what a buyer actually pays,
per 91mobiles / Samsung's own listed price), not the inflated MRP. Samsung India quotes
both — e.g. the A56 is ₹34,999 against a ₹49,999 MRP — so pick the former when adding a
phone. Street prices drift, so the figures go stale; each entry carries a comment naming
its source and India launch date.

**`year` is the India launch year, and it is load-bearing** — `latest` is derived from
it, so a mis-dated phone silently claims to be current. Verify against Samsung Newsroom
rather than assuming; a "2026 lineup" list will contain 2025 phones still on sale (the
M16, M36, A17, F17 and F06 are all 2025).

- **Every wizard id is a bare string matched against `match_tags`.** An id no phone
  carries doesn't raise — it scores zero against everything and the control silently
  stops working. This shipped: all six preference chips and the `storage` need were
  inert for the life of the project, so asking for "S-Pen support" cheerfully returned
  phones with no S-Pen. `tests/test_wizard_contract.py` now fails the build on any id
  that isn't in the catalog. Never add a chip to `Needs.jsx`, `Preferences.jsx`, or
  `SelectPersona.jsx` without a phone carrying the tag.
- **Needs and persona are soft; preferences and budget are hard.** `match_score()` ranks
  with additive tag hits (+12 each, capped 60) plus a price component. Preferences go
  through `satisfies()` and *filter* — additive scoring cannot express "must have an
  S-Pen". Budget filters too, since the UI states it as "Under ₹75,000".
- **`/api/recommend` can legitimately return zero results** — e.g. S-Pen under ₹75,000,
  which no Samsung satisfies at any price under ₹1,29,999. It then returns
  `unsatisfiable: {preferences, budget, nearest, relaxations}` and `Recommendations.jsx`
  renders an explanatory empty state. Don't "fix" the empty list by relaxing a
  constraint behind the user's back.
  - `nearest` — cheapest phone meeting the preferences, ignoring budget. `null` means
    nothing satisfies them at **any** price, and the UI must then not imply that
    raising the budget would help.
  - `relaxations` — the single preferences whose removal alone would yield results,
    with counts. With several filters set it isn't obvious which one is at fault
    (`latest` excludes 14 of 21 phones), so the UI offers the targeted drop rather than
    "drop everything", which would discard constraints the user could have kept.
- **A preference must be able to exclude something.** `5G ready` shipped matching every
  phone, so it could never change a result and merely padded the empty-state message with
  a filter that wasn't to blame; it was removed like `storage`. The contract test now
  fails any preference matching 0 or all phones.
- `compact`, `large_screen`, `latest` and `5g` are **derived** from `specs.display` and
  `year` in `phones.py`, not hand-written — that's what stops tags drifting from specs.
  `s_pen` and `foldable` are explicit; they aren't inferable from the data.
- `storage` was removed from `Needs.jsx` rather than tagged: the catalog carries no
  storage spec, so there was nothing to match on. Re-add the chip only with real data.
- `5g`, `business_executive`, `family`, `tech_enthusiast` and `traveller` are in
  `match_tags` but **no UI control can send them**, so they can never be matched.
  Harmless, but the catalog work behind them is inert.
- Every `series` value needs a matching chip in `Models.jsx` `FILTERS` or those phones
  are reachable only from "All models" — adding the F-series required one. A test
  enforces it.
- **The catalog is accurate but not exhaustive.** `a55`/`m55` were replaced by
  `a56`/`m56` after Samsung discontinued them (`sm-a556`/`sm-m556` are gone from Samsung
  India *and* UK, so no official render exists to fetch). Samsung India still sells the
  A36, A26, A07, M06, M17, S25 FE and S24 (`sm-s921`), none of which are here.
- `store_links(phone)` builds the Samsung/Amazon/Flipkart URLs and is shared by
  `/api/buy-links` and the chat cards — keep it that way so they can't drift.
- **`SYSTEM_PROMPT`'s lineup is generated from `PHONES`** via `_catalog_for_prompt()`.
  It used to be hand-written and drifted — it kept offering the A55/M55 after both were
  discontinued. A phone the model names but the catalog lacks yields no product card,
  since `phones_mentioned()` has nothing to match. A test pins the two together.
- `phones_mentioned(text)` scans a finished assistant reply for catalog phone names to
  build the in-chat product cards. It matches **longest name first and blanks each hit**,
  so "Galaxy S26 Ultra" isn't also counted as "Galaxy S26". Preserve that if you touch it.

### The chat stream contract

`/api/chat` returns SSE. **Frames are of two kinds**, and both sides depend on this:

- `data: "<json string>"` — a text chunk. JSON-encoded on purpose: replies contain blank
  lines, and a raw `\n\n` would split the SSE frame and silently truncate the message.
- `data: {"type":"phones","phones":[…]}` — product cards, emitted once after the text.
- `data: [DONE]` — sentinel.

`Chat.jsx` distinguishes them with a `typeof` check. Anything added to this stream must
be a JSON object with a `type`.

Gemini is stateless, so **conversation memory is rebuilt every turn** by replaying
`chat_messages` from Mongo into `contents`. Failed turns persist no assistant row — an
empty one would be replayed back to the model as a blank turn.

Transient failures (429/5xx) retry 3× with backoff; permanent ones (e.g. 404) don't.
Retries only happen before any text has been sent, since a retry would duplicate it.
Users see a friendly message; the real error goes to the server log.

### Frontend (`frontend/src`)

CRA + craco, Tailwind, shadcn/ui in `components/ui`, `@` aliased to `src`.

- `context/GalaxyContext.jsx` holds wizard state (persona, needs, budget, preferences,
  recommendations). It is **in-memory only** — deep-linking to `/recommendations` or
  `/needs` without walking the wizard means empty state.
- `hooks/useSaved.js` — bookmarks in `localStorage` under `galaxypick.saved`. It keeps
  separate mounts in sync via a module-level listener set, because the `storage` event
  only fires in *other* tabs.
- Pages map 1:1 to routes in `App.js`. `/models` and `/compare` were added later;
  `/compare` takes its selection from `?ids=a,b,c`.

**The Header creates a containing block for fixed children.** It has `backdrop-blur-xl`,
and a `backdrop-filter` ancestor makes `position: fixed` resolve against *it*, not the
viewport — a modal rendered inside the header gets clipped into the 64px bar. The About
dialog uses `createPortal(…, document.body)` for this reason. Any new modal in the header
must do the same.

Animations are plain CSS keyframes in `index.css` (`fade-up`, `hero-device`, `hero-glow`),
gated behind `prefers-reduced-motion`. framer-motion is in `package.json` but unused —
match the CSS convention rather than introducing it.

## Data that is fabricated

Be careful about presenting these as real:

- **Reviews are hardcoded** — `4.6`, `2,345 reviews` and the 72/20/6/1/1 histogram are
  identical for every phone, and there is no reviews backend. "Write a Review" validates
  input, says "submitted for moderation", and discards it.
- **Store links are Google searches**, not real product pages
  (`google.com/search?q=site:samsung.com+…`). No affiliate or price API is wired up.
- The **product-page match badge** used to be a hardcoded `98%` on every phone regardless
  of the wizard. It now renders the real score from `recommendations`, and is omitted
  entirely when deep-linked without wizard state. Don't reintroduce a literal.
- A **"Trusted by 50,000+ users"** line with three fake avatar circles was removed from
  the landing hero. There are no users to count.

**The product uses no emojis** — not in the UI, and `SYSTEM_PROMPT` forbids them in chat
replies too, since a model told to be "warm and conversational" reaches for them and its
output lands in the same UI. The `←`/`→` in link labels are typographic arrows, not emoji.

## Phone images

All 21 are official Samsung renders in `frontend/public/phones/{id}.jpg`, referenced by
the catalog as `/phones/{id}.jpg` — CRA serves `public/` at the site root, so no import is
needed and the backend keeps the path as plain data.

Stored **locally on purpose**: remote Samsung URLs rot, and this repo has been bitten
twice (the old `m55`/`m35` 404s, and the A55 page vanishing outright mid-project).

Sourcing more:

- Current phones have clean shots on the India `/buy/` page:
  `images.samsung.com/in/smartphones/{slug}/buy/product_color_{colour}_{Tablet|PC}.{jpg|png}`.
- Everything else lives on the `p6pim` gallery CDN under a SKU, e.g.
  `.../p6pim/in/sm-a566ezahins/gallery/{name}?$650_519_PNG$`. Find SKUs by scraping the
  `galaxy-a` / `galaxy-m` / `galaxy-f` / `galaxy-s` listing pages. F-series SKUs start
  `sm-e` (F06 is `sm-e066`), not `sm-f`.
- **Scrape with a headless browser**, not a plain fetch — the shots lazy-load, so
  `curl`/WebFetch sees only the marketing banner.
- Samsung's masters for older SKUs top out near 235×290 for the product itself; bigger
  Scene7 presets only pad. Upscaling is fine — the card slot renders ~285px tall.
- The pipeline trims the white padding and centres each product on a 900×675 canvas at
  82% fill, so every card matches. Do the same for anything new.

## No third-party analytics — keep it that way

`index.html` is deliberately minimal: fonts, the favicon, a title, and the app root.
Nothing else.

An earlier revision shipped a **PostHog session recorder** and an **external error logger**
that intercepted console and network traffic and postMessaged it to a parent frame — both
pulled from a vendor CDN, neither declared anywhere a reader would look. Every visitor was
being recorded. They are gone. Don't add analytics, session replay, or a remote script tag
without deciding to on purpose; there is no consent flow in this app to hang them off.

`frontend/plugins/health-check/` is the one piece of scaffolding kept: self-contained,
unbranded, and gated behind `ENABLE_HEALTH_CHECK=true`, so it's inert by default.

`public/favicon.svg` is a hand-written mark. The project previously had **no favicon at
all** — `/favicon.ico` fell through to `index.html` via the SPA fallback.

## Notes

- `frontend/README.md` is untouched CRA boilerplate; the root `README.md` is the real one.
