#!/usr/bin/env node
/**
 * prebuild.js — runs automatically before every `next build` via the
 * "prebuild" npm/pnpm script hook.
 *
 * What it does on every deploy:
 *   1. Stamps sw.js CACHE_NAME with a unique build ID so old SW caches
 *      are cleared automatically for every release.
 *   2. Writes public/version.json so the running app can detect a new
 *      build and silently reload — no user action required.
 */

const fs = require('fs');
const path = require('path');

const BUILD_ID = Date.now().toString();
const publicDir = path.join(__dirname, '..', 'public');

// ── 1. Stamp sw.js ────────────────────────────────────────────────────────────
const swPath = path.join(publicDir, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(
  /const CACHE_NAME = 'buddi-[^']*'/,
  `const CACHE_NAME = 'buddi-${BUILD_ID}'`
);
fs.writeFileSync(swPath, sw);

// ── 2. Write version.json ─────────────────────────────────────────────────────
fs.writeFileSync(
  path.join(publicDir, 'version.json'),
  JSON.stringify({ buildId: BUILD_ID, builtAt: new Date().toISOString() })
);

console.log(`[prebuild] buildId=${BUILD_ID} — sw.js stamped, version.json written`);
