// Evidence for the Hộp thư duyệt (HRM-12/FE-1) against the real stack with the demo personas and the example data on
// (the local compose stack). Through the API, every persona but HR and Admin sends a profile update, the personas who
// approve level 1 approve what waits for them, so the requests reach HR, and HR rejects one. The browser, as the HR
// persona, walks "Chờ tôi duyệt" with the search and type filter, "Đã xử lý", opens a request and shows the 390 rows;
// then, as the Nhân viên persona, "Tôi đã gửi". Use a throwaway database (CI does), never the demo database.
// Writes screenshots and a Markdown report; exits non-zero at the first step that fails.
//   BASE_URL (http://localhost:5173)  OUT (e2e-out)  IMG_BASE (image URL prefix)  HRM_ADMIN_PASSWORD
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';
const SENDERS = ['EMPLOYEE', 'LINE_MANAGER', 'PROJECT_MANAGER', 'ACCOUNTANT', 'DIRECTOR'];

mkdirSync(OUT, { recursive: true });
const report = ['### Hộp thư duyệt (real backend, PostgreSQL)', ''];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
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
  writeFileSync(`${OUT}/report-approvals.md`, report.join('\n'));
  await browser.close();
  process.exit(code);
}

async function step(title, run) {
  n += 1;
  const slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const file = `approvals-${String(n).padStart(2, '0')}-${slug}.png`;
  try {
    const note = await run();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
    report.push(`**${n}. ${title}**${note ? `: ${note}` : ''}`, '', `![${title}](${IMG_BASE}/${file}?raw=true)`, '');
    console.log(`ok ${n}. ${title}`);
  } catch (error) {
    await page.screenshot({ path: `${OUT}/${file}` }).catch(() => {});
    report.push(`**${n}. ${title}: FAILED**`, '', '```', String(error).slice(0, 1500), '```', '', `![${title}](${IMG_BASE}/${file}?raw=true)`, '', 'Result: FAILED.');
    console.error(`FAILED ${n}. ${title}\n${error}`);
    await finish(1);
  }
}

const signInAs = async (persona) => {
  token = (await api('/api/auth/demo/sign-in', { method: 'POST', body: { persona } })).accessToken;
};
/** A valid mobile number that differs on every run, so the request always changes something. */
const phone = (i) => `09${String(Date.now() + i).slice(-8)}`;

// --- Data through the API. ---
let hr = null;
let employee = null;
let sent = 0;
try {
  token = (await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })).accessToken;
  const personas = (await api('/api/auth/demo/personas')).personas;
  hr = personas.find((persona) => persona.persona === 'HR');
  employee = personas.find((persona) => persona.persona === 'EMPLOYEE');
  if (!hr?.available || !employee?.available) throw new Error('the HR or Nhân viên persona is missing or locked (HRM_DEMO_PERSONAS, HRM_EXAMPLE_DATA)');
  for (const [i, persona] of SENDERS.entries()) {
    if (!personas.find((p) => p.persona === persona)?.available) continue;
    await signInAs(persona);
    // The body is every contact field as wanted: the current ones, with a new phone and address.
    const { personal } = await api(`/api/employees/${(await api('/api/me')).employeeId}`);
    const body = { personalEmail: personal.personalEmail, phone: phone(i), address: `${10 + i} Lý Thường Kiệt, Hoàn Kiếm, Hà Nội`, emergencyContact: personal.emergencyContact, note: 'Cập nhật theo hợp đồng thuê nhà mới' };
    try {
      await api('/api/profile-update-requests', { method: 'POST', body });
      sent += 1;
    } catch (error) {
      // A run before left an open request: it is still in the inbox.
      if (error.status !== 409) throw error;
    }
  }
  // The approvers of level 1 approve, so the requests reach HR at level 2.
  for (const persona of SENDERS) {
    if (!personas.find((p) => p.persona === persona)?.available) continue;
    await signInAs(persona);
    for (const item of (await api('/api/approvals?box=WAITING&size=50')).items) {
      if (item.rule !== 'ROLE') await api(`/api/approvals/${item.id}/approve`, { method: 'POST', body: { comment: 'Đã kiểm tra' } }).catch(() => {});
    }
  }
  await signInAs('HR');
  const waiting = (await api('/api/approvals?box=WAITING&size=50')).items;
  if (waiting.length < 2) throw new Error(`only ${waiting.length} request(s) wait for HR`);
  await api(`/api/approvals/${waiting.at(-1).id}/reject`, { method: 'POST', body: { comment: 'Địa chỉ chưa đúng hợp đồng' } });
} catch (error) {
  report.push('**Preparing data through the API: FAILED**', '', '```', String(error).slice(0, 1500), '```', '', 'Result: FAILED.');
  console.error(`FAILED preparing data\n${error}`);
  await finish(1);
}

const main = () => page.getByRole('main');
const table = (name) => main().getByRole('table', { name });
const WAITING = 'Yêu cầu chờ tôi duyệt. Bấm một dòng để mở yêu cầu.';
const loaded = async () => main().getByRole('status', { name: 'Đang tải yêu cầu' }).waitFor({ state: 'detached' }).catch(() => {});

await step('HR opens the inbox from the sidebar: requests waiting for them, with the step, the sent time and the auto-approve date', async () => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('banner').getByRole('button', { name: 'Demo as…' }).click();
  await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(hr.fullName) }).click();
  await page.getByRole('banner').getByRole('button', { name: `Menu Tài khoản: ${hr.fullName}` }).waitFor();
  const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });
  await nav.getByRole('link', { name: /Hộp thư duyệt/ }).click();
  await table(WAITING).waitFor();
  await loaded();
  const rows = await table(WAITING).getByRole('row').count();
  const badge = await nav.getByRole('link', { name: /Hộp thư duyệt/ }).textContent();
  return `${rows - 1} request(s) waiting (${sent} sent in this run); sidebar item "${badge?.trim()}"`;
});

await step('Search by the sender and filter by request type', async () => {
  const first = await table(WAITING).getByRole('row').nth(1).getByRole('link').first().textContent();
  const word = first.trim().split(' ').at(-1);
  await main().getByRole('searchbox', { name: 'Tìm theo tên hoặc mã người gửi' }).fill(word);
  await page.waitForURL(/q=/);
  await loaded();
  await main().getByRole('combobox', { name: 'Loại yêu cầu' }).click();
  await page.getByRole('option', { name: 'Cập nhật hồ sơ' }).click();
  await page.waitForURL(/type=PROFILE_UPDATE/);
  await loaded();
  return `"${word}", Cập nhật hồ sơ`;
});

await step('A search that matches nothing says so and offers to clear the filters', async () => {
  await main().getByRole('searchbox', { name: 'Tìm theo tên hoặc mã người gửi' }).fill('zzzz');
  await main().getByText('Không có yêu cầu nào khớp “zzzz”').waitFor();
  await main().getByRole('button', { name: 'Xóa bộ lọc' }).first().click();
  await table(WAITING).waitFor();
});

await step('"Đã xử lý": the request HR rejected, with its outcome', async () => {
  await main().getByRole('tab', { name: 'Đã xử lý' }).click();
  await table('Yêu cầu tôi đã xử lý. Bấm một dòng để mở yêu cầu.').waitFor();
  await loaded();
  await main().getByText('Bị từ chối').first().waitFor();
});

await step('A row opens the request', async () => {
  await main().getByRole('tab', { name: /Chờ tôi duyệt/ }).click();
  await table(WAITING).waitFor();
  await loaded();
  await table(WAITING).getByRole('row').nth(1).getByRole('cell').nth(1).click();
  await page.waitForURL(/\/approvals\/[0-9a-f-]{36}$/);
  await main().getByRole('heading', { level: 1 }).waitFor();
  return new URL(page.url()).pathname;
});

await step('At 390 the inbox is a list of two-line rows', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/approvals`);
  await main().getByRole('list', { name: WAITING }).waitFor();
  await loaded();
});

await step('As the Nhân viên persona, "Tôi đã gửi": their own requests with the status and the step', async () => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
  await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(employee.fullName) }).click();
  await page.getByRole('banner').getByRole('button', { name: `Menu Tài khoản: ${employee.fullName}` }).waitFor();
  await page.goto(`${BASE}/approvals?box=sent`);
  await table('Yêu cầu tôi đã gửi. Bấm một dòng để mở yêu cầu.').waitFor();
  await loaded();
  const statuses = await table('Yêu cầu tôi đã gửi. Bấm một dòng để mở yêu cầu.').getByRole('row').count();
  return `${statuses - 1} request(s)`;
});

report.push('Result: passed.');
await finish(0);
