// Evidence for the punch log import (HRM-23, FE-1) against the real stack: the Admin opens /attendance/import, chooses a
// CSV with valid punches and one row of each kind of error, reads the check (numbers, tabs, errors by row), skips the
// errors and imports; chooses the clean part of the same file again and finds every punch already stored; then the page
// at 390 (desktop-only state). Every run stores new punches (a random minute on a day in the past); use a throwaway
// database (CI does), never the demo one. Writes screenshots and a Markdown report; exits non-zero at the first step
// that fails.
//   BASE_URL (http://localhost:5173)  OUT (e2e-out)  IMG_BASE (image URL prefix)  HRM_ADMIN_PASSWORD
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';

mkdirSync(OUT, { recursive: true });
const report = ['### Punch log import (real backend, PostgreSQL)', ''];
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
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function finish(code) {
  writeFileSync(`${OUT}/report-attendance.md`, report.join('\n'));
  await browser.close();
  process.exit(code);
}

async function step(title, run) {
  n += 1;
  const file = `attendance-${String(n).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
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

const expectText = async (locator, text) => {
  const found = await locator.filter({ hasText: text }).count();
  if (found === 0) throw new Error(`"${text}" not found in ${await locator.allTextContents()}`);
};
const chooseFile = (name, text) => page.locator('input[type="file"]').setInputFiles({ name, mimeType: 'text/csv', buffer: Buffer.from(text, 'utf8') });
const pad = (value) => String(value).padStart(2, '0');

// A day 40 days ago and a random minute, so a rerun on the same database still stores new punches.
const day = new Date(Date.now() - 40 * 86_400_000);
const date = `${pad(day.getDate())}/${pad(day.getMonth() + 1)}/${day.getFullYear()}`;
const minute = Math.floor(Math.random() * 40);
const FILE_NAME = `log-e2e-${Date.now()}.csv`;

token = (await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })).accessToken;
const people = (await api('/api/employees?size=5')).items;
if (people.length < 2) throw new Error('needs at least two Employees (HRM_EXAMPLE_DATA on)');
const [a, b] = people;
const valid = [
  `${a.code},${date} 08:${pad(minute)},Cổng chính`,
  `${a.code},${date} 17:${pad(30 + minute)},Cổng chính`,
  `${b.code},${date} 08:${pad(minute + 1)},Cổng chính`,
];
const errors = [`NV9999X,${date} 08:00,`, `${b.code},not a time,`, valid[0]];
const header = 'Mã nhân viên,Thời gian,Máy chấm công';
const mixed = [header, ...valid, ...errors].join('\n');
const clean = [header, ...valid].join('\n');

await step('Admin opens Nhập log quẹt thẻ', async () => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).waitFor();
  await page.goto(`${BASE}/attendance/import`);
  await page.getByRole('heading', { level: 1, name: 'Nhập log quẹt thẻ' }).waitFor();
  await page.getByText('Chọn file log').waitFor();
  await page.getByRole('button', { name: 'Tải file mẫu (.csv)' }).waitFor();
  return 'step 1 of 3: the drop zone, the columns of the file and the template';
});

await step('A file with errors is checked at once', async () => {
  await chooseFile(FILE_NAME, mixed);
  await page.getByText('Kết quả kiểm tra').waitFor();
  await page.getByRole('table', { name: `Các dòng lỗi của file ${FILE_NAME}` }).waitFor();
  const tabs = (await page.getByRole('tab').allTextContents()).join('|');
  if (!tabs.includes('Tất cả lỗi3') || !tabs.includes('Không tìm thấy mã1') || !tabs.includes('Thời gian1') || !tabs.includes('Trùng trong file1')) {
    throw new Error(`unexpected tabs: ${tabs}`);
  }
  await expectText(page.getByRole('button'), 'Bỏ qua 3 dòng lỗi, tiếp tục');
  await expectText(page.getByRole('table', { name: /Các dòng lỗi/ }).getByRole('row'), 'NV9999X');
  return 'POST /api/attendance/punch-imports/check: 6 rows read, 3 new, 3 with errors listed by row';
});

await step('Errors can be filtered by kind', async () => {
  await page.getByRole('tab', { name: /Thời gian/ }).click();
  const rows = await page.getByRole('table', { name: /Các dòng lỗi/ }).getByRole('row').count();
  if (rows !== 2) throw new Error(`expected the header and one row, found ${rows}`);
  await page.getByRole('tab', { name: /Tất cả lỗi/ }).click();
});

await step('Skip the errors and confirm', async () => {
  await page.getByRole('button', { name: 'Bỏ qua 3 dòng lỗi, tiếp tục' }).click();
  await page.getByText('Xác nhận nhập log').waitFor();
  await page.getByText('3 lần quẹt của 2 nhân viên').waitFor();
  await page.getByRole('button', { name: 'Nhập 3 lần quẹt' }).waitFor();
});

await step('The punches are stored', async () => {
  await page.getByRole('button', { name: 'Nhập 3 lần quẹt' }).click();
  await page.getByRole('heading', { name: 'Đã nhập 3 lần quẹt' }).waitFor();
  await page.getByRole('link', { name: 'Xem công theo ngày' }).waitFor();
  return 'POST /api/attendance/punch-imports with skipInvalid and the checksum of the check';
});

await step('The same file again: everything is stored already', async () => {
  await page.getByRole('button', { name: 'Nhập file khác' }).click();
  await page.getByText('Chọn file log').waitFor();
  await page.getByText('Lần nhập gần đây').waitFor();
  await chooseFile(FILE_NAME, clean);
  await page.getByText('File này đã được nhập: cả 3 lần quẹt đều đã có').waitFor();
  const importButtons = await page.getByRole('button', { name: /^Nhập \d/ }).count();
  if (importButtons > 0) throw new Error('an import button is offered for a file with nothing new');
});

await step('At 390 the page asks for a computer', async () => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`${BASE}/attendance/import`);
  await page.getByText('Mở trang này trên máy tính').waitFor();
});

report.push('Result: PASSED.');
await finish(0);
