# HRI Passport API

"One Profile. Every Robot Understands You."

A robot (or any external system) reads a person's HRI Passport over HTTP and adapts how it
interacts: distance, movement speed, eye contact, language and speaking speed. No web page is
involved. The response is robot-agnostic: it describes preferences and units, and each robot maps
them onto what its own hardware supports.

> **Simulation vs real robots.** The robots in HumanoidTH's Living Lab are three.js simulations in the
> browser. This API is the integration contract a real robot would use; no code in this repository
> controls physical robot hardware.

## Endpoint

```
GET /api/hri/passport/{accessToken}
```

| | |
|---|---|
| `accessToken` | 43-character base64url string (256 random bits). It is encoded in the passport's QR code and shown to the owner once when the passport is created. |
| Auth | Holding the token is the authorisation (bearer-in-path). Treat it like a password. |
| CORS | `Access-Control-Allow-Origin: *`, `GET` and `OPTIONS` only. |
| Caching | `Cache-Control: no-store`. Re-fetch when you meet the person; compare `version` to detect edits. |

### 200 OK

```json
{
  "schema": "humanoidth.hri-passport/v1",
  "status": "active",
  "version": 1,
  "updatedAt": "2026-11-07T09:00:00.000Z",
  "expiresAt": null,
  "preferences": {
    "distance":      { "band": "far", "closeness": 0.35, "sceneUnits": -1.3, "metres": null },
    "movementSpeed": { "multiplier": 0.5, "band": "slow" },
    "eyeContact":    { "level": "soft" },
    "language":      { "tag": "th", "locale": "th-TH" },
    "speakingSpeed": { "pace": "slow", "rate": 0.85 }
  },
  "interaction": {
    "greeting": "wai",
    "voice": true,
    "captions": "large",
    "handover": "place_nearby",
    "demeanor": "calm"
  },
  "units": { "distance": "…", "movementSpeed": "…", "speakingSpeed": "…" }
}
```

### Errors

| Status | `error` | When |
|---|---|---|
| 400 | `invalid_token` | Token is not 43 base64url characters. Counts as a failed lookup. |
| 404 | `not_found` | No passport has this token. Counts as a failed lookup. |
| 410 | `expired` | `expiresAt` has passed. |
| 410 | `revoked` | The owner revoked the passport. |
| 429 | `rate_limited` | Too many requests or failed lookups. See `Retry-After` (seconds). |
| 500 | `server_error` | The database is unreachable or an unexpected error occurred. |

Error responses never contain profile data.

## Owner card

The person's own view of a passport lives at:

```
GET /living-lab/passport/{accessToken}
```

| | |
|---|---|
| Visibility | `noindex, nofollow`, `force-dynamic`. Only the same preferences the API returns (plus the 6-character code, status, version and timestamps) are in the HTML. Nickname and anxiety are **not** rendered for anyone holding the link. |
| Owner access | The browser where the passport was created stores the edit key in `localStorage["hri-passport-edit:<accessToken>"]`. On load, the card verifies it through a server action and then reveals nickname, anxiety, edit and delete. On another device the owner can paste the 43-character edit key shown once at creation. |
| Edit | `updatePassportAction` accepts only the preference fields (`ownerPatchSchema` in `lib/hri/passport-owner.ts`, a strict partial of `passportSchema`), rejects smuggled fields such as `version` or `accessTokenHash`, bumps `version` and updates `updatedAt`. |
| Delete | `deletePassportAction` hard-deletes the passport row. Sessions survive (`HriSession.passportId` is `onDelete: SetNull`), so journey ratings stay anonymous; `lib/hri/session-privacy.ts` keeps care needs and identifiers out of their summaries and event logs when they are written. The access token stops working immediately. |
| Journey link | The 6-character code on the card opens `/living-lab/meet/CODE` without an edit key. That page receives the same effects as the API (capped speed, calm demeanour), never the raw anxiety level (`toJourneyPassport`). |
| Guessing | Card lookups share the API's failed-lookup budget: an unknown or malformed token counts as a miss, and an exhausted caller cannot load even a valid card. |
| Rate limits | Per client: unlock 20 per 10 min, save 30 per 10 min, delete 5 per hour. Failed owner checks also consume the shared failed-lookup budget. |
| Consent | Consent is required before calibration starts and is stored on the passport as `consentAt`. |

The card URL is also the content of the passport QR code, so scanning it opens the card on any phone.

## Rate limits and guessing protection

Limits are stored in Postgres (`HriRateLimit`), so they hold across all serverless instances.

| Bucket | Limit | Effect |
|---|---|---|
| Requests per caller | 60 per minute | 61st request → 429 |
| Failed lookups per caller | 20 per 10 minutes | After 20 misses, **every** lookup from that caller (even with a valid token) → 429 until the window ends |

The failed-lookup budget is shared with the legacy 6-character code links (`/living-lab/meet/CODE`)
and the journey's `recordMeetingAction`, so codes and tokens cannot be guessed in parallel.
Callers are identified by a salted HMAC of the client IP (`RATE_LIMIT_SALT`, falling back to
`ADMIN_SESSION_SECRET` / `ADMIN_BASIC_PASSWORD`); raw IPs are never stored. Rows older than a
day are cleaned up automatically.

## Unit standard

| Preference | Stored as (`HriPassport`) | API field | Unit |
|---|---|---|---|
| Preferred distance | `comfortDistance` | `distance` | `band` (`close` ≥ 0.9, `medium` ≥ −0.6, else `far` in scene units), `closeness` 0 = farthest … 1 = closest, `sceneUnits` = raw value of the 3D stage (−3 far … 1.8 close). **`metres` is `null`**: no validated scene-to-metre conversion exists yet. Each robot maps `band`/`closeness` to its own safe physical distance. |
| Movement speed | `speed` (0.25–2) | `movementSpeed.multiplier` | Multiple of the robot's own nominal speed. Already reduced for comfort needs: capped at 0.75 (medium anxiety) or 0.5 (high anxiety), the same rule the hospital journey uses (`careSpeed` in `lib/hri/passport.ts`). |
| Eye contact | `gaze` | `eyeContact.level` | `direct` or `soft` (look at the person only occasionally). |
| Preferred language | `language` | `language.tag` / `locale` | BCP 47: `th`/`th-TH` or `en`/`en-US`. |
| Speaking speed | `speechPace` | `speakingSpeed` | `pace` `normal`/`slow`; `rate` is the speech-rate multiplier (Web Speech API scale): 1 or 0.85. |

Stored values are never rewritten; conversions happen only in `lib/hri/public-profile.ts`.
To add metres later, agree a mapping, add it there, bump `schema` to `v2`, and keep `v1` fields.

## Privacy and data minimisation

The API returns only what a robot needs to adapt. It never returns the passport id, the
6-character code, the nickname, the raw anxiety level, timestamps other than `updatedAt` and
`expiresAt`, token hashes, or session logs. Anxiety appears only as its *effect*: a lower
`movementSpeed.multiplier` and `demeanor: "calm"`.

Tokens are stored only as SHA-256 hashes (`accessTokenHash`, `editTokenHash`). Session summaries
no longer copy the anxiety level (stripped on the server in `app/living-lab/actions.ts`).

Passports created before this API (no `accessTokenHash`) are not reachable through it; they keep
working through their 6-character code link only.

## Files

| File | Role |
|---|---|
| `app/api/hri/passport/[token]/route.ts` | Route handler: wires Prisma and the rate limiter |
| `lib/hri/passport-api.ts` | Request logic (validation, limits, status codes); unit-tested |
| `lib/hri/public-profile.ts` | Robot-facing serializer and unit conversions |
| `lib/hri/security.ts` | Token generation and hashing, salted client id (server-only) |
| `lib/hri/rate-limit.ts` | Postgres fixed-window limiter, `enforceActionLimit` for server actions |
| `lib/hri/passport-owner.ts` | Owner edit schema (strict partial) and owner rate limits |
| `app/living-lab/passport/[token]/page.tsx` | Card page: rate-limited lookup by token hash, public fields only |
| `app/living-lab/passport/[token]/PassportCardClient.tsx` | Card UI, owner unlock, edit form, inline delete confirmation |
| `app/living-lab/passport/passport.module.css` | Scoped card styles |
| `prisma/migrations/20261107000000_hri_passport_access/` | Additive schema change |

## Tests

```bash
pnpm test                                   # unit tests (no database needed)

# Integration: writes and removes test passports, refuses to run unless NEON_BRANCH=dev
set -a && source ./.env.local && set +a
pnpm build && pnpm start                    # in another terminal
PLAYWRIGHT_EXTERNAL_SERVER=1 pnpm exec playwright test tests-node/hri-passport-api.spec.ts tests-node/hri-passport-card.spec.ts
```

## Database changes and production rollout

Existing databases were created with `prisma db push` and have no `_prisma_migrations` table.
The repository now records the HRI tables (`20261004000000_hri_living_lab`) and this change
(`20261107000000_hri_passport_access`) as migrations, so a fresh database can use `prisma migrate deploy`.

The access migration has been applied **only to the Neon `dev` branch**. To apply it to production
(needs explicit approval):

1. Take a Neon snapshot of the `production` branch.
2. Review: `prisma migrate diff --from-url "$PROD_URL" --to-schema-datamodel prisma/schema.prisma --script`
   must print exactly the SQL in `20261107000000_hri_passport_access/migration.sql`.
3. Apply: `prisma db execute --url "$PROD_URL" --file prisma/migrations/20261107000000_hri_passport_access/migration.sql`
4. Optionally start using `prisma migrate`: `prisma migrate resolve --applied <name>` for each of the three migrations.

The SQL only adds nullable or defaulted columns, one table and indexes. It does not modify existing rows.
