> Historical handoff. See [JURY_LIVE.md](JURY_LIVE.md) for the current wiring, deadlines, secret setup, lint policy and production verification.

# Jury Live: formatting and runtime setup handoff

## Scope and status

No application code, generated integration file, frontend, approved evidence, provider pipeline, server wiring, database schema, or deployment was changed during this check. No provider request or publishing was performed.

`JURY_LIVE_ENABLED` was securely saved as the requested disabled setting. This does not establish the value of the currently deployed production snapshot. Lovable documents that preview receives Settings secret changes automatically, whereas published server code receives them only at the next publish.

## Generated integration formatting: blocked by platform policy

On this checkout, `npm run lint` reports **284 errors**, all Prettier errors in these five generated integration files, plus six existing Fast Refresh warnings:

- `src/integrations/supabase/auth-middleware.ts`
- `src/integrations/supabase/client.server.ts`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/previewAuthStorage.ts`
- `src/integrations/supabase/types.ts`

The repository Prettier configuration is `printWidth: 100`, `semi: true`, `singleQuote: false`, `trailingComma: "all"`. Applying Prettier to temporary copies of all five files passes its formatting check. The project files were not modified: the platform instructions explicitly prohibit editing these generated files, and no supported generator/regeneration action is exposed in this session. Lint remains failing; no rules were disabled. A platform-generated output correction is still required before repository lint can pass.

## Secure credential entry

There is no callable secure credential-input form in the tools exposed to this session. The supported secure entry destination is **Project Settings → Secrets**; do not paste credentials into chat or commit an environment file.

Add these user-supplied credentials there:

| Name                   | Entry                                               |
| ---------------------- | --------------------------------------------------- |
| `ORIANE_API_KEY`       | Your Oriane credential                              |
| `OPENAI_API_KEY`       | Your OpenAI project credential                      |
| `JURY_ACCESS_PASSWORD` | Your chosen access password, at least 16 characters |

`JURY_LIVE_ENABLED` has been saved in the disabled state; leave it disabled until the production runtime and authenticated flow are verified. Managed backend credentials need no user copying, resetting, or re-saving. The user-created secret listing does not enumerate all managed backend bindings and cannot establish their production presence.

## Foreground execution and secret injection

### Supported platform behavior

Lovable's deployment documentation states that unprefixed Settings secrets are available to server functions and server routes. Its execution documentation directs reads through `process.env` inside a server-only request boundary. Preview receives secret updates automatically; production receives them at the next publish. This is a documented supported path, not a direct observation of the current deployed worker's bindings.

The managed server-client template reads `SUPABASE_SERVICE_ROLE_KEY` through `process.env` when the lazy client is first accessed. That demonstrates the expected server API, not current production injection. The earlier backend handoff verified its local transport; that observation is not a production verification.

Cloudflare HTTP requests have no hard wall-clock duration limit while the client remains connected. Consequently, a 55-second awaited foreground HTTP request is supported by the underlying runtime in principle. CPU limits are separate and plan/configuration dependent; waiting on provider responses is not CPU execution. A client disconnect or cancellation does not provide durable background execution. The current production plan, CPU allowance, intermediary timeouts, and effective worker configuration have not been read or exercised, so **this project's production 55-second flow is not verified**.

Cloudflare supports populating `process.env` from configured variables and secret bindings with `nodejs_compat` and `nodejs_compat_populate_process_env`; the population flag defaults on for compatibility dates on or after `2025-04-01` when Node compatibility applies. Direct handler `env` bindings are also supported.

### Local configuration evidence

- `vite.config.ts` selects the owner's `src/server.ts` entry through the installed Lovable Vite wrapper, version `2.26.5`.
- Installed Nitro is `3.0.260603-beta`; its Cloudflare generator writes `.output/server/wrangler.json` and adds `nodejs_compat` conditionally when the effective `cloudflare.nodeCompat` option is enabled.
- No generated `.output` or explicit project Wrangler configuration is available in this checkout. Neither effective deployed compatibility flags/date nor CPU settings can be inferred from that absence.
- The available tools expose no read-only production worker configuration inspection. No speculative compatibility or CPU override, migration, new diagnostic endpoint, or deployment was made.

References:

- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/runtime-apis/nodejs/process/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://docs.lovable.dev/features/cloud

## Exact remaining steps

1. Correct the platform-generated integration output using the repository Prettier settings, then rerun `npm run lint`; this session cannot perform that correction under its generated-file restrictions.
2. Enter the three credentials in **Project Settings → Secrets**. Keep `JURY_LIVE_ENABLED` disabled; do not copy managed backend secrets.
3. Complete the owner's merged backend and `src/server.ts` wiring. The intended same-origin contract remains `/api/jury/*`; this checkout is not a verification of the owner's merged backend.
4. Validate effective deployment compatibility flags/date and CPU allowance through the managed deployment configuration or emitted configuration at the owner's authorized build/deployment step. No schema migration is needed to establish HTTP timing or environment injection.
5. Before enabling Live, verify production secret presence privately (only presence checks, no values/derived diagnostics) and exercise an awaited, provider-free 55-second foreground check through the same deployed request path. Do not expose a public diagnostics endpoint or reserve a paid analysis for this check.
6. Production code and new Settings bindings require an owner-authorized publish. This session did not publish; if publishing remains prohibited, current production timing and binding checks remain blocked. After verification, enabling Live is a separate explicit owner action.
