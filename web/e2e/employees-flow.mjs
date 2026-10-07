// Evidence for the employee list (HRM-06/FE-1) against the real stack: /employees as the Admin at 1280 and 390.
// The fictional Employees below are added through POST /api/employees when no Employee of that name exists yet
// (a re-run keeps them), on the units of the example company and the default positions. Then: the list with its
// columns and paging, search without accents, the unit filter with its child units, the position filter, the
// no-match state, a row opening the profile, and at 390 the compact rows and the filter dialog.
// Use a throwaway database (CI does), never the demo one.
// Writes screenshots and a Markdown report; exits non-zero at the first step that fails.
//   BASE_URL (http://localhost:5173)  OUT (e2e-out)  IMG_BASE (image URL prefix)  HRM_ADMIN_PASSWORD
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';

// [full name, unit code (null: directly under the company), position code, gender, status]. 24 people: more
// than one page of 20.
const PEOPLE = [
  ['Phạm Quốc Bảo', null, 'GD', 'MALE'],
  ['Nguyễn Văn Khoa', 'PTPM', 'TP', 'MALE'],
  ['Trần Thị Mai', 'HCNS', 'TP', 'FEMALE'],
  ['Hoàng Thị Thu', 'TCKT', 'TP', 'FEMALE'],
  ['Trần Quang Vinh', 'DVKH', 'TP', 'MALE'],
  ['Đặng Hoàng Nam', 'KD', 'TP', 'MALE'],
  ['Lê Văn Hùng', 'WEB', 'TN', 'MALE'],
  ['Đỗ Thị Thu Hằng', 'MOBILE', 'TN', 'FEMALE'],
  ['Hồ Sỹ Quang', 'CNDN', 'TP', 'MALE'],
  ['Vũ Đức Thắng', 'DEVOPS', 'TN', 'MALE'],
  ['Hoàng Gia Huy', 'DATA', 'TN', 'MALE'],
  ['Bùi Thị Ngọc Lan', 'QA', 'TN', 'FEMALE'],
  ['Vũ Thị Lan', 'PTPM', 'CV', 'FEMALE'],
  ['Ngô Thanh Sơn', 'TK', 'TN', 'MALE'],
  ['Trần Đức Hòa', 'PMDN', 'CV', 'MALE'],
  ['Phan Thị Mỹ Linh', 'HTKH', 'TN', 'FEMALE'],
  ['Trịnh Văn Phúc', 'KDGP', 'TN', 'MALE'],
  ['Võ Mạnh Cường', 'KDGP', 'CV', 'MALE'],
  ['Lương Văn Hiển', 'PMDN', 'TP', 'MALE'],
  ['Lý Thảo Vy', 'MKT', 'TN', 'FEMALE'],
  ['Nguyễn Văn An', 'WEB', 'NV', 'MALE'],
  ['Mạc Thị Quỳnh', 'WEB', 'NV', 'FEMALE', 'PROBATION'],
  ['Phan Khánh Duy', 'WEBDN', 'NV', 'MALE', 'PROBATION'],
  ['Phạm Thị Lan Anh', 'QA', 'NV', 'FEMALE', 'PROBATION'],
];

mkdirSync(OUT, { recursive: true });
const report = ['### Employee list (real backend, PostgreSQL)', ''];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(15_000);
let n = 0;
let token = '';

async function api(path, init = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!response.ok) {
    const error = new Error(`${init.method ?? 'GET'} ${path} → ${response.status} ${await response.text()}`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

// The app shell scrolls inside <main>, so a full-page screenshot needs a taller window for that moment.
async function capture(path) {
  const size = page.viewportSize();
  const extra = await page.evaluate(() => {
    const main = document.getElementById('main');
    return main ? main.scrollHeight - main.clientHeight : 0;
  }).catch(() => 0);
  if (extra > 0) {
    await page.setViewportSize({ width: size.width, height: size.height + extra });
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path, fullPage: true });
  if (extra > 0) await page.setViewportSize(size);
}

async function finish(code) {
  writeFileSync(`${OUT}/report-employees.md`, report.join('\n'));
  await browser.close();
  process.exit(code);
}

async function step(title, run) {
  n += 1;
  const file = `employees-${String(n).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
  try {
    const note = await run();
    await page.waitForTimeout(300);
    await capture(`${OUT}/${file}`);
    report.push(`**${n}. ${title}**${note ? `: ${note}` : ''}`, '', `![${title}](${IMG_BASE}/${file}?raw=true)`, '');
    console.log(`ok ${n}. ${title}`);
  } catch (error) {
    await page.screenshot({ path: `${OUT}/${file}`, fullPage: true }).catch(() => {});
    report.push(`**${n}. ${title}: FAILED**`, '', '```', String(error).slice(0, 1500), '```', '', `![${title}](${IMG_BASE}/${file}?raw=true)`, '', 'Result: FAILED.');
    console.error(`FAILED ${n}. ${title}\n${error}`);
    await finish(1);
  }
}

// --- Data through the API: the Employees above, each with a CCCD of its own (12 digits, unique per company). ---
let added = 0;
try {
  token = (await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })).accessToken;
  const units = new Map((await api('/api/org-units')).units.map((unit) => [unit.code, unit.id]));
  const positions = new Map((await api('/api/catalogs/positions/items?page=0&size=200')).items.map((item) => [item.code, item.id]));
  for (const code of ['WEB', 'PTPM']) if (!units.has(code)) throw new Error(`the example unit ${code} is missing: run against the compose stack with HRM_EXAMPLE_DATA on`);
  for (const [index, [fullName, unit, position, gender, status = 'OFFICIAL']] of PEOPLE.entries()) {
    const found = await api(`/api/employees?q=${encodeURIComponent(fullName)}&size=20`);
    if (found.items.some((each) => each.fullName === fullName)) continue;
    const number = index + 1;
    const body = {
      fullName,
      personal: { dateOfBirth: `${1980 + (number % 15)}-0${1 + (number % 9)}-1${number % 10}`, gender },
      identity: { idNumber: `0791900${String(number).padStart(5, '0')}` },
      job: { orgUnitId: unit ? (units.get(unit) ?? null) : null, positionId: positions.get(position), managerId: null, hireDate: `20${18 + (number % 8)}-0${1 + (number % 9)}-0${1 + (number % 9)}`, status },
    };
    try {
      await api('/api/employees', { method: 'POST', body });
      added += 1;
    } catch (error) {
      // The CCCD is taken: someone of another name holds it from an earlier run.
      if (error.status !== 409) throw error;
    }
  }
} catch (error) {
  report.push('**Preparing data through the API: FAILED**', '', '```', String(error).slice(0, 1500), '```', '', 'Result: FAILED.');
  console.error(`FAILED preparing data\n${error}`);
  await finish(1);
}

const table = () => page.getByRole('table', { name: 'Danh sách nhân viên' });
const nameLinks = () => table().getByRole('link');
const summary = () => page.getByRole('navigation', { name: 'Phân trang' }).getByText(/^Hiển thị /);
const search = () => page.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã nhân viên' });
/** Every row of the table has `text` in its cell number `column` (0-based). */
/** Every row has `text` in column `column`. Retries for a while: the rows of the previous filter stay until the new ones arrive. */
async function everyRow(column, text) {
  let last = '';
  for (let tries = 0; tries < 50; tries += 1) {
    const cells = await table().locator('tbody tr').evaluateAll((rows, at) => rows.map((row) => row.cells[at]?.textContent ?? ''), column);
    const other = cells.find((cell) => !cell.includes(text));
    if (cells.length > 0 && other === undefined) return cells.length;
    last = cells.length === 0 ? 'the table has no row' : `a row has "${other}" where "${text}" was expected`;
    await page.waitForTimeout(200);
  }
  throw new Error(last);
}

await step('Admin: "Nhân viên" lists the current Employees by code, 20 a page', async () => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Nhân viên' }).click();
  await page.getByRole('heading', { level: 1, name: 'Nhân viên' }).waitFor();
  await table().getByRole('link', { name: 'Phạm Quốc Bảo' }).waitFor();
  const headers = await table().getByRole('columnheader').allTextContents();
  const expected = ['Nhân viên', 'Đơn vị', 'Chức danh', 'Quản lý trực tiếp', 'Ngày vào làm', 'Trạng thái'];
  if (headers.join('|') !== expected.join('|')) throw new Error(`the columns are [${headers.join(', ')}]`);
  const rows = await nameLinks().count();
  if (rows !== 20) throw new Error(`page 1 has ${rows} rows`);
  await page.getByRole('link', { name: 'Thêm nhân viên' }).waitFor();
  return `${added} Employee(s) added through the API for this run; ${await summary().textContent()}`;
});

await step('Paging: page 2', async () => {
  await page.getByRole('button', { name: 'Trang 2' }).click();
  await page.waitForURL(/[?&]page=2\b/);
  await summary().filter({ hasText: /^Hiển thị 21–/ }).waitFor();
  return await summary().textContent();
});

await step('Search without accents', async () => {
  await search().fill('tran thi mai');
  await page.waitForURL(/[?&]q=tran\+thi\+mai\b/);
  await table().getByRole('link', { name: 'Trần Thị Mai' }).waitFor();
  const names = await nameLinks().allTextContents();
  if (names.some((name) => name !== 'Trần Thị Mai')) throw new Error(`"tran thi mai" also finds ${names.join(', ')}`);
  return `"tran thi mai" finds ${names.length} row(s)`;
});

await step('Unit filter: Nhóm Web, chosen from the tree search, with its child units', async () => {
  await search().fill('');
  await page.waitForURL((url) => !url.searchParams.has('q'));
  await page.getByRole('button', { name: /^Đơn vị tổ chức: / }).click();
  const menu = page.getByRole('dialog', { name: 'Đơn vị tổ chức' });
  await menu.getByRole('searchbox', { name: 'Tìm đơn vị' }).fill('nhom web');
  await menu.getByRole('checkbox', { name: 'Gồm các đơn vị con' }).waitFor({ state: 'attached' });
  await page.waitForTimeout(200);
  await capture(`${OUT}/employees-${String(n).padStart(2, '0')}a-unit-menu.png`);
  await menu.getByRole('treeitem', { name: 'Nhóm Web', exact: true }).click();
  await page.waitForURL(/[?&]orgUnitId=/);
  await table().getByRole('link', { name: 'Lê Văn Hùng' }).waitFor();
  const rows = await everyRow(1, 'Nhóm Web');
  report.push(`![The unit menu](${IMG_BASE}/employees-${String(n).padStart(2, '0')}a-unit-menu.png?raw=true)`, '');
  return `${rows} row(s), all in Nhóm Web`;
});

await step('Position filter: Trưởng nhóm, then "Xóa bộ lọc"', async () => {
  await page.getByRole('combobox', { name: 'Chức danh' }).click();
  await page.getByRole('option', { name: 'Trưởng nhóm', exact: true }).click();
  await page.waitForURL(/[?&]positionId=/);
  await table().getByRole('link', { name: 'Lê Văn Hùng' }).waitFor();
  const rows = await everyRow(2, 'Trưởng nhóm');
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click();
  await page.waitForURL((url) => url.search === '');
  return `Nhóm Web and Trưởng nhóm: ${rows} row(s); cleared afterwards`;
});

await step('Position filter alone: Trưởng nhóm across the company', async () => {
  await page.getByRole('combobox', { name: 'Chức danh' }).click();
  await page.getByRole('option', { name: 'Trưởng nhóm', exact: true }).click();
  await page.waitForURL(/[?&]positionId=/);
  await table().getByRole('link', { name: 'Hoàng Gia Huy' }).waitFor();
  return `${await everyRow(2, 'Trưởng nhóm')} row(s)`;
});

await step('No match: the state names the search and offers "Xóa bộ lọc"', async () => {
  await search().fill('khong co ai');
  await page.getByRole('heading', { name: 'Không có nhân viên nào khớp “khong co ai”' }).waitFor();
  await page.getByText(/^Đang lọc: Trưởng nhóm · Thử việc và chính thức\./).waitFor();
});

await step('A row opens the profile (placeholder until HRM-06/FE-3)', async () => {
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).last().click();
  await table().getByRole('link', { name: 'Trần Thị Mai' }).waitFor();
  await table().getByRole('row').filter({ has: page.getByRole('link', { name: 'Trần Thị Mai' }) }).getByRole('cell').nth(4).click();
  await page.waitForURL(/\/employees\/[0-9a-f-]{36}$/);
  await page.getByRole('heading', { level: 1, name: 'Hồ sơ nhân viên' }).waitFor();
});

await step('390: compact rows', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/employees`);
  await page.getByRole('list', { name: 'Danh sách nhân viên' }).getByRole('link', { name: 'Phạm Quốc Bảo' }).waitFor();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (wide) throw new Error('the page scrolls sideways at 390');
});

await step('390: the filter dialog, newest hires first', async () => {
  await page.getByRole('button', { name: /^Lọc/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Lọc nhân viên' });
  await dialog.getByRole('combobox', { name: 'Sắp xếp' }).click();
  await page.getByRole('option', { name: 'Mới vào làm trước' }).click();
  await page.waitForURL(/[?&]sort=newest\b/);
  await dialog.getByRole('button', { name: /^Xem \d+ nhân viên$/ }).waitFor();
});

report.push('Result: passed.');
await finish(0);
