# Handoff: HRI Passport development (all phases done; see the delivery report)

Written 2026-11-07 for the next agent working in this repository. Read this whole file before
changing anything. The user (HRI Hackathon Thailand 2026 team) writes in Thai; report to them in Thai.
Phases 0–6 and 3B (Auto Calibration) are built and verified in software (2026-11-07). The current state,
test results, setup, changed files and known issues are in **`docs/HRI-PASSPORT-DELIVERY.md`**; the demo
script is `docs/HRI-PASSPORT-DEMO.md`. Still open and needing the team: the real-person go/no-go test for
Auto mode, committing to a branch, and the production migration (needs explicit approval).

**Goal:** "One Profile. Every Robot Understands You." A person creates an HRI Passport once; any
robot reads it through an API and adapts distance, movement speed, eye contact, language and
speaking speed.

---

## 1. Ground rules from the user (non-negotiable)

- **Extend, never rebuild.** HRI Passport already exists in the Living Lab (`app/living-lab/`, `lib/hri/`).
- **Work one phase at a time.** After each phase, report and wait for the user before starting the next.
  Each report covers: what you found, what you built, files changed, database changes, tests run,
  real results, problems, remaining risks and next steps. Never report a test as passing unless you ran it.
- **Never touch the production database** without explicit approval. All schema work goes to the Neon
  `dev` branch. No `prisma db push` to production, ever.
- **Never delete or overwrite existing passport, session or demo data.**
- **Never claim real robot control.** Everything that moves is a three.js browser simulation. Label it.
- Keep the existing stack (Next.js 15 App Router, Prisma 6, Neon Postgres, plain CSS). No new UI frameworks.
- Keep the HumanoidTH visual identity. Only the passport-related pages get the premium redesign.
- Don't commit, push or deploy unless the user asks. If asked to commit, branch off `main` first.

---

## 2. Where things are

| | |
|---|---|
| Repo folder | `/Users/phiphanachat/Desktop/HRI - Hackathon/HumanoidTH` (the two sibling folders `HumanoidTH-taechasith` and `HumanoidTH-upstream` are stale upstream clones; don't edit them) |
| Git | branch `main` @ `3f0023b`. Remote `origin` = github.com/6710615151/Robosonic (canonical). `hri` remote is 1 commit behind; `upstream` = taechasith/HumanoidTH. |
| Uncommitted | All Phase 2 and Phase 3 work (see §4) is uncommitted. Five untracked `audit*.tmp.mjs` files in the repo root belong to the user; leave them. |
| Database | Neon project `weathered-dust-68967874`. Branch `production` (`br-green-fog-b3b96pkq`) is live. Branch **`dev`** (`br-crimson-snow-b3ra57k6`) is for development. |
| Env | `.env.local` points at **`dev`** (`NEON_BRANCH="dev"`). Production values are backed up in `.env.local.production-backup` (gitignored). **Check `NEON_BRANCH=dev` before any DB work.** Never print or paste connection strings. |
| Earlier audit | https://claude.ai/artifact/Xhif1oq69px5nj1KtGjuRA (private to the user) |

---

## 3. What existed before this work (verified)

- `HriPassport` / `HriSession` models (`prisma/schema.prisma`). Preferences: `comfortDistance` (3D
  scene units, −3 far … 1.8 close), `speed` (0.25–2 multiplier), `gaze` (direct|soft), `language`
  (th|en), `speechPace` (normal|slow), plus `greeting`, `voice`, `anxiety`, `captions`, `noReach`, `nickname`.
- `/living-lab` → `LivingLabClient.tsx` (~578 lines): calibration game. Ends in phase `"done"` showing the
  6-char code and a QR (`LivingLabClient.tsx` ~L266–292 save + QR; ~L467 "Start the hospital journey" link).
  The QR currently encodes `/living-lab/meet/{code}`.
- `/living-lab/meet` (enter code) and `/living-lab/meet/[code]` → `MeetClient.tsx` (~577 lines): 3-station
  hospital journey (Mr SAM, Pinto, Mirror Telepresence), passport vs default robot, 1–5 comfort rating.
  Behaviour mapping is inline at `MeetClient.tsx` ~L172–182 (`careBehaviour`).
- `app/components/robot/RobotStage.tsx` + `lib/hri/behavior-engine.ts` (`RobotBehavior`: `setDistance`,
  `setSpeed`, `lookAt`, `bow`, `wave`, `expression`, `setGlow`…). Also used by the Overview page: only add to these.
- Copy (TH/EN) for the Living Lab lives in `app/living-lab/copy.ts`; site-wide strings in `lib/translations.ts`.
- Design tokens: `app/globals.css` L5–25 (`--accent #4a7c59`, `--accent-strong #365b41`, `--warning` amber
  `#705c30`, `--background #faf6f0`, sidebar deep green `#0b1a15` hard-coded). Global `button` rules
  (L266–340) style every button. Living Lab pages use inline `<style>` blocks (`.ll-*`, `.mt-*`).

---

## 4. Done so far

**Phase 0 (audit)** and **Phase 1 (env & safety)**: created Neon `dev` branch, repointed `.env.local`,
verified `pnpm build`, all pages, passport creation and the journey at runtime.

**Phase 2 (API & security)**, all uncommitted:

| File | What |
|---|---|
| `app/api/hri/passport/[token]/route.ts` | NEW. `GET` robot-facing profile, `OPTIONS` for CORS. |
| `lib/hri/passport-api.ts` | NEW. Framework-free handler `getPassportResponse(token, caller, deps)` → 200/400/404/410/429; `API_LIMITS`; `BASE_HEADERS`. |
| `lib/hri/public-profile.ts` | NEW. `toPublicProfile()` serializer, schema `humanoidth.hri-passport/v1`, unit conversions, `distanceCloseness`, `speedBand`. |
| `lib/hri/security.ts` | NEW, **server-only** (node:crypto). `generateToken` (32 bytes → 43-char base64url), `hashToken` (SHA-256 hex), `tokenMatchesHash` (constant time), `issuePassportTokens`, `clientId(headers)` (salted HMAC of IP). |
| `lib/hri/rate-limit.ts` | NEW. Postgres fixed-window limiter: `consumeRateLimit`, `peekRateLimit`, `currentClientId`, `enforceActionLimit`. Window maths is done in SQL on purpose. |
| `lib/hri/passport.ts` | `newPassportCode` now uses Web Crypto (client-safe); added `careSpeed(speed, anxiety)`. |
| `app/living-lab/actions.ts` | `createPassportAction` now rate-limited (10/h), issues tokens, stores hashes, **returns `{ code, accessToken, editToken }`** (the UI does not use the tokens yet). `recordMeetingAction` rate-limited, unknown codes count as misses. Both strip `anxiety`/`nickname` from session summaries. |
| `app/living-lab/meet/[code]/page.tsx`, `meet/page.tsx` | Legacy code links: shared guessing budget, `?error=rate_limited` message; inactive/expired passports treated as not found. |
| `MeetClient.tsx` | Removed `anxiety` from the station summary (1 line). |
| `prisma/schema.prisma` | `HriPassport` + `accessTokenHash @unique`, `editTokenHash`, `status` ("active"\|"revoked"), `expiresAt`, `consentAt`, `version`; new model `HriRateLimit`. |
| `prisma/migrations/20261004000000_hri_living_lab/` | NEW. Records the HRI tables that were originally `db push`ed. |
| `prisma/migrations/20261107000000_hri_passport_access/` | NEW. Additive only. **Applied to `dev` only** (via `prisma db execute`). Production verified unchanged. |
| `prisma.config.ts` | Loads `.env.local` then `.env` (was `.env` only, which broke local builds). |
| `test/hri-api.test.ts` | NEW. 15 unit tests (tokens, profile minimisation, every API branch, guessing lockout). |
| `tests-node/hri-passport-api.spec.ts` | NEW. 8 Playwright integration tests; refuses to run unless `NEON_BRANCH=dev`; seeds and deletes its own rows. |
| `docs/hri-passport-api.md` | NEW. API contract, error table, rate limits, unit standard, privacy rules, production rollout steps. **Read it.** |

**Verified results (2026-11-07):** unit tests 33/33, `tsc --noEmit` exit 0, `pnpm build` passes,
integration 8/8, Living Lab regression OK (new passport has both hashes; no session contains `anxiety`).
Lint cannot run: there is no ESLint config and `next lint` prompts interactively.

**Agreed decisions** (user said "use your recommendations"):
- Robot API takes the 256-bit **access token** only; the 6-char code stays as a typing convenience and for legacy links.
- **Delete = hard delete** of the passport row; sessions survive via the existing `onDelete: SetNull`.
- Distance stays in scene units; the API reports `band` / `closeness` / `sceneUnits` and **`metres: null`**
  until the team agrees a conversion. Don't invent metres.
- The public API never exposes anxiety, nickname, code, id, token hashes or session logs. Anxiety only as
  its effect (`movementSpeed.multiplier` via `careSpeed`, `interaction.demeanor: "calm"`).

---

**Phase 3 (passport experience)**, all uncommitted:

| File | What |
|---|---|
| `app/living-lab/LivingLabClient.tsx` | Required consent checkbox before Start/camera (both disabled without it); saves the edit token in `localStorage["hri-passport-edit:<accessToken>"]`; QR now encodes `/living-lab/passport/<accessToken>`; the done screen shows the edit key once (with a copy button), the code, and links to the card and the journey. |
| `app/living-lab/copy.ts` | TH/EN consent copy plus card/edit-key copy. |
| `app/living-lab/actions.ts` | `createPassportAction(..., consent)` requires `consent === true` and stores `consentAt`; new `getOwnerViewAction`, `updatePassportAction`, `deletePassportAction`. Owner actions verify the edit-token hash, count failures toward the shared miss budget and are rate-limited. Edit bumps `version`; delete is a hard delete. Owner actions return `{ ok, error }` objects because Next redacts thrown server-action messages in production. |
| `app/living-lab/passport/[token]/page.tsx` | NEW. Card page: `noindex`, `force-dynamic`, lookup by `hashToken(token)` under the API's request + miss limits. Nickname and anxiety are never in the HTML. |
| `app/living-lab/passport/[token]/PassportCardClient.tsx` | NEW. Public card (QR, code, preferences, status, version, dates, copy/share), auto-unlock from localStorage, paste-key fallback, owner edit form, inline delete confirmation. |
| `app/living-lab/passport/copy.ts` | NEW. TH/EN card copy. |
| `app/living-lab/passport/passport.module.css` | NEW. Scoped card styles (Phase 5 will polish). |
| `lib/hri/passport-owner.ts` | NEW. `ownerPatchSchema` (strict partial of `passportSchema`) and `OWNER_LIMITS`. |
| `test/hri-owner.test.ts` | NEW. 6 unit tests: partial patches, no defaults, range/enum rejection, no smuggled server fields, nickname rules, edit-vs-access token, limits. |
| `tests-node/hri-passport-card.spec.ts` | NEW. 7 integration tests: public card hides owner data, unlock, access token as edit key refused, edit bumps version and API reflects it, delete → API 404, unknown token notice, shared guessing budget. |
| `package.json` / `pnpm-lock.yaml` | Added `@types/pg` (already in the pnpm store) so `tsc` passes with the Playwright specs. |

**Verified results (2026-11-07):** unit tests 39/39, `tsc --noEmit` exit 0, `pnpm build` passes,
Playwright 15/15 (8 API + 7 card) on the built server against the `dev` branch, and a full browser
run of the calibration flow: Start disabled until consent, passport created, card link and edit key
shown, card auto-unlocked from localStorage, version 1. The test passport was deleted afterwards.

**Known limitation:** a runtime not-found on the card page renders the "Passport not found" notice
with HTTP 200 because the page streams (Next flushes the status before the DB answer). The API keeps
its proper 400/404/410 codes. The card is `noindex`.

**Phase 4 (robot integration)**, all uncommitted:

| File | What |
|---|---|
| `lib/hri/adapt.ts` | NEW. Pure `adapt(publicProfile, robotProfile) → BehaviourPlan` plus `DEFAULT_PLAN` (no-passport robot: wave, close, ×1.4, direct gaze). Records each compromise in `adaptations` (`fixed_base_distance`, `fixed_base_speed`, `speed_capped`, `no_head`, `no_arms`, `no_speaker`). |
| `lib/hri/robot-profiles.ts` | NEW. `ROBOT_PROFILES`: Robot A (mobile humanoid: head, arms, speaker, screen) and Robot B (fixed-base screen-only telepresence). |
| `app/living-lab/robot/page.tsx`, `RobotConsoleClient.tsx`, `copy.ts`, `robot.module.css` | NEW. `/living-lab/robot` console (`noindex`): paste a token **or the full card URL** → `fetch('/api/hri/passport/…')` → Robot A, Robot B and a Default robot act side by side on `RobotStage`, with per-field plans, the raw JSON (collapsible) and a persistent "Browser simulation. No real robot is connected or controlled." label. |
| `app/living-lab/meet/[code]/MeetClient.tsx` | The journey now gets its behaviour from `toPublicProfile` + `adapt(…, Robot A)` instead of inline maths. Same behaviour, with one fix: a passport with `greeting: "none"` no longer waves. |
| `app/living-lab/LivingLabClient.tsx` | Links to the robot console (page header and done screen). |
| `test/hri-adapt.test.ts` | NEW. 8 unit tests for `adapt`. |
| `tests-node/hri-robot-console.spec.ts` | NEW. 3 integration tests: one passport → two different plans + default (no anxiety/code/nickname/token in the page or URL), unknown token error, no horizontal overflow at phone width. |

**Verified results for Phases 0–4 (2026-11-07, re-run by the reviewing agent on a fresh `pnpm build`):**
unit tests 47/47, `tsc --noEmit` exit 0, build passes, Playwright **18/18** (8 API + 7 card + 3 console) on
`next start` against the `dev` branch, and a real-UI run: Start disabled until consent → calibration →
card link with a 43-char token → edit key shown once → API 200 with no `anxiety` → card unlocked for the
owner → robot console accepts the full card URL; Robot A and B differ; simulation label visible; 0 page errors.
Optional items not built: REST `PATCH`/`DELETE` with a bearer edit token; in-app QR scanning (P2).

**Phase 3B (Auto Calibration, ML)**, all uncommitted:

| File | What |
|---|---|
| `lib/hri/auto-calibration.ts` | NEW. Pure `AutoCalibrator` state machine fed with camera frames → events (`stage`, `paused`/`resumed`, `wai_received`/`wai_timeout`, `step`, `too_fast`, `too_close`, `lean_in`, `distance_set`, `gaze_check`, `complete`, `aborted`). All thresholds and timings are exported constants (`AUTO_TIMING`, `AUTO_THRESHOLDS`) so the venue test can tune them in one place. |
| `lib/hri/signals.ts` | Added `headTurn`, `isFrontal`, `StillnessDetector`, `LeanBackDetector.reset()`. |
| `lib/hri/camera.ts` | `numPoses: 2` (to detect "more than one person"; `landmarks` is still the first pose, so camera mode is unchanged), new `people` and `luma` (mean brightness of a 64×48 sample, about once a second) on each frame. |
| `lib/hri/passport.ts` | `sessionSchema.inputMode` accepts `"auto"`. |
| `app/living-lab/LivingLabClient.tsx` | "Auto: just stand in front of the camera" button (needs consent), Auto panel (stage, step meter, person/wai/lean-back chips, Stop), review screen that **auto-saves after a 10 s countdown** (Save now / Wait / Start again), shared `savePassport()` for both modes, camera split into `startCamera`/`stopCam`; the camera stops as soon as Auto completes or aborts. The done screen shows "Not asked (Auto mode)" for anxiety. |
| `app/living-lab/copy.ts` | TH/EN copy for Auto mode and the review screen. |
| `test/hri-auto.test.ts` | NEW. 16 unit tests with synthetic landmark streams: full happy path, no wai, too close, too fast, repeated lean-backs, lean-in, gaze aversion, sideways turn ignored, no person → abort, pause/resume, dropped frames, two people, too dark, chaotic input always ends, safe defaults, server-schema compatibility. |
| `tests-node/hri-auto-mode.spec.ts` | NEW. 3 browser tests with Chromium's fake camera: consent gate; with nobody in view Auto pauses then stops cleanly and saves nothing; Stop returns to buttons and turns the camera off. |

How Auto decides (details in the file header of `auto-calibration.ts`): ~2 s baseline of the person's
shoulder width → wait up to 10 s for a wai (bows anyway) → approach `[-2.2, -1.3, -0.4, 0.5]` one step at a
time, moving on after 2 s of stillness (max 5 s per step) → lean-back while moving = too fast (half speed,
one step back, once); lean-back or a 1 s step-back (<85% baseline width) while waiting = too close (back off
0.8) → leaning in (>112%) at the last step unlocks 1.3 → two or more lean-backs = 0.4 farther and speed ≤ 0.5
(this replaces asking about anxiety) → 5 s eye-contact check: head turned away > 35% of the time → `soft`
(unmeasurable → `soft`) → review. Pauses for no person (after 1.5 s), more than one person, or too dark
(luma < 35); a pause over 25 s, or 180 s in total, ends the session without saving.

**Decision taken while building:** eye contact uses the **pose** landmarks (nose offset from the shoulder
midpoint) instead of adding MediaPipe Face Landmarker. It reuses the pipeline already loaded and avoids a
second model download. Face Landmarker remains a possible upgrade if the venue test shows head turn is too coarse.

**Verified (2026-11-07):** unit tests 63/63, `tsc` exit 0, `pnpm build` passes, Auto browser tests 3/3, regression
Playwright 18/18 and the full button-mode UI flow (0 page errors), no horizontal scroll at 1440 and 390 px.
**Not verified:** detection accuracy on real people, and a browser run where an Auto session completes and
saves (Chromium's fake camera has no person in it; the save path is covered by the shared `savePassport`
and a unit test that the Auto result and session pass the server schemas). **Run the go/no-go test in
`HRI_FEASIBILITY_SPIKE.md` §3.4 with real people before demoing Auto mode**, and add a "complete Auto session"
check by hand: consent → Auto → stand, wai, lean back once → review → auto-save → card.

**Phase 5 (UI/UX)**, all uncommitted. Scope kept to the three passport pages; `app/globals.css`, the
sidebar, navigation and every other page are untouched.

| File | What |
|---|---|
| `app/living-lab/PassportCardVisual.tsx` + `passport-card.module.css` | NEW. The passport drawn as an identity card, shared by the calibration done screen and the card page: sidebar deep green → `--accent-strong` gradient, gold hairline (a lighter cut of the amber `--warning` marker), faint guilloché security pattern, QR on a white tile, code, five preference chips with icons, and a passport-style MRZ line (`HRI<TH<<CODE<<V1<<<…`, only data already on the card, `aria-hidden`). Container queries switch the chips to label/value rows in narrow places. One "issued" animation (settle + one sheen) on the calibration screen, off under `prefers-reduced-motion`. |
| `app/living-lab/passport/[token]/PassportCardClient.tsx` + `passport.module.css` | Hero = card visual + an aside with Copy/Share and a compact status list; "What every robot reads" split into *Interaction preferences* and *Care and communication*; duplicate owner badge removed from the header (the one in Owner settings stays). All test ids kept (`passport-code`, `passport-qr`, `passport-status`, `passport-version`, `owner-section`). |
| `app/living-lab/LivingLabClient.tsx` | Done screen uses `PassportCardVisual` (keeps the `ll-code` class on the code) plus an "Also on your passport" list; old `.ll-passport`/`.ll-code` rules removed. |
| `app/living-lab/robot/RobotConsoleClient.tsx`, `robot.module.css`, `copy.ts` | Facts that differ from the default robot are tinted and tagged "adapted" (text, not colour alone), with a legend above the robots. |
| `app/living-lab/copy.ts`, `app/living-lab/passport/copy.ts` | TH/EN for the card heading, motto ("One profile. Every robot understands you."), groups and meta line. |
| `tests-node/hri-auto-mode.spec.ts`, `tests-node/hri-robot-console.spec.ts` | Test robustness only: the Auto test counts passports created during its own run (other specs delete their rows in parallel); the WebGL-heavy console test gets a 60 s timeout. |

**Verified (2026-11-07):** before/after screenshots of all three pages at 1440 and 390 px (no horizontal
scroll, 0 page errors), unit 63/63, `tsc` 0, build passes, Playwright 21/21 in parallel in 4 of the last 5 full
runs. **Known flake:** once, the console test's "no page errors" check failed under parallel load (three WebGL
robots plus other browser suites); it passed alone and in three later full runs. Error text not captured;
likely WebGL contexts under load. The repo config uses 1 worker on CI.

## 5. Critical risk before any push/deploy

The Phase 2 code reads and writes columns that **production does not have yet**. Pushing to `main`
(Vercel auto-deploys) before migrating production would break passport creation and the meet page in
production. The production rollout steps (snapshot → review diff → `prisma db execute`) are in
`docs/hri-passport-api.md`; they need the user's explicit approval.

---

## 6. Next phases (the plan the user approved)

### Phase 3: Passport Experience (done 2026-11-07)

**Status: complete — see §4.** The list below is the original plan, kept for reference. One
optional item was not built: REST `PATCH`/`DELETE` on the API route with `Authorization: Bearer
<editToken>` (the server actions cover the card). Phase 5 will polish the card styles.

1. **Show the tokens after creation.** In `LivingLabClient.tsx` (phase `"done"`), use the
   `accessToken`/`editToken` now returned by `createPassportAction`. Save the edit token in the owner's
   browser, e.g. `localStorage["hri-passport-edit:" + accessToken]` (wrap in try/catch), and also show it
   once with a "keep this to edit or delete later" note. Link to the card page.
2. **QR content:** encode `${origin}/living-lab/passport/${accessToken}`. A person scanning it sees the card;
   a robot takes the last path segment and calls the API. Keep the code shown for typing.
3. **My HRI Passport card:** new `app/living-lab/passport/[token]/page.tsx` (server component,
   `robots: noindex`, `force-dynamic`) plus a client component. Look up by `hashToken(token)`, run it through
   the same rate-limit/miss logic as the API (reuse `API_LIMITS`, `peekRateLimit`, `consumeRateLimit`).
   Show: code, QR, the five preferences with human labels (reuse `describeDistance`), status, created/updated
   dates, version, and Copy link / Share (`navigator.share` with fallback). Show Edit/Delete only when the
   browser holds a matching edit token. Anxiety is shown only to the owner (edit-token holder), never to
   someone who merely has the QR.
4. **Edit:** server action `updatePassportAction(accessToken, editToken, patch)` in
   `app/living-lab/actions.ts`: verify with `tokenMatchesHash`, validate with `passportSchema.partial()`,
   `version: { increment: 1 }`, rate-limit. Give `speechPace` its own control (today it is tied to large
   captions). Optionally add REST `PATCH`/`DELETE` on the API route with `Authorization: Bearer <editToken>`.
5. **Delete:** `deletePassportAction(accessToken, editToken)` → `prisma.hriPassport.delete`. Put the
   confirmation step in the page itself; never use `confirm()`. Sessions keep `passportId = null`.
6. **Consent:** add a required consent step **before calibration starts** (not just before saving), so the
   same step also covers the camera in Auto mode (Phase 3B). Pass it to `createPassportAction` and set
   `consentAt`. TH/EN copy in `app/living-lab/copy.ts`.
7. Tests: unit (edit/delete authorisation: wrong token, access token used as edit token, version bump) +
   extend the Playwright spec (card renders, edit, delete → API then returns 404).

### Phase 3B: Auto Calibration (ML), approved 2026-11-07 (built and software-verified, see §4; real-person test still open)

**Goal:** the person taps once (consent + start) and the robot calibrates the passport by itself from the
camera, with no further input until the passport is saved. It can run in parallel with Phase 3 (a different
team member), but it shares Phase 3's consent step.

**Decisions (user agreed):**
- **Add** an "Auto" mode next to the existing button and camera modes. Do **not** remove button mode: it is
  the demo fallback and the accessible path for people who can't or won't use a camera.
- One tap is unavoidable and required: browsers need a user gesture for camera permission and for speech
  audio, and PDPA/HRI ethics need explicit consent before sensing.
- **Do not infer anxiety from the face.** Facial emotion recognition is unreliable and anxiety is sensitive
  health data. In Auto mode, store no anxiety label (`anxiety` stays at its default `"low"`). Express
  discomfort through measured behaviour instead: frequent lean-backs → slower `speed` and a farther
  `comfortDistance`. The API output stays the same shape.
- Everything stays on-device (MediaPipe WASM in `public/mediapipe`). Only derived preferences are saved,
  never frames or landmarks.

**Flow:** consent + Start (1 tap) → automatic sequence of about 60–90 s → summary screen that auto-saves after
a visible 10 s countdown (with a Stop/adjust option) → passport + QR. Save sessions with
`inputMode: "auto"` (add it to `sessionSchema`'s enum in `lib/hri/passport.ts`) so analytics can compare modes.

**Step mapping** (current buttons are at `LivingLabClient.tsx` ~L369–440):

| Step | Auto replacement | Code status |
|---|---|---|
| Wai | `WaiDetector` (`lib/hri/signals.ts`); robot waits, with a timeout that proceeds anyway | exists |
| Too close | `LeanBackDetector` (needs per-person baseline: record shoulder width for ~2 s at the start) | exists |
| Comfortable here | New `StillnessDetector`: no lean-back and low shoulder-width variance for N s at a step → stop there | new, pure + unit-tested |
| Too fast | Lean-back while the robot moves at speed > 1 → lower speed (reuse `tooFast` logic) | new logic, existing signals |
| Eye contact | Face Landmarker (prototype in `spike/hri/sensing.js`; model `spike/hri/models/face_landmarker.task` → copy to `public/mediapipe/`). While the robot looks directly, measure the share of time the face turns away (head yaw / nose offset); above a threshold → `gaze: "soft"` | new; accuracy UNKNOWN |
| Language | Current `lang` cookie / `navigator.language` | trivial |
| Voice | No reliable camera signal → default spoken + text | default |
| Anxiety | **Not inferred** (see decisions) | — |
| Captions / speech pace / no-reach | No reliable signal → safe defaults (`captions: "normal"`, `speechPace: "normal"`, `noReach: true`); the owner can change them on the card page (Phase 3 edit) | default |

**Before building, run the go/no-go test** in `HRI_FEASIBILITY_SPIKE.md` §3.4 (~45 min, 5 people,
0.6 m and 1.2 m, normal and backlit/dim light, on the demo laptop, via `spike/hri/sensing-lab.html`).
Accuracy on real people is currently UNKNOWN. If wai or lean-back fails the thresholds, keep those steps on
buttons and report it honestly. Add a stillness and gaze-aversion readout to the sensing lab if needed.

**Robustness:** light check (mean luma, as in the spike) with a "too dark" message; if no person or more than
one person is in frame, pause and say so; a timeout on every step so the flow always finishes; a sideways turn
must not count as a lean-back (check both shoulders are visible).

**Files:** new `lib/hri/auto-calibration.ts` (pure state machine: phase, timers, signal inputs →
preference outputs; unit-tested with synthetic landmark streams like `test/hri.test.ts`); extend
`lib/hri/signals.ts` (stillness, gaze aversion) and `lib/hri/camera.ts` (optional face landmarker); wire into
`LivingLabClient.tsx` (coordinate with whoever does Phase 3 on the same file).

**Effort:** about 1.5–2 days (pose-based auto flow) + 0.5–1 day (face-based gaze), plus the go/no-go test.

**Tests:** unit tests for every detector and the state machine (including timeouts and "no person");
a Playwright run of Auto mode with a fake camera (`--use-fake-device-for-media-stream` and
`--use-file-for-fake-video-capture=<y4m>` in Chromium) that checks the flow finishes and saves a passport;
the venue test results recorded honestly in the phase report.

### Phase 4: Robot Integration (done 2026-11-07, see §4)

- Extract `lib/hri/adapt.ts`: a pure function from the public profile (or passport) to a behaviour plan.
  Base it on `MeetClient.tsx` ~L172–182 and `careSpeed`. Make `MeetClient` use it, with no behaviour change.
- New `/living-lab/robot` "Robot console": enter or scan a token → `fetch('/api/hri/passport/' + token)` →
  `RobotStage` adapts. Show **Robot A** and **Robot B** with different capability profiles
  (`lib/hri/robot-profiles.ts`, e.g. one with no head or eye contact, one screen-only) applying the same JSON
  differently, side by side with Default behaviour. Visible "Browser simulation, not real robot control" label.
- Optional P2: in-app QR scanning with `BarcodeDetector` where available; a phone camera works anyway.

### Phase 5: UI/UX (done 2026-11-07, see §4)

Scoped premium styles only for calibration, the card and the robot console (e.g.
`app/living-lab/passport.module.css`). Derive from the existing tokens (deep green, forest-green accent,
amber); don't edit `globals.css` global rules; mind the global `button` styles. Responsive at ~390px,
accessible contrast, `prefers-reduced-motion`.

### Phase 6: Testing & Demo (done 2026-11-07)

Added `tests-node/hri-e2e.spec.ts` (one passport through the real UI: consent → calibration → QR verified
module-by-module against the card URL → API → owner card → Thai read-only visitor → robot console →
edit → version 2 everywhere → delete → gone everywhere, self-cleaning), a 120 s timeout on the Auto "Stop"
test (MediaPipe load ≈ 20 s), `docs/HRI-PASSPORT-DELIVERY.md` and `docs/HRI-PASSPORT-DEMO.md`.
Results: unit 63/63, tsc 0, build OK, HRI Playwright 22/22 with 1 worker and in parallel, original smoke 2/2,
whole-site crawl unchanged vs. baseline. `network.spec.ts` needs `next dev` (reads a dev-only `window.cy`).

Playwright E2E: create (button mode and Auto mode) → card → API → robot console → edit → delete. Security tests from the user's list
(invalid token, unauthorised edit/delete, rate limit, guessing, sensitive data exposure, invalid input).
Demo script, setup docs, final list of changed files, known issues.

---

## 7. How to run things

```bash
cd "/Users/phiphanachat/Desktop/HRI - Hackathon/HumanoidTH"
grep NEON_BRANCH .env.local                 # must say dev
pnpm test                                   # unit tests, no DB needed
node ./node_modules/typescript/bin/tsc --noEmit --incremental false
pnpm build                                  # works without sourcing env now

# Server + integration tests (writes only to dev)
set -a && source ./.env.local && set +a
./node_modules/.bin/next start -p 3000      # run in background
PLAYWRIGHT_EXTERNAL_SERVER=1 ./node_modules/.bin/playwright test tests-node/hri-passport-api.spec.ts tests-node/hri-passport-card.spec.ts tests-node/hri-robot-console.spec.ts tests-node/hri-auto-mode.spec.ts
```

If port 3000 is taken (e.g. a server another session left running; don't kill processes you didn't
start), run `next start -p 3100` and pass a config kept **outside the repo** whose `use.baseURL` is
`http://localhost:3100` and whose `testDir` is the absolute path of `tests-node` (`--config <file>`).
Stop your own servers when you're done.

Schema changes: edit `schema.prisma` → generate SQL with `prisma migrate diff --from-schema-datamodel <old> --to-schema-datamodel prisma/schema.prisma --script`
→ save as a new folder in `prisma/migrations/` → confirm the URL is the dev endpoint → `prisma db execute --url "$DATABASE_URL_UNPOOLED" --file …`
→ check `prisma migrate diff --from-url "$DATABASE_URL_UNPOOLED" --to-schema-datamodel prisma/schema.prisma` is empty → `prisma generate`.
`prisma migrate dev/deploy` will not work on the existing databases (no `_prisma_migrations` table).

---

## 8. Gotchas we already hit

- **Time zones:** `pg` writes a JS `Date` as local time (UTC+7) into `timestamp without time zone`
  columns. Prisma writes UTC correctly. In raw SQL or tests, compute timestamps in SQL (`now() AT TIME ZONE 'UTC'`).
- **Playwright cannot import the Prisma client** (`generated/prisma` directory import under ESM). In
  `tests-node/` use `pg` directly, as `hri-passport-api.spec.ts` does.
- `lib/hri/security.ts` and `rate-limit.ts` are server-only. Client components may import only
  `lib/hri/passport.ts` and `lib/hri/public-profile.ts`.
- `"use server"` files may only export async functions.
- Rate limits key on `x-forwarded-for`. Tests send a random value per test to stay isolated (only
  spoofable locally; Vercel sets it).
- The last journey station shows "Finish journey", not "Saved to the Living Lab.". Tests must not wait
  for the latter on station 3.
- The `"Start the hospital journey"` link is a client-side `<Link>`: wait for the URL change
  (`waitUntil: "commit"`), not a `load` event.
- Unrelated issues that already existed (not ours; don't fix unless asked): React hydration error #418 on
  `/database`; `TypeError … 'notify'` on `/network` at phone width; horizontal scroll on `/` (desktop),
  `/contributions` and `/analytics` (phone); `/map` falls back to mock clusters without `GEMINI_API_KEY`.
- `prisma.config.ts` seed command still points at the Windows `tsx.CMD`; use `pnpm db:seed`.
- `vercel env pull` would overwrite `.env.local` with production values.

## 9. Data in `dev` created during testing

Passports `USZP68` and `34RD3M` with their calibration and journey sessions (test data, safe to keep),
plus one passport created by the Phase 4 real-UI check (calibration session only; also safe to keep).
Integration-test passports are removed automatically (nickname `integration-test`; codes start with `1`).
