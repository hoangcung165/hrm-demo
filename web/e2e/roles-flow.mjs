// Evidence for the role and permission matrix (HRM-04/FE-4a) against the real stack: the "Vai trò và quyền" tab of
// /accounts as the Admin at 1280 and 390, and as an HR Account once its role holds ACCOUNT_LIST.
// The matrix is read-only in this slice, so the flow changes the permissions of HR through the API
// (PUT /api/roles/permissions) and shows that the screen follows what is stored.
// It puts every role back to its default permissions at its start (an earlier run may have failed midway) and at
// its end, also when a step fails: the other flows and the smoke script share the database.
// It creates one fictional HR Account (kept and reused by a re-run, which sets its password again): use a throwaway
// database (CI does), never the demo database.
// Writes screenshots and a Markdown report; exits non-zero at the first step that fails.
// Run it after accounts-flow.mjs; it does not depend on the demo personas or on the Accounts other flows create.
//   BASE_URL (http://localhost:5173)  OUT (e2e-out)  IMG_BASE (image URL prefix)  HRM_ADMIN_PASSWORD
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';
// A fictional person of a fictional company, with a password only this flow uses.
const HR = { fullName: 'Lâm Thị Hoa', email: 'hoa.lam@congty.vn', roles: ['HR', 'EMPLOYEE'], password: 'Vai-tro-2026' };
const LIST = 'Xem danh sách Tài khoản và quyền của từng vai trò';
const ROLE_NAMES = ['Admin', 'HR', 'Quản lý trực tiếp', 'PM', 'Kế toán', 'Giám đốc', 'Nhân viên'];
const YES = 'Có';
const NO = '–Không';

mkdirSync(OUT, { recursive: true });
const report = ['### Role and permission matrix (real backend, PostgreSQL)', ''];
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
const resetRoles = () => api('/api/roles/reset', { method: 'POST' });

// The app shell scrolls inside <main>, so a full-page screenshot needs a taller window for that moment.
async function capture(path, shown) {
  const size = shown.viewportSize();
  const extra = await shown.evaluate(() => {
    const main = document.getElementById('main');
    return main ? main.scrollHeight - main.clientHeight : 0;
  }).catch(() => 0);
  if (extra > 0) {
    await shown.setViewportSize({ width: size.width, height: size.height + extra });
    await shown.waitForTimeout(200);
  }
  await shown.screenshot({ path, fullPage: true });
  if (extra > 0) await shown.setViewportSize(size);
}

async function finish(code) {
  // Whatever happened, the roles go back to their defaults.
  if (token) await resetRoles().catch((error) => report.push('', `**Restoring the default permissions FAILED:** ${String(error).slice(0, 300)}`));
  writeFileSync(`${OUT}/report-roles.md`, report.join('\n'));
  await browser.close();
  process.exit(code);
}

/** `shown` is the page of the screenshot: the Admin's, or the second browser of the HR Account. */
async function step(title, run, shown = page) {
  n += 1;
  const file = `roles-${String(n).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
  try {
    const note = await run();
    await shown.waitForTimeout(300);
    await capture(`${OUT}/${file}`, shown);
    report.push(`**${n}. ${title}**${note ? `: ${note}` : ''}`, '', `![${title}](${IMG_BASE}/${file}?raw=true)`, '');
    console.log(`ok ${n}. ${title}`);
  } catch (error) {
    await capture(`${OUT}/${file}`, shown).catch(() => {});
    report.push(`**${n}. ${title}: FAILED**`, '', '```', String(error).slice(0, 1500), '```', '', `![${title}](${IMG_BASE}/${file}?raw=true)`, '');
    report.push('Result: FAILED.');
    console.error(`FAILED ${n}. ${title}\n${error}`);
    await finish(1);
  }
}

// --- Data through the API: default permissions, and the HR Account with a password this flow knows. ---
let hrDefaults = [];
try {
  token = (await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })).accessToken;
  const matrix = await resetRoles();
  if (matrix.customized) throw new Error('the matrix is still customized after a reset');
  hrDefaults = matrix.roles.find((rule) => rule.role === 'HR').permissions;
  if (hrDefaults.includes('ACCOUNT_LIST')) throw new Error('HR has ACCOUNT_LIST by default: the flow has nothing to show');
  const found = (await api(`/api/accounts?${new URLSearchParams({ q: HR.email, size: '1' })}`)).items[0];
  if (found) {
    await api(`/api/accounts/${found.id}/unlock`, { method: 'POST' });
    await api(`/api/accounts/${found.id}/password`, { method: 'PUT', body: { password: HR.password } });
  } else {
    await api('/api/accounts', { method: 'POST', body: { fullName: HR.fullName, email: HR.email, roles: HR.roles, password: HR.password, employeeId: null } });
  }
} catch (error) {
  report.push('**Preparing data through the API: FAILED**', '', '```', String(error).slice(0, 1500), '```', '', 'Result: FAILED.');
  console.error(`FAILED preparing data\n${error}`);
  await finish(1);
}

const matrixOn = (on) => on.getByRole('table', { name: 'Quyền của từng vai trò' });
const region = (on) => on.getByRole('region', { name: 'Quyền của từng vai trò' });
/** The cells of a permission or of the data scope row, one text per role. */
const valuesOf = (on, rowHeader) =>
  matrixOn(on).getByRole('row').filter({ has: on.getByRole('rowheader', { name: rowHeader, exact: true }) }).getByRole('cell').allTextContents();
/** Waits until the row reads like this (a reload or a refetch may still be on its way). */
async function expectRow(on, rowHeader, values) {
  await matrixOn(on).getByRole('rowheader', { name: rowHeader, exact: true }).waitFor();
  await on.waitForFunction(
    ({ name, want }) => {
      const header = [...document.querySelectorAll('table th[scope="row"]')].find((th) => th.textContent === name);
      return header && [...header.parentElement.querySelectorAll('td')].map((td) => td.textContent).join('|') === want;
    },
    { name: rowHeader, want: values.join('|') },
  ).catch(async () => {
    throw new Error(`"${rowHeader}" reads [${(await valuesOf(on, rowHeader)).join(', ')}], not [${values.join(', ')}]`);
  });
}
const nav = (on) => on.getByRole('navigation', { name: 'Điều hướng chính' });
async function signIn(on, email, password) {
  await on.getByLabel('Email').fill(email);
  await on.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await on.getByRole('button', { name: 'Đăng nhập' }).click();
  await on.getByRole('button', { name: /Menu Tài khoản/ }).waitFor();
}
/** Scrolls the matrix sideways to its end and checks that the permission column did not move. */
async function scrollToLastRole(on) {
  const lead = matrixOn(on).getByRole('columnheader', { name: 'Quyền', exact: true });
  const before = await lead.boundingBox();
  const moved = await region(on).evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    return element.scrollLeft;
  });
  if (moved <= 0) throw new Error('the matrix does not scroll sideways at this width');
  const after = await lead.boundingBox();
  if (Math.abs(after.x - before.x) > 1) throw new Error(`the permission column moved from ${before.x} to ${after.x}`);
  const last = await matrixOn(on).getByRole('columnheader', { name: 'Nhân viên', exact: true }).boundingBox();
  const box = await region(on).boundingBox();
  if (last.x + last.width > box.x + box.width + 1) throw new Error('the last role is not in view after scrolling');
  if (await on.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error('the page itself scrolls sideways');
  return moved;
}

await step('Admin: the Roles and permissions tab shows the matrix with the default permissions', async () => {
  await page.goto(`${BASE}/`);
  await signIn(page, EMAIL, PASSWORD);
  await nav(page).getByRole('link', { name: 'Tài khoản và vai trò' }).click();
  await page.getByRole('tab', { name: 'Vai trò và quyền' }).click();
  await page.waitForURL(/[?&]view=roles\b/);
  const headers = await matrixOn(page).getByRole('columnheader').allTextContents();
  if (headers.join('|') !== ['Quyền', ...ROLE_NAMES].join('|')) throw new Error(`the columns are [${headers.join(', ')}]`);
  await expectRow(page, 'Phạm vi dữ liệu', ['Toàn công ty', 'Toàn công ty', 'Đơn vị quản lý', 'Bản thân', 'Toàn công ty', 'Toàn công ty', 'Bản thân']);
  await expectRow(page, 'Xem Thông tin công ty', Array(7).fill(YES));
  await expectRow(page, LIST, [YES, NO, NO, NO, NO, NO, NO]);
  await expectRow(page, 'Xem Cơ cấu tổ chức và Sơ đồ tổ chức', [YES, YES, NO, NO, NO, YES, NO]);
  if ((await page.getByRole('checkbox').count()) !== 0) throw new Error('the matrix has checkboxes');
  return 'GET /api/roles after POST /api/roles/reset: 7 roles, the data scope row, permissions under their groups; read-only';
});
await step('Admin 1280: the roles scroll sideways inside the table, the permission column stays', async () => {
  const moved = await scrollToLastRole(page);
  return `scrolled ${Math.round(moved)}px to the last role; the page itself does not scroll sideways`;
});
const theirs = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
theirs.setDefaultTimeout(15_000);
await step('HR with the default permissions: no Accounts and roles item, /accounts is denied', async () => {
  await theirs.goto(`${BASE}/`);
  await signIn(theirs, HR.email, HR.password);
  if ((await nav(theirs).getByRole('link', { name: 'Tài khoản và vai trò' }).count()) !== 0) throw new Error('HR sees the Accounts and roles item');
  await theirs.goto(`${BASE}/accounts?view=roles`);
  await theirs.getByRole('heading', { level: 2, name: 'Bạn không có quyền xem Tài khoản và vai trò' }).waitFor();
  return `signed in as ${HR.fullName} (HR, Nhân viên) in a second browser`;
}, theirs);
await step('HR after its role got ACCOUNT_LIST: the item appears without signing in again', async () => {
  const matrix = await api('/api/roles/permissions', { method: 'PUT', body: { roles: [{ role: 'HR', permissions: [...hrDefaults, 'ACCOUNT_LIST'] }] } });
  if (!matrix.customized) throw new Error('the matrix is not customized after the change');
  // Coming back to the tab makes the app read GET /api/me again (HRM-04/FE-3).
  await theirs.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await nav(theirs).getByRole('link', { name: 'Tài khoản và vai trò' }).waitFor();
  return 'PUT /api/roles/permissions for HR through the API; the permissions of GET /api/me follow at the next request';
}, theirs);
await step('HR: the matrix shows the stored change', async () => {
  await nav(theirs).getByRole('link', { name: 'Tài khoản và vai trò' }).click();
  await theirs.getByRole('tab', { name: 'Vai trò và quyền' }).click();
  await expectRow(theirs, LIST, [YES, YES, NO, NO, NO, NO, NO]);
  if ((await theirs.getByRole('checkbox').count()) !== 0) throw new Error('the matrix has checkboxes');
  if ((await theirs.getByRole('button', { name: 'Thêm tài khoản' }).count()) !== 0) throw new Error('HR sees the add button');
  return 'HR now has "Có" for the account list permission; no add button without ACCOUNT_EDIT';
}, theirs);
await step('Admin 390: the whole page, with the swipe hint above the table', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expectRow(page, LIST, [YES, YES, NO, NO, NO, NO, NO]);
  await page.getByText('Vuốt ngang để xem các vai trò khác').waitFor();
  return 'the Admin sees the stored change too after a reload';
});
await step('Admin 390: scrolled sideways, the permission column stays in view', async () => {
  const moved = await scrollToLastRole(page);
  await region(page).scrollIntoViewIfNeeded();
  return `scrolled ${Math.round(moved)}px to the last role`;
});
await step('After the reset HR loses the access again', async () => {
  const matrix = await resetRoles();
  if (matrix.customized) throw new Error('the matrix is still customized after the reset');
  await theirs.reload();
  await theirs.getByRole('heading', { level: 2, name: 'Bạn không có quyền xem Tài khoản và vai trò' }).waitFor();
  if ((await nav(theirs).getByRole('link', { name: 'Tài khoản và vai trò' }).count()) !== 0) throw new Error('HR still sees the Accounts and roles item');
  return 'POST /api/roles/reset through the API; every role is back to its defaults';
}, theirs);

report.push(`Result: all ${n} steps passed.`);
await finish(0);
