#!/usr/bin/env node
/**
 * anywhere-agents: thin CLI that downloads and runs the upstream shell bootstrap
 * in the current directory. All real logic lives in the shell bootstrap scripts
 * at https://github.com/yzhao062/anywhere-agents/tree/main/bootstrap — this CLI
 * exists so that agents and users in a Node-first workflow can invoke the same
 * mechanism without reaching for curl.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const { spawnSync } = require("child_process");

const REPO = "yzhao062/anywhere-agents";
const BRANCH = "main";
const VERSION = require(path.join(__dirname, "..", "package.json")).version;

const log = (msg) => process.stderr.write(`[anywhere-agents] ${msg}\n`);

function bootstrapUrl(scriptName) {
  return `https://raw.githubusercontent.com/${REPO}/${BRANCH}/bootstrap/${scriptName}`;
}

function chooseScript() {
  if (process.platform === "win32") {
    return { name: "bootstrap.ps1", interpreter: null /* resolved via PATH */, psMode: true };
  }
  return { name: "bootstrap.sh", interpreter: "bash", psMode: false };
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      // Follow redirects.
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        download(res.headers.location, dest).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        res.resume();
        return;
      }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on("finish", () => out.close(resolve));
      out.on("error", reject);
    });
    req.on("error", reject);
  });
}

function showHelp() {
  process.stdout.write(`anywhere-agents ${VERSION}

Usage:
  anywhere-agents             run bootstrap in the current directory
  anywhere-agents --dry-run   print what would run without fetching or executing
  anywhere-agents --version   print version
  anywhere-agents --help      print this help

This CLI downloads the latest shell bootstrap from
https://github.com/${REPO}/tree/main/bootstrap and runs it in the cwd.
See the GitHub repo for what bootstrap does and how to customize.
`);
}

async function main(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    showHelp();
    return 0;
  }
  if (argv.includes("--version") || argv.includes("-V")) {
    process.stdout.write(`anywhere-agents ${VERSION}\n`);
    return 0;
  }
  const dryRun = argv.includes("--dry-run");

  const { name, interpreter, psMode } = chooseScript();
  const url = bootstrapUrl(name);
  const configDir = path.join(process.cwd(), ".agent-config");
  const outPath = path.join(configDir, name);

  if (dryRun) {
    log(`Would fetch: ${url}`);
    log(`Would write: ${outPath}`);
    const shownInterp = psMode ? "powershell -NoProfile -ExecutionPolicy Bypass -File" : interpreter;
    log(`Would run:   ${shownInterp} ${outPath}`);
    return 0;
  }

  fs.mkdirSync(configDir, { recursive: true });

  log(`Fetching ${name} from ${url}`);
  try {
    await download(url, outPath);
  } catch (e) {
    log(`Download failed: ${e.message}`);
    return 1;
  }

  log("Running bootstrap (refreshes AGENTS.md, skills, settings)");
  let result;
  if (psMode) {
    // Try pwsh first (PowerShell 7+, cross-platform), fall back to powershell.
    const tryInterp = (cmd) =>
      spawnSync(cmd, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", outPath], {
        stdio: "inherit",
        shell: false,
      });
    result = tryInterp("pwsh");
    if (result.error && result.error.code === "ENOENT") {
      result = tryInterp("powershell");
    }
  } else {
    result = spawnSync(interpreter, [outPath], { stdio: "inherit", shell: false });
  }

  if (result.error) {
    log(`Interpreter not found or failed to start: ${result.error.message}`);
    return 2;
  }
  if (result.status !== 0) {
    log(`Bootstrap exited with code ${result.status}`);
  }
  return result.status ?? 0;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((e) => {
    log(`Unexpected error: ${e.message}`);
    process.exit(1);
  });
