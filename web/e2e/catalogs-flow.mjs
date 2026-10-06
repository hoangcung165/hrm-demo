// Evidence for the catalogs page (HRM-05/FE-1, FE-2, FE-3) against the real stack: /catalogs as the Admin at 1280 and 390,
// the lists, adding and editing through the dialog, then deactivating, reactivating and deleting. The defaults are
// seeded at startup (HRM-05/BE-2); the items below are added through the API only when they are missing (a database
// whose defaults were changed), and an item already there is kept as it is. Use a throwaway database (CI does),
// never the demo one.
// Writes screenshots and a Markdown report; exits non-zero at the first step that fails.
//   BASE_URL (http://localhost:5173)  OUT (e2e-out)  IMG_BASE (image URL prefix)  HRM_ADMIN_PASSWORD
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';

const ITEMS = {
  positions: [
    { code: 'GD', name: 'Giám đốc' },
    { code: 'TP', name: 'Trưởng phòng' },
    { code: 'NV', name: 'Nhân viên' },
    { code: 'TTS', name: 'Thực tập sinh' },
  ],
  'contract-types': [
    { code: 'KXDTH', name: 'HĐLĐ không xác định thời hạn', term: 'INDEFINITE' },
    { code: 'XDTH', name: 'HĐLĐ xác định thời hạn', term: 'FIXED', maxMonths: 36 },
    { code: 'TV', name: 'Hợp đồng thử việc', term: 'PROBATION' },
  ],
  'allowance-types': [
    { code: 'AN_TRUA', name: 'Phụ cấp ăn trưa', insurable: false, taxable: true },
    { code: 'CHUC_VU', name: 'Phụ cấp chức vụ', insurable: true, taxable: true },
  ],
  holidays: [
    { name: 'Tết Dương lịch', startDate: '2026-01-01', endDate: '2026-01-01' },
    { name: 'Tết Nguyên đán', startDate: '2026-02-16', endDate: '2026-02-20' },
    { name: 'Quốc khánh', startDate: '2026-09-01', endDate: '2026-09-02' },
  ],
};

mkdirSync(OUT, { recursive: true });
const report = ['### Catalogs page (real backend, PostgreSQL)', ''];
// A skill of its own on every run, so a re-run against the same database still adds one.
const RUN = Date.now().toString(36).slice(-5).toUpperCase();
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

async function finish(code) {
  writeFileSync(`${OUT}/report-catalogs.md`, report.join('\n'));
  await browser.close();
  process.exit(code);
}

async function step(title, run) {
  n += 1;
  const file = `catalogs-${String(n).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
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

// --- Data through the API: a few items per catalog, deactivating one position to show the status. ---
let added = 0;
try {
  token = (await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })).accessToken;
  for (const [catalog, items] of Object.entries(ITEMS)) {
    for (const item of items) {
      try {
        await api(`/api/catalogs/${catalog}/items`, { method: 'POST', body: item });
        added += 1;
      } catch (error) {
        // Already there: a re-run, or the seeded defaults.
        if (error.status !== 409) throw error;
      }
    }
  }
  const trainee = (await api('/api/catalogs/positions/items?q=TTS&size=5')).items.find((item) => item.code === 'TTS');
  await api(`/api/catalogs/positions/items/${trainee.id}/deactivate`, { method: 'POST' });
} catch (error) {
  report.push('**Preparing data through the API: FAILED**', '', '```', String(error).slice(0, 1500), '```', '', 'Result: FAILED.');
  console.error(`FAILED preparing data\n${error}`);
  await finish(1);
}

const list = (name) => page.getByRole('table', { name });
// The row whose name cell is exactly `text` ("Giám đốc" is also part of "Phó giám đốc").
const rowWith = (name, text) => list(name).getByRole('row').filter({ has: page.getByRole('cell', { name: text, exact: true }) });

await step('Admin: "Danh mục" opens on the positions', async () => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Danh mục' }).click();
  await page.getByRole('heading', { level: 1, name: 'Danh mục' }).waitFor();
  await rowWith('Chức danh', 'Thực tập sinh').getByText('Ngừng hoạt động').waitFor();
  await rowWith('Chức danh', 'Giám đốc').getByText('Đang dùng').waitFor();
  return `${added} item(s) added through the API for this run (the rest came with the defaults); "Thực tập sinh" deactivated`;
});

await step('Contract types: the term column', async () => {
  await page.getByRole('tab', { name: 'Loại hợp đồng' }).click();
  await page.waitForURL(/[?&]catalog=contract-types\b/);
  await rowWith('Loại hợp đồng', 'HĐLĐ xác định thời hạn').getByText('Xác định thời hạn, tối đa 36 tháng').waitFor();
});

await step('Allowance types: social insurance and income tax', async () => {
  await page.getByRole('tab', { name: 'Loại phụ cấp' }).click();
  const meal = rowWith('Loại phụ cấp', 'Phụ cấp ăn trưa');
  await meal.waitFor();
  const cells = await meal.getByRole('cell').allTextContents();
  if (cells[2] !== 'Không' || cells[3] !== 'Có') throw new Error(`the meal allowance reads [${cells.join(', ')}]`);
});

await step('Holidays of 2026 from the defaults: date ranges, days and the year filter', async () => {
  await page.goto(`${BASE}/catalogs?catalog=holidays&year=2026`);
  const tet = rowWith('Ngày lễ', 'Tết Nguyên đán');
  await tet.getByText('16/02 – 20/02/2026').waitFor();
  const cells = await tet.getByRole('cell').allTextContents();
  if (cells[1] !== '5') throw new Error(`Tết counts ${cells[1]} days`);
  // From the defaults seeded at startup: Nghị quyết 28/2026/QH16 and the day off in lieu of 26/04.
  await rowWith('Ngày lễ', 'Ngày Văn hóa Việt Nam').getByText('24/11/2026').waitFor();
  await rowWith('Ngày lễ', 'Nghỉ bù Giỗ Tổ Hùng Vương').getByText('27/04/2026').waitFor();
  await page.getByRole('combobox', { name: 'Năm' }).waitFor();
});

await step('Search without accents, and the no-match state', async () => {
  await page.getByRole('tab', { name: 'Chức danh' }).click();
  const box = page.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' });
  await box.fill('truong');
  await rowWith('Chức danh', 'Trưởng phòng').waitFor();
  await page.waitForURL(/[?&]q=truong\b/);
  await box.fill('khong co');
  await page.getByRole('heading', { name: 'Không có chức danh nào khớp “khong co”' }).waitFor();
});

const dialog = (name) => page.getByRole('dialog', { name });
const toast = (text) => page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(text);

await step('Add a skill: the code is upper-cased, then a toast and the new row', async () => {
  await page.goto(`${BASE}/catalogs?catalog=skills`);
  await page.getByRole('button', { name: 'Thêm kỹ năng' }).first().click();
  const form = dialog('Thêm kỹ năng');
  await form.getByLabel('Mã').fill(`react_${RUN.toLowerCase()}`);
  await form.getByLabel('Tên').fill(`React ${RUN}`);
  await form.getByRole('button', { name: 'Thêm kỹ năng' }).click();
  await toast(`Đã thêm React ${RUN}`).waitFor();
  await rowWith('Kỹ năng', `React ${RUN}`).getByText(`REACT_${RUN}`).waitFor();
  return `typed "react_${RUN.toLowerCase()}", saved as "REACT_${RUN}"`;
});

await step('A code already in the catalog: the error under its field', async () => {
  await page.getByRole('button', { name: 'Thêm kỹ năng' }).first().click();
  const form = dialog('Thêm kỹ năng');
  await form.getByLabel('Mã').fill(`REACT_${RUN}`);
  await form.getByLabel('Tên').fill(`React Native ${RUN}`);
  await form.getByRole('button', { name: 'Thêm kỹ năng' }).click();
  await form.getByText('Mã này đã có trong danh mục. Nhập một mã khác.').waitFor();
});

await step('Edit a contract type: the maximum of a fixed term', async () => {
  await dialog('Thêm kỹ năng').getByRole('button', { name: 'Hủy' }).click();
  await page.getByRole('tab', { name: 'Loại hợp đồng' }).click();
  await page.getByRole('button', { name: 'Thao tác cho HĐLĐ xác định thời hạn' }).click();
  await page.getByRole('menuitem', { name: 'Sửa' }).click();
  const form = dialog('Sửa loại hợp đồng: HĐLĐ xác định thời hạn');
  const save = form.getByRole('button', { name: 'Lưu thay đổi' });
  if (await save.isEnabled()) throw new Error('"Lưu thay đổi" is enabled before any change');
  await form.getByLabel('Tối đa (tháng)').fill('24');
  await save.click();
  await toast('Đã lưu HĐLĐ xác định thời hạn').waitFor();
  await rowWith('Loại hợp đồng', 'HĐLĐ xác định thời hạn').getByText('Xác định thời hạn, tối đa 24 tháng').waitFor();
  // Back to the legal maximum for the next run.
  const fixed = (await api('/api/catalogs/contract-types/items?q=XDTH&size=5')).items.find((item) => item.code === 'XDTH');
  await api(`/api/catalogs/contract-types/items/${fixed.id}`, { method: 'PUT', body: { code: 'XDTH', name: fixed.name, term: 'FIXED', maxMonths: 36 } });
  return 'saved 24 months (put back to 36 through the API afterwards)';
});

await step('A holiday over another: the error under the dates', async () => {
  await page.goto(`${BASE}/catalogs?catalog=holidays&year=2026`);
  await page.getByRole('button', { name: 'Thêm ngày lễ' }).click();
  const form = dialog('Thêm ngày lễ');
  await form.getByLabel('Tên').fill('Nghỉ thêm dịp Tết');
  await form.getByLabel('Từ ngày').fill('2026-02-20');
  await form.getByLabel('Đến ngày').fill('2026-02-23');
  await form.getByRole('button', { name: 'Thêm ngày lễ' }).click();
  await form.getByText('Trùng với ngày lễ Tết Nguyên đán (16/02 – 20/02/2026). Chọn ngày khác.').waitFor();
});

const menuOf = async (name) => {
  await page.getByRole('button', { name: `Thao tác cho ${name}` }).click();
  return page.getByRole('menu');
};

await step('Deactivate a skill, then "Hoàn tác" in the toast', async () => {
  await page.keyboard.press('Escape');
  await page.goto(`${BASE}/catalogs?catalog=skills`);
  await (await menuOf(`React ${RUN}`)).getByRole('menuitem', { name: 'Ngừng hoạt động' }).click();
  await toast(`Đã ngừng hoạt động React ${RUN}`).waitFor();
  await rowWith('Kỹ năng', `React ${RUN}`).getByText('Ngừng hoạt động').waitFor();
  await page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByRole('button', { name: 'Hoàn tác' }).click();
  await toast(`Đã kích hoạt lại React ${RUN}`).waitFor();
  await rowWith('Kỹ năng', `React ${RUN}`).getByText('Đang dùng').waitFor();
  return 'deactivated, then undone from the toast';
});

await step('Reactivate an inactive position', async () => {
  await page.goto(`${BASE}/catalogs`);
  await (await menuOf('Thực tập sinh')).getByRole('menuitem', { name: 'Kích hoạt lại' }).click();
  await toast('Đã kích hoạt lại Thực tập sinh').waitFor();
  await rowWith('Chức danh', 'Thực tập sinh').getByText('Đang dùng').waitFor();
});

await step('Delete: the confirm names the item', async () => {
  await page.goto(`${BASE}/catalogs?catalog=skills`);
  await (await menuOf(`React ${RUN}`)).getByRole('menuitem', { name: 'Xóa' }).click();
  await dialog(`Xóa React ${RUN}?`).getByText('Mục này sẽ bị xóa khỏi danh mục Kỹ năng. Không hoàn tác được.').waitFor();
});

await step('Deleted: a toast, and the row is gone', async () => {
  await dialog(`Xóa React ${RUN}?`).getByRole('button', { name: 'Xóa' }).click();
  await toast(`Đã xóa React ${RUN}`).waitFor();
  await rowWith('Kỹ năng', `React ${RUN}`).waitFor({ state: 'detached' });
});

await step('390: compact rows and tabs that scroll sideways', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/catalogs`);
  await page.getByRole('list', { name: 'Chức danh' }).getByText('Trưởng phòng').waitFor();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (wide) throw new Error('the page scrolls sideways at 390');
});

report.push('Result: passed.');
await finish(0);
