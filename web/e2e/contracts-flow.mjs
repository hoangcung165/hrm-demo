// HRM-10/FE-1 screenshot evidence: real employee contract history, privacy and expiry.
// Runs after employees-flow.mjs seeds the throwaway company's Employees in CI.
// BASE_URL / OUT / IMG_BASE / HRM_ADMIN_EMAIL / HRM_ADMIN_PASSWORD as in the other flows.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';
mkdirSync(OUT, { recursive: true });
const report = ['### Contract tab (real backend, PostgreSQL)', ''];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
page.setDefaultTimeout(15_000);
let token;

function dateShift(delta) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const date = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const companyDay = `${date.year}-${date.month}-${date.day}`;
  const shifted = new Date(`${companyDay}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + delta);
  return shifted.toISOString().slice(0, 10);
}

async function api(path, init = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method: init.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function capture(name, action, note) {
  try {
    await action();
    const file = `contracts-${name}.png`;
    await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
    report.push(`**${name}** — ${note}`, '', `![${name}](${IMG_BASE}/${file}?raw=true)`, '');
    console.log(`ok ${name}`);
  } catch (err) {
    // Include route and visible UI in the CI log: a screenshot alone does not say
    // whether the app redirected to login, returned 403, or rendered an API error.
    const url = page.url();
    const visible = await page.locator('main').innerText().catch(() => page.locator('body').innerText().catch(() => ''));
    const diagnostic = `URL: ${url}\\nVisible content: ${visible.slice(0, 2500)}`;
    console.error(`contracts E2E ${name} failed: ${diagnostic}`);
    report.push(`**${name}: FAILED**`, '', String(err), '', '```', diagnostic, '```', '');
    await page.screenshot({ path: `${OUT}/contracts-${name}.png`, fullPage: true }).catch(() => {});
    throw err;
  }
}

try {
  token = (await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })).accessToken;
  const listing = await api(`/api/employees?q=${encodeURIComponent('Nguyễn Văn An')}&size=30`);
  const employee = listing.items.find(e => e.fullName === 'Nguyễn Văn An');
  if (!employee) throw new Error('Fictional employee Nguyễn Văn An missing; run employees-flow first');

  const endpoint = `/api/employees/${employee.id}/contracts`;
  const existing = await api(endpoint);
  const examples = [
    { contractNumber: 'HD-E2E-HISTORY-2026', contractType: 'FIXED_TERM', signedOn: dateShift(-440),
      startsOn: dateShift(-430), endsOn: dateShift(-380), baseSalary: 12500000, insuranceSalary: 12500000,
      allowancesJson: '[]', insured: true, taxMethod: 'PROGRESSIVE' },
    { contractNumber: 'HD-E2E-ACTIVE-2026', contractType: 'FIXED_TERM', signedOn: dateShift(-30),
      startsOn: dateShift(-20), endsOn: dateShift(20), baseSalary: 18000000, insuranceSalary: 18000000,
      allowancesJson: '[]', insured: true, taxMethod: 'PROGRESSIVE' },
  ];
  for (const sample of examples) {
    if (!existing.some(c => c.contractNumber === sample.contractNumber)) {
      await api(endpoint, { method: 'POST', body: sample });
    }
  }

  await capture('desktop-masked', async () => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    // Login uses an async mutation and the auth token is in memory. Navigating away
    // immediately aborts it, leaving the new page unauthenticated (redirected to /login).
    // Wait for the actual signed-in app shell, as the other browser E2E flows do.
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).waitFor();
    await page.goto(`${BASE}/employees/${employee.id}?tab=contracts`);
    await page.getByRole('tab', { name: 'Hợp đồng', exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Hợp đồng hiện tại' }).waitFor();
    await page.getByRole('region', { name: 'HD-E2E-ACTIVE-2026' }).getByText('•••••• ₫').first().waitFor();
    await page.getByRole('heading', { name: 'Hợp đồng trước đây và sắp có hiệu lực' }).waitFor();
    await page.getByRole('alert').getByText('Có hợp đồng sắp hết hạn').waitFor();
  }, 'Admin, current/historical contracts and expiry warning; salary hidden by default');

  await capture('desktop-revealed', async () => {
    const active = page.getByRole('region', { name: 'HD-E2E-ACTIVE-2026' });
    await active.getByRole('button', { name: 'Hiện lương hợp đồng HD-E2E-ACTIVE-2026' }).click();
    await active.getByText('18.000.000 ₫').first().waitFor();
    const previous = page.getByRole('region', { name: 'HD-E2E-HISTORY-2026' });
    await previous.getByText('•••••• ₫').first().waitFor();
  }, 'Salary reveal affects only one contract card');

  await capture('mobile-remasked', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('tab', { name: 'Công việc' }).click();
    await page.getByRole('tab', { name: 'Hợp đồng' }).click();
    await page.getByRole('region', { name: 'HD-E2E-ACTIVE-2026' }).getByText('•••••• ₫').first().waitFor();
  }, '390px layout; changing tabs re-masks previously revealed salary');


  await capture('probation-create-dialog', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('button', { name: 'Thêm hợp đồng' }).click();
    const dialog = page.getByRole('dialog', { name: 'Thêm hợp đồng lao động' });
    await dialog.getByRole('combobox', { name: 'Loại hợp đồng' }).click();
    await page.getByRole('option', { name: 'Hợp đồng thử việc' }).click();
    await dialog.getByLabel('Số hợp đồng').fill('HD-E2E-PROBATION');
    await dialog.getByLabel('Ngày ký').fill(dateShift(-300));
    await dialog.getByLabel('Ngày bắt đầu').fill(dateShift(-290));
    await dialog.getByLabel('Ngày kết thúc').fill(dateShift(-220));
    await dialog.getByLabel('Lương chính thức làm cơ sở thử việc').fill('20000000');
    if (await dialog.getByLabel('Lương theo hợp đồng (VND)').inputValue() !== '17000000')
      throw new Error('Probation 85% preview was not calculated');
  }, 'Probation form proposes 85% salary and defaults');

  report.push('Result: PASS');
} catch (err) {
  console.error(err);
  report.push('Result: FAILED', '', String(err));
  process.exitCode = 1;
} finally {
  writeFileSync(`${OUT}/report-contracts.md`, report.join('\n'));
  await browser.close();
}
