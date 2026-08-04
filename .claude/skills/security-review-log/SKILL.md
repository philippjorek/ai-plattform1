---
name: security-review-log
description: Run a security review of the current branch's pending changes and append the result as a dated entry to docs/security/security-review.md. Use when the user asks to "run a security review", "security-review and document it", or "log the security review", for this project specifically.
---

# Security review + log

This project keeps a running log of security reviews at
`docs/security/security-review.md` (see that file for the format and past
entries). This skill runs a review and appends to that log — it doesn't
replace the underlying `security-review` skill, it wraps it with
documentation.

## Steps

1. Run `git status` and `git diff` (and `git diff --stat` for untracked/new
   files, `git status` already lists those) to capture exactly what's in
   scope: modified tracked files plus new untracked files relevant to the
   change. This is the same scoping `security-review` does on its own, but
   capture it yourself first so you can log it even if the sub-skill's own
   diff-gathering comes back empty (this has happened before — always fall
   back to your own `git diff` output as source of truth for what's in
   scope).
2. Invoke the `security-review` skill (via the `Skill` tool,
   `skill: "security-review"`) to perform the actual analysis. Follow its
   sub-task/false-positive-filtering methodology as instructed by that
   skill — don't skip straight to a verdict yourself.
3. Take the final findings (empty list, or a list of confirmed
   vulnerabilities) and append a **new dated entry** to
   `docs/security/security-review.md`, in the same format as the existing
   2026-08-04 entry:
   - `## YYYY-MM-DD — <short description of what changed>`
   - Branch, scope reviewed (modified + new files)
   - Method (name the skill(s) used)
   - Findings (list them with file/line/severity, or state "none at ≥80%
     confidence" with a brief rationale)
   - Confidence in the "no findings" conclusion, if applicable
   - If there are real findings, also report them to the user directly in
     the conversation (via `ReportFindings` if the review context calls for
     it) — don't let them go unmentioned just because they're in the log.
4. Create `docs/security/` and `security-review.md` if they don't exist yet
   (they do as of 2026-08-04), using the same structure.
5. Never overwrite prior entries — always append. The log's value is in
   showing what was checked and when, including past runs that found
   nothing.
