# Security Process

This document describes crwsync's recurring security process: how vulnerabilities are found, how rate limits and secrets get reviewed, and how to report a problem.

## Reporting a vulnerability

Open a private security advisory via GitHub's "Report a vulnerability" button on this repo's Security tab, or contact the maintainer directly. Do not open a public issue for an unpatched vulnerability.

## Automated scanning

Three layers run continuously, each catching a different class of problem:

| Layer | Trigger | What it checks | Where |
|---|---|---|---|
| Trivy filesystem scan | Every push/PR to `main` | Known CVEs in the working tree (deps, base images, IaC) | `.github/workflows/deploy.yml` (`scan-security` job) |
| Scheduled `pnpm audit` | Weekly (Mondays), plus manual dispatch | High/critical vulnerabilities in the resolved `pnpm-lock.yaml` | `.github/workflows/security-audit.yml` |
| Dependabot | Weekly | Opens a PR to bump any dependency (npm packages + GitHub Actions) with a known advisory | `.github/dependabot.yml` |

A failing scheduled audit files (or comments on) a `dependency-audit`-labeled issue automatically — it is never silent. Treat that issue as a blocker: run `pnpm audit` locally, upgrade the flagged package(s), and close it once a re-run is clean.

## Rate-limit review cadence

Global default (`ThrottlerModule.forRoot` in `apps/backend/src/app.module.ts`): **100 requests/minute** per client, applied everywhere via `APP_GUARD` unless a route overrides it.

Sensitive routes are tuned tighter, e.g.:

- `POST /auth/signup` — 5/hour
- `POST /auth/signin` — 10/5 min
- `POST /password-reset/*` — 5/hour
- `POST /contact` — 3/min
- `POST /workspaces` (create) — 5/hour, invites — 50/hour

**Review these values quarterly**, and immediately after any incident involving brute-forcing, scraping, or abuse. When reviewing, check:

1. Has legitimate usage started hitting a limit (support reports, error-tracking noise)? Loosen it.
2. Has a route been added without an explicit `@Throttle`/`@SkipThrottle` decision? Every new controller method must pick one deliberately (see `CLAUDE.md`).
3. Do the tightest limits (auth, password reset) still match current brute-force guidance (OWASP ASVS)?

## Secret rotation cadence

Secrets are injected as GitHub Actions secrets at deploy time (`.github/workflows/deploy.yml`) and validated as required env vars at backend boot (`apps/backend/src/main.ts`). Current inventory:

- `JWT_ACCESS_TOKEN_SECRET`, `COOKIE_SECRET` — session/auth signing
- `DATABASE_URL` — Postgres credentials
- `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` — S3/MinIO credentials
- `REDIS_PASS` — Redis auth
- `MAIL_USER` / `MAIL_PASS` — SMTP credentials
- `SENTRY_AUTH_TOKEN` — source map upload token
- `DEMO_OWNER_PASSWORD` / `DEMO_MEMBER_PASSWORD` / `DEMO_INVITEE_PASSWORD` — seeded demo accounts

**Rotate every secret quarterly**, and immediately (same day) if: a secret may have leaked (log line, screen share, compromised laptop), a team member with repository/environment access leaves, or a dependency with access to the secret (e.g. a CI action) is itself flagged by the scans above.

To rotate: generate a new value, update the corresponding GitHub Actions secret (repo or environment settings), then re-run the `deploy` workflow so the running stack picks it up — `main.ts` will refuse to boot if a required secret is missing, so a partial rotation fails loudly rather than falling back to an old value.
