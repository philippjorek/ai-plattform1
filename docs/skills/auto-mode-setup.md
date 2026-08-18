# `/auto-mode-setup` and `~/.claude/settings.json`

Documents the Claude Code **`/auto-mode-setup` command** and the **user-level
settings file it writes**, `/root/.claude/settings.json`. Recorded here on
2026-08-18.

Like `docs/skills/skills.md`, this is *tooling* documentation — how Claude
Code is configured while working on this repo — not application
architecture. Nothing described here is part of the app in `src/`. See
`docs/architecture/architecture.md` for the actual application.

**Why this file exists**: `/root/.claude/settings.json` lives outside the
repository and is not under version control. If that file is lost, or the
container is rebuilt, this document is the only in-repo record of what it
contained.

## `/auto-mode-setup` — what it is

A **built-in Claude Code command** (verified on Claude Code `2.1.233`), not
a project-authored skill and not a user-defined slash command.

- It does **not** exist as a readable file anywhere on this machine —
  neither in this repo's `.claude/`, nor in `/root/.claude/commands/` or
  `/root/.claude/skills/` (both absent). A filesystem-wide search for
  `auto-mode-setup` matches only Claude Code's own session logs
  (`/root/.claude/history.jsonl` and the per-session transcript under
  `/root/.claude/projects/`), i.e. records of it being *invoked*, never a
  definition.
- This is the same situation as the built-in `dataviz` / `artifact-design` /
  `update-config` skills described in `docs/skills/skills.md`: it ships
  inside the Claude Code application and is loaded on demand.

**What it does**: it interviews/inspects the environment, then writes an
`autoMode` block into `/root/.claude/settings.json` describing the trust
boundary Claude should assume — which repos, hosts, and services are
trusted, where secrets live, and which actions require extra caution. On
invocation it prints `Gathering data and drafting your auto-mode setup;
back soon`.

**What "auto mode" then changes**: with the `autoMode` block present, each
session receives an additional standing directive. The one observed in this
session was, verbatim:

> While auto mode is active:
>
> Do your work through the Bash tool wherever it can accomplish the job:
> read files with cat, head, or sed -n, search with grep and find, and make
> file changes with sed, heredocs, or short scripts, rather than using the
> dedicated Read, Edit, or Write tools. Fall back to a dedicated tool only
> when Bash genuinely cannot do the job.

So auto mode affects both **which tools** Claude reaches for and **which
actions it will take unattended**, per the `soft_deny` list below.

## `/root/.claude/settings.json` — full contents

User-level (global) settings, applying to every project on this machine —
not just this repo. Recorded as of 2026-08-18, file size 3236 bytes.

There are **no secret values in this file** — it references credentials
only by variable name (e.g. `OPEN_WEBUI_API_KEY`), never their contents.

```json
{
  "model": "opus",
  "effortLevel": "high",
  "theme": "dark",
  "autoMode": {
    "environment": [
      "### Org-wide",
      "**Organization**: None configured",
      "**Cloud provider(s)**: Cloudflare (Nitro/Wrangler deploy target, per CLAUDE.md)",
      "**Repository visibility**: not queryable here — assume private (default; repo name `ai-plattform1` under `philippjorek` shows no public-visibility signal)",
      "**Internal sharing / snippet hosting**: None configured — treat public paste/gist services as outside the trust boundary",
      "**Secrets management**: `.env` / `.env.local` files (gitignored; `.env.example` and `.env.local.example` tracked as templates)",
      "**Default / protected branches**: main (default branch; protection status not queryable here)",
      "**CI/CD deploy targets**: Cloudflare via Nitro/Wrangler (per CLAUDE.md); `.github/workflows` present but contents not reviewed here",
      "**Network posture**: None configured",
      "**Source control**: github.com:philippjorek/ai-plattform1.git (origin) only",
      "**Trusted internal domains**: None configured",
      "**Trusted cloud buckets**: None configured",
      "**Key internal services**: Atlassian/Jira (mcp.atlassian.com, used via jira-task-implementer agent); open-webui chatbot backend (OPEN_WEBUI_URL, per .env.example)",
      "**Internal package registry**: None configured",
      "**Sensitive data locations & audiences**: `.env`, `.env.local` and similar gitignored files (OPEN_WEBUI_API_KEY and similar credentials); share only with audiences cleared at the [named+specifics] bar",
      "**Data retention / declassification**: None configured",
      "**Sensitive remote targets**: any namespace, host, or container whose name carries `prod` or `production` as a whole word or name segment",
      "**Protected deployment namespaces / environments**: None configured — fall back to the Sensitive remote targets heuristic",
      "**Protected IaC scopes**: IAM, RBAC, networking, quota, and node-pool resources; anything whose name or tag carries `prod` or `production` as a whole word or name segment",
      "**Repository visibility**: not queryable here — assume private (default; no public-visibility signal found for philippjorek/ai-plattform1)",
      "### User-specific",
      "**Primary use of Claude Code**: software development (TanStack Start portfolio/marketing site, incl. Jira-ticket-driven implementation via jira-task-implementer agent)",
      "**Trusted repo**: github.com:philippjorek/ai-plattform1.git (origin) and its local checkout at /home/www/20260709/ai-plattform2 — visibility unconfirmed, treat as private by default per assumption above",
      "**Org-specific CLIs**: None configured",
      "Execution scope per CLAUDE.md: routine work confined to the ai-plattform2 Docker container and /home/www/20260709/ai-plattform2 project folder"
    ],
    "soft_deny": [
      "$defaults",
      "Bash(git push --force*) in github.com:philippjorek/ai-plattform1.git — force-push to the trusted repo's remote",
      "Bash(npx playwright:*) fresh install (downloading a browser) without a cached copy — per this repo's CLAUDE.md \"missing package\" stop condition"
    ]
  }
}
```

## Key-by-key

### Top-level

| Key | Value | Meaning |
| --- | --- | --- |
| `model` | `opus` | Default model for sessions on this machine. |
| `effortLevel` | `high` | Default reasoning effort. |
| `theme` | `dark` | Terminal colour theme. |
| `autoMode` | object | Written by `/auto-mode-setup`; everything below. |

### `autoMode.environment`

A free-text array — the trust-boundary briefing injected into sessions.
Entries are Markdown strings, with `### Org-wide` / `### User-specific`
acting as section headers rather than structured keys. Points worth
knowing:

- **The repo name is genuinely `ai-plattform1`, not a typo.** The GitHub
  remote is `git@github.com:philippjorek/ai-plattform1.git` while the local
  checkout directory is `/home/www/20260709/ai-plattform2`. Both names are
  correct and refer to the same project; the settings file records the
  mismatch explicitly under **Trusted repo**.
- **Repository visibility is assumed private**, not confirmed — Claude Code
  couldn't query it. Anything relying on the repo actually being private
  should be verified independently.
- **Secrets** are declared as living in `.env` / `.env.local` (gitignored),
  with `.env.example` / `.env.local.example` tracked as templates. This
  matches the repo: those four files exist, and the tracked examples carry
  only key names.
- **Key internal services** names both integrations this project actually
  uses: Atlassian/Jira via the `jira-task-implementer` agent
  (`.claude/agents/jira-task-implementer.md`), and the open-webui chatbot
  backend behind `OPEN_WEBUI_URL`.
- **`prod`/`production` heuristic**: with no explicit protected namespaces
  configured, any host, container, or namespace whose name contains `prod`
  or `production` as a whole word/segment is treated as sensitive.
- **Execution scope** restates this repo's `CLAUDE.md` rule: routine work
  stays inside the `ai-plattform2` Docker container and the
  `/home/www/20260709/ai-plattform2` folder.
- **Known redundancy**: `**Repository visibility**` appears twice (entries
  4 and 21) with the same verdict in slightly different wording. Harmless,
  but if the file is ever regenerated or hand-edited, one can be dropped.

### `autoMode.soft_deny`

Actions Claude should not take unattended in auto mode — it stops and asks
instead. "Soft" means blocked-by-default but overridable by explicit
instruction, as opposed to a hard refusal.

- `$defaults` — a placeholder expanding to Claude Code's built-in
  soft-deny set; the two entries after it are additions, not replacements.
- `git push --force` to `philippjorek/ai-plattform1` — force-pushing the
  trusted repo's remote.
- A fresh `npx playwright` install that would download a browser with no
  cached copy present — derived directly from this repo's `CLAUDE.md`
  **missing package** stop condition.

## Relationship to `.claude/settings.local.json`

Two distinct files, easily confused:

| | `/root/.claude/settings.json` | `.claude/settings.local.json` |
| --- | --- | --- |
| Scope | User-level, all projects on this machine | This repo only |
| In version control | No (outside the repo) | Yes (in the repo) |
| Contains | `model`, `effortLevel`, `theme`, `autoMode` | `permissions.allow` only |
| Written by | `/auto-mode-setup` | Permission prompts / `update-config` |

The project file is a long `permissions.allow` list accumulated from
approving individual commands (npm/npx scripts, `curl` probes against the
local dev server, git and nginx commands, the four
`mcp__atlassian__*` tools the `jira-task-implementer` agent needs). It has
**no `hooks` key** — consistent with what `docs/skills/skills.md` records
about `update-config`.

The two layer rather than compete: `autoMode` sets the trust boundary and
the stop-and-ask list; `permissions.allow` records which concrete commands
have been pre-approved.

## Scope note

This documents Claude Code harness configuration observed on 2026-08-18, at
Claude Code `2.1.233`. It is not derived from anything in `src/`, so it can
go stale independently of the application — in particular if
`/auto-mode-setup` is re-run (which rewrites the `autoMode` block), if the
GitHub remote is renamed to match the local `ai-plattform2` folder, or if
Claude Code changes how auto mode works. Re-read
`/root/.claude/settings.json` before trusting the JSON above as current.
