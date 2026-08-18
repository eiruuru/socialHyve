#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'marketing');
const baseUrl = process.env.MARKETING_CAPTURE_URL || 'http://localhost:5173/__marketing-capture';

/** Logical width of capture containers (matches max-w-6xl). */
const CAPTURE_WIDTH = 1152;
const DEVICE_SCALE = 2;

const CAPTURES = [
  { id: 'queue', file: 'queue.png' },
  { id: 'composer', file: 'composer-finetune.png' },
  { id: 'calendar', file: 'calendar.png' },
  { id: 'interactions', file: 'interactions.png' },
  { id: 'preview-grid', file: 'preview-grid.png' },
  { id: 'settings-clients', file: 'settings-clients.png' },
];

async function main() {
  await mkdir(outDir, { recursive: true });

  const chromePath =
    process.env.PLAYWRIGHT_CHROME_PATH ||
    `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext({
    viewport: { width: CAPTURE_WIDTH + 128, height: 1200 },
    deviceScaleFactor: DEVICE_SCALE,
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  for (const { id, file } of CAPTURES) {
    const outPath = path.join(outDir, file);
    console.log(`Capturing #capture-${id} → ${file} (@${DEVICE_SCALE}x)`);
    const el = page.locator(`#capture-${id}`);
    await el.waitFor({ state: 'visible', timeout: 15000 });
    await el.screenshot({ path: outPath, type: 'png' });
  }

  await browser.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
