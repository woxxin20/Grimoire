import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Serve production assets through browser routing: no server or real API is used.
async function openGrimoire(page: Page, options: { offline?: boolean; empty?: boolean; slowSearch?: boolean } = {}) {
  const titles = ['Neuro-Grimoire · Interface vision', 'The architecture of a second brain', 'Emerald design language', 'A quieter kind of intelligence', 'Memory ingestion pipeline', 'Semantic search patterns'];
  const memories = options.empty ? [] : titles.map((title, index) => ({
    id: `memory-${index}`, title, type: 'text', category: ['Projects', 'Knowledge', 'Design'][index % 3],
    original_content: `Original preserved thought ${index}.`, summary: 'A connection between living knowledge and an evolving intelligence.',
    analysis: '', tags: ['grimoire', 'intelligence'], keywords: [], entities: [], concepts: ['Neural intelligence'],
    raw_content: '', raw_content_preview: '', importance_score: 7, confidence_score: .95, favorite: index === 0,
    created_at: '2026-09-07T08:00:00.000Z', updated_at: '2026-09-07T08:00:00.000Z', relationships: [],
  }));
  const categories = ['Projects', 'Knowledge', 'Design'].map(category => ({ category, count: memories.filter(memory => memory.category === category).length })).filter(category => category.count);
  const nodes = [...memories.map(memory => ({ id: memory.id, label: memory.title, category: memory.category, type: 'memory' })), ...categories.map(category => ({ id: `category-${category.category}`, label: category.category, category: category.category, type: 'category' }))];
  const edges = memories.map(memory => ({ id: `edge-${memory.id}`, source: memory.id, target: `category-${memory.category}`, label: 'PART_OF', weight: 1 }));
  const posts: Array<{ url: string; body: unknown }> = [];
  await page.route('http://grimoire.test/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) {
      if (options.offline) return route.fulfill({ status: 503, json: { error: 'Service unavailable' } });
      if (route.request().method() === 'POST') posts.push({ url: url.pathname, body: route.request().postDataJSON() });
      if (url.pathname === '/api/search') {
        if (options.slowSearch) await new Promise(resolve => setTimeout(resolve, 1500));
        return route.fulfill({ json: { query: 'interface', primary_match: { ...memories[0], mind_match_score: 96, match_reason: 'Related concept' }, strong_matches: [], connected_memories: [], possible_matches: [], related_concepts: [], total_results: 1 } });
      }
      if (url.pathname === '/api/memories' && route.request().method() === 'POST') return route.fulfill({ status: 201, json: { memory: memories[0] } });
      if (url.pathname === '/api/memories') return route.fulfill({ json: { memories, total: memories.length } });
      if (url.pathname === '/api/categories') return route.fulfill({ json: { categories } });
      if (url.pathname === '/api/concepts') return route.fulfill({ json: { concepts: [{ concept: 'Neural intelligence', count: memories.length }] } });
      if (url.pathname === '/api/graph') return route.fulfill({ json: { nodes, edges } });
      if (url.pathname === '/api/multiverse/agents') return route.fulfill({ json: { agents: ['Architect', 'Researcher', 'Analyst', 'Archivist'].map((name, index) => ({ id: `agent-${index}`, name, role: 'Independent perspective', modelName: 'Configured provider' })) } });
      if (url.pathname.startsWith('/api/memories/')) return route.fulfill({ json: memories.find(memory => url.pathname.endsWith(memory.id)) || {} });
      return route.fulfill({ json: { slots: [], activeKeys: 0, recentLogs: [] } });
    }
    const file = path.join(process.cwd(), 'dist', url.pathname === '/' ? 'index.html' : url.pathname);
    try {
      const body = await readFile(file);
      const contentType = file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/html';
      return route.fulfill({ body, contentType });
    } catch { return route.fulfill({ status: 404, body: 'Not found' }); }
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The intelligence within.' })).toBeVisible();
  await expect(page.locator('.awareness-label')).toHaveText('AWARE');
  return { posts, memories };
}

test('desktop composition and memory navigation use the live data contract', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openGrimoire(page);
  await expect(page.locator('.hive-counts')).toContainText('9');
  await expect.poll(() => page.locator('.hive-preview canvas').evaluate((canvas: HTMLCanvasElement) => canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data.some(value => value > 0))).toBe(true);
  await page.screenshot({ path: 'artifacts/grimoire-desktop.png', fullPage: true });
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Grimoire', exact: true }).click();
  await expect(page.locator('.folio-spread')).toBeVisible();
  await page.screenshot({ path: 'artifacts/grimoire-book.png', fullPage: true });
  await page.locator('.folio-chapters').getByRole('button', { name: /Memory/ }).click();
  await page.getByRole('textbox', { name: 'Search saved memories' }).fill('interface');
  await expect(page.locator('.memory-grid .memory-tile')).toHaveCount(1);
  await page.locator('.memory-grid .memory-tile').click();
  await expect(page.getByRole('dialog')).toContainText('Original preserved thought 0.');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('search enters reasoning, can cancel, and renders only the completed result', async ({ page }) => {
  await openGrimoire(page, { slowSearch: true });
  const command = page.getByRole('textbox', { name: 'Search memories or enter a command' });
  await command.fill('interface');
  await page.getByRole('button', { name: 'Send command', exact: true }).click();
  await expect(page.locator('.awareness-label')).toHaveText('REASONING');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.awareness-label')).toHaveText('AWARE');
  await expect(page.getByRole('region', { name: 'Search results' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Send command', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Search results' })).toContainText('Neuro-Grimoire');
  await expect(page.locator('.awareness-label')).toHaveText('AWARE');
});

test('capture preserves exact text and modal keyboard focus', async ({ page }) => {
  const { posts } = await openGrimoire(page);
  await page.getByRole('button', { name: 'Preserve a thought' }).click();
  const dialog = page.getByRole('dialog');
  const text = '  A thought\nwith exact whitespace.  ';
  await dialog.getByRole('textbox', { name: 'Original content' }).fill(text);
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBe(true);
  await dialog.getByRole('button', { name: 'Seal memory' }).click();
  await expect(dialog).toHaveCount(0);
  expect(posts.find(post => post.url === '/api/memories')?.body).toEqual({ content: text, user_notes: '' });
});

test('voice is opt in, deletion requires confirmation, and palette is keyboard accessible', async ({ page }) => {
  const { posts } = await openGrimoire(page);
  await page.getByRole('button', { name: 'Talk to JARVIS', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Your browser may send audio');
  await page.getByRole('button', { name: 'Use text', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Search memories or enter a command' })).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('textbox', { name: 'Search commands' }).fill('memory');
  await page.keyboard.press('Escape');
  await page.locator('.recent-memories .memory-tile').first().click();
  await page.getByRole('button', { name: 'Forget', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('permanently deleted');
  await page.getByRole('button', { name: 'Keep memory' }).click();
  expect(posts).toHaveLength(0);
});

test('mobile, landscape, reduced motion and high contrast retain usable navigation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openGrimoire(page);
  await expect(page.locator('.grimoire-app')).toHaveClass(/motion-paused/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/grimoire-mobile.png', fullPage: true });
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('button', { name: 'System', exact: true }).click();
  await page.getByRole('switch', { name: 'High contrast' }).click();
  await expect(page.locator('.grimoire-app')).toHaveClass(/high-contrast/);
  await nav.getByRole('button', { name: 'Hive', exact: true }).click();
  await page.getByRole('combobox', { name: 'Select a knowledge graph node' }).selectOption('memory-0');
  await expect(page.locator('.graph-inspector')).toContainText('Neuro-Grimoire');
  await page.setViewportSize({ width: 812, height: 375 });
  await nav.getByRole('button', { name: 'Core', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search memories or enter a command' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Start voice command' })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.locator('.grimoire-rail')).toBeVisible();
  await expect(page.locator('.main-content')).toBeInViewport();
  expect(await page.locator('.main-content').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test('offline and empty states do not fabricate stored knowledge', async ({ page }) => {
  await openGrimoire(page, { offline: true });
  await expect(page.locator('.header-status')).toHaveText('LOCAL INTERFACE ACTIVE');
  await expect(page.locator('.empty-echo')).toContainText('archive is out of reach');
  await page.getByRole('textbox', { name: 'Search memories or enter a command' }).fill('anything');
  await page.getByRole('button', { name: 'Send command', exact: true }).click();
  await expect(page.locator('.awareness-label')).toHaveText('COGNITIVE FAULT');
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await expect(page.locator('.awareness-label')).toHaveText('AWARE');
});

test('empty archive stays empty and focus mode removes surrounding panels', async ({ page }) => {
  await openGrimoire(page, { empty: true });
  await expect(page.locator('.empty-echo')).toContainText('The first page is yours.');
  await expect(page.locator('.hive-counts')).toContainText('0');
  await page.getByRole('button', { name: 'Focus mode', exact: true }).click();
  await expect(page.locator('.grimoire-rail')).toBeHidden();
  await expect(page.locator('.context-rail')).toBeHidden();
  await expect(page.locator('.focus-timer')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.grimoire-rail')).toBeVisible();
});
