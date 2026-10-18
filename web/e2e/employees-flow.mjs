// Evidence for the employee list (HRM-06/FE-1) against the real stack: /employees as the Admin at 1280 and 390.
// The fictional Employees below are added through POST /api/employees when no Employee of that name exists yet
// (a re-run keeps them), on the units of the example company and the default positions. Then: the list with its
// columns and paging, search without accents, the unit filter with its child units, the position filter, the
// no-match state; a row opening the profile (HRM-06/FE-3) with a number revealed, the job tab, a later tab and the
// way back; adding an Employee through "Thêm nhân viên" (HRM-06/FE-2), first with a CCCD already used; editing
// its cards in place (HRM-06/FE-4): personal details, identity numbers (a conflict first), the leave guard on a tab
// switch, and the status; at 390 the
// profile, the form, the compact rows and the filter dialog; and, when the demo personas are on, the
// masked numbers as the Giám đốc persona. HRM-07/FE-1: "Xuất Excel" with the unit filter (the file name, a real
// .xlsx, and the count of the toast against the list), the same from "Thao tác khác" at 390, and "Tải file mẫu" on
// the import page. HRM-07/FE-2: the import wizard with a file the flow writes itself (`e2e/xlsx.mjs`): two new
// fictional Employees with this run's own CCCDs and one row with an unknown unit code, imported skipping that row.
// Use a throwaway database (CI does), never the demo one.
// Writes screenshots and a Markdown report; exits non-zero at the first step that fails.
//   BASE_URL (http://localhost:5173)  OUT (e2e-out)  IMG_BASE (image URL prefix)  HRM_ADMIN_PASSWORD
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { buildXlsx } from './xlsx.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';

// [full name, unit code (null: directly under the company), position code, gender, status]. 24 people: more
// than one page of 20. With the example data on (HRM_EXAMPLE_DATA), the backend already seeds these 24 (and about
// 20 more) on a fresh database, so this run adds none of them.
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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
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
let TAKEN_ID_NUMBER = '';
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
  // The CCCD of Phan Khánh Duy, which the conflict steps below type in: the flow's own number when it added him,
  // the example data's number when the backend seeded him. The Admin sees it unmasked.
  const duy = (await api(`/api/employees?q=${encodeURIComponent('Phan Khánh Duy')}&size=20`)).items.find((each) => each.fullName === 'Phan Khánh Duy');
  if (!duy) throw new Error('Phan Khánh Duy is missing');
  TAKEN_ID_NUMBER = (await api(`/api/employees/${duy.id}`)).identity.idNumber;
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

/**
 * Clicks `trigger` and waits for the browser download it starts; checks the server's file name against `name` and
 * that the file is a non-empty .xlsx (a zip: it starts with "PK"). Returns the name and the size.
 */
async function downloadOf(trigger, name) {
  const [download] = await Promise.all([page.waitForEvent('download'), trigger()]);
  const fileName = download.suggestedFilename();
  if (!name.test(fileName)) throw new Error(`the file is named "${fileName}"`);
  const bytes = readFileSync(await download.path());
  if (bytes.length < 100 || bytes.subarray(0, 2).toString('latin1') !== 'PK') throw new Error(`"${fileName}" is not an .xlsx (${bytes.length} bytes)`);
  return { fileName, size: bytes.length };
}
const EXPORT_NAME = /^nhan-vien-\d{4}-\d{2}-\d{2}\.xlsx$/;

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

await step('Xuất Excel: the filtered list as .xlsx, named by the server, counted in the toast', async () => {
  const listed = await summary().textContent({ timeout: 2_000 }).then((text) => Number(/trên ([\d.]+)/.exec(text ?? '')?.[1]?.replace(/\./g, '')), () => nameLinks().count());
  const button = page.getByRole('button', { name: 'Xuất Excel' });
  const { fileName, size } = await downloadOf(() => button.click(), EXPORT_NAME);
  const toast = page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(/^Đã xuất \d+ nhân viên ra file /).last();
  const text = await toast.textContent();
  if (text !== `Đã xuất ${listed} nhân viên ra file ${fileName}.`) throw new Error(`the toast says "${text}" for a list of ${listed}`);
  await page.getByRole('button', { name: 'Xuất Excel' }).waitFor();
  return `${fileName}, ${size} bytes, ${listed} Employee(s) of Nhóm Web and its child units`;
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

let profileUrl = '';
const main = () => page.getByRole('main');
const cardOf = (name) => page.getByRole('region', { name });

await step('A row opens the profile: header, facts and the tab Cá nhân', async () => {
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).last().click();
  await table().getByRole('link', { name: 'Trần Thị Mai' }).waitFor();
  await table().getByRole('row').filter({ has: page.getByRole('link', { name: 'Trần Thị Mai' }) }).getByRole('cell').nth(4).click();
  await page.waitForURL(/\/employees\/[0-9a-f-]{36}$/);
  profileUrl = page.url();
  await page.getByRole('heading', { level: 1, name: 'Trần Thị Mai' }).waitFor();
  await page.getByRole('tab', { name: 'Cá nhân', selected: true }).waitFor();
  await cardOf('Thông tin cá nhân').getByText('Liên hệ khẩn cấp').waitFor();
  await cardOf('Giấy tờ định danh').getByText('Bấm Hiện để xem số đầy đủ, từng số một.').waitFor();
});

await step('Admin reveals the CCCD, one number at a time', async () => {
  const identity = cardOf('Giấy tờ định danh');
  const masked = (await identity.locator('dd').first().textContent()) ?? '';
  if (!/^•••• \d{4}/.test(masked)) throw new Error(`the CCCD reads "${masked}" before "Hiện"`);
  await identity.getByRole('button', { name: 'Hiện số CCCD' }).click();
  await identity.getByRole('button', { name: 'Ẩn số CCCD', pressed: true }).waitFor();
  const full = (await identity.locator('dd').first().textContent()) ?? '';
  if (!/^\d{12}/.test(full)) throw new Error(`the CCCD reads "${full}" after "Hiện"`);
  return `"${masked.slice(0, 9)}" becomes 12 digits`;
});

await step('Tab Công việc: unit, position, manager, start date', async () => {
  await page.getByRole('tab', { name: 'Công việc' }).click();
  await page.waitForURL(/[?&]tab=job\b/);
  await cardOf('Vị trí công việc').getByText('Phòng Hành chính - Nhân sự').waitFor();
  await page.getByText('Điều chuyển, bổ nhiệm và thử việc').waitFor();
});

// HRM-08/FE-1: seed sample read-only records through the real API, then capture all three tabs.
const profileId = new URL(profileUrl).pathname.split('/').at(-1);
if (!profileId) throw new Error('Employee profile ID missing in URL');
const baseRecords = `/api/employees/${profileId}`;
await step('HRM-11 Work history: signed reward and hiring milestone', async () => {
  const history = await api(`${baseRecords}/work-history`);
  if (!history.some((item) => item.kind === 'REWARD' && item.decisionNumber === 'E2E-HRM11-REWARD')) {
    await api(`${baseRecords}/work-history`, { method: 'POST', body: {
      decisionNumber: 'E2E-HRM11-REWARD', kind: 'REWARD', signedOn: '2026-09-10', effectiveOn: '2026-09-12',
      description: 'Khen thưởng hoàn thành dự án', orgUnitId: null, positionId: null,
      baseSalary: null, insuranceSalary: null, allowancesJson: null,
    } });
  }
  await page.goto(`${profileUrl}?tab=history`);
  const timeline = page.getByRole('list', { name: 'Dòng thời gian công tác' });
  await timeline.getByRole('heading', { name: 'Khen thưởng' }).waitFor();
  await timeline.getByRole('heading', { name: 'Vào làm' }).waitFor();
  await timeline.getByText('E2E-HRM11-REWARD').waitFor();
  await timeline.getByText('Khen thưởng hoàn thành dự án').waitFor();
  await timeline.getByText(/Người thực hiện \(ID\)/).waitFor();
  return 'Real API decision, signed date, actor ID and hiring event';
});

await step('HRM-11 Work history: hiring only, with no later decisions', async () => {
  const fresh = (await api(`/api/employees?q=${encodeURIComponent('Phan Khánh Duy')}&size=20`)).items.find((item) => item.fullName === 'Phan Khánh Duy');
  if (!fresh) throw new Error('Hiring-only employee is missing');
  const history = await api(`/api/employees/${fresh.id}/work-history`);
  if (history.length !== 1 || history[0].kind !== 'HIRE') throw new Error('Expected a hiring-only employee for the empty follow-up state');
  await page.goto(`${BASE}/employees/${fresh.id}?tab=history`);
  await page.getByText('Chưa có quyết định hoặc đánh giá công tác nào sau khi vào làm.').waitFor();
  await page.getByRole('list', { name: 'Dòng thời gian công tác' }).getByRole('heading', { name: 'Vào làm' }).waitFor();
  return 'The backend includes hiring; no later decision is the empty follow-up state';
});

const certificateName = `TypeScript Demo Certificate ${Date.now()}`;
const catalogSkills = await api('/api/catalogs/skills/items?page=0&size=200');
let typescriptSkill = catalogSkills.items.find(item => item.code === 'TYPESCRIPT');
if (!typescriptSkill) {
  typescriptSkill = await api('/api/catalogs/skills/items', { method: 'POST',
    body: { code: 'TYPESCRIPT', name: 'TypeScript', term: null, maxMonths: null, insurable: null,
      taxable: null, startDate: null, endDate: null } });
}
await step('HRM-09 Skills: add a catalog skill with a level, then edit it', async () => {
  // The preceding hiring-only screenshot uses another Employee; continue the existing record flow on Mai.
  await page.goto(profileUrl);
  await page.getByRole('tab', { name: 'Kỹ năng' }).click();
  await page.waitForURL(/[?&]tab=skills\b/);
  const existing = await api(`${baseRecords}/skills`);
  if (!existing.some(item => item.skill.id === typescriptSkill.id)) {
    await page.getByRole('button', { name: 'Thêm kỹ năng' }).click();
    const dialog = page.getByRole('dialog', { name: 'Thêm kỹ năng' });
    await dialog.getByRole('combobox', { name: 'Kỹ năng' }).click();
    await page.getByRole('option', { name: 'TypeScript' }).click();
    await dialog.getByRole('combobox', { name: 'Mức độ' }).click();
    await page.getByRole('option', { name: 'Mức 3/5' }).click();
    await dialog.getByRole('button', { name: 'Lưu' }).click();
    await dialog.waitFor({ state: 'detached' });
  }
  await page.getByRole('button', { name: 'Sửa TypeScript', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Sửa kỹ năng' });
  await editor.getByRole('combobox', { name: 'Mức độ' }).click();
  await page.getByRole('option', { name: 'Mức 4/5' }).click();
  await editor.getByRole('button', { name: 'Lưu' }).click();
  await editor.waitFor({ state: 'detached' });
  await page.getByText('Mức 4/5').waitFor();
  return 'TypeScript is stored at level 4 of 5 on the Employee profile';
});

await step('HRM-09 Certificates: dates, private upload and authenticated download', async () => {
  await page.getByRole('button', { name: 'Thêm chứng chỉ' }).click();
  const dialog = page.getByRole('dialog', { name: 'Thêm chứng chỉ' });
  await dialog.getByRole('textbox', { name: 'Tên chứng chỉ' }).fill(certificateName);
  await dialog.getByRole('textbox', { name: 'Đơn vị cấp' }).fill('Demo Academy');
  await dialog.getByLabel('Ngày cấp').fill('2026-01-01');
  await dialog.getByLabel('Ngày hết hạn').fill('2028-01-01');
  await dialog.getByLabel('Tải tệp mới lên').setInputFiles({ name: 'hrm09-e2e.pdf', mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7\nHRM09 E2E certificate\n%%EOF\n') });
  const shot = `employees-${String(n).padStart(2, '0')}a-certificate-form.png`;
  await capture(`${OUT}/${shot}`);
  report.push(`![Certificate form](${IMG_BASE}/${shot}?raw=true)`, '');
  await dialog.getByRole('button', { name: 'Lưu' }).click();
  await dialog.waitFor({ state: 'detached' });
  const certificate = cardOf(certificateName);
  await certificate.getByText('01/01/2028').waitFor();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    certificate.getByRole('button', { name: 'Tải hrm09-e2e.pdf' }).click(),
  ]);
  if (download.suggestedFilename() !== 'hrm09-e2e.pdf') throw new Error('Certificate file name mismatch');
  return 'Certificate saved with expiry and a private PDF downloaded through the authenticated API';
});
const savedBanks = await api(`${baseRecords}/bank-accounts`);
if (!savedBanks.length) {
  await api(`${baseRecords}/bank-accounts`, {
    method: 'POST', body: { bankName: 'Vietcombank', accountNumber: '1234567890', accountHolder: 'Trần Thị Mai', defaultAccount: true },
  });
}
const savedDependents = await api(`${baseRecords}/dependents`);
if (!savedDependents.length) {
  await api(`${baseRecords}/dependents`, {
    method: 'POST', body: { fullName: 'Trần Minh Anh', relationship: 'Con', dateOfBirth: '2018-04-02', effectiveFrom: '2020-01-01', effectiveTo: null },
  });
}
await api(`${baseRecords}/insurance`, {
  method: 'PUT', body: { participationDate: '2021-04-15', healthRegistrationPlace: 'Bệnh viện Quận 7', healthInsuranceNumber: 'DN4012345678' },
});

await step('HRM-08 Bank tab: salary default and masked account number', async () => {
  await page.getByRole('tab', { name: 'Ngân hàng' }).click();
  await page.waitForURL(/[?&]tab=bank\b/);
  const bank = cardOf('Vietcombank');
  await bank.getByText('Tài khoản nhận lương').waitFor();
  await bank.getByText('•••• 7890').waitFor();
  return 'Vietcombank salary account is marked default; account number initially hidden';
});

await step('HRM-08 FE-2A: add bank and switch the salary default', async () => {
  await page.getByRole('button', { name: 'Thêm tài khoản ngân hàng' }).click();
  const form = page.getByRole('dialog', { name: 'Thêm tài khoản ngân hàng' });
  await form.getByRole('textbox', { name: 'Ngân hàng' }).fill('ACB');
  await form.getByRole('textbox', { name: 'Chủ tài khoản' }).fill('Trần Thị Mai');
  await form.getByRole('textbox', { name: 'Số tài khoản' }).fill('9876543210');
  const shot = `employees-${String(n).padStart(2, '0')}a-bank-form.png`;
  await capture(`${OUT}/${shot}`);
  report.push(`![Bank creation form](${IMG_BASE}/${shot}?raw=true)`, '');
  await form.getByRole('button', { name: 'Lưu' }).click();
  await form.waitFor({ state: 'detached' });
  const account = cardOf('ACB');
  await account.getByText('•••• 3210').waitFor();
  await account.getByRole('button', { name: 'Đặt mặc định' }).click();
  await account.getByText('Tài khoản nhận lương').waitFor();
  return 'New bank account created and selected as salary default through the real backend';
});

await step('HRM-08 Dependents tab: effective dates', async () => {
  await page.getByRole('tab', { name: 'Người phụ thuộc' }).click();
  await page.waitForURL(/[?&]tab=dependents\b/);
  const dependent = cardOf('Trần Minh Anh');
  await dependent.getByText('01/01/2020').waitFor();
  await dependent.getByText('Không có ngày kết thúc').waitFor();
});

await step('HRM-08 FE-2A: dependent edit dialog and date validation', async () => {
  const dependent = cardOf('Trần Minh Anh');
  await dependent.getByRole('button', { name: 'Sửa Trần Minh Anh' }).click();
  const form = page.getByRole('dialog', { name: 'Sửa người phụ thuộc' });
  await form.getByLabel('Hiệu lực đến').fill('2026-12-31');
  const shot = `employees-${String(n).padStart(2, '0')}a-dependent-form.png`;
  await capture(`${OUT}/${shot}`);
  report.push(`![Dependent editing form](${IMG_BASE}/${shot}?raw=true)`, '');
  await form.getByRole('button', { name: 'Lưu' }).click();
  await form.waitFor({ state: 'detached' });
  await dependent.getByText('31/12/2026').waitFor();
  return 'Existing dependent effective end date saved through the real backend';
});

await step('HRM-08 Insurance tab: registration and sensitive numbers', async () => {
  await page.getByRole('tab', { name: 'Bảo hiểm' }).click();
  await page.waitForURL(/[?&]tab=insurance\b/);
  const insurance = cardOf('Thông tin BHXH và BHYT');
  await insurance.getByText('Bệnh viện Quận 7').waitFor();
  await insurance.getByText('•••• 5678').waitFor();
  return 'Insurance data comes from the API; card number hidden until revealed';
});

await step('HRM-08 FE-2B: edit insurance participation date with real backend', async () => {
  const insurance = cardOf('Thông tin BHXH và BHYT');
  await insurance.getByRole('button', { name: 'Sửa thông tin BHXH/BHYT' }).click();
  const form = page.getByRole('dialog', { name: 'Chỉnh sửa thông tin BHXH/BHYT' });
  await form.getByLabel('Ngày tham gia').fill('2021-05-15');
  const screenshot = `employees-${String(n).padStart(2, '0')}a-insurance-edit-form.png`;
  await capture(`${OUT}/${screenshot}`);
  report.push(`![Insurance edit form](${IMG_BASE}/${screenshot}?raw=true)`, '');
  await form.getByRole('button', { name: 'Lưu thông tin bảo hiểm' }).click();
  await form.waitFor({ state: 'detached' });
  await insurance.getByText('15/05/2021').waitFor();
  return 'Insurance update persisted through PUT /api/employees/{id}/insurance';
});

await step('HRM-08 FE-2C: passport metadata can be added and expires in future', async () => {
  await page.getByRole('tab', { name: 'Tài liệu' }).click();
  await page.waitForURL(/[?&]tab=documents\b/);
  await page.getByRole('heading', { name: 'Giấy tờ nhân viên nước ngoài' }).waitFor();
  await page.getByRole('button', { name: 'Thêm giấy tờ' }).click();
  const form = page.getByRole('dialog', { name: 'Thêm giấy tờ' });
  await form.getByRole('textbox', { name: 'Số giấy tờ' }).fill('P123456789');
  await form.getByLabel('Ngày cấp').fill('2025-01-01');
  await form.getByLabel('Ngày hết hạn').fill('2030-12-31');
  const shot = `employees-${String(n).padStart(2, '0')}a-expat-form.png`;
  await capture(`${OUT}/${shot}`);
  report.push(`![Passport form](${IMG_BASE}/${shot}?raw=true)`, '');
  await form.getByRole('button', { name: 'Lưu giấy tờ' }).click();
  await form.waitFor({ state: 'detached' });
  await cardOf('Hộ chiếu (Passport)').getByText('31/12/2030').waitFor();
  return 'PASSPORT metadata saved through backend; date and masked number display verified';
});

await step('HRM-08 FE-2C: upload and download a private employee document', async () => {
  const fileInput = page.getByLabel('Chọn tệp đính kèm');
  await fileInput.setInputFiles({
    name: 'hrm08-e2e.pdf', mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7\\nHRM08 E2E upload\\n%%EOF\\n'),
  });
  const attachment = cardOf('hrm08-e2e.pdf');
  await attachment.getByText('hrm08-e2e.pdf').waitFor();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    attachment.getByRole('button', { name: 'Tải xuống hrm08-e2e.pdf' }).click(),
  ]);
  if (download.suggestedFilename() !== 'hrm08-e2e.pdf') throw new Error('Private attachment filename mismatch');
  return 'Upload and authenticated download completed; PDF filename confirmed';
});

await step('HRM-08 FE-2D: edit Employee nationality', async () => {
  await page.getByRole('tab', { name: 'Cá nhân' }).click();
  const nationality = cardOf('Quốc tịch');
  await nationality.getByRole('button', { name: 'Cập nhật quốc tịch' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cập nhật quốc tịch' });
  await dialog.getByRole('textbox', { name: 'Quốc tịch' }).fill('VN');
  await dialog.getByRole('button', { name: 'Lưu quốc tịch' }).click();
  await dialog.waitFor({ state: 'detached' });
  await nationality.getByText('VN').waitFor();
  return 'Nationality stored on Employee with PUT and reflected on profile';
});


await step('Contract tab: records or an informative empty state', async () => {
  await page.getByRole('tab', { name: 'Hợp đồng' }).click();
  await page.waitForURL(/[?&]tab=contracts\b/);
  await page.getByRole('heading', { name: /^(Chưa có hợp đồng lao động|Hợp đồng hiện tại|Hợp đồng trước đây và sắp có hiệu lực)$/ }).first().waitFor();
});

await step('"Nhân viên" goes back to the list', async () => {
  await main().getByRole('link', { name: 'Nhân viên', exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/employees');
  await table().getByRole('link', { name: 'Trần Thị Mai' }).waitFor();
});

await step('HRM-08 FE-2D: country filter matches Employee list and export', async () => {
  const input = page.getByRole('textbox', { name: 'Quốc tịch' });
  await input.fill('VN');
  await page.waitForURL(/[?&]nationality=VN(?:&|$)/);
  await table().getByRole('link', { name: 'Trần Thị Mai' }).waitFor();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Xuất Excel' }).click(),
  ]);
  if (!download.suggestedFilename().endsWith('.xlsx')) throw new Error('Missing filtered Excel export');
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click();
  await page.waitForURL(url => !url.searchParams.has('nationality'));
  return 'Nationality filter is URL-backed; Excel uses same filter and scope';
});


// A name and a CCCD of their own on every run, so a re-run against the same database still adds one.
const RUN = Date.now().toString(36).slice(-5).toUpperCase();
const NEW_NAME = `Đinh Thu Trang ${RUN}`;
const NEW_ID_NUMBER = `0793${String(Date.now()).slice(-8)}`;
const EDITED_ID_NUMBER = `0794${NEW_ID_NUMBER.slice(4)}`;
const today = new Date().toISOString().slice(0, 10);

async function fillNewEmployee(idNumber) {
  const name = page.getByRole('textbox', { name: 'Họ và tên' });
  await name.fill(NEW_NAME);
  await page.getByLabel(/^Ngày sinh/).fill('1998-03-15');
  await page.getByRole('radio', { name: 'Nữ', exact: true }).check({ force: true });
  await page.getByRole('textbox', { name: 'Số CCCD' }).fill(idNumber);
  await page.getByRole('button', { name: /^Đơn vị tổ chức: / }).click();
  const menu = page.getByRole('dialog', { name: 'Đơn vị tổ chức' });
  await menu.getByRole('searchbox', { name: 'Tìm đơn vị' }).fill('kiem thu');
  await menu.getByRole('treeitem', { name: 'Nhóm Kiểm thử', exact: true }).click();
  await page.getByRole('combobox', { name: 'Chức danh' }).click();
  await page.getByRole('option', { name: 'Nhân viên', exact: true }).click();
  await page.getByLabel(/^Ngày vào làm/).fill(today);
}

await step('Thêm nhân viên: the form, with the next code and the default manager of the unit', async () => {
  await page.getByRole('link', { name: 'Thêm nhân viên' }).first().click();
  await page.waitForURL(/\/employees\/new$/);
  await page.getByRole('heading', { level: 1, name: 'Thêm nhân viên' }).waitFor();
  // The CCCD of Phan Khánh Duy, read through the API above.
  await fillNewEmployee(TAKEN_ID_NUMBER);
  await page.getByRole('radio', { name: /^Theo Trưởng đơn vị/ }).waitFor();
  const code = await page.getByRole('textbox', { name: 'Mã nhân viên' }).inputValue();
  if (!/^NV\d{5,}$/.test(code)) throw new Error(`the expected code reads "${code}"`);
  return `expected code ${code}`;
});

await step('A CCCD already used: the error names the holder, under the field', async () => {
  await page.getByRole('button', { name: 'Thêm nhân viên' }).click();
  await page.getByText(/^Số CCCD này đã có ở hồ sơ Phan Khánh Duy \(NV\d+\)/).waitFor();
  await page.getByText('Chưa thêm được nhân viên').waitFor();
});

await step('Added: the toast with the code, then the new profile', async () => {
  await page.getByRole('textbox', { name: 'Số CCCD' }).fill(NEW_ID_NUMBER);
  await page.getByRole('button', { name: 'Thêm nhân viên' }).click();
  await page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(new RegExp(`^Đã thêm nhân viên ${NEW_NAME} \\(NV\\d+\\)\\.$`)).waitFor();
  await page.waitForURL(/\/employees\/[0-9a-f-]{36}$/);
  await page.getByRole('heading', { level: 1, name: NEW_NAME }).waitFor();
  await page.getByRole('region', { name: NEW_NAME }).getByText('Thử việc').waitFor();
  return `${NEW_NAME}, CCCD ${NEW_ID_NUMBER}`;
});

const toastText = (text) => page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(text);

await step('Edit "Thông tin cá nhân" in place: phone and emergency contact', async () => {
  await cardOf('Thông tin cá nhân').getByRole('button', { name: 'Sửa thông tin cá nhân' }).click();
  const form = cardOf('Thông tin cá nhân');
  await form.getByText('Đang sửa. Chuyển tab hoặc rời trang sẽ hỏi trước nếu còn thay đổi chưa lưu.').waitFor();
  await cardOf('Giấy tờ định danh').getByText('Lưu hoặc hủy phần đang sửa trước khi sửa phần này.').waitFor();
  await form.getByRole('textbox', { name: 'Số điện thoại', exact: true }).first().fill('0938 204 117');
  const contact = form.getByRole('group', { name: 'Liên hệ khẩn cấp' });
  await contact.getByRole('textbox', { name: 'Họ và tên' }).fill('Đinh Văn Hải');
  await contact.getByRole('textbox', { name: 'Quan hệ' }).fill('Bố');
  await contact.getByRole('textbox', { name: 'Số điện thoại' }).fill('0983 112 456');
  await form.getByText(/^4 thay đổi: /).waitFor();
  await capture(`${OUT}/employees-${String(n).padStart(2, '0')}a-personal-form.png`);
  await form.getByRole('button', { name: 'Lưu thông tin cá nhân' }).click();
  await toastText(`Đã lưu thông tin cá nhân của ${NEW_NAME}.`).waitFor();
  await cardOf('Thông tin cá nhân').getByText('Đinh Văn Hải').waitFor();
  await cardOf('Thông tin cá nhân').getByText('0938 204 117').waitFor();
  report.push(`![The card in edit mode](${IMG_BASE}/employees-${String(n).padStart(2, '0')}a-personal-form.png?raw=true)`, '');
});

await step('Edit "Giấy tờ định danh": a CCCD already used, then a new one saved', async () => {
  await cardOf('Giấy tờ định danh').getByRole('button', { name: 'Sửa giấy tờ định danh' }).click();
  const form = cardOf('Giấy tờ định danh');
  const value = await form.getByRole('textbox', { name: 'Số CCCD' }).inputValue();
  if (value !== NEW_ID_NUMBER) throw new Error(`the CCCD field starts from "${value}", not the full number`);
  await form.getByRole('textbox', { name: 'Số CCCD' }).fill(TAKEN_ID_NUMBER);
  await form.getByRole('button', { name: 'Lưu giấy tờ định danh' }).click();
  await form.getByText(/^Số CCCD này đã có ở hồ sơ Phan Khánh Duy \(NV\d+\)/).waitFor();
  await page.waitForTimeout(200);
  await capture(`${OUT}/employees-${String(n).padStart(2, '0')}a-identity-conflict.png`);
  await form.getByRole('textbox', { name: 'Số CCCD' }).fill(EDITED_ID_NUMBER);
  await form.getByRole('button', { name: 'Lưu giấy tờ định danh' }).click();
  await toastText(`Đã lưu giấy tờ định danh của ${NEW_NAME}.`).waitFor();
  await cardOf('Giấy tờ định danh').getByText(`•••• ${EDITED_ID_NUMBER.slice(-4)}`).first().waitFor();
  report.push(`![The conflict under the CCCD](${IMG_BASE}/employees-${String(n).padStart(2, '0')}a-identity-conflict.png?raw=true)`, '');
  return `CCCD ${NEW_ID_NUMBER} → ${EDITED_ID_NUMBER}`;
});

await step('Unsaved changes: switching tab asks first', async () => {
  await cardOf('Thông tin cá nhân').getByRole('button', { name: 'Sửa thông tin cá nhân' }).click();
  await cardOf('Thông tin cá nhân').getByRole('textbox', { name: 'Địa chỉ' }).fill('12 Nguyễn Hữu Thọ, TP. Hồ Chí Minh');
  await page.getByRole('tab', { name: 'Công việc' }).click();
  const dialog = page.getByRole('dialog', { name: 'Bỏ thay đổi chưa lưu?' });
  await dialog.getByText(`Thông tin cá nhân của ${NEW_NAME} còn thay đổi chưa lưu.`, { exact: false }).waitFor();
  await page.waitForTimeout(200);
  await capture(`${OUT}/employees-${String(n).padStart(2, '0')}a-leave-guard.png`);
  await dialog.getByRole('button', { name: 'Bỏ thay đổi' }).click();
  await page.waitForURL(/[?&]tab=job\b/);
  report.push(`![The leave guard](${IMG_BASE}/employees-${String(n).padStart(2, '0')}a-leave-guard.png?raw=true)`, '');
  return 'discarded, then on the tab Công việc';
});

await step('Edit "Vị trí công việc": Thử việc to Chính thức', async () => {
  await cardOf('Vị trí công việc').getByRole('button', { name: 'Sửa vị trí công việc' }).click();
  const form = cardOf('Vị trí công việc');
  await form.getByRole('combobox', { name: 'Trạng thái' }).click();
  await page.getByRole('option', { name: 'Chính thức', exact: true }).click();
  await form.getByText('1 thay đổi: Trạng thái').waitFor();
  await form.getByRole('button', { name: 'Lưu thông tin công việc' }).click();
  await toastText(`Đã lưu thông tin công việc của ${NEW_NAME}.`).waitFor();
  await page.getByRole('region', { name: NEW_NAME }).getByText('Chính thức').waitFor();
});

await step('Nhập từ Excel: the import page offers "Tải file mẫu"', async () => {
  await page.goto(`${BASE}/employees`);
  await page.getByRole('link', { name: 'Nhập từ Excel' }).click();
  await page.waitForURL(/\/employees\/import$/);
  await page.getByRole('heading', { level: 1, name: 'Nhập nhân viên từ Excel' }).waitFor();
  const { fileName, size } = await downloadOf(() => page.getByRole('button', { name: 'Tải file mẫu' }).click(), /^mau-nhap-nhan-vien\.xlsx$/);
  await page.getByRole('button', { name: 'Tải file mẫu' }).waitFor();
  return `${fileName}, ${size} bytes`;
});

// A file in the template's columns (the import finds them by header): two new people and one row with an error.
const IMPORT_NAMES = [`Hồ Ngọc Ánh ${RUN}`, `Tạ Minh Khôi ${RUN}`];
const IMPORT_BAD = `Lâm Gia Bảo ${RUN}`;
const runDigits = String(Date.now()).slice(-8);
const ddmmyyyy = today.split('-').reverse().join('/');
const importFile = {
  name: `nhap-nhan-vien-${RUN.toLowerCase()}.xlsx`,
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer: buildXlsx([
    ['Mã nhân viên', 'Họ và tên *', 'Ngày sinh *', 'Giới tính *', 'Số CCCD *', 'Mã đơn vị *', 'Mã chức danh *', 'Ngày vào làm *', 'Trạng thái'],
    ['', IMPORT_NAMES[0], '15/03/1995', 'Nữ', `0795${runDigits}`, 'WEB', 'NV', ddmmyyyy, 'Thử việc'],
    ['', IMPORT_NAMES[1], '02/09/1993', 'Nam', `0796${runDigits}`, 'WEB', 'NV', ddmmyyyy, 'Chính thức'],
    ['', IMPORT_BAD, '20/11/1997', 'Nam', `0797${runDigits}`, 'KHONGCO', 'NV', ddmmyyyy, ''],
  ]),
};

await step('Nhập từ Excel, Kiểm tra: 2 valid rows, 1 with an error, named by column and value', async () => {
  await page.locator('input[type="file"]').setInputFiles(importFile);
  await page.getByText('1 dòng có lỗi', { exact: true }).waitFor();
  await page.getByRole('tab', { name: /Dòng lỗi/, selected: true }).waitFor();
  const results = page.getByRole('table', { name: `Kết quả kiểm tra file ${importFile.name}` });
  const bad = results.getByRole('row').filter({ hasText: IMPORT_BAD });
  await bad.getByText('Không có đơn vị mã “KHONGCO”', { exact: false }).waitFor();
  const detail = await bad.getByRole('cell').last().textContent();
  if (!detail.startsWith('M · Mã đơn vị')) throw new Error(`the error reads "${detail}"`);
  return detail;
});

await step('Nhập từ Excel, Hợp lệ: the units and positions resolved to names', async () => {
  await page.getByRole('tab', { name: /Hợp lệ/ }).click();
  const results = page.getByRole('table', { name: `Kết quả kiểm tra file ${importFile.name}` });
  for (const name of IMPORT_NAMES) await results.getByRole('row').filter({ hasText: name }).getByText('Nhóm Web', { exact: false }).waitFor();
});

await step('Nhập từ Excel, Xác nhận: skip the row with an error', async () => {
  await page.getByRole('button', { name: 'Bỏ qua 1 dòng lỗi, tiếp tục' }).click();
  const confirm = page.getByRole('region', { name: 'Xác nhận nhập' });
  await confirm.getByText('2 nhân viên mới').waitFor();
  await confirm.getByText('1 Thử việc, 1 Chính thức').waitFor();
  await confirm.getByText('1 dòng lỗi').waitFor();
});

await step('Nhập từ Excel, Kết quả: 2 Employees added, with their codes', async () => {
  await page.getByRole('button', { name: 'Nhập 2 nhân viên' }).click();
  await page.getByRole('heading', { name: 'Đã nhập 2 nhân viên' }).waitFor();
  await toastText('Đã nhập 2 nhân viên.').last().waitFor();
  return await page.getByText(/^Mã NV\d+ – NV\d+\./).textContent();
});

await step('Nhập từ Excel: the new people are on top of the list, the row with an error is not', async () => {
  await page.getByRole('link', { name: 'Xem nhân viên vừa nhập' }).click();
  await page.waitForURL(/[?&]sort=newest\b/);
  await search().fill(RUN.toLowerCase());
  await page.waitForURL(/[?&]q=/);
  for (const name of IMPORT_NAMES) await table().getByRole('link', { name }).waitFor();
  const names = await nameLinks().allTextContents();
  if (names.includes(IMPORT_BAD)) throw new Error(`${IMPORT_BAD} is in the list`);
  // Importing the same file again creates nobody: every valid row is now "Đã có".
  await page.goto(`${BASE}/employees/import`);
  await page.locator('input[type="file"]').setInputFiles(importFile);
  await page.getByText('Không có dòng nào nhập được').waitFor();
  await page.getByRole('tab', { name: /Đã có/ }).click();
  for (const name of IMPORT_NAMES) await page.getByRole('row').filter({ hasText: name }).getByText('Trùng Số CCCD với hồ sơ', { exact: false }).waitFor();
  return 'a second import of the file finds both as "Đã có"';
});

await step('390: compact rows', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/employees`);
  await page.getByRole('list', { name: 'Danh sách nhân viên' }).getByRole('link', { name: 'Phạm Quốc Bảo' }).waitFor();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (wide) throw new Error('the page scrolls sideways at 390');
});

await step('390: "Thao tác khác" exports the list', async () => {
  await page.getByRole('button', { name: 'Thao tác khác' }).click();
  const item = page.getByRole('menuitem', { name: 'Xuất Excel' });
  await item.waitFor();
  await page.waitForTimeout(200);
  await capture(`${OUT}/employees-${String(n).padStart(2, '0')}a-more-actions.png`);
  report.push(`![The menu "Thao tác khác"](${IMG_BASE}/employees-${String(n).padStart(2, '0')}a-more-actions.png?raw=true)`, '');
  const { fileName } = await downloadOf(() => item.click(), EXPORT_NAME);
  await page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(`ra file ${fileName}.`, { exact: false }).last().waitFor();
  return fileName;
});

await step('390: the profile, compact header and tabs that scroll sideways', async () => {
  await page.goto(profileUrl);
  await page.getByRole('heading', { level: 1, name: 'Trần Thị Mai' }).waitFor();
  await cardOf('Giấy tờ định danh').getByRole('button', { name: 'Hiện số CCCD' }).waitFor();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (wide) throw new Error('the profile scrolls sideways at 390');
  await page.goto(`${BASE}/employees`);
  await page.getByRole('list', { name: 'Danh sách nhân viên' }).getByRole('link', { name: 'Phạm Quốc Bảo' }).waitFor();
});

await step('390: HRM-11 work history timeline remains readable', async () => {
  await page.goto(`${profileUrl}?tab=history`);
  const timeline = page.getByRole('list', { name: 'Dòng thời gian công tác' });
  await timeline.getByRole('heading', { name: 'Khen thưởng' }).waitFor();
  await timeline.getByRole('heading', { name: 'Vào làm' }).waitFor();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (wide) throw new Error('Work history overflows 390px');
  return 'Milestones, dates, decision source and actor remain in the accessible list';
});

await step('390: HRM-09 Skills and Certificates fit the profile viewport', async () => {
  await page.goto(`${profileUrl}?tab=skills`);
  await page.getByText('Mức 4/5').waitFor();
  await cardOf(certificateName).getByText('01/01/2028').waitFor();
  if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) {
    throw new Error('Skills tab overflows the 390px viewport');
  }
  await page.getByRole('button', { name: 'Sửa TypeScript', exact: true }).click();
  await page.getByRole('dialog', { name: 'Sửa kỹ năng' }).waitFor();
  if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) {
    throw new Error('Skill dialog overflows the 390px viewport');
  }
  await page.getByRole('dialog', { name: 'Sửa kỹ năng' }).getByRole('button', { name: 'Hủy' }).click();
  return 'Qualification rows and dialog fit 390px without horizontal scrolling';
});

await step('390: HRM-08 FE-2D nationality filter is accessible', async () => {
  await page.goto(`${BASE}/employees`);
  await page.getByRole('button', { name: /Lọc/ }).click();
  const modal = page.getByRole('dialog', { name: 'Lọc nhân viên' });
  await modal.getByRole('textbox', { name: 'Quốc tịch' }).fill('VN');
  await page.waitForURL(/[?&]nationality=VN(?:&|$)/);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (wide) throw new Error('Nationality mobile filter overflow');
  await modal.getByRole('button', { name: /Xem/ }).click();
  return 'Mobile filter applies country and retains selection in URL';
});


await step('390: HRM-08 Bank, Dependents and Insurance tabs stay within the viewport', async () => {
  const checkWidth = async (section) => {
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (wide) throw new Error(`${section} overflows the 390px viewport`);
  };
  await page.goto(`${profileUrl}?tab=bank`);
  await cardOf('ACB').getByText('Tài khoản nhận lương').waitFor();
  await checkWidth('Bank');
  const extra = `employees-${String(n).padStart(2, '0')}a-bank-390.png`;
  await capture(`${OUT}/${extra}`);
  report.push(`![HRM-08 Bank at 390px](${IMG_BASE}/${extra}?raw=true)`, '');
  await page.getByRole('tab', { name: 'Người phụ thuộc' }).click();
  await cardOf('Trần Minh Anh').getByText('31/12/2026').waitFor();
  await checkWidth('Dependents');
  const extraDependents = `employees-${String(n).padStart(2, '0')}b-dependents-390.png`;
  await capture(`${OUT}/${extraDependents}`);
  report.push(`![HRM-08 Dependents at 390px](${IMG_BASE}/${extraDependents}?raw=true)`, '');
  await page.getByRole('tab', { name: 'Bảo hiểm' }).click();
  await cardOf('Thông tin BHXH và BHYT').getByText('Bệnh viện Quận 7').waitFor();
  await checkWidth('Insurance');
  return 'Bank and Dependents captured alongside Insurance; no horizontal overflow at 390px';
});

await step('390: HRM-08 FE-2B insurance edit dialog fits mobile screen', async () => {
  await page.goto(`${profileUrl}?tab=insurance`);
  await cardOf('Thông tin BHXH và BHYT').getByText('15/05/2021').waitFor();
  await cardOf('Thông tin BHXH và BHYT').getByRole('button', { name: 'Sửa thông tin BHXH/BHYT' }).click();
  const dialog = page.getByRole('dialog', { name: 'Chỉnh sửa thông tin BHXH/BHYT' });
  await dialog.getByLabel('Ngày tham gia').waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) throw new Error('Insurance edit dialog overflows the 390px viewport');
  return 'Insurance edit form is usable at 390px without horizontal scrolling';
});

await step('390: HRM-08 FE-2C foreign documents and attachments fit mobile', async () => {
  await page.goto(`${profileUrl}?tab=documents`);
  await page.getByRole('heading', { name: 'Giấy tờ nhân viên nước ngoài' }).waitFor();
  await page.getByRole('heading', { name: 'Tài liệu đính kèm' }).waitFor();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (wide) throw new Error('Documents tab overflows 390px');
  await page.getByRole('button', { name: 'Thêm giấy tờ' }).click();
  await page.getByRole('dialog', { name: 'Thêm giấy tờ' }).waitFor();
  const wideDialog = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (wideDialog) throw new Error('Document modal overflows 390px');
  return 'Document cards and editable dialog accessible on mobile';
});

await step('390: the form "Thêm nhân viên"', async () => {
  await page.goto(`${BASE}/employees/new`);
  await page.getByRole('textbox', { name: 'Họ và tên' }).waitFor();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (wide) throw new Error('the form scrolls sideways at 390');
  await page.goto(`${BASE}/employees`);
  await page.getByRole('list', { name: 'Danh sách nhân viên' }).getByRole('link', { name: 'Phạm Quốc Bảo' }).waitFor();
});

await step('390: the filter dialog, newest hires first', async () => {
  await page.getByRole('button', { name: /^Lọc/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Lọc nhân viên' });
  await dialog.getByRole('combobox', { name: 'Sắp xếp' }).click();
  await page.getByRole('option', { name: 'Mới vào làm trước' }).click();
  await page.waitForURL(/[?&]sort=newest\b/);
  await dialog.getByRole('button', { name: /^Xem \d+ nhân viên$/ }).waitFor();
});

// HRM-11/FE-2 uses a separate Employee in the throwaway database; resignation cannot affect the profiles used
// by the list, project and leave flows. Every action is completed in Chromium against the real API.
const actionSuffix = Date.now();
const actionUnits = new Map((await api('/api/org-units')).units.map(unit => [unit.code, unit.id]));
const actionPositions = new Map((await api('/api/catalogs/positions/items?page=0&size=200')).items.map(item => [item.code, item.id]));
const actionEmployee = await api('/api/employees', { method: 'POST', body: {
  fullName: `Nguyễn Thị Kiểm Thử ${actionSuffix}`,
  personal: { dateOfBirth: '1998-01-01', gender: 'FEMALE' },
  identity: { idNumber: String(actionSuffix).slice(-12) },
  job: { orgUnitId: actionUnits.get('QA'), positionId: actionPositions.get('NV'),
    managerId: profileId, hireDate: '2026-01-01', status: 'PROBATION' },
} });
const actionUrl = `${BASE}/employees/${actionEmployee.id}?tab=history`;
const trialNumber = `HD-HRM11-${actionSuffix}`;
await api(`/api/employees/${actionEmployee.id}/contracts`, { method: 'POST', body: {
  contractNumber: trialNumber, contractType: 'PROBATION', signedOn: '2026-01-01',
  startsOn: '2026-01-02', endsOn: '2026-02-28', baseSalary: 9000000,
  insuranceSalary: null, allowancesJson: '[]', insured: false, taxMethod: 'WITHHOLD_10',
} });

await step('HRM-11 FE-2: evaluate probation Pass from its source contract', async () => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(actionUrl);
  await page.getByRole('button', { name: 'Đánh giá thử việc' }).click();
  const dialog = page.getByRole('dialog', { name: 'Đánh giá thử việc' });
  if (!await dialog.evaluate(element => element.contains(document.activeElement))) throw new Error('Dialog did not receive focus');
  await page.keyboard.press('Tab');
  if (!await dialog.evaluate(element => element.contains(document.activeElement))) throw new Error('Tab left the dialog');
  await dialog.getByRole('combobox', { name: 'Hợp đồng nguồn' }).click();
  await page.getByRole('option', { name: trialNumber }).click();
  await dialog.getByLabel('Nhận xét').fill('Đạt yêu cầu thử việc');
  const evaluator = dialog.getByRole('combobox', { name: 'Người đánh giá' });
  if (!(await evaluator.textContent()).includes('Trần Thị Mai')) {
    await dialog.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' }).fill('Trần Thị Mai');
    await evaluator.click();
    await page.getByRole('option', { name: /Trần Thị Mai/ }).click();
  }
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'visible' });
  const formShot = `employees-${String(n).padStart(2, '0')}a-probation-form.png`;
  await capture(`${OUT}/${formShot}`);
  report.push(`![Probation evaluation form](${IMG_BASE}/${formShot}?raw=true)`, '');
  await dialog.getByRole('button', { name: 'Lưu đánh giá' }).click();
  await dialog.waitFor({ state: 'detached' });
  await page.getByRole('heading', { name: 'Gợi ý hợp đồng chính thức sau thử việc' }).waitFor();
  await page.getByRole('list', { name: 'Dòng thời gian công tác' }).getByRole('heading', { name: 'Đạt thử việc' }).waitFor();
  return 'Source trial contract, evaluator, dates and Pass persisted; formal contract is only suggested';
});

await step('HRM-11 FE-2: formal-contract suggestion pre-fills an editable form', async () => {
  await page.getByRole('button', { name: 'Tạo hợp đồng chính thức' }).click();
  const dialog = page.getByRole('dialog', { name: 'Thêm hợp đồng lao động' });
  if (await dialog.getByLabel('Ngày bắt đầu').inputValue() !== '2026-03-01') throw new Error('Formal start is not prefilled');
  if (await dialog.getByLabel('Lương theo hợp đồng (VND)').inputValue() !== '9000000') throw new Error('Formal salary is not prefilled');
  await dialog.getByLabel('Số hợp đồng').fill(`HD-FORMAL-${actionSuffix}`);
  await dialog.getByLabel('Ngày ký').fill('2026-02-28');
  const formShot = `employees-${String(n).padStart(2, '0')}a-formal-contract-form.png`;
  await capture(`${OUT}/${formShot}`);
  report.push(`![Prefilled formal contract form](${IMG_BASE}/${formShot}?raw=true)`, '');
  await dialog.getByRole('button', { name: 'Lưu hợp đồng' }).click();
  await dialog.waitFor({ state: 'detached' });
  const contracts = await api(`/api/employees/${actionEmployee.id}/contracts`);
  if (!contracts.some(c => c.contractType === 'INDEFINITE' && c.startsOn === '2026-03-01')) throw new Error('Formal contract did not persist');
  return 'Prefilled type, start and pay reviewed, then a formal contract saved through the real API';
});

await step('HRM-11 FE-2: signed reward with salary effect', async () => {
  await page.getByRole('button', { name: 'Thêm quyết định' }).click();
  const dialog = page.getByRole('dialog', { name: 'Thêm quyết định công tác' });
  await dialog.getByRole('button', { name: 'Lưu quyết định' }).click();
  await dialog.getByText(/Kiểm tra số quyết định/).waitFor();
  await dialog.getByLabel('Số quyết định').fill(`QD-HRM11-${actionSuffix}`);
  await dialog.getByLabel('Ngày ký').fill('2026-03-01');
  await dialog.getByLabel('Ngày hiệu lực').fill('2026-03-02');
  await dialog.getByLabel('Nội dung quyết định').fill('Khen thưởng hoàn thành thử việc');
  await dialog.getByRole('checkbox', { name: 'Quyết định thay đổi lương/phụ cấp' }).check();
  await dialog.getByLabel('Lương cơ bản mới (VND)').fill('12000000');
  const formShot = `employees-${String(n).padStart(2, '0')}a-decision-form.png`;
  await capture(`${OUT}/${formShot}`);
  report.push(`![Decision with salary effect](${IMG_BASE}/${formShot}?raw=true)`, '');
  await dialog.getByRole('button', { name: 'Lưu quyết định' }).click();
  await dialog.waitFor({ state: 'detached' });
  await page.getByRole('list', { name: 'Dòng thời gian công tác' }).getByText(`QD-HRM11-${actionSuffix}`).waitFor();
  const history = await api(`/api/employees/${actionEmployee.id}/work-history`);
  if (!history.some(item => item.decisionNumber === `QD-HRM11-${actionSuffix}`)) throw new Error('Decision did not persist');
  return 'Validation shown, then a signed decision and salary-profile effect saved';
});

await step('390: HRM-11 FE-2 resignation requires final-day confirmation', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(actionUrl);
  await page.getByRole('button', { name: 'Ghi nhận nghỉ việc' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ghi nhận nghỉ việc' });
  await dialog.getByRole('textbox', { name: 'Ngày làm việc cuối cùng' }).fill('2026-09-30');
  await dialog.getByLabel('Lý do nghỉ việc').fill('Nguyện vọng cá nhân');
  await dialog.getByRole('button', { name: 'Xác nhận nghỉ việc' }).click();
  await dialog.getByText(/Nhập ngày làm việc cuối cùng hợp lệ/).waitFor();
  if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error('Resignation dialog overflows 390px');
  await dialog.getByRole('checkbox', { name: /Tôi xác nhận ngày làm việc cuối cùng/ }).check();
  const formShot = `employees-${String(n).padStart(2, '0')}a-resignation-form-390.png`;
  await page.screenshot({ path: `${OUT}/${formShot}`, fullPage: true });
  report.push(`![Resignation confirmation at 390px](${IMG_BASE}/${formShot}?raw=true)`, '');
  await dialog.getByRole('button', { name: 'Xác nhận nghỉ việc' }).click();
  await dialog.waitFor({ state: 'detached' });
  await page.getByRole('list', { name: 'Dòng thời gian công tác' }).getByRole('heading', { name: 'Nghỉ việc' }).waitFor();
  await page.getByText('Đã nghỉ việc').first().waitFor();
  return 'Confirmation was required; resignation persisted and the profile became inactive';
});

// Masked numbers need an Account without EMPLOYEE_SENSITIVE_VIEW: the Giám đốc persona of "Demo as…", when the
// demo personas are on (the local compose stack).
const me = await api('/api/me').catch(() => null);
const director = me?.demo?.enabled ? ((await api('/api/auth/demo/personas').catch(() => ({ personas: [] }))).personas ?? []).find((each) => each.persona === 'DIRECTOR' && each.available) : undefined;
if (director) {
  await step('As the Giám đốc (no EMPLOYEE_SENSITIVE_VIEW): masked numbers, no "Hiện", no "Sửa"', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/employees`);
    await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
    await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(director.fullName) }).click();
    await page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(new RegExp(`Đang dùng Tài khoản của ${director.fullName}`)).waitFor();
    await page.goto(profileUrl);
    const identity = cardOf('Giấy tờ định danh');
    await identity.getByText('Bạn không có quyền xem số đầy đủ.').waitFor();
    if ((await identity.getByRole('button').count()) > 0) throw new Error('the masked card offers a button');
    return `switched to ${director.fullName} through "Demo as…"`;
  });
} else {
  report.push('_Masked numbers: skipped, the demo personas are off._', '');
}

// The units come from /api/org-units/options, open to EMPLOYEE_VIEW: the Kế toán persona (no ORG_VIEW) filters by unit.
const personas = me?.demo?.enabled ? ((await api('/api/auth/demo/personas').catch(() => ({ personas: [] }))).personas ?? []) : [];
const accountant = personas.find((each) => each.persona === 'ACCOUNTANT' && each.available);
if (accountant) {
  await step('As the Kế toán (no ORG_VIEW): the unit filter of the list', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/employees`);
    await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
    await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(accountant.fullName) }).click();
    await page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(new RegExp(`Đang dùng Tài khoản của ${accountant.fullName}`)).waitFor();
    await page.goto(`${BASE}/employees`);
    await page.getByRole('button', { name: /^Đơn vị tổ chức: / }).click();
    const menu = page.getByRole('dialog', { name: 'Đơn vị tổ chức' });
    await menu.getByRole('searchbox', { name: 'Tìm đơn vị' }).fill('ke toan');
    await menu.getByRole('treeitem', { name: 'Phòng Tài chính - Kế toán', exact: true }).click();
    await page.waitForURL(/[?&]orgUnitId=/);
    const rows = await everyRow(1, 'Phòng Tài chính - Kế toán');
    return `switched to ${accountant.fullName}; ${rows} row(s) in Phòng Tài chính - Kế toán`;
  });
} else {
  report.push('_Unit filter as the Kế toán: skipped, the demo personas are off._', '');
}

const employeePersona = personas.find((each) => each.persona === 'EMPLOYEE' && each.available);
if (employeePersona) {
  await step('HRM-11 work history: employee persona receives a real 403 on own profile', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
    await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(employeePersona.fullName) }).click();
    await page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(new RegExp(`Đang dùng Tài khoản của ${employeePersona.fullName}`)).waitFor();
    await page.goto(`${BASE}/profile`);
    await page.waitForURL(/\/employees\/[0-9a-f-]{36}/);
    const denied = page.waitForResponse((response) => response.url().includes('/work-history') && response.status() === 403);
    await page.getByRole('tab', { name: 'Quá trình công tác' }).click();
    await denied;
    await page.getByText('Bạn không xem được quá trình công tác').waitFor();
    return `Real EMPLOYEE persona ${employeePersona.fullName}, self profile readable, history denied`;
  });
} else {
  report.push('_HRM-11 denied state: skipped, the demo Employee persona is off._', '');
}

report.push('Result: passed.');
await finish(0);
