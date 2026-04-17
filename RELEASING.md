# Releasing anywhere-agents

This document captures the exact steps used to release a new version of `anywhere-agents`. The repo and both packages (PyPI + npm) share **one version number**, bumped together and tagged on the same commit so that checking out the tag reproduces exactly what is published.

## Prerequisites (one-time)

| Item | Needed for | Setup |
|------|------------|-------|
| Python 3.9+ with `build` and `twine` | PyPI publish | `pip install build twine` |
| Node.js 14+ with `npm` | npm publish | Any recent install |
| `git` | everything | — |
| PyPI API token in `~/.pypirc` | `twine upload` | Generate at https://pypi.org/manage/account/token/; for CI/unattended use, prefer a project-scoped token |
| npm token with **Bypass 2FA** enabled in `~/.npmrc` | `npm publish` without interactive OTP | Generate at https://www.npmjs.com/settings/<you>/tokens/new; check the "Bypass Two-Factor Authentication" box. Required because npm requires 2FA on publish by default and publishing with WebAuthn/Windows Hello cannot accept `--otp` |
| Chrome or Chromium headless | Regenerate `docs/hero.png` from `docs/hero.html` when hero content changes | — |

## Pre-release checks

From a clean `main` with no uncommitted changes:

```bash
# 1. Run the full test suite — must pass locally on your OS, and CI on Ubuntu + Windows must be green
python -B -m unittest discover -s tests -p "test_*.py" -v

# 2. Whitespace-clean diff (no trailing spaces, no tab/space mixing)
git diff --cached --check

# 3. Leak sweep: no personal identifiers slipped in
grep -rEi "yuezh|yzhao010|USC|miniforge3|py312|Overleaf" \
  --include="*.md" --include="*.py" --include="*.json" --include="*.yml" \
  --include="*.yaml" --include="*.sh" --include="*.ps1" \
  .
# Review hits: "USC" in the maintainer credential is OK; "co-PI" inside hyphenation examples is OK; any other match is a leak and must be fixed.
```

If any of the three checks fail, stop and fix before continuing.

## Real-agent smoke tests

Two scripts exercise different layers. CI runs complementary workflows (`validate.yml`, `real-agent-smoke.yml`, `package-smoke.yml`) on every push, every release, and weekly.

### Pre-tag gate: validate the release candidate

`scripts/pre-push-smoke.sh` checks the commit you are about to tag — **not** the published package:

1. Regenerates `CLAUDE.md` / `agents/codex.md` in a temp dir from the committed `AGENTS.md` and diffs against the committed files. Catches stale generator output.
2. Runs `claude -p "..."` in the repo root and asserts the response lists every skill under `skills/`. Proves Claude actually loads the committed `CLAUDE.md`.
3. Runs `codex exec "..."` with the same assertion for Codex.

Agent calls are skipped (not failed) if the CLI is missing, so the script is useful on machines with only one agent configured.

```bash
bash scripts/pre-push-smoke.sh
```

The pre-push git hook (`.githooks/pre-push`, enable with `git config core.hooksPath .githooks`) runs this automatically when a push touches `AGENTS.md`, `bootstrap/`, `scripts/`, or `skills/`.

### Post-publish verification: validate the published artifacts

`scripts/remote-smoke.sh` bootstraps a throwaway project via the **published** package — `pipx run anywhere-agents`, `npx anywhere-agents`, or the raw-shell install — then asserts file structure + user-level hook deployment + agent behavior end-to-end. Useful for ad-hoc verification from a maintainer machine:

```bash
bash scripts/remote-smoke.sh

# From a dev machine, via SSH to an agent-equipped host (e.g., the DGX release-gate box):
ssh user@host 'bash -s' < scripts/remote-smoke.sh
```

CI runs `.github/workflows/package-smoke.yml` automatically on `release: published` and weekly, covering the same surface across a larger OS × Python/Node matrix. The manual `remote-smoke.sh` is convenient when you want to spot-check immediately after publishing without waiting for the weekly scheduled run.

Prerequisites on the agent-equipped machine: `git`, `python3`, and at least one of `pipx` / `npx` / `curl` for the install step; plus `claude` CLI with `ANTHROPIC_API_KEY` and `codex` CLI with `OPENAI_API_KEY` for the roster assertions (which are skipped gracefully if a CLI is missing).

## Version bump (single source of truth)

Only **three files** hold the release version. The CLIs read their version at runtime from these files, so there are no other strings to touch.

```bash
# PyPI package
#   - packages/pypi/pyproject.toml          → project.version
#   - packages/pypi/anywhere_agents/__init__.py  → __version__

# npm package
#   - packages/npm/package.json             → "version"
```

Use the same version number across all three files. Add a `[X.Y.Z] — YYYY-MM-DD` section to `CHANGELOG.md` with what changed, moving anything from `[Unreleased]`. Update the compare-link block at the bottom of the changelog so `[X.Y.Z]` resolves and `[Unreleased]` compares against the new tag.

## Verify version locally before tagging

```bash
# Build and install the PyPI wheel into a scratch location
rm -rf packages/pypi/dist packages/pypi/build packages/pypi/*.egg-info
python -m build packages/pypi --outdir packages/pypi/dist
python -m twine check packages/pypi/dist/*
pip install --force-reinstall --no-deps packages/pypi/dist/*.whl
anywhere-agents --version   # should print anywhere-agents X.Y.Z

# Run the Node CLI directly (no install)
node packages/npm/bin/anywhere-agents.js --version   # should print anywhere-agents X.Y.Z
```

## Commit, tag, push

```bash
git add packages/ CHANGELOG.md
git commit -m "release: vX.Y.Z — <short summary>"
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin main
git push origin vX.Y.Z
```

The tag must be on the same commit as the version bump. Later reviewers verify that checking out the tag and running `python -m build packages/pypi` produces the same artifact that is on PyPI.

## Publish to PyPI

From the repo root after tagging:

```bash
python -m twine upload packages/pypi/dist/*
```

The `~/.pypirc` token authenticates automatically (no interactive prompt).

Verify the upload:

```bash
# Short delay may be needed if PyPI CDN is slow; add --no-cache-dir to bypass local pip cache
pip install --upgrade --force-reinstall --no-cache-dir anywhere-agents==X.Y.Z
anywhere-agents --version   # should print X.Y.Z
```

## Publish to npm

```bash
npm publish packages/npm --access public
```

The bypass-2FA token in `~/.npmrc` authenticates automatically. Verify:

```bash
npm view anywhere-agents version   # should print X.Y.Z
```

Then sanity-check from a throwaway directory:

```bash
cd "$(mktemp -d)"
npx anywhere-agents@X.Y.Z --version
```

## Post-release

- Close any GitHub issues that were addressed by the release (reference the tag in the closing comment).
- Update `[Unreleased]` section of `CHANGELOG.md` to start fresh (`_No unreleased changes queued._`).

## Common gotchas

- **PyPI CDN cache.** After `twine upload`, a fresh `pip install --upgrade` may still report the previous version for a minute or two. Use `--force-reinstall --no-cache-dir` with an explicit `==X.Y.Z` to verify.
- **npm without bypass-2FA.** If the token does not have bypass 2FA enabled and you use Windows Hello for npm 2FA, publishing fails with a 403 and cannot be completed with `--otp=` (WebAuthn does not produce a 6-digit code). Regenerate the token with bypass 2FA or switch to a classic Automation token.
- **Version drift.** If you change one of the three version files but forget another, the published package advertises one version in metadata and another via `--version`. The refactor (Python `__version__` import, Node `package.json` read-at-runtime) prevents this for the CLI output, but the package metadata is still authored separately in each ecosystem — keep them in sync by hand or script it.
- **Tag-before-publish.** Always tag before publishing. If publishing fails or you need to amend the release, it is easier to adjust a local tag than to retract a published package (PyPI and npm consider release versions immutable).

## Reference

- Private release workflow (two-repo sync + sanitization discipline): see `docs/anywhere-agents.md` in the private `yzhao062/agent-config` repo.
- Review history for each release: see `CHANGELOG.md` "Review history" sections.
- CI that guards the release: `.github/workflows/validate.yml` runs the test suite on Ubuntu + Windows.
