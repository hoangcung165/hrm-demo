// Evidence for the Nguồn lực shell and Heatmap (HRM-17/FE-1) against the real stack: /resources as the Admin at 1280
// (12 week columns, the current week marked, Cao Minh Trí at 120% "quá tải", the legend), the "Mọi mức tải" filter on
// "Quá tải", search without accents, paging through the periods and back to "Tuần này", the month view (6 columns),
// the sort by name, and the same screen at 390 (3 week columns, the "Lọc" dialog, the view switch).
// Cao Minh Trí is 60% on DA-029 and 60% on DA-031 for a few weeks (seeded with the example data, HRM_EXAMPLE_DATA on,
// or added by the projects flow), so the flow fails with a clear message when that overload is missing.
// Use a throwaway database (CI does), never the demo one. Writes screenshots and a Markdown report; exits non-zero at
// the first step that fails.
//   BASE_URL (http://localhost:5173)  OUT (e2e-out)  IMG_BASE (image URL prefix)  HRM_ADMIN_PASSWORD
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';

mkdirSync(OUT, { recursive: true });
const report = ['### Resources heatmap (real backend, PostgreSQL)', ''];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(15_000);
let n = 0;

async function finish(code) {
  writeFileSync(`${OUT}/report-resources.md`, report.join('\n'));
  await browser.close();
  process.exit(code);
}

async function step(title, run) {
  n += 1;
  const file = `resources-${String(n).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
  try {
    const note = await run();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
    report.push(`**${n}. ${title}**${note ? `: ${note}` : ''}`, '', `![${title}](${IMG_BASE}/${file}?raw=true)`, '');
    console.log(`ok ${n}. ${title}`);
  } catch (error) {
    await page.screenshot({ path: `${OUT}/${file}`, fullPage: true }).catch(() => {});
    report.push(`**${n}. ${title}: FAILED**`, '', '```', String(error).slice(0, 1500), '```', '', `![${title}](${IMG_BASE}/${file}?raw=true)`, '', 'Result: FAILED.');
    console.error(`FAILED ${n}. ${title}\n${error}`);
    await finish(1);
  }
}

const grid = () => page.getByRole('table', { name: 'Heatmap Tải phân bổ theo nhân viên' });
const columnCount = async () => grid().locator('tbody tr:first-child td').count();
const personRow = (name) => grid().getByRole('row').filter({ hasText: name });
const shownPeople = async () => grid().locator('tbody tr .truncate').allTextContents();

await step('Admin: Nguồn lực opens on the Heatmap with 12 weeks', async () => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Nguồn lực' }).click();
  await page.getByRole('heading', { level: 1, name: 'Nguồn lực' }).waitFor();
  await personRow('Cao Minh Trí').waitFor();
  const columns = await columnCount();
  if (columns !== 12) throw new Error(`expected 12 week columns, found ${columns}`);
  await grid().locator('[aria-current="date"]').first().waitFor();
  await page.getByText('Dưới 50%: Bench').waitFor();
  await page.getByText('Trên 100%: Quá tải').waitFor();
  return 'GET /api/resources/heatmap (WEEK, 12 columns); the current week is marked; the legend shows the four levels';
});

await step('Cao Minh Trí is over 100% in a cell', async () => {
  const over = personRow('Cao Minh Trí').locator('[aria-label*="quá tải"]');
  if ((await over.count()) === 0) {
    throw new Error('no overloaded cell for Cao Minh Trí: the flow needs the example data (HRM_EXAMPLE_DATA on)');
  }
  await over.first().scrollIntoViewIfNeeded();
  const label = await over.first().getAttribute('aria-label');
  if (!/120%/.test(label ?? '')) throw new Error(`expected 120%, got "${label}"`);
  return `cell label "${label}"`;
});

await step('Level filter "Quá tải"', async () => {
  await page.getByRole('combobox', { name: 'Mức tải' }).click();
  await page.getByRole('option', { name: 'Quá tải' }).click();
  await page.waitForURL(/[?&]level=over/);
  // Other people may be over as well (the projects flow overloads a few): every row left must have an over cell.
  await personRow('Cao Minh Trí').waitFor();
  await page.waitForFunction(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    return rows.length > 0 && rows.every((row) => row.querySelector('[aria-label*="quá tải"]'));
  });
  const names = await shownPeople();
  return `level=over keeps ${names.length} person/people over 100% in the period, among them Cao Minh Trí`;
});

await step('Search without accents: "tri"', async () => {
  await page.getByRole('combobox', { name: 'Mức tải' }).click();
  await page.getByRole('option', { name: 'Mọi mức tải' }).click();
  await page.waitForURL((url) => !url.search.includes('level='));
  await page.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã nhân viên' }).fill('tri');
  await page.waitForURL(/[?&]q=tri/);
  await personRow('Cao Minh Trí').waitFor();
  const names = await shownPeople();
  if (!names.includes('Cao Minh Trí')) throw new Error(`"Cao Minh Trí" is missing: [${names.join(', ')}]`);
  return `q=tri finds ${names.length} person/people, among them Cao Minh Trí`;
});

await step('Page through the periods and back to "Tuần này"', async () => {
  await page.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã nhân viên' }).fill('');
  await page.waitForURL((url) => !url.search.includes('q='));
  await page.getByRole('button', { name: 'Khoảng sau' }).click();
  await page.waitForURL(/[?&]from=/);
  await page.getByRole('button', { name: 'Tuần này' }).click();
  await page.waitForURL((url) => !url.search.includes('from='));
  await personRow('Cao Minh Trí').waitFor();
  const columns = await columnCount();
  if (columns !== 12) throw new Error(`expected 12 week columns, found ${columns}`);
  return 'from= appears when paging and goes away on "Tuần này"';
});

await step('Month view: 6 months', async () => {
  await page.getByRole('button', { name: 'Theo tháng' }).click();
  await page.waitForURL(/[?&]view=month/);
  await personRow('Cao Minh Trí').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('table tbody tr:first-child td').length === 6);
  return 'view=month: 6 month columns';
});

await step('Sort by name', async () => {
  await page.getByRole('button', { name: 'Theo tuần' }).click();
  await page.waitForURL((url) => !url.search.includes('view='));
  await page.getByRole('combobox', { name: 'Sắp xếp' }).click();
  await page.getByRole('option', { name: 'Theo tên' }).click();
  await page.waitForURL(/[?&]sort=name/);
  await personRow('Cao Minh Trí').waitFor();
  const names = await shownPeople();
  const sorted = [...names].sort((a, b) => a.localeCompare(b, 'vi'));
  if (names.join('|') !== sorted.join('|')) throw new Error(`not sorted by name: [${names.slice(0, 6).join(', ')}…]`);
  return `sort=name: ${names.length} row(s) in Vietnamese alphabetical order`;
});

await step('390: 3 week columns and the filter dialog', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/resources`);
  await personRow('Cao Minh Trí').waitFor();
  const columns = await columnCount();
  if (columns !== 3) throw new Error(`expected 3 week columns at 390, found ${columns}`);
  await page.getByRole('group', { name: 'Kiểu xem' }).waitFor();
  await page.getByRole('button', { name: /^Lọc/ }).click();
  await page.getByRole('dialog', { name: 'Lọc heatmap' }).waitFor();
  return '3 week columns; the "Lọc" button opens the filter dialog';
});

report.push('Result: passed.');
console.log('Result: passed.');
await finish(0);
