#!/usr/bin/env node
import { mkdir, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'marketing');
const baseUrl = process.env.MARKETING_CAPTURE_URL || 'http://localhost:5173/__marketing-capture';

const CAPTURES = [
  { id: 'queue', file: 'queue.jpg' },
  { id: 'composer', file: 'composer-finetune.jpg' },
  { id: 'calendar', file: 'calendar.jpg' },
  { id: 'interactions', file: 'interactions.jpg' },
  { id: 'preview-grid', file: 'preview-grid.jpg' },
  { id: 'settings-clients', file: 'settings-clients.jpg' },
];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const chromePath =
    process.env.PLAYWRIGHT_CHROME_PATH ||
    `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  for (const { id, file } of CAPTURES) {
    const pngPath = path.join(outDir, file.replace('.jpg', '.png'));
    const jpgPath = path.join(outDir, file);
    console.log(`Capturing #capture-${id}`);
    const el = page.locator(`#capture-${id}`);
    await el.waitFor({ state: 'visible', timeout: 15000 });
    await el.screenshot({ path: pngPath });
    await run('sips', ['-s', 'format', 'jpeg', pngPath, '--out', jpgPath]);
    await unlink(pngPath).catch(() => {});
  }

  await browser.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
