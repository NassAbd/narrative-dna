# Jury Live operations and verification

Public app: https://narrative-evidence-atlas.lovable.app/

**Decision: GO for Explore; NO-GO for public Jury Live. Keep `JURY_LIVE_ENABLED=false`.** Source code release: `27cb83c` (processing version `jury-v5-gpt4o-mini-2026-11-07`). Production credentials are configured. Authentication and storage work; repeated model extraction timeouts block reliable activation.

Explore is anonymous and uses only the nine approved precomputed claims. Jury Live uses the same UI and a private same-origin `/api/jury/*` server API. No provider credentials or passwords belong in frontend code, Git, URLs, or localStorage.

## Architecture

TanStack Start/Nitro Cloudflare module → server-only HTTP handler → Lovable Cloud PostgreSQL `jury_backend` RPC. Five RLS-enabled private tables persist sessions, login limiting, jobs, cache access and the singleton quota. Only `service_role` can execute the SECURITY DEFINER RPC; fixed search path and row locking serialize admission. No browser Supabase client is used by this flow.

The foreground runner is awaited, with a shared 46-second claim/pipeline budget, 4-second storage request limits and a 120-second conservative lease. Oriane has a 14-second deadline; OpenAI extraction 28 seconds and grouping 12 seconds, both inside the shared budget. This does not promise continuation after disconnection. Polling reads saved milestones; stale leases fail on a later RPC and retain their spent allocation.

Limits: ten new analyses globally, one active job, ten unique videos, at most five groups. Reserve one slot, 50 estimated Oriane credits and $0.10 OpenAI before providers. Lifetime internal ceilings are 500 estimated credits and $1 reserved OpenAI. These estimates do not expose the provider's real billing balance. Failures/cancellation are charged; no automatic retries/refunds. Completed matching versioned queries are free; duplicate idempotency keys never launch a second runner. Do not reset production accounting during the demo.

The source boundary allows 2 MB provider responses, 40k transcript characters, 6k/video and 250 passages. Model calls are capped at two, with 3000 extraction / 1500 grouping output tokens and 120k aggregate input bytes including schemas. The model is `gpt-4o-mini`; cost estimates use [$0.15/M input and $0.60/M output tokens](https://developers.openai.com/api/docs/models/gpt-4o-mini). Failed calls may be billable even when no usage is returned.

## Secure configuration

Use the existing Lovable project's Settings → Secrets:

- `ORIANE_API_KEY`
- `OPENAI_API_KEY`
- `JURY_ACCESS_PASSWORD`: 16–128 characters, supplied privately to judges.
- `JURY_LIVE_ENABLED`: exact `true` enables; any other value disables.

Managed `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` stay server-side. Never copy the managed service credential into the browser. Publish after secret changes so production receives them.

To rotate jury access, replace the password in Secrets and publish. Password-bound credential versions invalidate old sessions on subsequent requests. Sessions are 45 minutes, opaque and hashed in storage, with `__Host-nd-jury; HttpOnly; Secure; SameSite=Strict; Path=/`. Logout revokes the session. Mutations require allowed Origin, JSON and session CSRF. A persistent global limiter constrains login attempts.

To stop new Live usage, set `JURY_LIVE_ENABLED=false` and publish. Existing foreground requests retain their original bounded execution; Explore remains available.

## Evidence behavior

The model selects existing source passage IDs; the server binds exact quotation, source ID, context and provider times. Missing times remain null. Source matching, timestamp checks and conservative semantic screens run before display. Fiction, lyrics, uncertain speaker/genre and off-topic evidence are excluded by model assessment; passage-level relevance/support flags are required. Questions presented as arguments/proposals/objections are deterministically rejected. Descriptions/questions remain individual observations.

Groups need at least two distinct videos. Unsupported wording/references are rejected; verified clips remain individual observations. Oversized grouping input skips that call. Zero groups is valid. Every live result is labelled **AI-GENERATED · SOURCE-VERIFIED · NOT EDITORIALLY REVIEWED**. These checks do not guarantee semantic fidelity, relevance, attribution, genre or factual truth. Review before publication; coding-agent review is not independent journalist approval. This sample does not represent public opinion.

Only safe unsigned Oriane CDN frames persist; their true frame times and outside-interval warnings remain visible. No documented canonical video or official playable URL was available, so no original URLs, embeds or simulated player are invented.

## Commands

```sh
npm install
npm run typecheck
npm run lint
npm test
npm run test:backend
npm run build
```

Generated Lovable integrations retain their platform formatting; `.prettierignore` excludes only their formatting checks. TypeScript and other ESLint rules still cover them. Six pre-existing React Refresh warnings remain.

The optional paid smoke command reads the owner password from the ignored experimental environment and never prints it:

```sh
node --env-file=../experiments/narrative-dna/.env scripts/jury-smoke.mjs
```

**Do not rerun this casually: a new version/query consumes global quota.** It checks deployment version before admission, anonymous-read denial, secure login cookie, CSRF rejection, duplicate reservation, completed evidence, free cache, logout and revocation. Sanitized reports go to `/private/tmp/narrative-dna-live-smoke*.json`, not Git. Successful token/cost metrics exclude any failed call whose provider returned no usage.

## Verification record

- Typecheck and production Cloudflare build pass.
- 47 frontend/core tests and 25 backend tests pass.
- Lint: no errors; six existing warnings.
- Rollback-only privileged database checks cover quota/concurrency/idempotency/cache/no-refund/expiry/rotation/limiter and privilege restrictions; no production allocation consumed by these checks.
- Anonymous production Explore, exact citation drawer, visible frames and password-access screen verified in browser.
- Production secret injection, private RPC access, server login, anonymous-read denial, CSRF rejection, logout and free cache verified over HTTPS.
- Browser assets and tracked source scanned against the configured local secret values; no matches found.

Initial v2 smoke: 18.302 s end to end; 10 analyzed / 3 relevant videos, 7 exact-bound claims with frames, zero accepted groups; one Oriane request and two OpenAI requests, 11,714 input / 1,177 output tokens, estimated $0.0024633. Manual coding review then found a question misclassified as an argument and off-topic AI-security material. No claims were human-approved; v3 tightened passage-level support/relevance, discourse handling and French attributed formulations.

The v3 regression failed at extraction with `openai_network`; no usage was returned. Its allocation was retained. v4 improves timeout classification, gives extraction more time inside the unchanged total bound, and records sanitized failure diagnostics.

The v4 job failed at search with `oriane_network` in 0.289 s. The timeout patch had introduced `redirect:"error"`; [Cloudflare does not support this mode](https://developers.cloudflare.com/workers/runtime-apis/request/) and throws before sending a request. This coding regression is fixed in v5 using `manual`; a regression test proves redirects cannot forward provider credentials. No provider request was sent by that v4 job, but its reserved allocation remains charged.

The final v5 run reached Oriane and then failed at extraction with `openai_timeout` in **28.673 s** for the runner request. No token usage was returned. Paid testing stopped. Public Live must remain disabled; no claim that current live extraction or clustering is ready is made.

### Actual accounting after testing

| Measure                                | Recorded outcome                                                     |
| -------------------------------------- | -------------------------------------------------------------------- |
| Reserved production jobs               | 4: one completed, three failed                                       |
| Remaining global allocation            | 6 / 10                                                               |
| Active job                             | None                                                                 |
| Oriane authenticated searches sent     | 3, including the two runs that later failed at OpenAI                |
| OpenAI HTTP attempts                   | 4: two completed in v2, two extraction requests failed without usage |
| Known OpenAI usage                     | 11,714 input / 1,177 output tokens                                   |
| Known estimated OpenAI cost            | $0.0024633; excludes two failed calls with unknown billing           |
| Internal Oriane reservation            | 200 estimated credits; actual provider consumption unconfirmed       |
| Internal OpenAI reservation            | $0.40; an admission ceiling, not actual billing                      |
| Latest successful semantic-quality run | None after the stricter prompt change                                |
| Initial source-verified output         | 7 claims / 3 contributing videos / 7 frames / 0 accepted narratives  |

One unauthenticated HEAD and one invalid unauthenticated empty POST inspected the official Oriane endpoint during redirect diagnosis. They retrieved no videos and sent no account key. These are not authenticated searches. Cached/duplicate checks did not make provider requests.

No new claims received independent journalist approval. The initial coding review was useful for finding inference/relevance errors, not for approving evidence. The stronger prompt and deterministic question filter pass tests, but their live quality was not validated because extraction timed out.

### Smallest next step

Reduce the extraction input to 3–5 substantive videos, cap passage/context volume and ask for 1–2 claims per video, retaining the same source/timestamp checks and deadlines. Measure extraction on the already available corpus before another bounded live test. Do not raise quotas, reset accounting or introduce automatic retries to hide these failures. Keep Explore as the jury presentation until that test succeeds.

### Changed areas

`src/lib/jury/`: contracts, runtime result schema, source normalization/grounding, authentication, private RPC transport, bounded extraction/grouping runner, client polling and backend/core tests. `src/server.ts`: same-origin API boundary. `src/components/narrative/JuryLivePanel.tsx`, SearchPanel, IndividualObservations, EvidenceDrawer and `src/routes/index.tsx`: protected UI and accurate provenance. `drizzle/migrations/` and generated Supabase types were created through Lovable. `scripts/jury-smoke.mjs` performs bounded verification. Precomputed approved-demo.json was unchanged. The pre-existing untracked package-lock.json was not committed.

Build warnings: the existing large browser chunk and six React Refresh warnings remain. npm audit also reports existing/transitive advisories (including development tooling and Zod 3); request/body/input limits mitigate collection expansion, but this work is not a dependency-security certification. No broad dependency upgrades were performed during the deadline iteration.

## Final disabled rollout

Deployment `1f04af2e-1830-4469-a0ca-0325f12762e2`, revision `ad7e62d`, was verified publicly: `/api/jury/config` returns HTTP 200 with `available:false`; `/api/jury/session` returns HTTP 200 with `available:false,authenticated:false`, processing header v5. Anonymous Explore still renders two groups and nine approved cards. Provider keys remain configured server-side; activation is deliberately off.
