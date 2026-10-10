// Evidence for the Hộp thư duyệt and the request detail (HRM-12/FE-1, FE-2) against the real stack with the demo
// personas and the example data on (the local compose stack). Through the API, every persona but HR and Admin sends a
// profile update and the personas who approve level 1 approve what waits for them, so the requests reach HR. The
// browser, as the HR persona, walks "Chờ tôi duyệt" with the search and type filter, opens a request, tries Từ chối
// without a reason, returns it, approves the next one (the one after opens), shows "Đã xử lý" and the 390 views; then,
// as the Nhân viên persona, "Tôi đã gửi" and the returned request. Use a throwaway database (CI does), never the demo
// database.
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
let personas = [];
let sent = 0;
try {
  token = (await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })).accessToken;
  personas = (await api('/api/auth/demo/personas')).personas;
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
  if (waiting.length < 3) throw new Error(`only ${waiting.length} request(s) wait for HR`);
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

await step('The bell shows the unread count; its panel lists the requests waiting for HR', async () => {
  const bell = page.getByRole('banner').getByRole('button', { name: /^Thông báo/ });
  const before = await bell.getAttribute('aria-label');
  await bell.click();
  const panel = page.getByRole('dialog', { name: 'Thông báo' });
  await panel.getByRole('group', { name: 'Mới' }).waitFor();
  const rows = await panel.getByRole('group', { name: 'Mới' }).getByRole('link').count();
  return `"${before}", ${rows} new`;
});

await step('A notification opens its request and the count goes down', async () => {
  const bell = page.getByRole('banner').getByRole('button', { name: /^Thông báo/ });
  const before = await bell.getAttribute('aria-label');
  await page.getByRole('dialog', { name: 'Thông báo' }).getByRole('group', { name: 'Mới' }).getByRole('link').first().click();
  await page.waitForURL(/\/approvals\/[0-9a-f-]{36}$/);
  await page.waitForFunction(([label]) => document.querySelector('header button[aria-label^="Thông báo"]')?.getAttribute('aria-label') !== label, [before]);
  const after = await bell.getAttribute('aria-label');
  await page.goto(`${BASE}/approvals`);
  await table(WAITING).waitFor();
  await loaded();
  return `"${before}" → "${after}"`;
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

const dialog = () => page.getByRole('dialog');
const toasts = () => page.getByRole('region', { name: 'Thông báo kết quả thao tác' });
const decision = () => main().getByRole('region', { name: 'Quyết định của bạn' });
let returnedTo = '';

await step('A row opens the request: the proposed changes, the decision card, the steps and the log', async () => {
  await main().getByRole('tab', { name: /Chờ tôi duyệt/ }).click();
  await table(WAITING).waitFor();
  await loaded();
  await table(WAITING).getByRole('row').nth(1).getByRole('cell').nth(1).click();
  await page.waitForURL(/\/approvals\/[0-9a-f-]{36}$/);
  await main().getByRole('table', { name: 'Các trường thay đổi' }).waitFor();
  await decision().waitFor();
  await main().getByRole('list', { name: 'Các bước duyệt' }).waitFor();
  returnedTo = (await main().getByRole('heading', { level: 1 }).textContent()).replace(/^.* của /, '');
  return `${new URL(page.url()).pathname}; ${await main().getByText(/^Yêu cầu \d+ \/ \d+$/).textContent()}`;
});

await step('Từ chối asks for a reason and does not go without one', async () => {
  await decision().getByRole('button', { name: 'Từ chối' }).click();
  await dialog().getByRole('button', { name: 'Từ chối' }).click();
  await dialog().getByText('Nhập lý do để người gửi biết cần sửa gì.').waitFor();
});

await step('Trả về để bổ sung with a reason: the Toast, and the page turns read-only', async () => {
  await dialog().getByRole('button', { name: 'Hủy' }).click();
  await decision().getByRole('button', { name: 'Trả về' }).click();
  await dialog().getByLabel(/Cần bổ sung gì/).fill('Địa chỉ mới thiếu tên tòa nhà, ghi đầy đủ theo hợp đồng thuê nhà giúp chị.');
  await dialog().getByRole('button', { name: 'Trả về' }).click();
  await toasts().getByText(`Đã trả về cho ${returnedTo} bổ sung`).waitFor();
  await main().getByText('Trả về để bổ sung').first().waitFor();
  if (await decision().count()) throw new Error('the decision card is still there');
});

await step('Duyệt on the next request: the Toast, and the request after it opens', async () => {
  await page.goto(`${BASE}/approvals`);
  await table(WAITING).waitFor();
  await loaded();
  await table(WAITING).getByRole('row').nth(1).getByRole('cell').nth(1).click();
  await decision().waitFor();
  const before = page.url();
  await decision().getByLabel('Ghi chú').fill('Đã đối chiếu với hợp đồng.');
  await decision().getByRole('button', { name: 'Duyệt' }).click();
  await toasts().getByText(/^Đã duyệt/).first().waitFor();
  await page.waitForURL((url) => url.toString() !== before);
  await page.waitForLoadState('networkidle');
  return `then ${new URL(page.url()).pathname}`;
});

await step('"Đã xử lý": the requests HR returned and approved', async () => {
  await page.goto(`${BASE}/approvals?box=handled`);
  await table('Yêu cầu tôi đã xử lý. Bấm một dòng để mở yêu cầu.').waitFor();
  await loaded();
  await main().getByText('Trả về để bổ sung').first().waitFor();
});

await step('At 390 the inbox is a list of two-line rows', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/approvals`);
  await main().getByRole('list', { name: WAITING }).waitFor();
  await loaded();
});

await step('At 390 a request has its changes stacked and the decision pinned to the bottom', async () => {
  await main().getByRole('list', { name: WAITING }).getByRole('listitem').first().getByRole('link').first().click();
  await main().getByRole('group', { name: 'Quyết định của bạn' }).waitFor();
});

await step('As the sender HR returned a request to, "Tôi đã gửi": their own requests with the status and the step', async () => {
  // The sender of the returned request is one of the personas; their bell has the return.
  employee = personas.find((persona) => persona.fullName === returnedTo) ?? employee;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
  await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(employee.fullName) }).click();
  await page.getByRole('banner').getByRole('button', { name: `Menu Tài khoản: ${employee.fullName}` }).waitFor();
  await page.goto(`${BASE}/approvals?box=sent`);
  await table('Yêu cầu tôi đã gửi. Bấm một dòng để mở yêu cầu.').waitFor();
  await loaded();
  const rows = await table('Yêu cầu tôi đã gửi. Bấm một dòng để mở yêu cầu.').getByRole('row').count();
  return `${employee.fullName}: ${rows - 1} request(s)`;
});

await step('The sender\'s bell says their request came back for more info', async () => {
  await page.getByRole('banner').getByRole('button', { name: /^Thông báo/ }).click();
  const panel = page.getByRole('dialog', { name: 'Thông báo' });
  await panel.getByText(/trả về .* để bạn bổ sung/).first().waitFor();
});

await step('The sender opens their request: why it came back, or that it waits', async () => {
  await page.keyboard.press('Escape');
  await table('Yêu cầu tôi đã gửi. Bấm một dòng để mở yêu cầu.').getByRole('row').nth(1).getByRole('cell').first().click();
  await main().getByRole('list', { name: 'Các bước duyệt' }).waitFor();
  await main().getByRole('heading', { level: 1 }).waitFor();
});

report.push('Result: passed.');
await finish(0);
