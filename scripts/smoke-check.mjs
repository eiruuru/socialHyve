#!/usr/bin/env node
/**
 * Smoke check for socialHyve project structure.
 * Run after npm install: node scripts/smoke-check.mjs
 */

import { existsSync } from 'fs';
import { join } from 'path';

const root = new URL('..', import.meta.url).pathname;
const required = [
  'package.json',
  'src/App.jsx',
  'src/main.jsx',
  'src/pages/CalendarPage.jsx',
  'src/pages/PostComposerPage.jsx',
  'src/features/posts/PostComposer.jsx',
  'src/features/calendar/ContentCalendar.jsx',
  'supabase/migrations/001_initial_schema.sql',
  'supabase/functions/publish-post/index.ts',
  'supabase/functions/meta-oauth-start/index.ts',
  'supabase/functions/canva-oauth-start/index.ts',
  'supabase/functions/refresh-tokens/index.ts',
];

let failed = 0;
for (const file of required) {
  const path = join(root, file);
  if (!existsSync(path)) {
    console.error(`MISSING: ${file}`);
    failed++;
  }
}

if (failed) {
  console.error(`\n${failed} required file(s) missing.`);
  process.exit(1);
}

console.log('smoke-check: all required files present');
