# HRI Passport: delivery report

HRI Hackathon Thailand 2026 · HumanoidTH · status as of 2026-11-07

"One Profile. Every Robot Understands You." A person creates one HRI Passport. Any robot reads it through a
public API and adapts distance, movement speed, eye contact, language and speaking speed, without the
person having to explain themselves again.

> **Scope of "robot".** Every robot that moves in this project is a three.js simulation in the browser,
> labelled as such on screen. The API is the integration contract for real robots; no code here controls
> robot hardware.

Related documents: `docs/hri-passport-api.md` (API contract, unit standard, rollout steps) ·
`docs/HRI-PASSPORT-DEMO.md` (demo script, Thai) · `docs/HANDOFF-HRI-PASSPORT.md` (history and plans for agents).

---

## 1. Deliverables

| # | Deliverable (master prompt §10) | Where | Status |
|---|---|---|---|
| 1 | HRI Passport working with the existing system | `/living-lab` (extended, not replaced) | ✅ Whole-site crawl unchanged vs. baseline (§3) |
| 2 | Robot-facing API + documentation | `GET /api/hri/passport/{token}` · `docs/hri-passport-api.md` | ✅ |
| 3 | My HRI Passport card | `/living-lab/passport/{token}` | ✅ |
| 4 | Edit and delete | Owner section on the card (edit key) | ✅ |
| 5 | Secure passport token | 256-bit access + edit tokens, SHA-256 hashed at rest | ✅ |
| 6 | Robot interaction integration | `lib/hri/adapt.ts`, hospital journey, `/living-lab/robot` | ✅ (simulation) |
| 7 | Default vs personalised demo | Robot console (Robot A, Robot B, Default) and the hospital journey | ✅ |
| 8 | Unit standardisation documentation | `docs/hri-passport-api.md` → *Unit standard* | ✅ |
| 9 | Automated test results | §3 below | ✅ |
| 10 | Setup and environment documentation | §4 below | ✅ |
| 11 | List of changed files | §5 below | ✅ |
| 12 | Known issues and limitations | §6 below | ✅ |
| + | Auto calibration (camera, one tap) | "Auto" button in `/living-lab` | ✅ in software · ⚠️ not yet tested with real people |
| + | Voice and typed answers, review before saving | "Talk or type your answers" in `/living-lab` | ✅ wiring tested with a stand-in recogniser · ⚠️ not yet tested with a real microphone |

### What the user gets

1. **Create** in the Living Lab. Consent is required first. Then either the button flow (wai, approach,
   care needs, eye contact, voice) or **Auto** mode (stand in front of the camera; it reads the wai,
   lean-backs, lean-ins and head turns, then saves after a 10 s review).
2. **Passport card**: identity-card design with code, QR, the five preferences, status, version and dates;
   copy link and share.
3. **Robots read it**: the QR holds the card URL; the last path segment is the access token for the API.
4. **Every robot adapts**: the same JSON becomes different behaviour on a full humanoid and on a
   screen-only telepresence robot. Values that changed versus the default robot are tagged *adapted*.
5. **Owner control**: edit (bumps the version robots see) or delete (gone from the API immediately)
   with the edit key kept in the owner's browser or pasted from the one-time key.

---

## 2. Requirements coverage (master prompt §8)

| Requirement | Automated test(s) |
|---|---|
| Create passport | `hri-e2e` (real UI, button mode) · `hri-auto` (Auto result passes server schemas) |
| Read passport | `hri-passport-api` (200 profile) · `hri-passport-card` (public card) · `hri-e2e` |
| Update passport | `hri-passport-card` (edit bumps version, API reflects it) · `hri-e2e` (eye contact change seen by robots) |
| Delete passport | `hri-passport-card` (inline confirm → API 404) · `hri-e2e` (API, card and legacy code link all gone; row removed) |
| Generate QR code | `hri-e2e` reads every QR module from the rendered image and compares with the expected card URL (plus a negative check) |
| Retrieve through API | `hri-passport-api` · `hri-e2e` |
| Robot personalised interaction | `hri-robot-console` · `hri-adapt` · `hri-e2e` |
| Invalid token | `hri-api` (unit) · `hri-passport-api` (400 / 404) · `hri-robot-console` (friendly error) |
| Unauthorised access | `hri-passport-card` (access token refused as edit key; public view never shows owner data) · `hri-owner` · `hri-e2e` (Thai visitor view is read-only) |
| Rate limiting | `hri-passport-api` (61st request → 429 + Retry-After) · `hri-api` |
| Token guessing protection | `hri-passport-api` and `hri-passport-card` (20 misses → locked out, shared with legacy codes) · `hri-api` |
| Sensitive data exposure | `hri-api`, `hri-passport-api`, `hri-robot-console`, `hri-e2e` (no anxiety, nickname, code, id or hashes in API, page or URL) · rate-limit table holds no raw IP |
| Invalid input | `hri-owner` (patch ranges, enums, smuggled fields) · `hri` (passport schema) · `hri-api` (malformed tokens) |
| Passport → API → robot simulation | `hri-robot-console` · `hri-e2e` |
| QR → passport retrieval | `hri-e2e` (console given the full card URL) |
| Default vs personalised | `hri-robot-console` (A, B and Default differ as expected) |
| Multiple robot compatibility | `hri-adapt` · `hri-robot-console` |
| Consent | `hri-auto-mode` and `hri-e2e` (Start and Auto disabled without consent). Server-side refusal without consent is enforced in `createPassportAction` (`app/living-lab/actions.ts`) but has no automated test (server actions cannot be called directly from Playwright). |

---

## 3. Automated test results (run 2026-11-07, against `next start` + Neon `dev`)

> **These results predate the review fixes and the voice flow.** The current status, including what has
> not been re-run, is in `docs/BASELINE-AUDIT.md`.

| Suite | Command | Result |
|---|---|---|
| Unit (node:test) | `pnpm test` | **63 / 63 pass** (18 pre-existing + 45 new) |
| Type check | `tsc --noEmit` | **0 errors** |
| Production build | `pnpm build` | **passes**, including the new routes `/api/hri/passport/[token]`, `/living-lab/passport/[token]` and `/living-lab/robot` |
| HRI integration (Playwright) | 5 specs, see §4 | **22 / 22 pass** with 1 worker (as on CI) and in parallel |
| Original smoke suite | `tests-node/smoke.spec.ts` | **2 / 2 pass** (admin crawl, visitors cannot become admin) |
| Original network suite | `tests-node/network.spec.ts` | 3 / 5 pass against a **production** build; the 2 others read `window.cy`, which `NetworkGraphClient.tsx` only exposes outside production. Neither file has changed since upstream; run them with `next dev` (the repo's Playwright default). |
| Whole-site crawl (16 pages × desktop and phone) | scripted check of status, page errors, horizontal scroll | All 200. The only issues are the 6 that already existed before this work (see §6), unchanged. |

Not automated: Auto mode with a real person (Chromium's fake camera has no person in it), Thai speech
output, phone camera scanning a QR on screen. These are in the demo checklist.

---

## 4. Setup and environment

**Requirements:** Node ≥ 20.11 (tested on 26), pnpm, a Neon Postgres branch.

```bash
cd HumanoidTH
pnpm install                       # also runs prisma generate
cp .env.example .env.local         # then fill in the variables below
grep NEON_BRANCH .env.local        # must say dev for development
pnpm test && pnpm build
pnpm dev                           # http://localhost:3000/living-lab
```

| Variable | Needed for | Notes |
|---|---|---|
| `DATABASE_URL` | everything | Pooled Neon URL. **Use the `dev` branch for development.** |
| `DATABASE_URL_UNPOOLED` | migrations, `prisma db execute` | Direct (non-pooler) URL of the same branch |
| `NEON_BRANCH` | safety checks | Integration tests refuse to run unless it is `dev` |
| `ADMIN_BASIC_USER`, `ADMIN_BASIC_PASSWORD` | admin pages, smoke test | No defaults: unset means nobody can sign in as admin |
| `ADMIN_SESSION_SECRET` | optional | Signs admin cookies; falls back to the admin password |
| `RATE_LIMIT_SALT` | optional | Salt for the anonymous rate-limit key; falls back to the admin secret/password |
| `NEXT_PUBLIC_SITE_URL` | optional | Canonical URLs |
| `GEMINI_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `YOUTUBE_API_KEY`, `GITHUB_TOKEN` | optional, other pages | Not used by HRI Passport |

**Integration tests** (write and remove their own rows; only on `dev`):

```bash
set -a && source ./.env.local && set +a
pnpm build && pnpm start &         # port 3000
PLAYWRIGHT_EXTERNAL_SERVER=1 pnpm exec playwright test --workers=1 \
  tests-node/hri-passport-api.spec.ts tests-node/hri-passport-card.spec.ts \
  tests-node/hri-robot-console.spec.ts tests-node/hri-auto-mode.spec.ts tests-node/hri-e2e.spec.ts
```

**Databases.** Neon project with two branches: `production` (live, untouched by this work) and `dev`
(all development and tests). `prisma.config.ts` now loads `.env.local`, so Prisma commands use the same
database as the app. `vercel env pull` would overwrite `.env.local` with production values.

**Before deploying to production:** the code needs the columns and the `HriRateLimit` table from
`prisma/migrations/20261107000000_hri_passport_access` (additive only). Pushing to `main` before migrating
production would break passport creation and the meet page in production. Steps (snapshot → review diff →
`prisma db execute`) are in `docs/hri-passport-api.md`; they need explicit approval from the team.

---

## 5. Changed files

Nothing outside `app/living-lab`, `app/api/hri`, `lib/hri`, Prisma, tests and docs was changed.
`app/globals.css`, layout, navigation and all other pages are untouched.

**Modified (13)**

| File | Change |
|---|---|
| `app/living-lab/LivingLabClient.tsx` | Consent gate, tokens and edit key on the done screen, QR → card URL, Auto mode and review screen, shared `savePassport`, passport card visual |
| `app/living-lab/actions.ts` | Tokens, consent, rate limits, owner view / update / delete actions, session data minimisation |
| `app/living-lab/copy.ts` | TH/EN copy for consent, card, Auto mode, review |
| `app/living-lab/meet/[code]/MeetClient.tsx` | Behaviour from `adapt()`; anxiety no longer copied into sessions |
| `app/living-lab/meet/[code]/page.tsx`, `meet/page.tsx` | Legacy code links: shared guessing budget, inactive passports hidden |
| `lib/hri/passport.ts` | CSPRNG codes, `careSpeed`, `inputMode: "auto"` |
| `lib/hri/signals.ts` | `headTurn`, `isFrontal`, `StillnessDetector` |
| `lib/hri/camera.ts` | Person count and brightness per frame |
| `prisma/schema.prisma` | Token hashes, status, expiry, consent, version; `HriRateLimit` |
| `prisma.config.ts` | Loads `.env.local` |
| `package.json`, `pnpm-lock.yaml` | `@types/pg` (dev only) |

**New (33):** route `app/api/hri/passport/[token]/route.ts`; pages `app/living-lab/passport/*` and
`app/living-lab/robot/*`; `app/living-lab/PassportCardVisual.tsx` + `passport-card.module.css`;
`lib/hri/{security,rate-limit,passport-api,public-profile,passport-owner,adapt,robot-profiles,auto-calibration}.ts`;
two migrations; unit tests `test/hri-{api,owner,adapt,auto}.test.ts`; Playwright specs
`tests-node/hri-{passport-api,passport-card,robot-console,auto-mode,e2e}.spec.ts`; the four docs.

**Database (Neon `dev` only):** 6 new columns on `HriPassport`, new table `HriRateLimit`. Production unchanged.

---

## 6. Known issues and limitations

**Limitations by design**
- Browser simulation only; no real robot control.
- Distance is in 3D scene units; the API reports `metres: null` until the team defines a conversion.
- Two languages (th, en); eye contact has two levels (direct, soft).
- Passports created before the API (no token) are reachable only through their 6-character code link.
- Anxiety is never inferred by the camera; Auto mode uses safe defaults for voice, captions, speech pace and handover, editable on the card.

**Open risks**
- **Auto mode accuracy on real people is unmeasured.** Run the go/no-go protocol in
  `HRI_FEASIBILITY_SPIKE.md` §3.4 (5 people, 2 distances, 2 lighting conditions, demo laptop) and tune
  `AUTO_TIMING` / `AUTO_THRESHOLDS` in `lib/hri/auto-calibration.ts`. Keep button mode as the fallback.
- **Production migration pending** (see §4). Confirm it has been applied before relying on production.
- **Voice input is untested with a real microphone**, and Thai recognition varies by browser and background noise. Typing and buttons are the fallback.
- Rate limiting keys on `x-forwarded-for`; correct on Vercel, spoofable on a self-hosted server without a trusted proxy.
- No REST `PATCH`/`DELETE` with a bearer edit token (owner edits go through server actions on the card).
- No in-app QR scanner; a phone camera opens the card URL.
- The card page renders "Passport not found" with HTTP 200 (streaming); the API returns proper status codes.

**Test notes**
- One intermittent failure was seen in 5 parallel full runs on 2026-11-07: the robot console's "no page
  errors" check under heavy parallel WebGL load. It passed alone and in all later runs, including with 1 worker.
- Auto-mode browser tests use a fake camera (no person), so they prove the wiring and the clean
  abort, not detection.

**Issues that already existed (not touched)**
React hydration error #418 on `/database`; `TypeError … 'notify'` on `/network` at phone width;
horizontal scroll on `/` (desktop), `/contributions` and `/analytics` (phone); `/map` falls back to mock
clusters without `GEMINI_API_KEY`; ESLint is not configured (`next lint` prompts); `prisma.config.ts`'s
seed command points at the Windows `tsx.CMD` (use `pnpm db:seed`).
