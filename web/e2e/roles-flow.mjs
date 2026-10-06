// Evidence for the role and permission matrix (HRM-04/FE-4a, FE-4b, FE-4c) against the real stack: the "Vai trò và quyền"
// tab of /accounts as the Admin at 1280 and 390, who ticks a permission for HR, discards, ticks again and saves;
// and as an HR Account, which gets the access without signing in again and sees the matrix read-only. Then the leave
// guard on a tab switch, "Khôi phục mặc định" from the page, and the arrow keys across the matrix.
// It puts every role back to its default permissions through the API at its start (an earlier run may have failed midway) and at
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

const EDIT = 'Thêm, sửa, đặt mật khẩu tạm, khóa và mở khóa Tài khoản';
const box = (role, permission) => page.getByRole('checkbox', { name: `${role}: ${permission}`, exact: true });
const bar = () => page.getByRole('region', { name: 'Thay đổi chưa lưu' });
const header = (role) => matrixOn(page).getByRole('columnheader', { name: new RegExp(`^${role}`) });
/** The label that fills the cell is what a person clicks; the input itself is visually hidden. */
const tick = (role, permission) => box(role, permission).locator('xpath=..').click();
const LAST_ROW = 'Thêm, sửa, ngừng hoạt động và xóa mục trong Danh mục';
/** Keyboard focus on a box of the last row: its cell must show whole, above the Save bar and beside the first column. */
async function expectFocusedCellClear(role) {
  await box(role, LAST_ROW).focus();
  await page.waitForTimeout(200);
  const cell = await box(role, LAST_ROW).locator('xpath=ancestor::td').boundingBox();
  const top = (await bar().boundingBox()).y;
  if (cell.y + cell.height > top + 1) throw new Error(`the focused cell of ${role} ends at ${cell.y + cell.height}, under the Save bar at ${top}`);
  const lead = await matrixOn(page).getByRole('rowheader', { name: LAST_ROW, exact: true }).boundingBox();
  if (cell.x < lead.x + lead.width - 1) throw new Error(`the focused cell of ${role} is under the permission column`);
}
async function expectChecked(role, permission, checked) {
  await box(role, permission).and(page.locator(checked ? ':checked' : ':not(:checked)')).waitFor();
}

await step('Admin: the editable matrix with the default permissions', async () => {
  await page.goto(`${BASE}/`);
  await signIn(page, EMAIL, PASSWORD);
  await nav(page).getByRole('link', { name: 'Tài khoản và vai trò' }).click();
  await page.getByRole('tab', { name: 'Vai trò và quyền' }).click();
  await page.waitForURL(/[?&]view=roles\b/);
  await page.getByText('Đánh dấu ô để cấp quyền cho vai trò, rồi lưu').waitFor();
  const headers = await matrixOn(page).getByRole('columnheader').allTextContents();
  if (headers.map((text) => text.replace('Đủ mọi quyền', '')).join('|') !== ['Quyền', ...ROLE_NAMES].join('|')) throw new Error(`the columns are [${headers.join(', ')}]`);
  await header('Admin').getByText('Đủ mọi quyền').waitFor();
  await expectRow(page, 'Phạm vi dữ liệuCố định theo vai trò', ['Toàn công ty', 'Toàn công ty', 'Đơn vị quản lý', 'Bản thân', 'Toàn công ty', 'Toàn công ty', 'Bản thân']);
  await expectChecked('HR', LIST, false);
  await expectChecked('HR', 'Xem Cơ cấu tổ chức và Sơ đồ tổ chức', true);
  // Locked: the Admin column and the base permissions have no box.
  if ((await page.getByRole('checkbox', { name: /^Admin:/ }).count()) !== 0) throw new Error('the Admin column has checkboxes');
  if ((await page.getByRole('checkbox').count()) !== 36) throw new Error(`the matrix has ${await page.getByRole('checkbox').count()} checkboxes, not 6 roles × 6 permissions`);
  if ((await bar().count()) !== 0) throw new Error('a clean matrix shows the Save bar');
  const fits = await region(page).evaluate((element) => element.scrollWidth <= element.clientWidth);
  if (!fits) throw new Error('the matrix scrolls sideways at 1280');
  return 'GET /api/roles after POST /api/roles/reset; boxes for 6 roles × 6 permissions, bare checks for Admin and the base permissions; no sideways scroll at 1280';
});
await step('Admin ticks the edit permission for HR: the list permission it requires is ticked along', async () => {
  await tick('HR', EDIT);
  await expectChecked('HR', EDIT, true);
  await expectChecked('HR', LIST, true);
  await header('HR').getByText('2 thay đổi').waitFor();
  await bar().getByText('2 thay đổi chưa lưu ở 1 vai trò').waitFor();
  await page.getByText('Đã đổi, chưa lưu').last().waitFor();
  await expectFocusedCellClear('Nhân viên');
  return 'both cells are marked; the column header and the Save bar count 2 changes; a focused box of the last row stays above the bar';
});
await step('Discard: the saved values are back and the Save bar is gone', async () => {
  await bar().getByRole('button', { name: 'Hủy thay đổi' }).click();
  await bar().waitFor({ state: 'hidden' });
  await expectChecked('HR', EDIT, false);
  await expectChecked('HR', LIST, false);
  return 'no request was sent';
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
await step('Admin gives HR the list permission and saves: the toast, no mark left', async () => {
  await tick('HR', LIST);
  await bar().getByText('1 thay đổi chưa lưu ở 1 vai trò').waitFor();
  await bar().getByRole('button', { name: 'Lưu thay đổi' }).click();
  await page.getByText('Đã lưu quyền của 1 vai trò: HR').waitFor();
  await bar().waitFor({ state: 'hidden' });
  await region(page).and(page.locator(':focus')).waitFor();
  await expectChecked('HR', LIST, true);
  if ((await header('HR').getByText('thay đổi').count()) !== 0) throw new Error('the HR column still counts a change');
  const stored = (await api('/api/roles')).roles.find((rule) => rule.role === 'HR').permissions;
  if (!stored.includes('ACCOUNT_LIST') || stored.length !== hrDefaults.length + 1) throw new Error(`the server holds [${stored.join(', ')}] for HR`);
  return 'PUT /api/roles/permissions with the full list of HR; GET /api/roles confirms what is stored';
});
await step('HR: the item appears without signing in again', async () => {
  // Coming back to the tab makes the app read GET /api/me again (HRM-04/FE-3).
  await theirs.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await nav(theirs).getByRole('link', { name: 'Tài khoản và vai trò' }).waitFor();
  return 'the permissions of GET /api/me follow at the next request';
}, theirs);
await step('HR: the matrix is read-only, says so, and shows the stored change', async () => {
  await nav(theirs).getByRole('link', { name: 'Tài khoản và vai trò' }).click();
  await theirs.getByRole('tab', { name: 'Vai trò và quyền' }).click();
  await theirs.getByText('Bạn chỉ xem được quyền của từng vai trò').waitFor();
  await expectRow(theirs, LIST, [YES, YES, NO, NO, NO, NO, NO]);
  if ((await theirs.getByRole('checkbox').count()) !== 0) throw new Error('the read-only matrix has checkboxes');
  if ((await theirs.getByRole('button', { name: 'Thêm tài khoản' }).count()) !== 0) throw new Error('HR sees the add button');
  return 'ACCOUNT_LIST without ACCOUNT_EDIT: checks and dashes, no boxes, no Save bar';
}, theirs);
await step('Admin 390: the whole page, with the swipe hint above the table', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expectChecked('HR', LIST, true);
  await page.getByText('Vuốt ngang để xem các vai trò khác').waitFor();
  return 'the stored change is there after a reload';
});
await step('Admin 390: a change, scrolled sideways: the permission column stays and the Save bar sits at the bottom edge', async () => {
  await tick('HR', 'Sửa Thông tin công ty và logo');
  await bar().getByText('1 thay đổi chưa lưu ở 1 vai trò').waitFor();
  const moved = await scrollToLastRole(page);
  const size = page.viewportSize();
  const box = await bar().boundingBox();
  if (Math.abs(box.y + box.height - size.height) > 1 || box.x !== 0 || Math.abs(box.width - size.width) > 1) throw new Error(`the Save bar is at ${JSON.stringify(box)}`);
  for (const name of ['Hủy thay đổi', 'Lưu thay đổi']) {
    const button = await bar().getByRole('button', { name }).boundingBox();
    if (button.height < 44) throw new Error(`"${name}" is ${button.height}px high`);
  }
  await expectFocusedCellClear('HR');
  await expectFocusedCellClear('Nhân viên');
  return `scrolled ${Math.round(moved)}px to the last role; the bar is full width with 44px buttons; focused boxes of the last row stay clear of it`;
});
await step('Admin 390: switching to the Accounts tab with an unsaved change asks first', async () => {
  await page.getByRole('tab', { name: 'Tài khoản' }).click();
  await page.getByRole('dialog', { name: 'Rời trang và bỏ thay đổi chưa lưu?' }).getByText('1 thay đổi quyền chưa lưu sẽ bị mất.').waitFor();
  if (!/[?&]view=roles\b/.test(page.url())) throw new Error(`the tab changed before the answer: ${page.url()}`);
  return 'the same guard covers another route and closing the page (the browser asks)';
});
await step('Admin 390: staying keeps the change; it is then discarded', async () => {
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await bar().getByText('1 thay đổi chưa lưu ở 1 vai trò').waitFor();
  if (!/[?&]view=roles\b/.test(page.url())) throw new Error(`the tab changed: ${page.url()}`);
  await bar().getByRole('button', { name: 'Hủy thay đổi' }).click();
  await bar().waitFor({ state: 'hidden' });
});
await step('Admin: "Khôi phục mặc định" is offered while customized, and asks first', async () => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole('button', { name: 'Khôi phục mặc định' }).click();
  await page.getByRole('dialog', { name: 'Khôi phục quyền mặc định cho mọi vai trò?' }).waitFor();
});
await step('Admin confirms: every role is back to its defaults and the action goes away', async () => {
  await page.getByRole('dialog').getByRole('button', { name: 'Khôi phục mặc định' }).click();
  await page.getByText('Đã khôi phục quyền mặc định cho mọi vai trò').waitFor();
  await expectChecked('HR', LIST, false);
  await page.getByRole('button', { name: 'Khôi phục mặc định' }).waitFor({ state: 'hidden' });
  const matrix = await api('/api/roles');
  if (matrix.customized) throw new Error('the matrix is still customized after the reset');
  return 'POST /api/roles/reset from the page; GET /api/roles confirms customized is false';
});
await step('Admin: the arrow keys move across the matrix, locked cells included', async () => {
  await box('HR', LIST).focus();
  await page.keyboard.press('ArrowLeft');
  const locked = await page.evaluate(() => document.activeElement?.textContent ?? '');
  if (!locked.includes('Admin: ' + 'Xem danh sách Tài khoản và quyền của từng vai trò') || !locked.includes('không đổi được')) throw new Error(`ArrowLeft reached "${locked}"`);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await box('HR', EDIT).and(page.locator(':focus')).waitFor();
  return 'ArrowLeft from HR reaches the locked Admin cell, which is read with its reason; ArrowRight, ArrowDown reach the HR edit box';
});
await step('After the reset HR loses the access again', async () => {
  await theirs.reload();
  await theirs.getByRole('heading', { level: 2, name: 'Bạn không có quyền xem Tài khoản và vai trò' }).waitFor();
  if ((await nav(theirs).getByRole('link', { name: 'Tài khoản và vai trò' }).count()) !== 0) throw new Error('HR still sees the Accounts and roles item');
  return 'the reset applies at the next request of HR';
}, theirs);

report.push(`Result: all ${n} steps passed.`);
await finish(0);
