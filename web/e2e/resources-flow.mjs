// Evidence for Nguồn lực (HRM-17) against the real stack: Tổng quan (FE-4: the stat tiles, the projects, this week, the
// 12 weeks as columns and as a table, who needs attention, the Quá tải tile), then the shell and Heatmap (FE-1) at 1280
// (12 week columns, the current week marked, Cao Minh Trí at 120% "quá tải", the legend), the "Mọi mức tải" filter on
// "Quá tải", search without accents, paging through the periods and back to "Tuần này", the month view (6 columns),
// the sort by name, the cell detail drawer (HRM-17/FE-2: the overloaded week of Cao Minh Trí with the projects that add
// up, Esc and focus back on the cell, a week with no allocation, stepping to the next week), and the same screen at 390
// (3 week columns, the "Lọc" dialog, the drawer as a full-screen sheet); the Bench and Sắp hết dự án tabs (HRM-17/FE-3:
// the lowest load first, the month view, the row menu, "Chỉ người chưa có phân bổ tiếp theo"); the thresholds dialog
// (HRM-17/FE-5: field errors, saving a new bench threshold and seeing the legend and the Bench tab follow, "Khôi phục
// mặc định"; it saves thresholds for the whole company and puts the defaults back at the end); the Dự án tab of
// the profile (HRM-17/FE-6: the 12-week strip, the overload sentence, the project history, the link back to the heatmap).
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
// The name is the first truncated line of the row head; the second one is the code and unit.
const shownPeople = async () => page.$$eval('table tbody tr th', (heads) => heads.map((head) => head.querySelector('.truncate')?.textContent ?? ''));

await step('Admin: Nguồn lực opens on Tổng quan with the stat tiles', async () => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Nguồn lực' }).click();
  await page.getByRole('heading', { level: 1, name: 'Nguồn lực' }).waitFor();
  if ((await page.getByRole('tab', { name: 'Tổng quan' }).getAttribute('aria-selected')) !== 'true') throw new Error('Nguồn lực did not open on Tổng quan');
  const tiles = page.getByRole('list', { name: 'Số liệu chính' }).getByRole('listitem');
  // Scoped to the tiles: the projects block says "Các dự án đang chạy…" too.
  await page.getByRole('list', { name: 'Số liệu chính' }).getByText('Dự án đang chạy', { exact: true }).waitFor();
  await page.getByRole('region', { name: 'Mức tải 12 tuần tới' }).getByRole('img').first().waitFor();
  const count = await tiles.count();
  if (count !== 6) throw new Error(`expected 6 stat tiles, found ${count}`);
  return 'GET /api/resources/overview; six stat tiles';
});

await step('Tổng quan: projects, this week, the 12 weeks and who needs attention', async () => {
  const weeks = page.getByRole('region', { name: 'Mức tải 12 tuần tới' });
  const columns = await weeks.getByRole('img').count();
  if (columns !== 12) throw new Error(`expected 12 week columns, found ${columns}`);
  await page.getByRole('region', { name: 'Mức Tải phân bổ tuần này' }).getByRole('img').waitFor();
  await page.getByRole('region', { name: 'Nhân sự theo dự án' }).getByRole('listitem').first().waitFor();
  await weeks.getByRole('button', { name: 'Xem dạng bảng' }).click();
  const rows = await weeks.getByRole('table').getByRole('row').count();
  if (rows !== 13) throw new Error(`expected 12 weeks and a head row in the table view, found ${rows} rows`);
  await weeks.getByRole('button', { name: 'Xem dạng biểu đồ' }).click();
  const over = page.getByRole('region', { name: 'Quá tải trong 12 tuần tới' });
  await over.getByText('Cao Minh Trí').waitFor();
  return 'running projects with head count; this week by level; the 12 weeks as columns and as a table; Cao Minh Trí is listed as overloaded';
});

await step('Tổng quan: the Quá tải tile leads to the heatmap filtered on Quá tải', async () => {
  await page.getByRole('list', { name: 'Số liệu chính' }).getByRole('link', { name: /Quá tải/ }).click();
  await page.waitForURL(/tab=heatmap/);
  await page.waitForURL(/level=OVER/i);
  await personRow('Cao Minh Trí').waitFor();
  const shown = await shownPeople();
  if (!shown.includes('Cao Minh Trí')) throw new Error(`Cao Minh Trí is not listed: ${shown.join(', ')}`);
  return 'the tile opens the Heatmap with the "Quá tải" level filter';
});

await step('Heatmap tab: 12 weeks', async () => {
  await page.goto(`${BASE}/resources`);
  await page.getByRole('tab', { name: 'Heatmap' }).click();
  await page.waitForURL(/tab=heatmap/);
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
  // The previous rows stay on screen (dimmed) until the sorted ones arrive, so poll until the order is right.
  // The exact collation is the backend's job (covered by its integration test). Here the order must follow the family
  // name's first letter, with đ right after d and tone marks ignored, whatever ICU data this runtime has.
  const letter = (name) => name.toLowerCase().replace(/đ/g, 'd~').normalize('NFD').replace(/[\u0300-\u036f]/g, '')[0] ?? '';
  const deadline = Date.now() + 15_000;
  let names = [];
  let problem = '';
  do {
    names = await shownPeople();
    const letters = names.map((name) => letter(name));
    const broken = letters.findIndex((each, i) => i > 0 && letters[i - 1] > each);
    problem = broken > 0 ? `not sorted by name at row ${broken}: "${names[broken - 1]}" before "${names[broken]}" (all: ${names.join(', ')})` : '';
    if (!problem) break;
    await page.waitForTimeout(300);
  } while (Date.now() < deadline);
  if (problem) throw new Error(problem);
  return `sort=name: ${names.length} row(s) in alphabetical order of the family name`;
});

const drawer = (name) => page.getByRole('dialog', { name });

await step('Cell detail drawer: the overloaded week of Cao Minh Trí', async () => {
  const cell = personRow('Cao Minh Trí').locator('button:has([aria-label*="quá tải"])').first();
  await cell.scrollIntoViewIfNeeded();
  const label = await cell.locator('[aria-label]').getAttribute('aria-label');
  await cell.click();
  const panel = drawer(/Cao Minh Trí/);
  await panel.waitFor();
  await panel.getByRole('alert').getByText(/quá tải, cao nhất 120%/).waitFor();
  await panel.getByText('Tải phân bổ theo từng khoảng').waitFor();
  await panel.getByText(/DA-0\d+ 60% \+ DA-0\d+ 60%/).first().waitFor();
  await panel.getByText(/Phân bổ trong kỳ \(\d+\)/).waitFor();
  if ((await cell.getAttribute('aria-pressed')) !== 'true') throw new Error('the open cell is not marked');
  return `GET /api/resources/employees/{id}/load; the drawer lists the periods and the allocations behind "${label}"`;
});

await step('Esc closes the drawer and focus returns to the cell', async () => {
  await page.keyboard.press('Escape');
  await drawer(/Cao Minh Trí/).waitFor({ state: 'detached' });
  const focused = await page.evaluate(() => document.activeElement?.querySelector('[aria-label]')?.getAttribute('aria-label') ?? '');
  if (!/quá tải/.test(focused)) throw new Error(`focus is not on the overloaded cell: "${focused}"`);
  return 'focus is back on the cell that opened it';
});

await step('Cell detail drawer: a week with no allocation', async () => {
  const empty = grid().locator('tbody button:has([aria-label^="Tải phân bổ 0%"])').first();
  await empty.scrollIntoViewIfNeeded();
  await empty.click();
  const panel = page.getByRole('dialog').filter({ hasText: 'Chi tiết ô heatmap' });
  await panel.getByText('Kỳ này chưa có phân bổ').waitFor();
  await panel.getByRole('button', { name: 'Kỳ sau' }).click();
  await panel.getByText(/Phân bổ trong kỳ|Kỳ này chưa có phân bổ/).first().waitFor();
  return 'the empty period says so; "Kỳ sau" steps to the next week';
});

await step('Bench tab: people under 50%, lowest load first', async () => {
  await page.goto(`${BASE}/resources?tab=heatmap`);
  await personRow('Cao Minh Trí').waitFor();
  const tab = page.getByRole('tab', { name: /^Bench/ });
  await tab.waitFor();
  await tab.click();
  await page.waitForURL(/tab=bench/);
  const list = page.getByRole('table', { name: 'Danh sách nhân sự ở bench' });
  const empty = page.getByText('Không ai ở bench');
  await list.or(empty).first().waitFor();
  if (await list.isVisible()) {
    const loads = await list.locator('tbody tr [role="img"]').evaluateAll((cells) => cells.map((cell) => Number.parseInt(cell.textContent ?? '', 10)));
    if (loads.some((load) => load >= 50)) throw new Error(`a person with ${loads.find((load) => load >= 50)}% is listed on the Bench`);
    if (loads.some((load, i) => i > 0 && load < loads[i - 1])) throw new Error(`the Bench is not lowest first: ${loads.join(', ')}`);
  }
  await page.getByText(/Tải phân bổ dưới 50% tuần này/).or(empty).first().waitFor();
  return 'GET /api/resources/bench; every load is under 50% and the list starts with the lowest';
});

await step('Bench tab: month view and the row menu', async () => {
  await page.getByRole('button', { name: 'Theo tháng' }).click();
  await page.getByText(/Tải phân bổ dưới 50% tháng này|Không ai ở bench/).first().waitFor();
  const menu = page.getByRole('button', { name: /^Thao tác của / }).first();
  if (await menu.isVisible().catch(() => false)) {
    await menu.click();
    await page.getByRole('menuitem', { name: 'Xem hồ sơ' }).waitFor();
    await page.getByRole('menuitem', { name: 'Xem trên heatmap' }).waitFor();
    await page.keyboard.press('Escape');
  }
  return 'the month view says "tháng này"; the row menu offers the profile and the heatmap';
});

await step('Sắp hết dự án tab and "Chỉ người chưa có phân bổ tiếp theo"', async () => {
  await page.getByRole('tab', { name: /^Sắp hết dự án/ }).click();
  await page.waitForURL(/tab=ending/);
  if (page.url().includes('granularity') || page.url().includes('view=')) throw new Error(`the Bench view stayed in the URL: ${page.url()}`);
  const list = page.getByRole('table', { name: 'Danh sách phân bổ sắp kết thúc' });
  const empty = page.getByText('Chưa có phân bổ nào sắp kết thúc');
  await list.or(empty).first().waitFor();
  await page.getByText(/người có phân bổ kết thúc trong \d+ tuần tới/).or(empty).first().waitFor();
  // The native input is visually hidden; the label is what a person clicks.
  await page.getByText('Chỉ người chưa có phân bổ tiếp theo').click();
  await page.waitForURL(/nonext=1/);
  await page.waitForFunction(() => document.querySelector('input[type="checkbox"]')?.checked === true);
  // The previous rows stay on screen until the filtered answer arrives, so wait for every row to say "no next".
  await page.waitForFunction(() => {
    if (document.body.innerText.includes('Mọi người sắp hết dự án đều đã có phân bổ tiếp theo')) return true;
    const table = [...document.querySelectorAll('table')].find((t) => t.querySelector('caption')?.textContent === 'Danh sách phân bổ sắp kết thúc');
    const rows = table ? [...table.querySelectorAll('tbody tr')] : [];
    if (rows.length === 0) return document.body.innerText.includes('Chưa có phân bổ nào sắp kết thúc');
    return rows.every((row) => row.textContent.includes('Chưa có phân bổ tiếp theo'));
  }, undefined, { timeout: 15_000 });
  return 'GET /api/resources/ending; the filter keeps only the people who need a new project';
});

const thresholdsButton = () => page.getByRole('button', { name: 'Ngưỡng nguồn lực' });
const thresholdsDialog = () => page.getByRole('dialog', { name: 'Ngưỡng nguồn lực' });
const thresholdField = (name) => thresholdsDialog().getByRole('textbox', { name: new RegExp(`^${name}`) });
// The fields show the thresholds in force once they are loaded; wait for a value before typing over it.
const openThresholds = async () => {
  await thresholdsButton().click();
  await thresholdsDialog().waitFor();
  await page.waitForFunction(() => document.querySelector('[role="dialog"] input')?.value !== '');
};

await step('Ngưỡng nguồn lực: errors under the fields, the dialog stays open', async () => {
  await page.goto(`${BASE}/resources?tab=heatmap`);
  await personRow('Cao Minh Trí').waitFor();
  await openThresholds();
  await thresholdField('Ngưỡng Bench').fill('95');
  await thresholdField('Sắp hết dự án').fill('13');
  await thresholdsDialog().getByRole('button', { name: 'Lưu ngưỡng' }).click();
  await thresholdsDialog().getByText(/^Ngưỡng Bench phải nhỏ hơn mức gần đầy/).waitFor();
  await thresholdsDialog().getByText('Nhập số tuần từ 1 đến 12.').waitFor();
  return 'bench 95% is not below near-full, 13 weeks is out of range: both messages show, nothing is saved';
});

await step('Ngưỡng nguồn lực: saving changes the legend and the Bench tab for everyone', async () => {
  await thresholdField('Ngưỡng Bench').fill('30');
  await thresholdField('Sắp hết dự án').fill('6');
  await thresholdsDialog().getByText('Dưới 30%: Bench').waitFor();
  await thresholdsDialog().getByRole('button', { name: 'Lưu ngưỡng' }).click();
  await page.getByText('Đã lưu ngưỡng nguồn lực').waitFor();
  await thresholdsDialog().waitFor({ state: 'detached' });
  await page.getByRole('list', { name: 'Chú giải Tải phân bổ' }).getByText('Dưới 30%: Bench').waitFor();
  await page.getByRole('tab', { name: /^Bench/ }).click();
  await page.waitForURL(/tab=bench/);
  await page.getByText(/Tải phân bổ dưới 30% tuần này/).or(page.getByText('Không ai ở bench')).first().waitFor();
  await openThresholds();
  await thresholdsDialog().getByText(/^Sửa lần cuối bởi /).waitFor();
  return 'PUT /api/resource-settings; the legend says "Dưới 30%: Bench", the Bench summary follows, the dialog names who saved';
});

await step('Ngưỡng nguồn lực: "Khôi phục mặc định" puts the defaults back', async () => {
  await thresholdsDialog().getByRole('button', { name: 'Khôi phục mặc định' }).click();
  for (const [name, value] of [['Ngưỡng Bench', '50'], ['Mức gần đầy', '90'], ['Sắp hết dự án', '4']]) {
    const found = await thresholdField(name).inputValue();
    if (found !== value) throw new Error(`${name}: expected ${value}, found ${found}`);
  }
  await thresholdsDialog().getByRole('button', { name: 'Lưu ngưỡng' }).click();
  await thresholdsDialog().waitFor({ state: 'detached' });
  await page.getByRole('tab', { name: 'Heatmap' }).click();
  await page.waitForURL(/tab=heatmap/);
  await page.getByRole('list', { name: 'Chú giải Tải phân bổ' }).getByText('Dưới 50%: Bench').waitFor();
  return 'the thresholds are 50% / 90% / 4 weeks again (the flow leaves the defaults in place)';
});

await step('Hồ sơ nhân viên: the Dự án tab with the 12-week strip and the project history', async () => {
  await page.goto(`${BASE}/resources?tab=heatmap&q=tri`);
  await personRow('Cao Minh Trí').waitFor();
  await personRow('Cao Minh Trí').getByRole('link').first().click();
  await page.waitForURL(/\/employees\/[0-9a-f-]{36}/);
  const tab = page.getByRole('tab', { name: 'Dự án' });
  await tab.click();
  await page.waitForURL(/tab=projects/);
  const strip = page.getByRole('list', { name: 'Tải phân bổ theo tuần' });
  await strip.waitFor();
  const cells = await strip.getByRole('listitem').count();
  if (cells !== 12) throw new Error(`expected 12 weeks in the strip, found ${cells}`);
  await page.getByRole('alert').filter({ hasText: /Quá tải 120% từ/ }).getByText(/DA-0\d+ 60% \+ DA-0\d+ 60%/).waitFor();
  const history = page.getByRole('table', { name: 'Lịch sử tham gia dự án của Cao Minh Trí' });
  await history.waitFor();
  // The overload starts in a later week, so one of the two projects may not have started yet ("Bắt đầu dd/mm").
  for (const code of ['DA-029', 'DA-031']) {
    const row = history.getByRole('row').filter({ hasText: code });
    await row.first().waitFor();
    await row.first().getByText(/^(Đang tham gia|Bắt đầu \d{2}\/\d{2})$/).waitFor();
  }
  return 'GET /api/employees/{id}/projects; 12 weeks with the 120% overload and the two projects that add up, the history lists both, each running or starting';
});

await step('Hồ sơ nhân viên: "Xem trên heatmap" goes back to the person on the heatmap', async () => {
  await page.getByRole('link', { name: 'Xem trên heatmap' }).click();
  await page.waitForURL(/\/resources\?.*tab=heatmap/);
  await personRow('Cao Minh Trí').waitFor();
  return 'the link opens the heatmap searched for the person\'s code';
});

await step('390: 3 week columns and the filter dialog', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/resources?tab=heatmap`);
  await personRow('Cao Minh Trí').waitFor();
  const columns = await columnCount();
  if (columns !== 3) throw new Error(`expected 3 week columns at 390, found ${columns}`);
  await page.getByRole('group', { name: 'Kiểu xem' }).waitFor();
  await page.getByRole('button', { name: /^Lọc/ }).click();
  await page.getByRole('dialog', { name: 'Lọc heatmap' }).waitFor();
  return '3 week columns; the "Lọc" button opens the filter dialog';
});

await step('390: the drawer is a full-screen sheet', async () => {
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: 'Lọc heatmap' }).waitFor({ state: 'detached' });
  const cell = personRow('Cao Minh Trí').locator('button:has([aria-label*="quá tải"])').first();
  await cell.scrollIntoViewIfNeeded();
  await cell.click();
  const panel = drawer(/Cao Minh Trí/);
  await panel.getByRole('alert').waitFor();
  const box = await panel.boundingBox();
  if (!box || Math.round(box.width) !== 390) throw new Error(`the sheet is ${box?.width}px wide at 390`);
  await panel.getByRole('button', { name: 'Đóng' }).click();
  await panel.waitFor({ state: 'detached' });
  return 'the drawer fills the 390 screen and closes with its button';
});

report.push('Result: passed.');
console.log('Result: passed.');
await finish(0);
