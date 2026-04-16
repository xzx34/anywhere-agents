# Changelog

All notable changes to `anywhere-agents` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Version tags apply uniformly to the repo content **and** the matching `anywhere-agents` PyPI / npm packages — they share one release stream. Consumers pinned to a specific tag get a stable snapshot; consumers on `main` receive ongoing updates.

## [Unreleased]

_No unreleased changes queued._

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

[Unreleased]: https://github.com/yzhao062/anywhere-agents/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/yzhao062/anywhere-agents/releases/tag/v0.1.1
[0.1.0]: https://github.com/yzhao062/anywhere-agents/releases/tag/v0.1.0
