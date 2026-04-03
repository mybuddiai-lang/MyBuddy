'use strict';
/**
 * entrypoint.js — Docker startup script
 *
 * 1. Fixes DATABASE_URL password encoding (handles special chars like @ that
 *    break Prisma's URL parser with error P1013 "invalid port number")
 * 2. Runs Prisma migrations
 * 3. Starts the NestJS app
 */
const { execSync, spawn } = require('child_process');

// --- Fix DATABASE_URL password encoding ---
if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  // Regex extracts: scheme, user, password (greedy — handles @ in password),
  // host (no @ or :), port (digits only), rest (db name + query params)
  const match = url.match(/^((?:postgresql|postgres):\/\/)([^:]+):(.+)@([^@:]+):(\d+)\/(.*)$/);
  if (match) {
    const [, scheme, user, rawPassword, host, port, rest] = match;
    try {
      // Decode first (in case partially encoded), then re-encode cleanly
      const decoded = decodeURIComponent(rawPassword);
      const encoded = encodeURIComponent(decoded);
      if (encoded !== rawPassword) {
        process.env.DATABASE_URL = `${scheme}${user}:${encoded}@${host}:${port}/${rest}`;
        console.log('[entrypoint] DATABASE_URL password encoded successfully');
      }
    } catch {
      console.warn('[entrypoint] Could not encode DATABASE_URL password — using as-is');
    }
  }
}

// --- Run Prisma migrations ---
try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
  console.log('[entrypoint] Migrations OK');
} catch (err) {
  console.warn('[entrypoint] Migrations failed — starting app anyway:', err.message);
}

// --- Start the app ---
const child = spawn('node', ['dist/main'], { stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
  console.error('[entrypoint] Failed to start app:', err);
  process.exit(1);
});
