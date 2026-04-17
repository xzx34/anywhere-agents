# Changelog

All notable changes to `anywhere-agents` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Version tags apply uniformly to the repo content **and** the matching `anywhere-agents` PyPI / npm packages — they share one release stream. Consumers pinned to a specific tag get a stable snapshot; consumers on `main` receive ongoing updates.

## [Unreleased]

_No unreleased changes queued._

## [0.1.3] — 2026-04-16

Central `AGENTS.md` → per-agent file generator (`CLAUDE.md`, `agents/codex.md`), Claude Code SessionStart hook that enforces bootstrap automatically, Scenario E in the README for the "you are running suboptimal defaults without knowing" pitch, and a 1:1 Simplified Chinese README.

### Added

- **Central source + per-agent generator.** `AGENTS.md` becomes the single source of truth for agent rule files. New HTML-comment markers (`<!-- agent:claude -->` / `<!-- agent:codex -->`) tag agent-specific sections. `scripts/generate_agent_configs.py` reads `AGENTS.md` and emits `CLAUDE.md` (Claude Code auto-loads this natively) and `agents/codex.md`. Each generated file carries a `GENERATED FILE` header and a documented precedence ladder. Bootstrap re-runs the generator on every session.
- **Hand-authored file protection.** The generator preserves any `CLAUDE.md` / `agents/codex.md` that lacks the `GENERATED FILE` header and prints a loud warning until the user resolves it. To keep a custom rule file, rename to `CLAUDE.local.md` — which wins over the generated file in the precedence ladder.
- **SessionStart hook enforces bootstrap.** `scripts/session_bootstrap.py` deploys to `~/.claude/hooks/session_bootstrap.py` on first bootstrap run. On every subsequent Claude Code session, the hook runs `.agent-config/bootstrap.sh` (or `.ps1`) if present, no-op otherwise. Users no longer need to type a reminder to keep the config fresh — for Claude Code, updates are fully automatic.
- **Configuration Precedence section in `AGENTS.md`.** Documents the three config layers (rule files, Claude Code settings, env vars) with explicit precedence rules.
- **Scenario E in README** — "The settings you did not know you were missing." Makes the selling point explicit: most Claude Code / Codex users never touch effort levels, model selection, or Codex MCP config; `anywhere-agents` ships the recommended default stack in one install.
- **README Install section** now documents the verbal fallback for non-Claude agents (Codex, Cursor, etc.) that lack SessionStart hook support — tell the agent `read @AGENTS.md to run bootstrap, session checks, and task routing` on the first message of each session.
- **`README.zh-CN.md`** — a 1:1 Simplified Chinese translation of `README.md`. Language switcher at the top of both files (`English · 中文`). Code blocks, Mermaid diagram labels, file paths, URLs, and skill names stay in English for consistency; narrative, section titles, table contents, and callouts are translated.

### Changed

- `user/settings.json` declares a `SessionStart` hook alongside the existing `PreToolUse` guard hook.
- `bootstrap/bootstrap.sh` and `bootstrap.ps1` run the generator after fetching `AGENTS.md`, and deploy `session_bootstrap.py` alongside `guard.py` to `~/.claude/hooks/`.
- `AGENTS.md` "What gets shared" table lists the new generated files and the user-level hook set (guard + session bootstrap).
- `AGENTS.md` "Environment Notes" Claude Code install + effort-level bullets are now tagged with `<!-- agent:claude -->` so Codex does not see the noise.
- `AGENTS.md` "Codex MCP Integration" section is tagged with `<!-- agent:codex -->` so Claude Code does not see the Codex setup noise.

### Fixed

- **Claude Code settings precedence wording in `AGENTS.md` Configuration Precedence section** — the ordering was reversed relative to Claude Code's documented behavior. Corrected to `managed policy > command-line args > .claude/settings.local.json > .claude/settings.json > ~/.claude/settings.json`. Regenerated `CLAUDE.md` and `agents/codex.md` so the correction propagates.
- **SessionStart hook noise** — `scripts/session_bootstrap.py` now captures subprocess stdout and emits one concise line (`anywhere-agents: bootstrap refreshed`) to avoid flooding Claude Code's session-start context with `git pull` status, clone progress, or generator messages. Errors surface to stderr with the last ~2 KB of child output for debugging.
- **Generator preserve-warning path for nested outputs** — the rename hint previously dropped the `agents/` prefix for `agents/codex.md`. Now the warning includes the full relative path, and a regression test covers the nested case.
- **Whitespace normalization in generator** — `extract_for()` now strips trailing whitespace on every line, so generated files do not inherit whitespace-only source lines that fail `git diff --cached --check`.

### Review history

0.1.3 passed `implement-review` with Codex before release. Resolved findings:

- **Medium** — Claude Code settings precedence wording in `AGENTS.md` reversed managed-policy order; corrected to match the documented `managed policy > command-line args > .local > project > user` chain.
- **Medium** — `scripts/session_bootstrap.py` forwarded raw subprocess stdout into Claude Code's session-start context; now captures and emits one concise summary line.
- **Low** — Generator preserve-warning dropped the `agents/` prefix for nested outputs; fixed, with a regression test.
- **Low** — Private repo `AGENTS.md` source had a whitespace-only line that propagated into generated files and failed `git diff --cached --check`; source corrected and generator now normalizes trailing whitespace on every line.
- **Low** — Private repo `AGENTS.md` "What gets shared" table did not yet list the new generated files and SessionStart hook ownership; added.
- **Medium** — `README.zh-CN.md` translated comments inside code blocks, violating the "keep code blocks verbatim in English" contract; restored English comments inside fences and kept translation outside.
- **Low** — Both READMEs introduced the scenarios as "Four" after Scenario E was added; corrected to "Five concrete scenarios" / "五个具体场景".
- **Low** — Repo-layout tree in the collapsible was stale (missed `CLAUDE.md`, `agents/codex.md`, `scripts/generate_agent_configs.py`, `scripts/session_bootstrap.py`); updated in both READMEs.
- **Low** — Chinese README used half-width punctuation in prose (`,`, `:`, `(`, `)` between Chinese characters); converted to full-width Chinese punctuation (`，` `。` `；` `：` `（）`) in prose while leaving code blocks, URLs, file paths, badge IDs, and English literals unchanged.
- No High-priority findings.

## [0.1.2] — 2026-04-16

Two new shipped skills (`ci-mockup-figure`, `readme-polish`), Read the Docs site launch, scenario-first README, reframed hero (project is the subject, author credentials become supporting evidence), Scenario B visualized as a left-to-right flowchart, and the usual round of Codex-driven corrections.

### Added

- **Skill: `ci-mockup-figure`** — build HTML mockups of systems, dashboards, and timelines, then capture as space-efficient PNG / PDF figures via headless Chrome. Includes an abstract-diagram path using TikZ or skia-canvas for architecture figures that need arrow routing between non-adjacent nodes. Covers tool selection, design principles, capture workflow, and LaTeX / Markdown insertion.
- **Skill: `readme-polish`** — audit a GitHub README and rewrite using modern 2025-2026 patterns: centered header, Shield.io badges, dot-separated nav, hero image, `> [!NOTE]` / `> [!TIP]` callouts, emoji-prefixed feature bullets, collapsible `<details>` for reference material, Mermaid diagrams, tables over dense prose. Ships with a patterns reference catalog and a pre-publish audit checklist.
- **Read the Docs site** — [anywhere-agents.readthedocs.io](https://anywhere-agents.readthedocs.io/). MkDocs + Material with a custom USC cardinal palette (`#990000`). Covers install, per-skill deep docs (via `mkdocs-include-markdown-plugin` so each skill page pulls directly from its `SKILL.md`), an `AGENTS.md` section-by-section reference, and a collapsible FAQ. Changelog is mirrored from the repo. New repo files: `.readthedocs.yaml`, `mkdocs.yml`, `docs/requirements.txt`, `docs/stylesheets/extra.css`, and `docs/*.md` content. Dependencies are upper-bounded so a future MkDocs 2.0 release cannot silently break the build.
- **`docs/skills/references/`** — pass-through pages for `review-lenses.md`, `routing-table.md`, `patterns.md`, and `checklist.md`. Links from inside each `SKILL.md` now resolve to real docs pages on RTD. `mkdocs build --strict --clean` is clean.
- **README RTD docs badge** — next to PyPI / npm / License / CI / Stars.
- **README "How to update" section** inside Install explaining that re-running the install command updates, plus the one-liner force refresh for mid-session.

### Changed

- **README restructured around four scenarios.** Replaces the adjacent "The agentic workflow this encodes" principle table and "What you get after setup" feature list with **What it does in practice** — A: add to any project, B: review before you push (left-to-right flowchart), C: writing that does not sound like an AI (with highlighted banned words and a before / after), D: Git safety catches mistakes. Reference-shaped content (day-to-day table, "what is opinionated" table) moves into collapsibles. Dot-nav points at Scenarios / Docs.
- **Hero reframed.** The project is visually primary; the author avatar is removed; PyOD credentials are supporting evidence under a "Built by…" line with PyOD described in context ("a widely used Python anomaly detection library") and numbers smaller and muted. Sig-strip pill changed from "What you get" to "Condensed experience" with the lead line "distilled from daily use since early 2026 across research, paper writing, and dev work." Panel 4 shows dispatch across the four shipped skills. Panel 5 removes `rm -rf` (not guard-scoped) and shows `git rebase` instead. Footer shows `4 shipped skills · anywhere-agents.readthedocs.io`.
- **Maintainer callout reframed** from "Maintained by [Yue Zhao]…" opener to "**Condensed from daily use.**" opener, with credentials moved to the end as backing evidence.
- **Scenario B visual** changed from a sequence diagram to a left-to-right flowchart with a loop-back arrow. Actor lanes disappear; the flow reads as one linear pipeline with an explicit `{clean?}` decision.
- **`skills/my-router/references/routing-table.md`** lists concrete keyword, file-type, and directory rules for all four shipped skills (previously only `implement-review`).
- **`skills/my-router/SKILL.md`** intro reflects the four-skill shipped set and includes dispatch examples for `ci-mockup-figure` and `readme-polish`.
- **`AGENTS.md`** "What gets shared" table lists all four shipped skills.
- **`.gitignore`** — added `site/` so local `mkdocs build` output does not leak into `git add -A`.

### Fixed

- **MkDocs strict build broken on included-link warnings** (Round 1, Medium). Included `SKILL.md` bodies referenced `references/*.md` that were not docs pages. Resolved by adding pass-through pages under `docs/skills/references/`, setting `rewrite_relative_urls: false` on the include-markdown plugin, and reorganizing the nav so reference pages appear as sub-items under each skill. `mkdocs build --strict --clean` now completes with zero warnings.
- **`tests/test_repo.py:260` stale two-skill-era failure message** (Round 1, Low). Replaced with a version-agnostic message pointing the maintainer at `SHIPPED_SKILLS` and the public docs together.
- **CHANGELOG scenario order mismatch** (Round 1, Low). Parenthetical listed scenarios as A-C-B-D; corrected to A-B-C-D.
- **Docs build dependency drift risk** (Round 2, Medium). `docs/requirements.txt` now carries upper bounds on every pin (`mkdocs<2.0`, `mkdocs-material<10.0`, `mkdocs-include-markdown-plugin<8.0`, `pymdown-extensions<11.0`) so a future RTD rebuild cannot pick up a breaking major.
- **Generated `site/` directory not ignored** (Round 2, Low). Added to `.gitignore` under a "MkDocs build output" comment.

### Review history

0.1.2 passed two rounds of `implement-review` with Codex before release:

- **Round 1**: 5 findings (2 Medium + 3 Low) covering MkDocs broken links, stale test message, CHANGELOG scenario order, and stale two-skill framing in the private relationship doc. All Fixed.
- **Round 2**: 3 findings (2 Medium + 1 Low) covering docs build dependency bounds, `site/` in `.gitignore`, and adding `mkdocs build --strict --clean` to the private release gate. All Fixed.
- No High-priority findings in either round.

## [0.1.1] — 2026-04-16

Release-hygiene follow-up. Documentation and layout improvements since 0.1.0, and package source is now fully reproducible from the repository.

### Added

- `docs/hero.png` + `docs/hero.html` + `docs/avatar.jpg` — README hero image with a 6-panel feature grid (cardinal-red branding), self-contained HTML source for regeneration, and vendored avatar so the hero does not depend on an external URL.
- README "The agentic workflow this encodes" section — educational narrative covering git-as-substrate, implementer + gatekeeper pattern, and IDE / MCP tradeoffs across operating systems.
- Mermaid review-loop sequence diagram (collapsed by default).
- Agent-friendly Install section with PyPI, npm, and raw-shell paths; `> [!TIP]` callout explains the "ask your agent to install" pattern.
- Package-local LICENSE files (`packages/pypi/LICENSE`, `packages/npm/LICENSE`) so published artifacts include the Apache-2.0 text.
- `packages/pypi/` and `packages/npm/` directories in the public repo so package source lives in the repo (was previously in an external scratch workspace — see 0.1.0 "Not included").

### Changed

- README restructured for scannability: centered header with badges and dot-nav; tables replaced dense bullet lists where the content was reference-like; collapsibles hide detail from first-read while keeping it one click away.
- Maintainer paragraph now sits inside a `> [!NOTE]` callout and is roughly half its previous length.
- CLI version reads from a single source of truth:
  - Python: `anywhere_agents.cli` imports `__version__` from `anywhere_agents/__init__.py`.
  - Node.js: `bin/anywhere-agents.js` reads `version` from its sibling `package.json` at runtime.
- Release workflow in the private relationship doc reflects the new `packages/` layout and the single-source version pattern.

### Fixed

- Guard-hook scope claim corrected in README, CHANGELOG, and hero source: `rm -rf` goes through Claude Code permission prompts via settings, not through `guard.py`. The `STOP! HAMMER TIME!` warning is for guard-covered Git/GitHub commands only.
- Raw shell install path now creates `.agent-config/` before downloading the bootstrap script on both macOS/Linux and Windows PowerShell. The install section also shows both shells (previously only Bash).
- CHANGELOG version numbering unified: one release stream covers both repo content and PyPI/npm packages.

## [0.1.0] — 2026-04-16

Initial public release. The sanitized downstream of the author's private daily-driver agent config, refined over months across many repositories, machines, and workflows. This release covers both the GitHub repo content (bootstrap, skills, guard hook, settings, tests, docs) and the matching PyPI / npm CLI packages.

### Added — repository

- **Bootstrap** (`bootstrap/bootstrap.sh`, `bootstrap/bootstrap.ps1`) — idempotent sync scripts for macOS, Linux, and Windows. Fetch `AGENTS.md`, sparse-clone skills, merge settings, deploy the guard hook, update `.gitignore`. Safe to run every session.
- **`AGENTS.md`** — opinionated agent configuration covering:
  - Source-vs-consumer repo detection.
  - Session start checks (OS, model and effort level, Codex config, GitHub Actions version pins).
  - User profile placeholder (intended for customization in forks).
  - Agent roles (Claude Code implementer + Codex reviewer).
  - Task routing via `my-router`.
  - Codex MCP integration guide.
  - Writing defaults (~40 AI-tell words to avoid, punctuation rules, format preservation).
  - Formatting defaults, Git safety, shell command style.
  - GitHub Actions version standards (Node.js 24 minimums).
  - Environment notes.
  - Local skills precedence and cross-tool skill sharing conventions.
- **Skill: `implement-review`** — structured dual-agent review loop with content-type-specific lenses (code via Google eng-practices, paper via NeurIPS/ICLR/ICML, proposal via NSF Merit Review or NIH Simplified Peer Review), focused sub-lenses (code/security, paper/formatting, proposal/compliance, etc.), multi-target reviews, round history tracking, and reviewer save contract. Includes example reviews covering code, paper, and proposal tracks.
- **Skill: `my-router`** — context-aware skill dispatcher shipped as a template. Ships with `implement-review` as the only concrete routing rule plus an extension template so users register their own skills in a fork.
- **Guard hook** (`scripts/guard.py`) — PreToolUse hook that intercepts destructive Git and GitHub commands (`git push`, `git commit`, `git reset --hard`, `git merge`, `git rebase`, `gh pr merge`, `gh pr create`, etc.) and compound `cd <path> && <cmd>` chains with deliberately memorable warnings ("STOP! HAMMER TIME!", etc.) to prevent muscle-memory auto-approval. Tuned to keep read-only operations fast. Shell deletes (`rm -rf`) go through Claude Code's built-in permission prompts via the user-level `ask` settings, not the guard hook itself.
- **Claude Code commands** (`.claude/commands/`) — pointer files for both shipped skills (local-first, bootstrap fallback lookup).
- **Claude Code settings** (`.claude/settings.json`) — curated project-level permissions.
- **User-level settings** (`user/settings.json`) — permissions, guard hook wiring, and `CLAUDE_CODE_EFFORT_LEVEL=max` env default.
- **Tests** (`tests/`) — bootstrap contract validation, skill layout checks, settings merge preservation, and Windows + Linux bootstrap smoke tests running in GitHub Actions CI.
- **CI** (`.github/workflows/validate.yml`) — validation on `ubuntu-latest` and `windows-latest` with `actions/checkout@v6` and `actions/setup-python@v6`.
- **README** with problem framing, "What you get" benefit list, install paths (PyPI / npm / raw shell), day-to-day usage notes, collapsible reference sections, and maintainer context. Includes a hero image (`docs/hero.png`, with `docs/hero.html` source and a vendored avatar at `docs/avatar.jpg`), a Mermaid review-loop sequence diagram, the "agentic workflow this encodes" educational section, and GitHub-style `> [!NOTE]` / `> [!TIP]` callouts.
- **`CONTRIBUTING.md`** — scope and process for PRs, bug reports, and customizations (customizations go in a fork; upstream takes bug fixes and clear improvements).
- **`LICENSE`** — Apache 2.0.

### Added — packages

- **PyPI `anywhere-agents` 0.1.0** — installable via `pip install anywhere-agents` or `pipx run anywhere-agents`. Ships a thin CLI (`anywhere_agents.cli:main`) that downloads the latest shell bootstrap from the repo and runs it in the current directory. Supports `--dry-run`, `--version`, `--help`.
- **npm `anywhere-agents` 0.1.0** — installable via `npx anywhere-agents` or `npm install -g anywhere-agents`. Same behavior as the PyPI CLI, implemented in Node.js.
- **Agent-native install path**: users can tell their AI agent _"install anywhere-agents in this project"_ and the agent will pick whichever command (pipx, npx, or raw shell) matches the environment. The packages exist purely as agent-friendly entry points; install logic stays single-source in the shell bootstrap scripts.

### Not included (out of scope for 0.1.0)

- No YAML manifest or config file — files in the repo are the configuration.
- No selective-update tooling — Git is the subscription engine (`git pull upstream main`, `git cherry-pick`).
- No environment auto-install — `AGENTS.md` documents required tools; users install them.
- No multi-agent expansion beyond Claude Code + Codex — forks can add Cursor, Aider, Gemini CLI support.
- No profiles system — there is one configuration; forks are how other "profiles" exist.
- No marketplace, registry, or web UI.

### Review history

0.1.0 passed multiple rounds of `implement-review` with Codex before release. Resolved findings:

- **High** — Bootstrap scripts were silently running `git config --global core.autocrlf false`, reaching beyond the consuming repo. Removed; regression test added.
- **High** — Raw shell install path in README missed `mkdir -p .agent-config` and omitted the Windows PowerShell variant; fixed with both shells in a collapsible.
- **Medium** — `AGENTS.md` "What gets shared" table listed unshipped skills. Corrected to the actually-shipped set (`implement-review`, `my-router`).
- **Medium** — README maintainer paragraph overstated this repo's role relative to the private canonical source. Revised to describe this as the "sanitized public release of the working agent config."
- **Medium** — README / CHANGELOG / hero overstated the guard hook's scope by listing `rm -rf` alongside Git/GitHub commands. Corrected to distinguish guard-covered commands from settings-based permission prompts.
- **Low** — Trailing whitespace in `AGENTS.md`; `docs/hero.html` external avatar URL (vendored to `docs/avatar.jpg` for reproducibility). Both fixed.

[Unreleased]: https://github.com/yzhao062/anywhere-agents/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/yzhao062/anywhere-agents/releases/tag/v0.1.3
[0.1.2]: https://github.com/yzhao062/anywhere-agents/releases/tag/v0.1.2
[0.1.1]: https://github.com/yzhao062/anywhere-agents/releases/tag/v0.1.1
[0.1.0]: https://github.com/yzhao062/anywhere-agents/releases/tag/v0.1.0
