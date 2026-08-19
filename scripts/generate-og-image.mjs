#!/usr/bin/env node
/* eslint-disable no-undef */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const templatePath = path.join(__dirname, 'og-image-template.html');
const outPath = path.join(root, 'public', 'og-image.png');

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

async function main() {
  const chromePath =
    process.env.PLAYWRIGHT_CHROME_PATH ||
    `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage({
    viewport: { width: OG_WIDTH, height: OG_HEIGHT },
    deviceScaleFactor: 1,
  });

  await page.goto(`file://${templatePath}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(300);

  const canvas = page.locator('#og-canvas');
  await canvas.waitFor({ state: 'visible', timeout: 10000 });
  await canvas.screenshot({ path: outPath, type: 'png' });

  await browser.close();
  console.log(`Wrote ${outPath} (${OG_WIDTH}x${OG_HEIGHT})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
