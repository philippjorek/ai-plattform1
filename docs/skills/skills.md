# Claude Code skills used in this project

This documents the Claude Code skills that have come up while working in
this repo: three **built-in** skills (`dataviz`, `artifact-design`,
`update-config`) and one **project-authored** skill defined specifically
for this repo (`security-review-log`). None of this is part of the
application's codebase — it's tooling around how Claude Code is used on
this project. See `docs/architecture/architecture.md` for the actual app;
this file is tooling documentation, kept here because it came up in project
work.

## Where they actually live

The three built-in skills don't exist as a readable file in this repo, in
`~/.claude/skills/`, or anywhere else on this machine's filesystem under
their own name. They ship inside the Claude Code application itself and are
loaded into the assistant's context on demand when invoked — the same way
Claude Code's core system prompt isn't a standalone editable file either
(see `docs/architecture/architecture.md`'s scope note, or ask Claude
directly: "where is systemprompt saved?"). The only local artifact of the
built-in skill system is a per-version runtime cache at
`/tmp/claude-0/bundled-skills/<version>/<hash>/`, populated only *after* a
skill is invoked — not a source location.

`security-review-log`, by contrast, **is** a real file in this repo:
`.claude/skills/security-review-log/SKILL.md`. This is the standard
location for a project-authored skill — `.claude/skills/<name>/SKILL.md` —
and it's checked into version control like any other project file, unlike
the three built-in skills above.

The descriptions of the three built-in skills below are taken from the
skill listing Claude Code itself exposes at the start of a session — that's
the extent of what's inspectable without invoking each one.

## `dataviz`

Loaded automatically before writing any chart, graph, plot, dashboard, or
data visualization, in any output medium: an HTML/React artifact, inline
SVG, a plotting library (matplotlib, plotly, d3, Recharts, …), a rendered
image, or a chart shared into Slack.

- **When it triggers**: before writing the first line of chart code,
  choosing chart colors, building a stat tile/meter/KPI row, or laying out
  a dashboard. Keyword triggers include "chart", "graph", "plot", "data
  viz", "visualization", "dashboard", "analytics", "categorical colors",
  "sequential/diverging palette", "stat tile", "sparkline", "heatmap",
  "legend", "axis", "tooltip", "chart colors", "color by series".
- **What it produces**: visualizations meant to read as one consistent
  system — accessible, and correct in both light and dark themes — using a
  brand-neutral placeholder palette that gets swapped for the project's own
  colors.
- **How it teaches this**: a design-system-agnostic method covering a form
  heuristic (which chart type fits which data), a color formula with a
  runnable validator, mark specs, and interaction rules. A validated
  default palette ships in `references/palette.md` inside the skill.

Not yet used in this project — this app has no charts/dashboards
currently — but relevant if e.g. a `/projekte` or admin view ever needs one.

## `artifact-design`

Design guidance and fundamentals for Artifacts (the standalone HTML/Markdown
pages Claude Code can publish via its `Artifact` tool). Loaded before
writing an Artifact's content to calibrate how much visual/design effort a
given request warrants, before the page skeleton is written.

Not directly tied to this repo's own UI conventions (Tailwind v4, shadcn/ui,
"Midnight Indigo" palette — see `docs/architecture/architecture.md`) — it
governs one-off published pages Claude Code generates, not the site's own
components.

## `update-config`

Used to configure the **Claude Code harness itself** via its
`settings.json` / `settings.local.json` — not this app's configuration.

- **When it triggers**: requests for automated/recurring behavior ("from
  now on when X", "each time X", "whenever X", "before/after X") — these
  require hooks configured in `settings.json`, since the harness executes
  hooks, not Claude's memory or stated preferences. Also covers permission
  changes ("allow X", "add permission", "move permission to X"),
  environment variables ("set X=Y"), and hook troubleshooting.
- **Why it exists as a separate skill**: memory (see the memory system
  described in `docs/architecture/architecture.md`'s scope note) can make
  Claude *remember* a preference, but can't make the harness *enforce* one
  automatically between turns — only a configured hook can. This skill is
  the mechanism for the latter.
- Not currently invoked to add hooks in this project: this repo does have
  a `.claude/settings.local.json`, but it currently only contains
  `permissions` — no `hooks` key defined.

## `security-review-log` (project-authored)

Defined at `.claude/skills/security-review-log/SKILL.md`. Wraps the
built-in `security-review` skill with project-specific documentation
behavior: it scopes the current pending diff, runs `security-review`'s
sub-task/false-positive-filtering analysis, then appends a dated entry to
`docs/security/security-review.md` (creating that file/folder if needed)
recording what was reviewed, the method, and the findings — including
"none found" outcomes, so the log shows what's been checked and when,
rather than only surfacing when something's wrong.

- **When it triggers**: asking to "run a security review", "security-review
  and document it", or "log the security review" on this project.
- **Why it exists**: the built-in `security-review` skill reports findings
  back in the conversation but doesn't persist them anywhere; this wraps it
  so review history survives across sessions in `docs/security/`.
- First used 2026-08-04 to review the deploy-pipeline reconciliation and
  new `docs/architecture/`, `docs/skills/`, `docs/tests/` files — see that
  file's first log entry.

## Scope note

This file documents Claude Code tooling behavior observed while working on
this project, not application architecture. If Claude Code itself is
swapped out or its skill set changes, this file will go stale independently
of anything in `src/` — it's not derived from this app's code.
