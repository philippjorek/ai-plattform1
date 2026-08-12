# Security review log

A running log of security reviews performed on this repo's pending changes,
using Claude Code's `security-review` skill. Each entry covers one review
run: what was in scope, the method, and the findings — logged even when
there's nothing to report, so absence of findings is distinguishable from
"never checked."

This reviews **diffs at the time they were pending**, not the whole
codebase — it's not a substitute for a full audit of `src/` (contact form
input handling, chat proxy, error-capture scaffolding, etc.). Re-run it
whenever meaningful application code changes land, not just docs/CI.

## 2026-08-04 — deploy pipeline reconciliation + new docs

- **Branch**: `main`, uncommitted working-tree changes (not yet committed).
- **Scope reviewed**:
  - Modified: `.github/workflows/deploy.yml`, `README.md`,
    `docs/deployment/DEPLOYMENT.md`
  - New (untracked): `docs/architecture/architecture.md`,
    `docs/skills/skills.md`, `docs/tests/tests.md`
- **Method**: `security-review` skill — analyzed against standard
  categories (injection, auth/authz, crypto/secrets management, code
  execution, data exposure), per the skill's exclusion policy (no DOS,
  no on-disk-secrets-in-general, no rate limiting, no documentation-only
  style findings, no GitHub Actions findings without a concrete
  untrusted-input path).
- **Findings**: none at ≥80% confidence.
- **Why**: this diff contains **zero application code changes**. The only
  functional change is a hardcoded CI environment variable string
  (`APP_DIR: /home/www/20260706/ai-plattform1` →
  `/home/www/20260709/ai-plattform2` in `deploy.yml`) — a static,
  repo-author-controlled literal with no attacker-controlled input feeding
  into it (not derived from a PR title, branch name, issue body, or other
  injectable source), plus workflow comment text. The rest is markdown
  documentation and relative links between docs in this repo. Reviewed the
  new doc files specifically for secret/credential/PII leakage:
  `architecture.md` names the `.env` keys used by the chat backend
  (`OPEN_WEBUI_URL`, `OPEN_WEBUI_API_KEY`, `OPEN_WEBUI_MODEL`) but never
  their values — naming a config key is not a secrets leak.
- **Confidence**: 9/10 that no exploitable issue exists in this diff.

## 2026-08-04 — full `src/` + `server/` audit: contact form, chat proxy, error scaffolding

- **Branch**: `main`, uncommitted working-tree changes.
- **Scope reviewed**: full audit (not diff-based) of `server/formular-server.mjs`,
  `server/chat-server.mjs`, `src/lib/formular-store.ts`,
  `src/lib/chat-feedback-store.ts`, `src/lib/chat-client.ts`,
  `vite.config.ts` (`formularApiPlugin`, `chatApiPlugin`,
  `chatFeedbackApiPlugin`), `src/routes/kontakt.tsx`, and the SSR
  error-recovery scaffolding (`src/lib/error-capture.ts`, `src/start.ts`,
  `src/server.ts`, `src/lib/error-page.ts`) — the areas this log's intro
  flagged as never having had a full audit.
- **Method**: manual code review against standard categories (injection,
  auth/authz, DoS/resource exhaustion, CORS/CSRF, data exposure), plus
  targeted review of the persistence layer (unbounded file growth,
  read-modify-write concurrency) and the SSR error path (response
  reflection).
- **Findings**:
  - No rate limiting on `/api/formular`, `/api/chat`, `/api/chat-feedback`
    (standalone servers and dev-mode Vite plugins alike) — **fixed**: added
    an in-memory per-IP sliding-window limiter (`src/lib/rate-limit.ts`,
    `server/rate-limit.mjs`), wired into all three endpoints in both the
    standalone servers and the dev plugins.
  - Unbounded growth of `data/formular-submissions.json` and
    `data/chat-feedback.json` (no entry cap, no per-field length cap on
    formular submissions, no request-body size cap) — **fixed**: added a
    bounded entry-count/file-size cap with oldest-first eviction
    (`src/lib/formular-store.ts`, `src/lib/chat-feedback-store.ts`, and
    their duplicated logic in the two standalone servers), length limits on
    all formular fields, and a request-body size cap enforced before
    `JSON.parse` ever runs (20 KB formular/feedback, 250 KB chat) so an
    oversized single request can't be fully buffered into memory before
    validation.
  - No CORS restriction (`Access-Control-Allow-Origin` unset) on any of the
    three endpoints — **fixed**: explicit origin allow-list
    (`https://deploy.service-mit-herz.de`, overridable via `ALLOWED_ORIGIN`)
    plus explicit `OPTIONS` preflight handling (`src/lib/cors.ts`,
    `server/cors.mjs`), applied to both the standalone servers and the dev
    Vite plugins. Note: this restricts which origins can *read* responses,
    it does not by itself prevent a cross-origin request from being
    processed server-side — full CSRF protection (e.g. Origin-header
    rejection or a token) was out of scope for this pass.
  - SSR error-recovery scaffolding (`error-capture.ts`, `start.ts`,
    `server.ts`, `error-page.ts`) — reviewed, **no issue found**.
    `renderErrorPage()` returns a static HTML string with zero
    interpolation; captured errors are only ever `console.error`'d
    server-side and never reflected into the response body.
  - Accepted risks (explicitly out of scope for this pass, documented only):
    - `OPEN_WEBUI_URL` uses plain HTTP (not HTTPS), so the upstream API key
      and chat content travel unencrypted network-to-network. Infra-level
      issue, not fixable in application code — recommend putting the
      upstream behind TLS.
    - Prompt injection against the chat proxy (`getChatReply` forwards
      user-supplied `messages` verbatim to the upstream model) — accepted
      as inherent to an LLM chat feature; no code-level mitigation applied
      in this pass.
    - Stored XSS risk in formular submissions (`name`/`company`/`message`
      persisted as-is, no output sanitization) — low risk today since
      nothing in the codebase currently renders this data back to any
      viewer/admin UI; flagged for awareness if an admin viewer is ever
      built, so it sanitizes/escapes on render rather than trusting the
      stored value.
    - Read-modify-write race on the JSON stores (no file locking) —
      unaddressed in this pass; residual risk is now bounded somewhat by
      the new rate limits reducing concurrent write volume, but a durable
      fix would need file locking or a real datastore.
- **Why**: this is a full-codebase audit rather than a diff review (per the
  gap noted in this log's intro), covering the two user-facing POST
  endpoints and the SSR error path end-to-end. Fixes were scoped to what
  was explicitly approved (rate limiting, size/length caps, CORS); the
  remaining findings are documented as accepted risks or recommendations
  rather than remediated.
- **Confidence**: 8/10 that the three fixed gaps are adequately mitigated;
  medium confidence specifically on the per-IP rate limiter's effectiveness
  in production, since it depends on the (out-of-repo) nginx reverse proxy
  actually forwarding `X-Forwarded-For` — this can't be verified from the
  repo alone.
