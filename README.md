# Narrative DNA

An editorial demonstration of housing narratives in France, using a precomputed analysis of real Oriane videos. The current release contains two narrative groups and three ungrouped student-housing observations: nine human-approved claims from five source videos. Narrative titles and summaries remain editorial drafts.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/41cd812c-07d9-4135-a56e-46e9f7e157f0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Approved precomputed demo

Run `npm run dev -- --host 127.0.0.1 --port 5184`, open the local URL and choose **View precomputed analysis**. The topic and platform are fixed; live search is not connected. No Oriane/OpenAI keys or API calls are required.

The UI accesses data through `NarrativeService` in `src/lib/narrative/index.ts`. The default service validates the curated public payload in `approved-demo.json` through `ValidatedPayloadSchema`, then adapts it to `AnalysisResult`, `Narrative` and `EvidenceClip`. This public projection contains only the nine approved claims and their exact source evidence. It omits local reviewer identities, fingerprints, other candidates, API responses and experimental diagnostics. Platform labels are copied from the matching normalized Oriane records; no additional metadata is reconstructed.

Each narrative counts distinct video IDs, not claim cards. The three ungrouped claims are explicitly individual observations from one source, never a third narrative. Evidence drawers preserve exact original quotes, bounded context, source IDs and fractional timestamps. Creator handles, publication dates and nearest available Oriane frames have been restored by exact source ID. Original links remain unavailable. Missing or failed metadata/media retains explicit fallbacks. Frames outside the quoted interval are clearly labelled with the actual image timestamp. No publication period is inferred from the collection date. Counts describe the approved evidence selection, not the full corpus or public opinion.

Mock data remains in its own module and is opt-in for local development only:

```sh
VITE_NARRATIVE_MODE=mock npm run dev
```

Production always uses the approved precomputed service; mock evidence is excluded from the production browser bundle. Never use a `VITE_` variable for secrets.

## Verification and deployment

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Tested with Node 24.14.0. Production output is a TanStack Start/Nitro Cloudflare worker (`.output/server/wrangler.json`) and browser assets (`.output/public`). Use the existing Lovable deployment flow or a compatible Cloudflare deployment; this is not a plain static-site export. No provider credentials are required for this stage. See [DEPLOYMENT.md](DEPLOYMENT.md) for the local verification report and remaining limitations.

## Public hackathon demo

https://narrative-evidence-atlas.lovable.app

The public MVP was deployed and anonymously verified before enrichment. The nine approved cards now include real creator/date metadata and seven unique public Oriane frames. Enrichment does not alter formulations, quotes, transcript context, claim timestamps, approvals or narrative membership. See DEPLOYMENT.md for API provenance, media checks and playback limitations. Live API credentials are never needed to view the demo.
