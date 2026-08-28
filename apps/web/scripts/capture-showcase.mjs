import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(rootDir, 'public', 'showcase');
const baseUrl = process.env.SHOWCASE_BASE_URL ?? 'http://127.0.0.1:5173';
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.addInitScript(() => {
  localStorage.setItem('carnotea.lang', 'en');
  localStorage.setItem('theme', 'dark');
});

await page.goto(`${baseUrl}/login?mode=signIn`, { waitUntil: 'networkidle' });
await page.getByLabel('Email').fill('test@carnotea.dev');
await page.getByLabel('Password').fill('Test1234!');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('**/dashboard');
await page.waitForLoadState('networkidle');
await page.getByRole('button', { name: /select vehicle/i }).click();
await page
  .getByText(/Volkswagen Golf/i)
  .first()
  .click();
await page.waitForLoadState('networkidle');
await page.getByText('Loading...').waitFor({ state: 'hidden' });

await page.screenshot({ path: path.join(outputDir, 'dashboard-golf-desktop.png') });
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole('button', { name: /Volkswagen Golf/i }).click();
await page
  .getByText(/Tesla Model 3/i)
  .first()
  .click();
await page.waitForLoadState('networkidle');
await page.getByText('Loading...').waitFor({ state: 'hidden' });
await page.screenshot({ path: path.join(outputDir, 'dashboard-ev-mobile.png') });
await page.mouse.wheel(0, 480);
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(outputDir, 'activity-mobile.png') });
await page.goto(`${baseUrl}/vehicles`, { waitUntil: 'networkidle' });
const vehicleHref = await page
  .locator('a[href^="/vehicles/"]')
  .filter({ hasText: 'Tesla Model 3' })
  .first()
  .getAttribute('href');
const vehicleId = vehicleHref?.split('/').at(-1);

if (!vehicleId) throw new Error('Could not resolve the showcase vehicle ID.');

await page.goto(`${baseUrl}/vehicles/${vehicleId}/reminders`, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(outputDir, 'reminders-mobile.png') });
await page.setViewportSize({ width: 1200, height: 650 });
await page.goto(`${baseUrl}/vehicles`, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(outputDir, 'vehicles-desktop.png') });
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(outputDir, 'dashboard-ev-desktop.png') });
await page.getByRole('heading', { name: 'Analytics' }).scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, 'analytics-desktop.png') });
await page.setViewportSize({ width: 1200, height: 630 });
await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(outputDir, 'carnotea-og.png') });

await browser.close();
