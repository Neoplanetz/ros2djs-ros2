import { test, expect } from '@playwright/test';

const BASE = process.env.ROS2D_BASE || 'http://localhost:4173';
const TOPICS = {
  occupancy: '/map',
  markerArray: '/topology_graph',
  pose: '/robot_0/pose',
  path: '/robot_0/traj',
};

const IGNORABLE_PATTERNS = [
  /Outdated Optimize Dep/i,
  /Outdated Dependency/i,
  /\[vite\] connecting/i,
  /\[vite\] connected/i,
];
function isIgnorable(line) {
  return IGNORABLE_PATTERNS.some((re) => re.test(line));
}

function collectConsole(page) {
  const messages = [];
  page.on('console', (msg) => {
    const line = `[${msg.type()}] ${msg.text()}`;
    if (!isIgnorable(line)) {
      messages.push(line);
    }
  });
  page.on('pageerror', (err) => {
    const line = `[pageerror] ${err.message}\n${err.stack || ''}`;
    if (!isIgnorable(line)) {
      messages.push(line);
    }
  });
  return messages;
}

async function waitForConnection(page) {
  await page
    .locator('.status-badge.status-connected')
    .first()
    .waitFor({ state: 'attached', timeout: 20000 });
}

async function clickDemo(page, label) {
  await page.getByRole('button', { name: new RegExp(label, 'i') }).first().click();
  await page.waitForTimeout(500);
}

async function setField(page, labelText, value) {
  const label = page.locator('label.field', { hasText: labelText });
  const input = label.locator('input');
  await input.fill(value);
}

async function clickApply(page) {
  await page
    .locator('.demo-card')
    .getByRole('button', { name: /^Apply$/ })
    .click();
}

async function getDemoStatus(page) {
  return (await page.locator('.demo-card .helper-text').first().textContent()) || '';
}

async function canvasHasPixelsDrawn(page) {
  return page.evaluate(() => {
    const c = document.querySelector('.viewer-canvas-host canvas');
    if (!c) { return { ok: false, reason: 'no canvas' }; }
    const ctx = c.getContext('2d');
    if (!ctx) { return { ok: false, reason: 'no 2d context' }; }
    // EaselJS Stage may cache or render async. Just sample pixels.
    const img = ctx.getImageData(0, 0, Math.min(200, c.width), Math.min(200, c.height));
    // count non-background (non-#f7f4ed which is 247,244,237) pixels
    const bg = [247, 244, 237];
    let painted = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data[i] !== bg[0] || img.data[i+1] !== bg[1] || img.data[i+2] !== bg[2]) {
        painted++;
      }
    }
    return { ok: painted > 10, painted, size: img.data.length / 4 };
  });
}

test.describe('ros2djs-ros2 smoke test (live rosbridge)', () => {
  test('boot: app renders, rosbridge connects', async ({ page }) => {
    const logs = collectConsole(page);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    await expect(page.locator('#root')).toBeVisible();
    await waitForConnection(page);

    await page.screenshot({ path: 'smoke-test/screenshots/01-boot.png', fullPage: true });

    const criticalErrors = logs.filter(l =>
      l.includes('[pageerror]') ||
      l.includes('Must call super constructor')
    );
    expect(criticalErrors, `critical errors:\n${criticalErrors.join('\n')}`).toHaveLength(0);
  });

  test('OccupancyGridClient /map renders a visible map', async ({ page }) => {
    const logs = collectConsole(page);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await waitForConnection(page);

    await clickDemo(page, 'OccupancyGridClient');
    await setField(page, 'Topic', TOPICS.occupancy);
    await clickApply(page);

    // Wait for the status text to flip from "Waiting for map data" to "Map ready"
    await expect(page.locator('.demo-card .helper-text')).toContainText(/Map ready/i, { timeout: 20000 });
    const status = await getDemoStatus(page);
    console.log('OccupancyGrid status:', status);

    const pixels = await canvasHasPixelsDrawn(page);
    console.log('OccupancyGrid pixels:', JSON.stringify(pixels));
    expect(pixels.ok, 'canvas appears blank').toBe(true);

    await page.screenshot({ path: 'smoke-test/screenshots/02-occupancy.png', fullPage: true });

    const criticalErrors = logs.filter(l =>
      l.includes('[pageerror]') || l.includes('Must call super constructor')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('MarkerArrayClient /topology_graph renders markers', async ({ page }) => {
    const logs = collectConsole(page);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await waitForConnection(page);

    await clickDemo(page, 'MarkerArrayClient');
    await setField(page, 'Topic', TOPICS.markerArray);
    await clickApply(page);

    await expect(page.locator('.demo-card .helper-text')).toContainText(/MarkerArray rendered/i, { timeout: 20000 });
    const status = await getDemoStatus(page);
    console.log('MarkerArray status:', status);

    const pixels = await canvasHasPixelsDrawn(page);
    console.log('MarkerArray pixels:', JSON.stringify(pixels));
    expect(pixels.ok, 'canvas appears blank').toBe(true);

    await page.screenshot({ path: 'smoke-test/screenshots/03-markers.png', fullPage: true });

    const criticalErrors = logs.filter(l =>
      l.includes('[pageerror]') || l.includes('Must call super constructor')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('Navigation Overlays /robot_0/pose renders (v1.3.1 super() fix)', async ({ page }) => {
    const logs = collectConsole(page);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await waitForConnection(page);

    await clickDemo(page, 'Navigation Overlays');
    await setField(page, 'Pose topic', TOPICS.pose);
    await setField(page, 'Path topic', TOPICS.path);
    await setField(page, 'Odometry topic', '/unused_odom');
    await setField(page, 'PoseArray topic', '/unused_particles');
    await clickApply(page);

    await expect(page.locator('.demo-card .helper-text')).toContainText(/Navigation overlays updated/i, { timeout: 20000 });
    const status = await getDemoStatus(page);
    console.log('Navigation status:', status);

    const pixels = await canvasHasPixelsDrawn(page);
    console.log('Navigation pixels:', JSON.stringify(pixels));
    expect(pixels.ok, 'canvas appears blank').toBe(true);

    await page.screenshot({ path: 'smoke-test/screenshots/04-navigation-pose.png', fullPage: true });

    const superCrash = logs.filter(l => l.includes('Must call super constructor'));
    expect(superCrash, 'super() regression').toHaveLength(0);

    const pageerrors = logs.filter(l => l.includes('[pageerror]'));
    expect(pageerrors, `page errors:\n${pageerrors.join('\n')}`).toHaveLength(0);
  });

  test('ImageMapClient PGM asset renders (no ROS)', async ({ page }) => {
    const logs = collectConsole(page);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    await clickDemo(page, 'ImageMapClient');
    await page.getByRole('button', { name: /Load Asset/ }).click();

    await expect(page.locator('.demo-card .helper-text')).toContainText(/Asset loaded/i, { timeout: 15000 });
    const status = await getDemoStatus(page);
    console.log('ImageMap status:', status);

    const pixels = await canvasHasPixelsDrawn(page);
    console.log('ImageMap pixels:', JSON.stringify(pixels));
    expect(pixels.ok, 'canvas appears blank').toBe(true);

    await page.screenshot({ path: 'smoke-test/screenshots/05-image-map.png', fullPage: true });

    const criticalErrors = logs.filter(l =>
      l.includes('[pageerror]') ||
      l.includes('Must call super constructor') ||
      l.toLowerCase().includes('failed to load')
    );
    expect(criticalErrors, `errors:\n${criticalErrors.join('\n')}`).toHaveLength(0);
  });

  test('RotateView: right-drag rotates stage around pivot', async ({ page }) => {
    const logs = collectConsole(page);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    await clickDemo(page, 'ImageMapClient');
    await page.getByRole('button', { name: /Load Asset/ }).click();
    await expect(page.locator('.demo-card .helper-text')).toContainText(/Asset loaded/i, { timeout: 15000 });
    await page.waitForTimeout(500);

    const canvas = page.locator('.viewer-canvas-host canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    const beforeShot = await canvas.screenshot();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(cx + 250, cy, { steps: 10 });
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(400);

    const afterShot = await canvas.screenshot();
    await page.screenshot({ path: 'smoke-test/screenshots/06-rotate.png', fullPage: true });

    // Heuristic: rotation must have changed canvas content
    expect(Buffer.compare(beforeShot, afterShot)).not.toBe(0);

    const criticalErrors = logs.filter(l =>
      l.includes('[pageerror]') || l.includes('Must call super constructor')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
