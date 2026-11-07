> Historical handoff. See [JURY_LIVE.md](JURY_LIVE.md) for the current wiring, deadlines, secret setup, lint policy and production verification.

# Jury Live backend handoff

## Status

Database migrations are applied. Server implementation is committed but **not wired, published, or enabled**. No paid provider calls were made. Existing Explore, precomputed evidence, components, content routes, result schema, and `src/server.ts` were not edited.

Import `handleJuryRequest` from `src/lib/jury/backend.server.ts` only inside your server boundary. Intercept `/api/jury/*`, call `await handleJuryRequest(request, env)`, and return its response; otherwise retain the existing TanStack request flow. Pass the actual server runtime bindings as `env`, not browser configuration. Never call this module from UI code. No Edge deployment, proxy, browser database client, or backend-target URL file is needed.

## HTTP contract after owner wiring

Same-origin base: `https://narrative-evidence-atlas.lovable.app/api/jury`

- `GET /config`: `{available}`; false on missing credentials, disabled switch, or unhealthy database.
- `GET /session`: `{available,authenticated,csrfToken?,remaining?,activeJobId?}`.
- `POST /login`: JSON `{password}`; generic incorrect-password response; strict secure 45-minute cookie.
- `POST /logout`: JSON `{}` plus `X-CSRF-Token`; revokes the session and clears its cookie.
- `POST /jobs`: JSON `{query:{topic,platforms:["tiktok"],language:"fr",dateRange:null},idempotencyKey:UUID}` plus CSRF; optional `Idempotency-Key` must match JSON.
- `GET /jobs/:id`: owner or explicit completed-cache access only.
- `POST /jobs/:id/run`: JSON `{}` plus CSRF; one awaited foreground execution, never background continuation.
- `POST /jobs/:id/cancel`: JSON `{}` plus CSRF; running cancellation keeps the lock until the active provider returns/aborts and completion persists.

Job responses carry `id,status,stage,completedStages,cached,remaining,result,errorCode`. `result` follows the requested AnalysisResult fields plus live counts/metrics/warnings. No run token or private storage fields are returned. Live evidence additionally carries `aiGenerated:true,sourceVerified:true,editorialReview:"required"`; optional `frameOutsideInterval` identifies a nearby frame outside the quote interval. The owner's UI/schema must render that warning and the lack of editorial review. No social URL or player is invented.

## Secrets and runtime verification

Save these through **Project Settings → Secrets**, never chat or `.env`/`VITE_*`:

| Name                   | Configuration                                                                 |
| ---------------------- | ----------------------------------------------------------------------------- |
| `ORIANE_API_KEY`       | Oriane account credential                                                     |
| `OPENAI_API_KEY`       | Your OpenAI project credential; direct official `gpt-4o-mini` requests        |
| `JURY_ACCESS_PASSWORD` | At least 16 characters; stored server-side only                               |
| `JURY_LIVE_ENABLED`    | `false` until deployment and duration are verified; only exact `true` enables |

The managed `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` already exist. Do not ask users to obtain or copy the managed service credential. The handler reads direct string bindings from `env` first and request-time `process.env` second. It never reads `VITE_*` or imports the browser client. Opaque service keys use `apikey` without a fake JWT bearer header.

**Verified:** the sandbox server process contains the managed credential and its private RPC health call succeeded. **Not verified:** production binding injection and platform foreground duration. Generated server code reads request-time `process.env`, but that alone does not establish published availability. After wiring, missing injection safely returns `{available:false}`; leave disabled until confirmed. No public diagnostic endpoint is provided.

The handler budgets health at 4s, atomic claim plus foreground work at 46s, and a single finish attempt at 4s (54s network budget; target 55s). Oriane aborts at 14s, each OpenAI call at 16s, all within the shared bound. Synchronous validation adds small overhead; runtime hard-duration capacity is unverified. A failed completion is not retried. The database execution deadline is 55s and admission lease 120s from claim. Queued jobs expire after 120s. Expiry is reaped transactionally on subsequent RPC calls, including health; no scheduler or durable unawaited runner is claimed. If the runtime terminates a request early, quota remains spent and the lease prevents immediate overlap. Do not enable unless the deployment can safely support this foreground duration.

## Persistent security and accounting

Private RLS-enabled tables: `jury_control`, `jury_sessions`, `jury_login_windows`, `jury_jobs`, `jury_job_access`. No anon/authenticated grants or policies. `jury_backend(text,jsonb)` is SECURITY DEFINER with fixed search path, executable by service_role only. Actions cover health, login limiting, login/session/logout, reservation/cache, get/claim/cancel, stage and finish. No diagnostics are public.

Every action obtains the singleton `jury_control` row `FOR UPDATE`. Reservation atomically checks one active job, at most ten new analyses, 500 estimated Oriane credits, and $1 reserved OpenAI total; each new job spends one slot, 50 estimated credits, and $0.10. Invalid preflight reserves nothing. Failure/cancellation never refunds. Session/idempotency and normalized query/filter/version uniqueness prevent reruns; completed cache access is free and explicitly mapped to the requesting session. Other sessions cannot read an active/failed job by guessing its ID or cache key. No process-memory counters.

Tokens are cryptographically random 32-byte values; only SHA-256 hashes persist. CSRF is derived using server HMAC and stored as a hash. Credential version is password-bound HMAC, so password or managed signing-credential rotation invalidates sessions. Password comparison uses fixed-length HMAC digests and a fixed loop. Cookie: `__Host-nd-jury`; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2700. Mutations require exact approved production/preview Origin and JSON. No CORS wildcard. Forwarded IP headers are **not trusted**; the persistent global login limiter is authoritative. Rotation is checked on each new request; already-running requests finish within their original bound.

## Provider/evidence bounds

One exact Oriane search per job with `limit=10,offset=0,projection=full,sort=transcriptRelevance:desc`; arbitrary topic-derived bounded keyword array. 200/206 supported; provider HTTP, network, empty/incomplete, oversized-body and token-truncation failures are explicit and never retried. 2MB response cap, ten deduplicated TikTok IDs, 40k transcript characters total, 6k/video and 250 source passages. Whole documented chunks retain timing; truncation never invents boundaries. Metadata/OCR/frames remain ephemeral. Only unsigned HTTPS catalog frames with real timestamps may persist.

At most two OpenAI structured-output calls: extraction ≤3000 output tokens and optional grouping ≤1500. Aggregate input ≤120k UTF-8 bytes (a conservative token upper bound) bounds model cost below the $0.10 reservation at current model rates independently of dashboard budget. Model IDs are supplied enums; local validation binds exact quote/context/time and screens unsupported semantic claims. Excluded genres/relevance/speakers may yield zero claims, which is an explicit insufficient-evidence failure. At most five groups, independent support from ≥2 videos, unique references, preserved ungrouped observations. Automated semantic screening is conservative and **not human editorial validation**.

## Unpaid verification

`bunx vitest run --config src/lib/jury/backend.vitest.config.ts` runs isolated Node/Web API backend mocks without the browser test setup. `bunx vitest run` runs the existing Explore and core suites.

`src/lib/jury/backend-db.test.sql` is a rollback-only privileged-connection check. The ordinary shell/query roles correctly cannot execute the private RPC; do not widen privileges to run tests. Migration `0002_jury_transactional_regression_checks.sql` ran equivalent real RPC assertions under the migration role in a deliberately rolled-back subtransaction: reservation/idempotence, global concurrency, double claim, cancellation lock, no refund, free cache, quota, credential rotation, expiry, CSRF, limiter and privilege denials passed, leaving no test rows or accounting changes. No live provider or published end-to-end runner has been tested.
