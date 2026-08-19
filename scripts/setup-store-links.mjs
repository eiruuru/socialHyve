#!/usr/bin/env node
/**
 * Writes Universal Links / App Links files from env vars.
 *
 *   APPLE_TEAM_ID=ABCDE12345 ANDROID_RELEASE_SHA256=AA:BB:... node scripts/setup-store-links.mjs
 *
 * Loads .env from repo root when present (simple KEY=value lines).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const wellKnown = path.join(root, 'public', '.well-known');

function loadDotEnv() {
  try {
    const raw = readFileSync(path.join(root, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // optional
  }
}

loadDotEnv();

const teamId = process.env.APPLE_TEAM_ID?.trim();
const sha256 = process.env.ANDROID_RELEASE_SHA256?.trim()?.replace(/:/g, ':');

if (!teamId && !sha256) {
  console.log('Skip: set APPLE_TEAM_ID and/or ANDROID_RELEASE_SHA256 to update .well-known files.');
  process.exit(0);
}

if (teamId) {
  const aasa = {
    applinks: {
      apps: [],
      details: [
        {
          appID: `${teamId}.app.socialhyve`,
          paths: ['/app/*', '/login', '/review/*'],
        },
      ],
    },
  };
  writeFileSync(
    path.join(wellKnown, 'apple-app-site-association'),
    `${JSON.stringify(aasa, null, 2)}\n`,
  );
  console.log(`Updated apple-app-site-association (appID: ${teamId}.app.socialhyve)`);
}

if (sha256) {
  const assetlinks = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'app.socialhyve',
        sha256_cert_fingerprints: [sha256],
      },
    },
  ];
  writeFileSync(
    path.join(wellKnown, 'assetlinks.json'),
    `${JSON.stringify(assetlinks, null, 2)}\n`,
  );
  console.log('Updated assetlinks.json');
}
