# Step 04 deployment readiness

Status: ready for the precomputed demo; verified locally, not deployed or pushed.

- Default production mode: real, approved Oriane evidence, explicitly labelled precomputed.
- Two narrative groups, each supported by two distinct videos. Three approved student-housing claims appear separately as individual observations.
- Nine approved claims from five videos; original quotations, context, video IDs, discourse types and timestamps preserved. Narrative prose remains labelled as an editorial draft.
- The public data file is a whitelist projection of the approved Step 03 result, checked against that payload and the explicit approval IDs. No rejected candidates, raw responses, reviewer identity, fingerprints, secret files or experimental fixture directories are included.
- Missing creators, publication dates, source URLs and frame images show explicit fallbacks. No playback is available without original URLs; transcript evidence and source IDs remain accessible.
- Production has no live search or provider API requests. No OpenAI/Oriane key is required. Development mock mode is opt-in and does not enter production browser assets.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 18 tests passed, including adapter validation, service cancellation/query constraints, exact fractional timestamps, real-data drawer interactions, ungrouped observations and no-network loading.
- `npm run lint`: passed with six pre-existing Fast Refresh warnings in unchanged shared UI components. Existing formatting failures in four files were fixed without changing their behavior.
- `npm run build`: passed. Nitro generated the existing Cloudflare worker target. Non-blocking warnings concern the existing tsconfig-path plugin, the 529 kB client chunk and a Nitro code-splitting option.
- Browser: real analysis and both group drawers/individual observations checked; no console errors. Mobile checked at 390 × 844 with document width 390 (no page-wide horizontal overflow).
- Production browser assets checked for provider key names, provider API hostnames and mock evidence identifiers: none found.

## Deploy through the existing project

Use the connected Lovable/GitHub workflow or a compatible Cloudflare worker deployment. The build emits `.output/server/wrangler.json` and `.output/public`; do not serve only the public folder as a standalone static app. No deployment command was executed. Any external publishing remains a separate action.

No blocking issue remains for the local precomputed demonstration. Live retrieval and richer metadata are intentionally outside this release.
