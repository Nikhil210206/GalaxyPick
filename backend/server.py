from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import asyncio
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx

from phones import PHONES, match_score, satisfies
from google import genai
from google.genai import types as genai_types

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-3.5-flash')

# Gemini returns transient 5xx/429s under load; a retry usually clears them.
RETRIABLE_STATUS = {429, 500, 502, 503, 504}
QUOTA_EXHAUSTED_STATUS = 429
MAX_LLM_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 0.8
# How long a key is passed over after it reports quota exhaustion. Free-tier limits are
# both per-minute and per-day; this is long enough to ride out the former without
# permanently retiring a key that only tripped the former.
KEY_COOLDOWN_SECONDS = 15 * 60
LLM_ERROR_MESSAGE = (
    "Sorry — Galaxy AI is having trouble reaching its brain right now. "
    "Please try that again in a moment."
)


def _load_api_keys():
    """Keys from GEMINI_API_KEYS (comma-separated), else the single GEMINI_API_KEY.

    Order is preserved and duplicates dropped — the first key is the default and the
    rest are only reached once an earlier one exhausts its quota.
    """
    raw = os.environ.get('GEMINI_API_KEYS') or os.environ.get('GEMINI_API_KEY') or ''
    keys = []
    for key in (k.strip() for k in raw.split(',')):
        if key and key not in keys:
            keys.append(key)
    return keys


class GeminiKeyPool:
    """Rotates across API keys when one exhausts its quota.

    Free-tier quota is billed per Google Cloud *project*, per model, per day — so this
    only buys headroom when the keys belong to different projects. Four keys minted in
    one project share a single bucket and will exhaust simultaneously, and rotation
    will do nothing for you.
    """

    def __init__(self, keys):
        self._clients = [genai.Client(api_key=k) for k in keys]
        # Only ever identify a key by its last 4 chars — the rest must not reach a log.
        self._labels = [f"key{i + 1}(…{k[-4:]})" for i, k in enumerate(keys)]
        self._cooling_until = [None] * len(keys)
        self._current = 0

    def __bool__(self):
        return bool(self._clients)

    def __len__(self):
        return len(self._clients)

    def acquire(self):
        """The current key, or the next one not cooling off. None if all are cooling."""
        now = datetime.now(timezone.utc)
        for offset in range(len(self._clients)):
            idx = (self._current + offset) % len(self._clients)
            until = self._cooling_until[idx]
            if until is None or until <= now:
                self._cooling_until[idx] = None
                self._current = idx
                return idx, self._clients[idx], self._labels[idx]
        return None

    def mark_exhausted(self, idx):
        """Pass this key over for a while and start from the next one."""
        self._cooling_until[idx] = datetime.now(timezone.utc) + timedelta(seconds=KEY_COOLDOWN_SECONDS)
        self._current = (idx + 1) % len(self._clients)
        logger.warning(
            "Gemini %s hit quota; cooling it for %ds and rotating to %s",
            self._labels[idx], KEY_COOLDOWN_SECONDS, self._labels[self._current],
        )

    def status(self):
        now = datetime.now(timezone.utc)
        return [
            {
                "key": label,
                "cooling": bool(until and until > now),
                "available_in_seconds": max(0, int((until - now).total_seconds())) if until and until > now else 0,
            }
            for label, until in zip(self._labels, self._cooling_until)
        ]


key_pool = GeminiKeyPool(_load_api_keys())

app = FastAPI(title="GalaxyPick API")
api_router = APIRouter(prefix="/api")


# -------------------- Models --------------------
class RecommendRequest(BaseModel):
    persona: Optional[str] = None
    needs: List[str] = []
    budget: Optional[int] = None
    preferences: List[str] = []


class ChatRequest(BaseModel):
    session_id: str
    message: str
    persona: Optional[str] = None


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # "user" | "assistant"
    content: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# -------------------- Endpoints --------------------
@api_router.get("/")
async def root():
    return {"message": "GalaxyPick API is running"}


@api_router.get("/health")
async def health():
    """Operational view of the LLM key pool. Reports only key suffixes, never keys."""
    keys = key_pool.status()
    return {
        "status": "ok",
        "model": GEMINI_MODEL,
        "keys_configured": len(key_pool),
        "keys_available": sum(1 for k in keys if not k["cooling"]),
        "keys": keys,
    }


@api_router.get("/phones")
async def list_phones():
    return {"phones": PHONES}


@api_router.get("/phones/{phone_id}")
async def get_phone(phone_id: str):
    phone = next((p for p in PHONES if p["id"] == phone_id), None)
    if not phone:
        raise HTTPException(status_code=404, detail="Phone not found")
    return phone


@api_router.post("/recommend")
async def recommend(req: RecommendRequest):
    tags = list(req.needs)
    if req.persona:
        tags.append(req.persona.lower().replace(" ", "_").replace("/", "_"))

    # Preferences and budget are constraints the user stated, not leanings: a phone with
    # no S-Pen must never surface for someone who asked for one, however well it scores
    # elsewhere. Needs and persona stay soft — they rank what's left.
    eligible = [p for p in PHONES if satisfies(p, req.preferences)]
    affordable = [p for p in eligible if not req.budget or p["price_inr"] <= req.budget]

    scored = sorted(
        ({**p, "match": match_score(p, tags, req.budget)} for p in affordable),
        key=lambda x: x["match"],
        reverse=True,
    )

    if scored:
        top = scored[:3]
        top[0]["best_match"] = True
        return {"recommendations": top, "all_scored": scored, "unsatisfiable": None}

    # Nothing satisfies both the preferences and the budget. Rather than quietly
    # dropping a constraint, work out which single one is actually responsible so the
    # user can be offered the one change that would help, and name the cheapest phone
    # honouring the preferences as the alternative.
    nearest = min(eligible, key=lambda p: p["price_inr"], default=None)
    return {
        "recommendations": [],
        "all_scored": [],
        "unsatisfiable": {
            "preferences": req.preferences,
            "budget": req.budget,
            "nearest": {**nearest, "match": match_score(nearest, tags, None)} if nearest else None,
            "relaxations": _relaxations(req.preferences, req.budget),
        },
    }


def _relaxations(preferences, budget):
    """Preferences that would, on their own, unblock the search if dropped.

    With several filters active it isn't obvious which one is at fault — "latest" quietly
    excludes nine phones while a filter every phone matches excludes none. Offering
    "drop everything" throws away constraints the user could have kept, so surface the
    single drops that actually produce results, best first.
    """
    options = []
    for dropped in preferences:
        kept = [p for p in preferences if p != dropped]
        hits = [
            p for p in PHONES
            if satisfies(p, kept) and (not budget or p["price_inr"] <= budget)
        ]
        if hits:
            options.append({
                "drop": dropped,
                "count": len(hits),
                "cheapest_inr": min(h["price_inr"] for h in hits),
            })
    options.sort(key=lambda o: (-o["count"], o["cheapest_inr"]))
    return options


@api_router.get("/location")
async def location(request: Request):
    """Detect country + currency from IP."""
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "")
    try:
        async with httpx.AsyncClient(timeout=3.0) as hc:
            r = await hc.get(f"https://ipapi.co/{ip}/json/" if ip else "https://ipapi.co/json/")
            data = r.json()
        return {
            "country": data.get("country_name", "India"),
            "country_code": data.get("country_code", "IN"),
            "currency": data.get("currency", "INR"),
        }
    except Exception:
        return {"country": "India", "country_code": "IN", "currency": "INR"}


def phones_mentioned(text, limit=3):
    """Catalog phones named in an assistant reply, in order of first mention.

    Matches longest names first and blanks each hit out of the haystack, so
    'Galaxy S26 Ultra' isn't also counted as a mention of 'Galaxy S26'.
    """
    haystack = text
    hits = []
    for phone in sorted(PHONES, key=lambda p: -len(p["name"])):
        idx = haystack.find(phone["name"])
        if idx != -1:
            hits.append((idx, phone))
            haystack = haystack[:idx] + "\0" * len(phone["name"]) + haystack[idx + len(phone["name"]):]
    hits.sort(key=lambda hit: hit[0])
    return [phone for _, phone in hits[:limit]]


def phone_card(phone):
    """Compact payload for the in-chat product cards."""
    return {
        "id": phone["id"],
        "name": phone["name"],
        "price_inr": phone["price_inr"],
        "image": phone["image"],
        "features": phone["features"][:3],
        "samsung_url": next(s["url"] for s in store_links(phone) if s["name"] == "Samsung"),
    }


def store_links(phone):
    q = phone["name"].replace(" ", "+")
    return [
        {"name": "Samsung", "url": f"https://www.google.com/search?q=site%3Asamsung.com+{q}", "price_inr": phone["price_inr"]},
        {"name": "Amazon", "url": f"https://www.amazon.in/s?k={q}", "price_inr": phone["price_inr"]},
        {"name": "Flipkart", "url": f"https://www.flipkart.com/search?q={q}", "price_inr": int(phone["price_inr"] * 1.015)},
    ]


@api_router.get("/buy-links/{phone_id}")
async def buy_links(phone_id: str):
    phone = next((p for p in PHONES if p["id"] == phone_id), None)
    if not phone:
        raise HTTPException(status_code=404, detail="Phone not found")
    return {"stores": store_links(phone)}


# -------------------- Chat with Galaxy AI --------------------
def _catalog_for_prompt():
    """The lineup the model may recommend, rendered from the catalog itself.

    This list used to be hand-written here, and it drifted: it still offered the A55 and
    M55 long after Samsung discontinued them. A model naming a phone that isn't in PHONES
    is worse than unhelpful — phones_mentioned() can't match it, so the reply arrives with
    no product card and links nowhere.
    """
    return "\n".join(
        f"- {p['name']} (₹{p['price_inr']:,}) — {', '.join(p['features'][:3])}"
        for p in sorted(PHONES, key=lambda p: -p["price_inr"])
    )


SYSTEM_PROMPT = f"""You are Galaxy AI, a friendly Samsung Galaxy phone recommendation assistant.
Your job is to understand the user's needs (budget, use-case, preferences) and suggest the best Samsung Galaxy phone(s) from Samsung's 2024-2026 lineup.

Available Samsung phones you can recommend:
{_catalog_for_prompt()}

Guidelines:
- Keep responses concise (2-4 short paragraphs max)
- Ask ONE clarifying question if needed (budget, main use-case)
- When recommending, name 1-3 specific models and explain WHY in one line each
- Be warm and conversational, not robotic
- Never recommend non-Samsung phones
- Never use emojis — the rest of the product has none, and a reply full of them
  reads as a different voice from every other screen
- Use ₹ (INR) for prices"""


@api_router.post("/chat")
async def chat(req: ChatRequest):
    if not key_pool:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    # Save user message
    user_msg = ChatMessage(session_id=req.session_id, role="user", content=req.message)
    await db.chat_messages.insert_one(user_msg.model_dump())

    # Replay the stored turns so the model can see the conversation so far.
    # The just-saved user message is the last entry, so this doubles as the prompt.
    prior = await db.chat_messages.find(
        {"session_id": req.session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    contents = [
        genai_types.Content(
            role="model" if m["role"] == "assistant" else "user",
            parts=[genai_types.Part(text=m["content"])],
        )
        for m in prior if m["content"]
    ]

    persona_ctx = f"\n\nUser persona: {req.persona}" if req.persona else ""
    config = genai_types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT + persona_ctx,
        # Thinking roughly doubles token spend on this workload for no gain here,
        # and burns free-tier quota. Recommending a phone needs no reasoning budget.
        thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
    )

    async def event_gen():
        full = []
        failed = False
        # Give every key a turn: with more keys than the base retry budget, a quota
        # failure on each of the first few must not exhaust the attempts before the
        # last key has been tried.
        max_attempts = max(MAX_LLM_ATTEMPTS, len(key_pool))
        for attempt in range(max_attempts):
            lease = key_pool.acquire()
            if lease is None:
                failed = True
                logger.error("Every Gemini key is cooling off after quota exhaustion; giving up")
                break
            idx, client, label = lease
            try:
                stream = await client.aio.models.generate_content_stream(
                    model=GEMINI_MODEL, contents=contents, config=config
                )
                async for chunk in stream:
                    if chunk.text:
                        full.append(chunk.text)
                        # JSON-encode: model output contains blank lines, which would
                        # otherwise split the SSE frame and truncate the message.
                        yield f"data: {json.dumps(chunk.text)}\n\n"
                failed = False
                break
            except Exception as e:
                failed = True
                code = getattr(e, "code", None)
                out_of_quota = code == QUOTA_EXHAUSTED_STATUS
                if out_of_quota:
                    key_pool.mark_exhausted(idx)
                retriable = code in RETRIABLE_STATUS and not full
                logger.error(
                    f"LLM stream error on {label} (attempt {attempt + 1}/{max_attempts}, "
                    f"code={code}, retrying={retriable and attempt + 1 < max_attempts}): {e}"
                )
                # Once any text has reached the client, a retry would duplicate it —
                # this is why rotation can only ever happen before the first chunk.
                if not retriable or attempt + 1 == max_attempts:
                    break
                # A quota failure rotated us onto a different project's bucket, so
                # there is nothing to wait for; only back off when retrying the
                # same key after a transient server error.
                if not out_of_quota:
                    await asyncio.sleep(RETRY_BACKOFF_SECONDS * (2 ** attempt))

        if failed and not full:
            yield f"data: {json.dumps(LLM_ERROR_MESSAGE)}\n\n"

        # Persist only a real reply — an empty row would pollute the replayed history.
        if full:
            reply = "".join(full)
            cards = [phone_card(p) for p in phones_mentioned(reply)]
            if cards:
                yield f"data: {json.dumps({'type': 'phones', 'phones': cards})}\n\n"
            assistant = ChatMessage(session_id=req.session_id, role="assistant", content=reply)
            await db.chat_messages.insert_one(assistant.model_dump())
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api_router.get("/chat/{session_id}/history")
async def chat_history(session_id: str):
    msgs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"messages": msgs}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
