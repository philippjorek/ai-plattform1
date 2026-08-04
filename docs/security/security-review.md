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
