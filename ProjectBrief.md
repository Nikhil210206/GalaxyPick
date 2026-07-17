# GalaxyPick — Project Brief

**Samsung Innovation Campus (SIC) — Capstone Project**

## Team Details

| Field | Details |
|---|---|
| Team Name | Team HyperVisor |
| Team Members | Nikhil Balamurugan — RA2411003011574 · Bodireddy Kiran — RA2411003012152 · Dheeraj Yenigalla — RA2411003012126 · Sai Santosh Preetham G — RA2411003012120 |
| Institution | SRM Institute of Science and Technology |
| Program | Samsung Innovation Campus (SIC) — Capstone Project |
| Trainer / Faculty Guide | Anil Kumar Sandrapuri |
| Submission Date | 17 July 2026 |
| Live Deployment | https://galaxypick.vercel.app |
| Repository | https://github.com/Nikhil210206/GalaxyPick |

## Problem Statement

Samsung's Galaxy lineup spans 21+ active models across the S, Z Fold/Flip, A, M, and F
series — from a ₹9,999 entry 5G phone to a ₹1,74,999 foldable flagship — with real overlap
in specs and features between adjacent tiers. A buyer trying to choose is left comparing
raw spec sheets on a retail site, with no way to translate "I'm a student, my budget is
₹20,000, and I want good battery" into a specific model. Generic e-commerce filters sort
by price or brand; they don't understand trade-offs, and they don't tell a buyer when
their requirements are simply unsatisfiable at their budget (e.g., no Galaxy under
₹1,25,000 has an S-Pen). The result is decision fatigue, over-reliance on in-store staff,
or a purchase the buyer later regrets.

## Business Context

For Samsung, friction at this exact decision point is friction before a sale. As the
Galaxy lineup fragments further across five series, guiding a buyer to the *right* model —
not just *a* model — directly supports purchase confidence and reduces the mismatch that
drives returns and dissatisfaction. This also sits squarely on Samsung's own product
direction: **Galaxy AI** is Samsung's push toward AI-assisted, conversational experiences
across its ecosystem, and a recommendation assistant is a natural extension of that into
pre-purchase retail. The project targets a segment particularly underserved by generic
comparison tools — budget-conscious and first-time buyers, students especially — who need
guidance more than they need another spec sheet.

## Approach

GalaxyPick offers two complementary entry points to the same underlying catalog and
scoring engine:

1. **A guided wizard** — persona → needs → budget → preferences → recommendations. Budget
   and preferences (e.g. "must have S-Pen") are treated as **hard constraints** that
   filter the catalog; needs and persona are **soft signals** that rank what's left. When
   no phone satisfies every constraint, the app says so explicitly, names the cheapest
   phone that *would* qualify, and offers to relax the one filter actually responsible —
   rather than silently dropping a requirement the user set.
2. **Galaxy AI** — a conversational assistant built on the Google Gemini API, for buyers
   who'd rather describe their needs in their own words. It shares the same product
   catalog and renders in-chat product cards for every phone it recommends, so a model the
   assistant names is always a model the app can actually sell.

The project was built and hardened iteratively rather than shipped as a first draft:

- **Data integrity.** The initial catalog and wizard shipped with silent bugs — preference
  filters that matched zero or every phone (so they could never change a result), a chat
  prompt that kept recommending phones Samsung had already discontinued, and a fixed 98%
  "match" badge shown regardless of the user's actual answers. These were found by
  auditing the scoring logic against real inputs, fixed, and pinned with automated tests
  so a future change can't reintroduce them silently.
- **Real content.** All 21 catalog entries — pricing, specs, and launch dates — were
  researched against Samsung India's official listings and Samsung Newsroom, not
  estimated. Every product image is an official Samsung render, sourced directly from
  Samsung's CDN and normalized for consistent presentation, replacing an initial set of
  generic stock photos (one of which was, on inspection, a photo of an iPhone).
- **Resilience.** Gemini's free tier caps requests per day per key; the backend supports
  automatic failover across multiple API keys so the assistant keeps working if one key's
  quota is exhausted.
- **Independent ownership.** The project was originally scaffolded by a third-party AI
  app builder. All of that vendor's tracking scripts, branding, and dead scaffolding were
  identified and removed, and the project now runs as a clean, independently owned
  codebase and deployment.
- **Verification over assumption.** Every fix in this project was verified by actually
  driving the running app — in a browser, end to end — rather than trusting that a code
  change worked. The same discipline applied to deployment: the first production build
  broke the chat assistant in a way local testing couldn't have caught (a local-only
  config value leaking into the deployed build), and it was diagnosed and fixed by testing
  the live site directly, not assumed fixed from reading the code.

## Tools & Technologies

| Layer | Technology |
|---|---|
| Frontend | React 19, Create React App + CRACO, Tailwind CSS, shadcn/ui, React Router |
| Backend | Python, FastAPI, Motor (async MongoDB driver), Pydantic |
| Database | MongoDB Atlas (stores chat history; the product catalog is static, version-controlled data) |
| AI / LLM | Google Gemini API (`gemini-3.1-flash-lite`), server-sent-event streaming, custom multi-key failover |
| Testing | Pytest, automated contract tests that tie every frontend option to the live catalog |
| Deployment | Vercel (unified frontend + backend deployment), MongoDB Atlas free tier |
| Tooling | Git / GitHub |

## Outcome

A working product, live at **galaxypick.vercel.app** — a 21-phone Samsung catalog with
real, sourced data; a wizard that filters honestly and explains itself when nothing
matches; and a Gemini-backed conversational assistant, all deployed to a single
production URL with no local-only configuration and no leftover third-party dependencies
from the project's scaffolded origin.
