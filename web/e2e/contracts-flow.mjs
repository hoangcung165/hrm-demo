// HRM-10/FE-1 screenshot evidence: real employee contract history, privacy and expiry.
// Runs after employees-flow.mjs seeds the throwaway company's Employees in CI.
// BASE_URL / OUT / IMG_BASE / HRM_ADMIN_EMAIL / HRM_ADMIN_PASSWORD as in the other flows.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

// The HTTP status of a call that is expected to be refused (api() throws on any non-2xx).
async function statusOf(path, init = {}, bearer = token) {
  const response = await fetch(`${BASE}${path}`, {
    method: init.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}` },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  return response.status;
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


  await capture('probation-saved', async () => {
    await page.getByRole('dialog', { name: 'Thêm hợp đồng lao động' })
      .getByRole('button', { name: 'Lưu hợp đồng' }).click();
    await page.getByRole('region', { name: 'HD-E2E-PROBATION' }).waitFor();
    const saved = (await api(endpoint)).find(c => c.contractNumber === 'HD-E2E-PROBATION');
    if (!saved || saved.baseSalary !== 17000000 || saved.insured !== false
      || saved.taxMethod !== 'WITHHOLD_10') throw new Error('Probation defaults not persisted');
  }, 'Probation values persisted through UI and contract API');

  await capture('amendment-dialog', async () => {
    await page.getByRole('region', { name: 'HD-E2E-ACTIVE-2026' })
      .getByRole('button', { name: 'Thêm phụ lục cho hợp đồng HD-E2E-ACTIVE-2026' }).click();
    const dialog = page.getByRole('dialog', { name: 'Thêm phụ lục cho HD-E2E-ACTIVE-2026' });
    await dialog.getByLabel('Số phụ lục').fill('PL-E2E-RAISE');
    await dialog.getByLabel('Ngày có hiệu lực').fill(dateShift(1));
    await dialog.getByLabel('Nội dung thay đổi').fill('Điều chỉnh lương từ ngày hiệu lực');
    await dialog.getByLabel('Mức lương mới (VND)').fill('21000000');
  }, 'Salary amendment dialog with effective date and preview');


  await capture('amendment-saved', async () => {
    await page.getByRole('dialog', { name: 'Thêm phụ lục cho HD-E2E-ACTIVE-2026' })
      .getByRole('button', { name: 'Lưu phụ lục' }).click();
    await page.getByText('PL-E2E-RAISE').waitFor();
    const from = dateShift(0);
    const to = dateShift(10);
    const segments = await api(`/api/employees/${employee.id}/salary-profile?from=${from}&to=${to}`);
    if (segments.length !== 2) throw new Error('Expected two salary segments');
    if (segments[0].baseSalary !== 18000000 || segments[1].baseSalary !== 21000000)
      throw new Error('Salary segment amounts did not follow the amendment');
    const audit = await api(`/api/audit-logs?entityType=SALARY_PROFILE&entityId=${employee.id}`);
    const changed = audit.items.find(item => item.action === 'UPDATE');
    if (!changed) throw new Error('Salary amendment did not emit an audit record');
    const detail = await api(`/api/audit-logs/${changed.id}`);
    if (detail.after.effectiveOn !== dateShift(1) || !detail.after.sourceAmendmentId
      || detail.before.baseSalary !== '***' || detail.after.baseSalary !== '***')
      throw new Error('Salary audit must retain source and effective date while masking amounts');
  }, 'Source-linked salary segments created by a new amendment');


  // FE-3: verify salary segments from the signed contract and effective-dated amendment
  // through the read-only employee Salary tab and the real PostgreSQL-backed API.
  await capture('salary-period-masked', async () => {
    await page.getByRole('tab', { name: 'Lương và phụ cấp' }).click();
    await page.getByRole('heading', { name: 'Hồ sơ lương', exact: true }).waitFor();
    await page.getByLabel('Từ ngày').fill(dateShift(0));
    await page.getByLabel('Đến ngày').fill(dateShift(10));
    await page.getByRole('button', { name: 'Xem kỳ' }).click();
    await page.getByRole('heading', { name: 'Dòng thời gian Hồ sơ lương' }).waitFor();
    const segments = page.getByRole('list', { name: 'Thanh đoạn hiệu lực Hồ sơ lương' });
    if (await segments.getByRole('listitem').count() !== 2)
      throw new Error('Salary segment bar must show two effective periods after an amendment');
    await segments.getByText('•••••• ₫').first().waitFor();
    if (await page.getByText('21.000.000 ₫').count() > 0)
      throw new Error('Salary appeared without an explicit reveal');
  }, 'Two effective salary periods and a read-only timeline, with amounts hidden by default');

  await capture('salary-period-revealed', async () => {
    await page.getByRole('button', { name: /^Hiện số tiền đoạn/ }).first().click();
    await page.getByText('21.000.000 ₫').first().waitFor();
    // The amendment inherits an 18m insurance salary from its prior source.
    // Verify the prior salary segment remains masked, not all occurrences of 18m.
    const bar = page.getByRole('list', { name: 'Thanh đoạn hiệu lực Hồ sơ lương' });
    await bar.getByRole('listitem').first().getByText('•••••• ₫').waitFor();
    await page.getByRole('link', { name: /Xem hợp đồng có phụ lục nguồn/ }).waitFor();
  }, 'Only the chosen salary record reveals pay; the amendment retains a source link');

  await capture('salary-mobile-remasked', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('tab', { name: 'Công việc' }).click();
    await page.getByRole('tab', { name: 'Lương và phụ cấp' }).click();
    await page.getByRole('heading', { name: 'Dòng thời gian Hồ sơ lương' }).waitFor();
    if (await page.getByText('21.000.000 ₫').count() > 0)
      throw new Error('Previously revealed salary must be re-masked on tab change');
    await page.getByRole('list', { name: 'Thanh đoạn hiệu lực Hồ sơ lương' }).waitFor();
  }, 'Mobile salary timeline resets amount visibility on tab change');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('tab', { name: 'Hợp đồng' }).click();

  await capture('delete-restriction', async () => {
    const active = page.getByRole('region', { name: 'HD-E2E-ACTIVE-2026' });
    await active.getByRole('button', { name: 'Xóa hợp đồng HD-E2E-ACTIVE-2026' }).click();
    const modal = page.getByRole('dialog', { name: 'Xóa hợp đồng HD-E2E-ACTIVE-2026' });
    await modal.getByText('Hợp đồng là chứng từ nguồn của Hồ sơ lương').waitFor();
    await modal.getByRole('button', { name: 'Đóng' }).click();
  }, 'API refuses deleting contracts with dependent amendments');


  // FE-2: drive the signed contract dialog against real PostgreSQL.
  const newNumber = 'HD-E2E-FE2-' + employee.id.slice(0, 8);
  await page.setViewportSize({ width: 1280, height: 850 });
  await capture('create-dialog', async () => {
    await page.getByRole('button', { name: 'Thêm hợp đồng' }).click();
    const dialog = page.getByRole('dialog', { name: 'Thêm hợp đồng lao động' });
    await dialog.getByLabel('Số hợp đồng').fill(newNumber);
    await dialog.getByLabel('Ngày ký').fill(dateShift(0));
    await dialog.getByLabel('Ngày bắt đầu').fill(dateShift(21));
    await dialog.getByLabel('Ngày kết thúc').fill(dateShift(100));
    await dialog.getByLabel('Lương theo hợp đồng (VND)').fill('20000000');
    await dialog.getByText('Xem trước hồ sơ lương').waitFor();
  }, 'Create contract with salary preview and a non-overlapping effective period');
  await capture('created-contract', async () => {
    await page.getByRole('dialog', { name: 'Thêm hợp đồng lao động' })
      .getByRole('button', { name: 'Lưu hợp đồng' }).click();
    await page.getByRole('region', { name: newNumber }).waitFor();
    if (!(await api(endpoint)).some(c => c.contractNumber === newNumber && c.baseSalary === 20000000))
      throw new Error('Created contract was not stored correctly');
  }, 'New signed contract persisted and listed');


  // INT-1: a contract that overlaps another one is refused by the form and, with no form in the way, by the API.
  const overlapNumber = 'HD-E2E-OVERLAP-' + employee.id.slice(0, 8);
  await capture('overlap-refused', async () => {
    await page.getByRole('button', { name: 'Thêm hợp đồng' }).click();
    const dialog = page.getByRole('dialog', { name: 'Thêm hợp đồng lao động' });
    await dialog.getByLabel('Số hợp đồng').fill(overlapNumber);
    await dialog.getByLabel('Ngày ký').fill(dateShift(0));
    await dialog.getByLabel('Ngày bắt đầu').fill(dateShift(50));
    await dialog.getByLabel('Ngày kết thúc').fill(dateShift(60));
    await dialog.getByLabel('Lương theo hợp đồng (VND)').fill('15000000');
    await dialog.getByRole('button', { name: 'Lưu hợp đồng' }).click();
    await dialog.getByRole('alert').getByText('Thời hạn hợp đồng chồng lấn với một hợp đồng đã có.').waitFor();
    const refused = await statusOf(endpoint, { method: 'POST', body: {
      contractNumber: overlapNumber, contractType: 'FIXED_TERM', signedOn: dateShift(0),
      startsOn: dateShift(50), endsOn: dateShift(60), baseSalary: 15000000, insuranceSalary: 15000000,
      allowancesJson: '[]', insured: true, taxMethod: 'PROGRESSIVE' } });
    if (refused !== 409) throw new Error(`The API answered ${refused} to an overlapping contract, not 409`);
    if ((await api(endpoint)).some(c => c.contractNumber === overlapNumber))
      throw new Error('An overlapping contract was stored');
  }, 'Overlapping term refused in the form (message) and by the API (409); nothing stored');
  await page.getByRole('dialog', { name: 'Thêm hợp đồng lao động' }).getByRole('button', { name: 'Hủy' }).click();

  // INT-1: departing from the default insurance/tax flags needs a reason, which the salary audit record keeps masked.
  const flagsNumber = 'HD-E2E-FLAGS-' + employee.id.slice(0, 8);
  await capture('flags-need-reason', async () => {
    await page.getByRole('button', { name: 'Thêm hợp đồng' }).click();
    const dialog = page.getByRole('dialog', { name: 'Thêm hợp đồng lao động' });
    await dialog.getByLabel('Số hợp đồng').fill(flagsNumber);
    await dialog.getByLabel('Ngày ký').fill(dateShift(0));
    await dialog.getByLabel('Ngày bắt đầu').fill(dateShift(110));
    await dialog.getByLabel('Ngày kết thúc').fill(dateShift(140));
    await dialog.getByLabel('Lương theo hợp đồng (VND)').fill('16000000');
    await dialog.getByRole('checkbox', { name: 'Có tham gia BHXH' }).uncheck();
    await dialog.getByLabel('Lý do thay đổi mặc định BHXH/thuế').waitFor();
    await dialog.getByRole('button', { name: 'Lưu hợp đồng' }).click();
    await dialog.getByRole('alert').getByText('Cần nhập lý do khi thay đổi cờ BHXH hoặc cách tính thuế mặc định.').waitFor();
    if ((await api(endpoint)).some(c => c.contractNumber === flagsNumber))
      throw new Error('A contract with changed flags and no reason was stored');
  }, 'Unticking the insurance flag asks for a reason and refuses to save without one');
  await capture('flags-saved-with-reason', async () => {
    const before = (await api(`/api/audit-logs?entityType=SALARY_PROFILE&entityId=${employee.id}`)).total;
    const dialog = page.getByRole('dialog', { name: 'Thêm hợp đồng lao động' });
    await dialog.getByLabel('Lý do thay đổi mặc định BHXH/thuế').fill('Đã thỏa thuận bằng văn bản');
    await dialog.getByRole('button', { name: 'Lưu hợp đồng' }).click();
    await page.getByRole('region', { name: flagsNumber }).waitFor();
    const saved = (await api(endpoint)).find(c => c.contractNumber === flagsNumber);
    if (!saved || saved.insured !== false) throw new Error('The changed insurance flag was not stored');
    const audit = await api(`/api/audit-logs?entityType=SALARY_PROFILE&entityId=${employee.id}`);
    if (audit.total !== before + 1) throw new Error('Saving the contract did not add one salary audit record');
    const detail = await api(`/api/audit-logs/${audit.items[0].id}`);
    if (detail.after.overrideReason !== '***' || JSON.stringify(detail).includes('Đã thỏa thuận'))
      throw new Error('The override reason must be masked in the audit record');
  }, 'Saved with the reason; one SALARY_PROFILE audit record, reason masked');



  // FE-4: a small valid DOCX fixture with known merge fields, uploaded through the actual UI.
  await capture('template-upload', async () => {
    await page.goto(`${BASE}/contract-templates`);
    await page.getByRole('heading', { name: 'Mẫu văn bản', exact: true }).waitFor();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'e2e-contract-template.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from('UEsDBBQAAAAIAOg4UF15bjPX6AAAAK0BAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH1QyU7DMBD9FWuuKHHggBCK0wPLETiUDxjZk8SqN3nc0v49Tlt6QIXjzFv1+tXeO7GjzDYGBbdtB4KCjsaGScHn+rV5AMEFg0EXAyk4EMNq6NeHRCyqNrCCuZT0KCXrmTxyGxOFiowxeyz1zJNMqDc4kbzrunupYygUSlMWDxj6Zxpx64p42df3qUcmxyCeTsQlSwGm5KzGUnG5C+ZXSnNOaKvyyOHZJr6pBJBXExbk74Cz7r0Ok60h8YG5vKGvLPkVs5Em6q2vyvZ/mys94zhaTRf94pZy1MRcF/euvSAebfjpL49zD99QSwMEFAAAAAgA6DhQXZv9N+qtAAAAKQEAAAsAAABfcmVscy8ucmVsc43POw7CMAwG4KtE3mlaBoRQ0y4IqSsqB7ASN61oHkrCo7cnAwNFDIy2f3+W6/ZpZnanECdnBVRFCYysdGqyWsClP232wGJCq3B2lgQsFKFt6jPNmPJKHCcfWTZsFDCm5A+cRzmSwVg4TzZPBhcMplwGzT3KK2ri27Lc8fBpwNpknRIQOlUB6xdP/9huGCZJRydvhmz6ceIrkWUMmpKAhwuKq3e7yCzwpuarF5sXUEsDBBQAAAAIAOg4UF3tlxSI8gAAAD8BAAARAAAAd29yZC9kb2N1bWVudC54bWxFjzFOxEAMRa8ymp6dQIFQlGS7FSUF1NFkYrKRMvbInt0QrXIIREXNISi2Q1xkb8IkCNF829/S+3axffGDOgJLT1jq602mFaCjtseu1E+Pu6s7rSRabO1ACKWeQPS2Ksa8JXfwgFElAEo+lnofY8iNEbcHb2VDATDtnom9jWnkzozEbWByIJL4fjA3WXZrvO1RL8iG2mmpYRFeZKXnEqxL0YFBgI+gq/vL+SOo79fL+Q07NVha+3fscnU6gQ8DTQA1Wg/zrL4+k+kII1sXazz4BvjPbqxALXawPM1zYVJgtSivup4h4OIDm9X4vc/8/179AFBLAQIUAxQAAAAIAOg4UF15bjPX6AAAAK0BAAATAAAAAAAAAAAAAACAAQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQDFAAAAAgA6DhQXZv9N+qtAAAAKQEAAAsAAAAAAAAAAAAAAIABGQEAAF9yZWxzLy5yZWxzUEsBAhQDFAAAAAgA6DhQXe2XFIjyAAAAPwEAABEAAAAAAAAAAAAAAIAB7wEAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAADAAMAuQAAABADAAAAAA==', 'base64'),
    });
    await page.getByRole('button', { name: 'Tải mẫu lên' }).click();
    // The drop zone shows the selected filename before upload finishes; wait for the
    // version list instead, which is refreshed only after the backend accepts the file.
    const versionList = page.getByRole('list', { name: 'Các phiên bản mẫu hợp đồng' });
    await versionList.getByText('e2e-contract-template.docx').waitFor();
    await versionList.getByText('Đang dùng').waitFor();
    const templates = await api('/api/contract-templates/FIXED_TERM');
    if (!templates.some(item => item.active && item.fileName === 'e2e-contract-template.docx'))
      throw new Error('Uploaded template did not become active');
  }, 'Upload valid DOCX into the versioned company template store');

  await capture('export-preview-masked', async () => {
    await page.goto(`${BASE}/employees/${employee.id}?tab=contracts`);
    const record = page.getByRole('region', { name: 'HD-E2E-ACTIVE-2026' });
    await record.waitFor();
    await record.getByRole('button', { name: 'Xuất hợp đồng HD-E2E-ACTIVE-2026' }).click();
    const dialog = page.getByRole('dialog', { name: 'Xuất hợp đồng HD-E2E-ACTIVE-2026' });
    await dialog.getByText('Xem trước dữ liệu trộn').waitFor();
    await dialog.getByText('•••••• ₫').first().waitFor();
    if (await dialog.getByText('18.000.000').count() > 0)
      throw new Error('Salary displayed before explicit reveal');
  }, 'Merge-field data preview with sensitive money masked');

  await capture('export-word', async () => {
    const downloadStarted = page.waitForEvent('download', { timeout: 65_000 });
    await page.getByRole('dialog', { name: 'Xuất hợp đồng HD-E2E-ACTIVE-2026' })
      .getByRole('button', { name: 'Tải Word' }).click();
    const download = await downloadStarted;
    if (!download.suggestedFilename().endsWith('.docx')) throw new Error('Expected a DOCX attachment');
    // The file is a zip: read its text the way Word would show it, tags removed.
    const xml = execFileSync('unzip', ['-p', await download.path(), 'word/document.xml'], { encoding: 'utf8' });
    const text = xml.replace(/<[^>]+>/g, '');
    const expected = 'Hợp đồng lao động: Nguyễn Văn An · HD-E2E-ACTIVE-2026 · 18.000.000';
    if (!text.includes(expected)) throw new Error(`The Word file reads "${text}", expected "${expected}"`);
    await page.getByRole('dialog', { name: 'Xuất hợp đồng HD-E2E-ACTIVE-2026' }).waitFor({ state: 'hidden' });
  }, 'DOCX created by backend from the uploaded template; the text has the diacritics and 18.000.000');

  await capture('export-pdf', async () => {
    const record = page.getByRole('region', { name: 'HD-E2E-ACTIVE-2026' });
    await record.getByRole('button', { name: 'Xuất hợp đồng HD-E2E-ACTIVE-2026' }).click();
    const downloadStarted = page.waitForEvent('download', { timeout: 65_000 });
    await page.getByRole('dialog', { name: 'Xuất hợp đồng HD-E2E-ACTIVE-2026' })
      .getByRole('button', { name: 'Tải PDF' }).click();
    const download = await downloadStarted;
    if (!download.suggestedFilename().endsWith('.pdf')) throw new Error('Expected a PDF attachment');
    const file = await download.path();
    let text = '';
    try {
      text = execFileSync('pdftotext', [file, '-'], { encoding: 'utf8' });
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      // No poppler on this machine: fall back to the file signature.
      if (!readFileSync(file).subarray(0, 5).toString().startsWith('%PDF')) throw new Error('Not a PDF file');
      report.push('_PDF text not read: pdftotext is not installed here; only the file signature was checked._', '');
    }
    if (text !== '' && !text.includes('Nguyễn Văn An') ) throw new Error(`The PDF reads "${text}"`);
    if (text !== '' && !text.includes('18.000.000')) throw new Error('The PDF does not show 18.000.000');
  }, 'PDF rendered from the same DOCX template; Vietnamese text and the salary read back');

  // INT-1: who may read or write contracts and the Hồ sơ lương. Needs the demo personas (the local compose stack).
  const me = await api('/api/me').catch(() => null);
  const personas = me?.demo?.enabled
    ? ((await api('/api/auth/demo/personas').catch(() => ({ personas: [] }))).personas ?? []) : [];
  const persona = key => personas.find(each => each.persona === key && each.available);
  if (persona('EMPLOYEE') && persona('LINE_MANAGER') && persona('DIRECTOR') && persona('ACCOUNTANT')) {
    const salaryQuery = `/api/employees/${employee.id}/salary-profile?from=${dateShift(0)}&to=${dateShift(10)}`;
    const probe = {
      method: 'POST', body: { contractNumber: 'HD-E2E-DENIED', contractType: 'FIXED_TERM', signedOn: dateShift(0),
        startsOn: dateShift(200), endsOn: null, baseSalary: 1, allowancesJson: '[]' } };
    const bearerOf = async key => (await api('/api/auth/demo/sign-in', { method: 'POST', body: { persona: key } })).accessToken;
    await capture('rbac-api', async () => {
      for (const key of ['EMPLOYEE', 'LINE_MANAGER', 'DIRECTOR']) {
        const bearer = await bearerOf(key);
        for (const path of [endpoint, salaryQuery]) {
          const status = await statusOf(path, {}, bearer);
          if (status !== 403) throw new Error(`${key} got ${status} from ${path}, expected 403`);
        }
      }
      const accountant = await bearerOf('ACCOUNTANT');
      if (await statusOf(endpoint, {}, accountant) !== 200) throw new Error('The Kế toán cannot read contracts');
      if (await statusOf(salaryQuery, {}, accountant) !== 200) throw new Error('The Kế toán cannot read the Hồ sơ lương');
      const write = await statusOf(endpoint, probe, accountant);
      if (write !== 403) throw new Error(`The Kế toán got ${write} writing a contract, expected 403`);
      if ((await api(endpoint)).some(c => c.contractNumber === 'HD-E2E-DENIED')) throw new Error('A refused contract was stored');
    }, 'Nhân viên, Quản lý trực tiếp and Giám đốc are refused (403); Kế toán reads but cannot write; nothing stored');

    const switchTo = async key => {
      const target = persona(key);
      await page.goto(`${BASE}/employees`);
      await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
      await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(target.fullName) }).click();
      await page.getByRole('region', { name: 'Thông báo kết quả thao tác' })
        .getByText(new RegExp(`Đang dùng Tài khoản của ${target.fullName}`)).waitFor();
      await page.goto(`${BASE}/employees/${employee.id}?tab=contracts`);
    };
    await capture('rbac-accountant-read-only', async () => {
      await switchTo('ACCOUNTANT');
      await page.getByRole('region', { name: 'HD-E2E-ACTIVE-2026' }).waitFor();
      if (await page.getByRole('button', { name: 'Thêm hợp đồng' }).count() > 0)
        throw new Error('The Kế toán is offered "Thêm hợp đồng"');
      if (await page.getByRole('button', { name: /^Thêm phụ lục cho hợp đồng/ }).count() > 0)
        throw new Error('The Kế toán is offered "Thêm phụ lục"');
    }, 'Kế toán sees the contracts with no add, amend, edit or delete control');
    await capture('rbac-director-denied', async () => {
      await switchTo('DIRECTOR');
      await page.getByRole('heading', { name: 'Bạn không có quyền xem hợp đồng' }).waitFor();
      if (await page.getByText('HD-E2E-ACTIVE-2026').count() > 0)
        throw new Error('A contract number is visible without EMPLOYEE_SENSITIVE_VIEW');
    }, 'Giám đốc (no sensitive view) gets the denied state and no contract data');
  } else {
    report.push('_Permissions by persona: skipped, the demo personas are off._', '');
  }

  report.push('Result: PASS');
} catch (err) {
  console.error(err);
  report.push('Result: FAILED', '', String(err));
  process.exitCode = 1;
} finally {
  writeFileSync(`${OUT}/report-contracts.md`, report.join('\n'));
  await browser.close();
}
