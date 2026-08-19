#!/usr/bin/env node
/* eslint-disable no-undef */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const iconTemplate = path.join(__dirname, 'pwa-icon-template.html');
const splashTemplate = path.join(__dirname, 'pwa-splash-template.html');
const iconsDir = path.join(root, 'public', 'icons');
const splashDir = path.join(root, 'public', 'splash');

const ICON_SIZES = [
  { name: 'icon-192.png', size: 192, markScale: 0.55 },
  { name: 'icon-512.png', size: 512, markScale: 0.55 },
  { name: 'icon-maskable-512.png', size: 512, markScale: 0.62, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, markScale: 0.55 },
  { name: 'app-store-1024.png', size: 1024, markScale: 0.55 },
];

const SPLASH_SIZES = [
  { name: 'splash-iphone-14-pro-max.png', width: 1284, height: 2778 },
  { name: 'splash-iphone-se.png', width: 750, height: 1334 },
  { name: 'splash-ipad-pro.png', width: 2048, height: 2732 },
];

async function main() {
  await mkdir(iconsDir, { recursive: true });
  await mkdir(splashDir, { recursive: true });

  const chromePath =
    process.env.PLAYWRIGHT_CHROME_PATH ||
    `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });

  const iconPage = await browser.newPage();
  await iconPage.goto(`file://${iconTemplate}`, { waitUntil: 'networkidle' });

  for (const { name, size, markScale } of ICON_SIZES) {
    const outPath = path.join(iconsDir, name);
    const markPx = Math.round(size * markScale);
    await iconPage.setViewportSize({ width: size, height: size });
    await iconPage.evaluate(({ markPx: mp }) => {
      document.documentElement.style.width = `${window.innerWidth}px`;
      document.documentElement.style.height = `${window.innerHeight}px`;
      document.body.style.width = `${window.innerWidth}px`;
      document.body.style.height = `${window.innerHeight}px`;
      document.body.style.background = '#14110C';
      const mark = document.querySelector('.mark');
      mark.style.width = `${mp}px`;
      mark.style.height = `${mp}px`;
    }, { markPx });
    await iconPage.screenshot({ path: outPath, type: 'png' });
    console.log(`Wrote ${outPath} (${size}x${size})`);
  }

  const splashPage = await browser.newPage();
  await splashPage.goto(`file://${splashTemplate}`, { waitUntil: 'networkidle' });
  await splashPage.waitForFunction(() => document.fonts.ready.then(() => true));

  for (const { name, width, height } of SPLASH_SIZES) {
    const outPath = path.join(splashDir, name);
    await splashPage.setViewportSize({ width, height });
    await splashPage.waitForTimeout(150);
    await splashPage.screenshot({ path: outPath, type: 'png', fullPage: true });
    console.log(`Wrote ${outPath} (${width}x${height})`);
  }

  await browser.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
