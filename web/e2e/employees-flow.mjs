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
// the import page.
// Use a throwaway database (CI does), never the demo one.
// Writes screenshots and a Markdown report; exits non-zero at the first step that fails.
//   BASE_URL (http://localhost:5173)  OUT (e2e-out)  IMG_BASE (image URL prefix)  HRM_ADMIN_PASSWORD
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

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

await step('A later tab: Hợp đồng is on its way', async () => {
  await page.getByRole('tab', { name: 'Hợp đồng' }).click();
  await page.waitForURL(/[?&]tab=contracts\b/);
  await page.getByRole('heading', { name: 'Hợp đồng đang được hoàn thiện' }).waitFor();
});

await step('"Nhân viên" goes back to the list', async () => {
  await main().getByRole('link', { name: 'Nhân viên', exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/employees');
  await table().getByRole('link', { name: 'Trần Thị Mai' }).waitFor();
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

report.push('Result: passed.');
await finish(0);
