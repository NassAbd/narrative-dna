# Final bounded iteration — 7 November 2026

## Decision

**Jury Live: NO-GO, remains disabled. Explore: GO.** Exactly one paid end-to-end HTTP smoke test was run in the authorized Lovable workspace against the real providers and the same handler/shared database. The external preview endpoint is protected by Lovable (HTTP401), so the test used a private loopback server, an in-memory test-only enable override, and the existing jury password/session/CSRF flow. No production kill-switch change or quota reset occurred.

## Live optimization and measured result

Selection is bounded to four substantive, topic-ranked videos, 2,000 source characters per video (8,000 total), six source passages per video, two claims per video, and 24KB aggregate model input including schemas. Compact passage aliases bind back to exact original source IDs, quotations, context and times. Output ceilings: 1,400 extraction / 700 grouping tokens. Questions/descriptions stay outside argumentative clustering; zero groups is valid. Authentication, atomic quotas, idempotency, cache and deadlines are retained.

The one v6 smoke returned `insufficient_evidence` after extraction, at the saved `group` milestone, before a grouping model call or valid final result. No claims or groups were displayed, no retry or further model call was made. It is **not a successful current analysis**, despite the speed improvement.

| Measurement                             | Result                                      |
| --------------------------------------- | ------------------------------------------- |
| Entire smoke workflow                   | 9.57 s                                      |
| Awaited runner request                  | 8.16 s                                      |
| Oriane                                  | one HTTP206 request, 0.23 s                 |
| OpenAI                                  | one HTTP200 request, 7.32 s                 |
| Tokens                                  | 1,985 input / 424 output                    |
| Estimated OpenAI cost                   | $0.00055215                                 |
| Auth/cookie/CSRF/duplicate admission    | Passed                                      |
| Final source-result/free-cache checks   | Not reached; no valid final result          |
| New quota slots consumed this iteration | 1, no refund                                |
| Global allocation remaining             | **5 / 10**                                  |
| Active job                              | None                                        |
| Lifetime internal reservations          | 250 estimated Oriane credits / $0.50 OpenAI |

Reservations are spending ceilings, not confirmed provider balances. Model cost uses the documented gpt-4o-mini input/output token rates. The test report remained private in the Lovable workspace at `/tmp/jury-v6-smoke/report.json`; no raw provider responses, credentials, cookies or unreviewed live transcripts were committed. No further extraction optimization or Oriane/OpenAI calls followed this smoke test.

## Original approved video integration

The Oriane OpenAPI distinguishes internal `id` from external `platformId`. Existing sanitized fixtures had cleared `platformId`; it was not assumed from the internal IDs. Numeric segments in existing approved frame paths were treated only as candidates. The official TikTok oEmbed API confirmed each candidate's exact `embed_product_id` and video type. Each official player then visibly confirmed the corresponding author and original publication link. Tracking parameters were omitted from the observed official links.

| Approved source  | Cards | Official player configured | Source link verified | Actual playback observed             |
| ---------------- | ----: | -------------------------- | -------------------- | ------------------------------------ |
| jeunesinsoumis   |     3 | Yes                        | Yes                  | Network player error on initial test |
| grandebavardeuse |     1 | Yes                        | Yes                  | Yes, including inside our drawer     |
| marylouleloup    |     2 | Yes                        | Yes                  | Yes, advancing timeline / Pause      |
| france3paca      |     2 | Yes                        | Yes                  | Yes, playback reached end / Replay   |
| romain_lck       |     1 | Yes                        | Yes                  | Yes, playback reached end / Replay   |
| **Coverage**     | **9** | **9 / 9**                  | **9 / 9**            | **6 / 9 confirmed**                  |

No source was confirmed removed or private. The jeunesinsoumis error was a network/player failure; its three cards retain the official source link, image and exact citation. The canonical publication page can show TikTok's login prompt; verified URL existence is not a promise of anonymous platform access in every browser or region.

Official iframes are mounted only for verified Explore media when the evidence drawer opens, with `loading=lazy`, `autoplay=0`, no autoplay permission, and safe external-link attributes. Origins and iframe window identity are checked before accepting readiness/error messages. Failure and missing-handshake states preserve the source image/transcript. The selected source ID, external post ID and publication URL must match the verified registry. No player is synthesized from `cnt_` identifiers. No automatic or messaging-based seeking is enabled because it was not end-to-end verified; the exact citation time remains visible beside TikTok's own controls.

Editorial content is unchanged: two groups, nine approved claims, three ungrouped observations, exact quotations/context, timestamps, creators, dates and frames. `approved-demo.json` was not edited. Live outputs remain AI-generated and not journalist-approved.

Verification evidence: `source-verification.json`; browser registry: `src/lib/narrative/verified-original-media.json`.

Official references:

- https://developers.tiktok.com/docs/en/embed-player
- https://developers.tiktok.com/docs/en/embed-videos
- https://developers.openai.com/api/docs/models/gpt-4o-mini

## Validation

- TypeScript typecheck: pass.
- Frontend/core tests: **56 passed**.
- Backend tests: **29 passed**.
- Lint: zero errors, six existing React Refresh warnings. Generated integration formatting follows the established exclusion; all other checks remain active.
- Production build: pass; existing large-chunk warning remains.
- Pre-existing untracked package-lock.json left untouched.

Public deployment: https://narrative-evidence-atlas.lovable.app/

Final anonymous rollout verification is recorded below after publishing. No further paid verification will be performed.

## Final anonymous deployment verification

Published revision `9a47dc52b4781536f27ce0eea5ec74f94c4035b5` (deployment `139fc4ff-aad7-4915-9d48-dc0b913c00f9`) was verified without login. Public `/api/jury/config` returns HTTP200, v6, `available:false`. Explore opens normally. Its S03 drawer loads the real official iframe, preserves its quotation/context/Oriane frame and source metadata, and exposes the verified original publication link. Playback initially shows Play (no autoplay); a user-initiated click changed to Pause and advanced the timeline from 0 to 27. The safe frame remains below. No paid provider requests were made for this verification.

A scan of 156 tracked/build files against the configured local credential values found no matches. Only the pre-existing untracked package-lock.json remains outside Git.
