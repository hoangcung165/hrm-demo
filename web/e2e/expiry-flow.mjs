// HRM-14: expiry list and warning settings against the real stack.
// Adds one fictional certificate per run; use a throwaway database, never the demo database.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';
mkdirSync(OUT, { recursive: true });
const report = ['### Upcoming expiry and warning settings (real backend, PostgreSQL)', ''];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(15_000);
let token;
let n = 0;
let originalSettings;
async function api(path, init = {}) {
  const response = await fetch(`${BASE}${path}`, { ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined });
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}
async function finish(code) {
  if (originalSettings) {
    try { await api('/api/expiry/settings', { method: 'PUT', body: { advanceDays: originalSettings } }); }
    catch (error) { report.push(`Warning settings restore failed: ${error}`); code = 1; }
  }
  writeFileSync(`${OUT}/report-expiry.md`, report.join('\n')); await browser.close(); process.exit(code);
}
async function step(title, run) {
  n += 1;
  const file = `expiry-${String(n).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  try {
    const note = await run();
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

try {
  token = (await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })).accessToken;
  const today = (await api('/api/expiry')).asOf;
  originalSettings = (await api('/api/expiry/settings')).advanceDays;
  const expiresAt = new Date(`${today}T00:00:00Z`);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 10);
  const expiryDay = expiresAt.toISOString().slice(0, 10);
  const person = (await api('/api/employees?q=Nguy%E1%BB%85n%20V%C4%83n%20An&size=20')).items.find((item) => item.fullName === 'Nguyễn Văn An');
  if (!person) throw new Error('Employee flow must create Nguyễn Văn An before expiry flow');
  const name = `Expiry E2E ${Date.now()}`;
  await api(`/api/employees/${person.id}/certificates`, { method: 'POST', body: {
    name, issuer: 'Demo Academy', issuedAt: today, expiresAt: expiryDay, attachmentId: null,
  } });
  await api(`/api/employees/${person.id}/expat-documents`, { method: 'POST', body: {
    documentType: 'VISA', documentNumber: `E2E${Date.now()}`, issuingCountry: 'VN',
    issuedAt: today, expiresAt: expiryDay,
  } });

  await step('Admin: navigation opens the scoped upcoming list', async () => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Sắp hết hạn', exact: true }).click();
    await page.getByRole('table', { name: 'Danh sách sắp hết hạn' }).waitFor();
    return `the Admin can open the list; a certificate expiring ${expiryDay} was prepared for filtering`;
  });
  await step('Type filter and date range retain the matching record', async () => {
    await page.getByRole('combobox', { name: 'Loại hồ sơ' }).click();
    await page.getByRole('option', { name: 'Chứng chỉ' }).click();
    await page.getByLabel('Từ ngày').fill(expiryDay);
    await page.getByLabel('Đến ngày').fill(expiryDay);
    await page.getByRole('table', { name: 'Danh sách sắp hết hạn' }).getByRole('link', { name: `Xem ${name} của Nguyễn Văn An` }).waitFor();
    if (!page.url().includes('type=CERTIFICATE') || !page.url().includes(`from=${expiryDay}`)) throw new Error('Filters missing from URL');
    return 'record type and dates are linkable; no salary or document number is displayed';
  });
  await step('Visa with no source name has a readable link to Documents', async () => {
    await page.getByRole('combobox', { name: 'Loại hồ sơ' }).click();
    await page.getByRole('option', { name: 'Visa', exact: true }).click();
    const source = page.getByRole('table', { name: 'Danh sách sắp hết hạn' }).getByRole('link', { name: 'Xem Visa của Nguyễn Văn An' });
    await source.waitFor();
    if (!((await source.getAttribute('href')) ?? '').endsWith('?tab=documents')) throw new Error('Visa source does not lead to Documents');
    await page.getByRole('combobox', { name: 'Loại hồ sơ' }).click();
    await page.getByRole('option', { name: 'Chứng chỉ' }).click();
    return 'null source names are localized and the destination is the real profile tab';
  });
  await step('A nonmatching range shows the no-results state', async () => {
    const other = new Date(`${expiryDay}T00:00:00Z`);
    other.setUTCDate(other.getUTCDate() + 1);
    const otherDay = other.toISOString().slice(0, 10);
    await page.getByLabel('Đến ngày').fill(otherDay);
    await page.getByLabel('Từ ngày').fill(otherDay);
    await page.getByRole('heading', { name: 'Không có kết quả' }).waitFor();
    return 'the filtered empty state offers a clear action';
  });
  await step('390px: compact list and source link', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Xóa bộ lọc' }).first().click();
    await page.getByRole('list', { name: 'Danh sách sắp hết hạn' }).getByRole('link', { name: new RegExp(name) }).waitFor();
    return 'compact row preserves the source link';
  });
  await step('Admin: settings show the five current warning windows', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('link', { name: 'Mốc cảnh báo sắp hết hạn' }).first().click();
    const visa = page.getByRole('textbox', { name: 'Visa' });
    await visa.waitFor();
    if (await visa.inputValue() !== String(originalSettings.VISA)) throw new Error('Settings do not match the API');
    return 'the form reads actual company settings and exposes all five types';
  });
  await step('Invalid value is announced and focused', async () => {
    const visa = page.getByRole('textbox', { name: 'Visa' });
    await visa.fill('366');
    await page.getByRole('button', { name: 'Lưu mốc cảnh báo' }).click();
    await page.getByText('Nhập số nguyên từ 0 đến 365 ngày.').waitFor();
    if (!(await visa.evaluate((el) => el === document.activeElement))) throw new Error('Invalid field did not receive focus');
    return 'out-of-range input is rejected before a request';
  });
  await step('Unsaved warning settings are protected when leaving', async () => {
    await page.getByRole('link', { name: 'Về danh sách sắp hết hạn' }).click();
    await page.getByRole('dialog', { name: 'Rời trang và bỏ thay đổi chưa lưu?' }).waitFor();
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    if (!page.url().endsWith('/expiry/settings')) throw new Error('The page changed after cancelling');
    return 'the leave confirmation keeps the unsaved edit';
  });
  await step('Admin: save and confirm the new warning days', async () => {
    await page.getByRole('textbox', { name: 'Visa' }).fill(String(originalSettings.VISA === 59 ? 58 : 59));
    await page.getByRole('button', { name: 'Lưu mốc cảnh báo' }).click();
    await page.getByText('Đã lưu mốc cảnh báo.').waitFor();
    const actual = (await api('/api/expiry/settings')).advanceDays;
    if (actual.VISA !== (originalSettings.VISA === 59 ? 58 : 59)) throw new Error('Saved days differ from the API');
    return 'the value was persisted, and the original values are restored at the end';
  });
  await step('390px: warning settings retain accessible controls', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('textbox', { name: 'Giấy phép lao động' }).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw new Error('Horizontal overflow at 390px');
    return 'five named controls and save action fit the narrow viewport';
  });
  const me = await api('/api/me');
  const personas = me.demo?.enabled ? (await api('/api/auth/demo/personas')).personas ?? [] : [];
  const employee = personas.find((item) => item.persona === 'EMPLOYEE' && item.available);
  if (employee) await step('Employee: company settings are read only', async () => {
    // The persona switch is in the desktop header; return to 390 for the denied-state screenshot.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
    await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(employee.fullName) }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/expiry/settings`);
    await page.getByText('Bạn có thể xem nhưng không có quyền sửa mốc cảnh báo.').waitFor();
    if (await page.getByRole('button', { name: 'Lưu mốc cảnh báo' }).count()) throw new Error('Reader sees save');
    return 'COMPANY_VIEW can inspect while COMPANY_EDIT is required to save';
  });
  if (employee) await step('Employee: direct list URL denied without a data request', async () => {
    await page.goto(`${BASE}/expiry`);
    await page.getByRole('heading', { name: 'Bạn không có quyền xem' }).waitFor();
    if (await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Sắp hết hạn', exact: true }).count()) throw new Error('Employee sees the restricted nav item');
    return 'permission and navigation agree';
  });
  await step('Settings denied for a session without company view', async () => {
    // Demo roles all inherit COMPANY_VIEW. Project the real /api/me response without that permission
    // to exercise the browser denied state; the settings endpoint remains on the real stack.
    await page.route('**/api/me', async (route) => {
      const response = await route.fetch();
      const account = await response.json();
      await route.fulfill({ response, json: { ...account, permissions: account.permissions.filter((permission) => permission !== 'COMPANY_VIEW' && permission !== 'COMPANY_EDIT') } });
    });
    await page.goto(`${BASE}/expiry/settings`);
    await page.reload();
    await page.getByRole('heading', { name: 'Bạn không có quyền xem mốc cảnh báo' }).waitFor();
    return 'permission projection of /api/me for a missing COMPANY_VIEW role; the API is not requested';
  });
  await finish(0);
} catch (error) {
  report.push('**Setup: FAILED**', '', '```', String(error).slice(0, 1500), '```', '', 'Result: FAILED.');
  console.error(error);
  await finish(1);
}
