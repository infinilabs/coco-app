#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * check-info-plist.cjs
 *
 * Validates `src-tauri/Info.plist` (or any plist passed as argv[2]):
 *   1. The file parses as well-formed XML (top-level `<dict>` present).
 *   2. Required privacy-usage-description keys appear EXACTLY ONCE.
 *      Duplicate keys can be silently stripped during macOS code-signing /
 *      notarization, which leads to TCC refusing to show the permission
 *      prompt at runtime (camera/mic stop working in release builds even
 *      though they worked in `tauri dev`).
 *   3. On macOS, additionally runs `plutil -lint` against the file.
 *
 * Exits non-zero on any failure so CI can fail the build.
 *
 * Usage:
 *   node scripts/check-info-plist.cjs [path/to/Info.plist]
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REQUIRED_KEYS_EXACTLY_ONCE = [
  "NSCameraUsageDescription",
  "NSMicrophoneUsageDescription",
];

// These keys, if present, must also be unique. (We don't require them to
// exist, but if they do, duplicates are still illegal.)
const OPTIONAL_UNIQUE_KEYS = [
  "NSSpeechRecognitionUsageDescription",
  "NSAppleEventsUsageDescription",
  "NSAccessibility",
  "CFBundleIdentifier",
  "CFBundleExecutable",
  "LSUIElement",
];

function fail(msg) {
  console.error(`\u001b[31m[check-info-plist] ERROR:\u001b[0m ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`\u001b[32m[check-info-plist] OK:\u001b[0m ${msg}`);
}

function main() {
  const target =
    process.argv[2] ||
    path.resolve(__dirname, "..", "src-tauri", "Info.plist");

  if (!fs.existsSync(target)) {
    fail(`File not found: ${target}`);
    return;
  }

  const xml = fs.readFileSync(target, "utf8");

  if (!/<\s*plist\b/.test(xml) || !/<\s*dict\b/.test(xml)) {
    fail(`Not a valid plist (missing <plist>/<dict>): ${target}`);
    return;
  }

  // Count occurrences of each <key>NAME</key> in the file.
  // We only look at top-level-ish keys here; the regex is intentionally
  // simple because plists put every key inside <key>…</key>.
  const keyRegex = /<key>([^<]+)<\/key>/g;
  const counts = new Map();
  let m;
  while ((m = keyRegex.exec(xml)) !== null) {
    const k = m[1].trim();
    counts.set(k, (counts.get(k) || 0) + 1);
  }

  let failed = false;

  for (const key of REQUIRED_KEYS_EXACTLY_ONCE) {
    const c = counts.get(key) || 0;
    if (c === 0) {
      fail(`Required key '${key}' is missing from ${target}`);
      failed = true;
    } else if (c > 1) {
      fail(
        `Key '${key}' appears ${c} times in ${target} (must appear exactly once)`
      );
      failed = true;
    }
  }

  for (const key of OPTIONAL_UNIQUE_KEYS) {
    const c = counts.get(key) || 0;
    if (c > 1) {
      fail(
        `Key '${key}' appears ${c} times in ${target} (must appear at most once)`
      );
      failed = true;
    }
  }

  // Generic safety net: warn on any duplicate top-level key we didn't
  // explicitly list above.
  for (const [key, c] of counts.entries()) {
    if (c > 1 && !REQUIRED_KEYS_EXACTLY_ONCE.includes(key) && !OPTIONAL_UNIQUE_KEYS.includes(key)) {
      fail(
        `Key '${key}' appears ${c} times in ${target} (duplicate keys are not allowed)`
      );
      failed = true;
    }
  }

  if (!failed) {
    ok(
      `${target}: ${REQUIRED_KEYS_EXACTLY_ONCE.join(", ")} each present exactly once`
    );
  }

  // On macOS, also run plutil -lint for a real parser check.
  if (process.platform === "darwin") {
    const r = spawnSync("plutil", ["-lint", target], {
      encoding: "utf8",
    });
    if (r.status !== 0) {
      fail(
        `plutil -lint failed for ${target}: ${(r.stdout || "") + (r.stderr || "")}`
      );
    } else {
      ok(`plutil -lint passed for ${target}`);
    }
  } else {
    console.log(
      `[check-info-plist] Skipping 'plutil -lint' (not running on macOS).`
    );
  }
}

main();
