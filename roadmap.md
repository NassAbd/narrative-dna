# Jury Live rollout

- [x] Apply private transactional schema and server-only RPCs.
- [x] Implement server sessions, CSRF, atomic quotas, idempotent jobs and cache.
- [x] Connect the protected Jury UI while preserving anonymous Explore.
- [x] Pass TypeScript, 46 frontend/core tests and 22 backend tests.
- [x] Pass lint: generated integrations retain platform formatting and remain covered by TypeScript/non-formatting ESLint rules; six existing React refresh warnings remain.
- [x] Build Cloudflare module with nodejs_compat and compatibility date 2026-11-07.
- [x] Owner configured production provider secrets and local jury test password.
- [ ] Publish and verify anonymous Explore and disabled Jury mode.
- [ ] Enable Jury mode, run one bounded paid smoke test, verify quota/cache/source evidence.
- [ ] Record final production GO/NO-GO and measured usage.
