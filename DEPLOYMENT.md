# Step 04 deployment readiness

Public MVP: https://narrative-evidence-atlas.lovable.app — the initial release at `7a94146d626d257100f99f581d91032fd287639a` was pushed, published through Lovable, and verified anonymously before evidence enrichment began. This enrichment release uses the same project and deployment workflow.

- Default production mode: real, approved Oriane evidence, explicitly labelled precomputed.
- Two narrative groups, each supported by two distinct videos. Three approved student-housing claims appear separately as individual observations.
- Nine approved claims from five videos; original quotations, context, video IDs, discourse types and timestamps preserved. Narrative prose remains labelled as an editorial draft.
- The public data file is a whitelist projection of the approved Step 03 result, checked against that payload and the explicit approval IDs. No rejected candidates, raw responses, reviewer identity, fingerprints, secret files or experimental fixture directories are included.
- All nine cards now have creator metadata, publication dates and verified Oriane source frames, matched to the five original approved video IDs. Seven unique images serve the nine cards. Three nearest available frames fall outside the quoted interval and are explicitly labelled with their actual frame time; quote times are unchanged. Missing/failed media retains the fallback. No canonical video URL is documented, so original playback is not fabricated.
- Production has no live search or provider API requests. No OpenAI/Oriane key is required. Development mock mode is opt-in and does not enter production browser assets.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 21 tests passed, including adapter validation, service cancellation/query constraints, exact fractional timestamps, real-data drawer interactions, ungrouped observations, no-live-API loading, safe unsigned CDN URL validation and image-error recovery.
- `npm run lint`: passed with six pre-existing Fast Refresh warnings in unchanged shared UI components. Existing formatting failures in four files were fixed without changing their behavior.
- `npm run build`: passed. Nitro generated the existing Cloudflare worker target. Non-blocking warnings concern the existing tsconfig-path plugin, the 533 kB client chunk and a Nitro code-splitting option.
- Browser: real analysis, metadata, all nine decoded frame images and the evidence drawer checked locally. Mobile checked at 390 × 844 with document width 390 (no page-wide horizontal overflow). The initial public MVP was also checked anonymously: HTTP 200, real-data label, both narratives, observations and exact evidence.
- Production browser assets checked for provider key names, provider API hostnames and mock evidence identifiers: none found.

## Deploy through the existing project

Use the connected Lovable/GitHub workflow or a compatible Cloudflare worker deployment. The build emits `.output/server/wrangler.json` and `.output/public`; do not serve only the public folder as a standalone static app. Publishing uses the connected Lovable deployment tool after a normal fast-forward GitHub push. The initial public MVP was verified before this enrichment was prepared; subsequent publishing is verified against the new commit rather than assumed from a successful push.

No blocking issue remains for the local precomputed demonstration. Live retrieval and richer metadata are intentionally outside this release.

## Oriane enrichment provenance and media checks

The local OpenAPI confirms `POST /rest/contents/search` supports `filters.id.includes`. One server-side exact-ID request for the five approved video IDs returned HTTP 200 in 711 ms. No other content IDs were accepted. Local normalized fixtures already retained publication dates, but had deliberately removed creator handles and frame URLs, so one request was necessary for the missing enrichment. No OpenAI generation or clustering call was made.

Only whitelisted metadata for the nine approved cards enters the public release. Anonymous GET checks returned HTTP 200 for all nine selected frame references (seven unique images), and WebP signatures were validated. The CDN uses `binary/octet-stream`, but all nine images decoded successfully in the browser. No API credentials, userinfo, signed query parameters or private hosts are included. The CDN supplied no expiry/cache headers, so long-term availability is not guaranteed; image errors show `Frame unavailable`. Images use `no-referrer` and cannot issue authenticated provider requests.

The user explicitly confirmed public frame display permission for this hackathon demo. Oriane's public terms were inspected; this confirmation is not presented as a general license for unrelated reuse. Frames are nearest to each quote's midpoint among the source-provided frames; their true timestamps are always disclosed, including when outside the quoted interval.

The supplied specification only exposes frame, thumbnail and profile image URLs in content-search responses. It does not expose a canonical social-video URL, public playable video file, or official embed. No speculative player or reconstructed social URL was added.
