"""Thin CLI that downloads and runs the anywhere-agents shell bootstrap in the current directory.

Usage:
    anywhere-agents            # install/refresh in cwd (default)
    anywhere-agents --dry-run  # print what would run without executing

This CLI is intentionally minimal. All real logic lives in the shell bootstrap
scripts at https://github.com/yzhao062/anywhere-agents/tree/main/bootstrap,
so that consumers who prefer raw `curl | bash` get the same result.
"""

from __future__ import annotations

import argparse
import platform
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

from . import __version__

REPO = "yzhao062/anywhere-agents"
BRANCH = "main"


def bootstrap_url(script_name: str) -> str:
    return f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/bootstrap/{script_name}"


def choose_script() -> tuple[str, list[str]]:
    """Return (script_name, interpreter_argv_prefix) for the current platform."""
    if platform.system() == "Windows":
        # Prefer pwsh (cross-platform PowerShell 7+) if available, fall back to Windows PowerShell.
        interpreter = shutil.which("pwsh") or shutil.which("powershell")
        if interpreter is None:
            raise RuntimeError("PowerShell is required on Windows but was not found on PATH.")
        return "bootstrap.ps1", [interpreter, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File"]
    bash = shutil.which("bash")
    if bash is None:
        raise RuntimeError("bash is required on macOS/Linux but was not found on PATH.")
    return "bootstrap.sh", [bash]


def log(msg: str) -> None:
    print(f"[anywhere-agents] {msg}", file=sys.stderr)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="anywhere-agents",
        description=(
            "Download and run the anywhere-agents shell bootstrap in the current "
            "directory. This refreshes AGENTS.md, skills, command pointers, and "
            "settings from the upstream repo."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would run without fetching or executing.",
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"anywhere-agents {__version__}",
    )
    args = parser.parse_args(argv)

    try:
        script_name, interpreter_argv = choose_script()
    except RuntimeError as e:
        log(str(e))
        return 2

    url = bootstrap_url(script_name)
    config_dir = Path(".agent-config")
    out_path = config_dir / script_name

    if args.dry_run:
        log(f"Would fetch: {url}")
        log(f"Would write: {out_path}")
        log(f"Would run:   {' '.join(interpreter_argv + [str(out_path)])}")
        return 0

    config_dir.mkdir(parents=True, exist_ok=True)

    log(f"Fetching {script_name} from {url}")
    try:
        urllib.request.urlretrieve(url, out_path)  # noqa: S310 (user-controlled URL is hard-coded)
    except Exception as exc:  # pragma: no cover — network failure path
        log(f"Download failed: {exc}")
        return 1

    log("Running bootstrap (refreshes AGENTS.md, skills, settings)")
    try:
        result = subprocess.run(interpreter_argv + [str(out_path)], check=False)
    except FileNotFoundError as exc:
        log(f"Interpreter not found: {exc}")
        return 2

    if result.returncode != 0:
        log(f"Bootstrap exited with code {result.returncode}")
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
