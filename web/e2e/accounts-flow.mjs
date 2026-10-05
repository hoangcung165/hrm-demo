// Evidence for the Accounts and roles screens (HRM-04) against the real stack: signs in as the Admin, makes sure the
// database has enough Accounts for two pages (created through the API; a re-run creates only the missing ones), then
// walks the read-only Account list (HRM-04/FE-1): paging, search, filters, the states, the roles tab, an Account
// without the permission, and the phone layout.
// It does not depend on how many other Accounts exist or how they sort (the demo personas may or may not be seeded):
// every count it checks is read from GET /api/accounts with the same filters, and rows are found by searching.
// It leaves its 25 Accounts behind with a known temporary password: use a throwaway database (CI does).
// Writes screenshots and a Markdown report; exits non-zero at the first step that fails.
// Run it after auth-flow.mjs, which leaves the Admin password at `reset-password-2`.
//   BASE_URL (http://localhost:5173)  OUT (e2e-out)  IMG_BASE (image URL prefix)  HRM_ADMIN_PASSWORD
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';
// The temporary password of every Account this flow creates. Fictional people of a fictional company.
const TEMP_PASSWORD = 'Tam-thoi-2026';
const PAGE_SIZE = 20;

mkdirSync(OUT, { recursive: true });
const report = ['### Accounts and roles screens (real backend, PostgreSQL)', ''];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(15_000);
let n = 0;

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

function finish(code) {
  writeFileSync(`${OUT}/report-accounts.md`, report.join('\n'));
  return browser.close().then(() => process.exit(code));
}

async function step(title, run) {
  n += 1;
  const file = `accounts-${String(n).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
  try {
    const note = await run();
    await page.waitForTimeout(300);
    await capture(`${OUT}/${file}`);
    report.push(`**${n}. ${title}**${note ? `: ${note}` : ''}`, '', `![${title}](${IMG_BASE}/${file}?raw=true)`, '');
    console.log(`ok ${n}. ${title}`);
  } catch (error) {
    await capture(`${OUT}/${file}`).catch(() => {});
    report.push(`**${n}. ${title}: FAILED**`, '', '```', String(error).slice(0, 1500), '```', '', `![${title}](${IMG_BASE}/${file}?raw=true)`, '');
    report.push('Result: FAILED.');
    console.error(`FAILED ${n}. ${title}\n${error}`);
    await finish(1);
  }
}

// --- Data: 25 Accounts with a mix of roles, two of them locked. Only the missing ones are created.
// No name or email is shared with a demo persona (demo.<role>@hrm.local). ---
const HR = { fullName: 'Trần Thu Trang', email: 'trang.tran@congty.vn', roles: ['HR', 'EMPLOYEE'] };
const MANY_ROLES = { fullName: 'Nguyễn Thị Hương', email: 'huong.nguyen@congty.vn', roles: ['HR', 'LINE_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE'] };
const LOCKED = ['nam.hoang@congty.vn', 'lan.ngo@congty.vn'];
const PEOPLE = [
  HR,
  MANY_ROLES,
  { fullName: 'Bùi Thanh Tùng', email: 'tung.bui@congty.vn', roles: ['EMPLOYEE'] },
  { fullName: 'Đặng Thùy Linh', email: 'linh.dang@congty.vn', roles: ['EMPLOYEE'] },
  { fullName: 'Đinh Công Sơn', email: 'son.dinh@congty.vn', roles: ['LINE_MANAGER', 'EMPLOYEE'] },
  { fullName: 'Đỗ Thành Trung', email: 'trung.do@congty.vn', roles: ['LINE_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE'] },
  { fullName: 'Đoàn Khánh Vy', email: 'vy.doan@congty.vn', roles: ['LINE_MANAGER', 'EMPLOYEE'] },
  { fullName: 'Hoàng Minh Quân', email: 'quan.hoang@congty.vn', roles: ['PROJECT_MANAGER', 'EMPLOYEE'] },
  { fullName: 'Hoàng Văn Nam', email: 'nam.hoang@congty.vn', roles: ['EMPLOYEE'] },
  { fullName: 'Hồ Kim Ngân', email: 'ngan.ho@congty.vn', roles: ['EMPLOYEE'] },
  { fullName: 'Huỳnh Tấn Phát', email: 'phat.huynh@congty.vn', roles: ['DIRECTOR', 'EMPLOYEE'] },
  { fullName: 'Lê Đức Hải', email: 'hai.le@congty.vn', roles: ['LINE_MANAGER', 'EMPLOYEE'] },
  { fullName: 'Lương Thu Hà', email: 'ha.luong@congty.vn', roles: ['ACCOUNTANT', 'EMPLOYEE'] },
  { fullName: 'Lý Gia Huy', email: 'huy.ly@congty.vn', roles: ['EMPLOYEE'] },
  { fullName: 'Ngô Thị Lan', email: 'lan.ngo@congty.vn', roles: ['EMPLOYEE'] },
  { fullName: 'Nguyễn Hữu Phước', email: 'phuoc.nguyen@congty.vn', roles: ['EMPLOYEE'] },
  { fullName: 'Phạm Gia Khánh', email: 'khanh.pham@congty.vn', roles: ['DIRECTOR'] },
  { fullName: 'Phan Văn Tài', email: 'tai.phan@congty.vn', roles: ['PROJECT_MANAGER', 'EMPLOYEE'] },
  { fullName: 'Tạ Quang Vinh', email: 'vinh.ta@congty.vn', roles: ['EMPLOYEE'] },
  { fullName: 'Trịnh Ngọc Ánh', email: 'anh.trinh@congty.vn', roles: ['LINE_MANAGER', 'EMPLOYEE'] },
  { fullName: 'Trương Quốc Thịnh', email: 'thinh.truong@congty.vn', roles: ['EMPLOYEE'] },
  { fullName: 'Võ Thanh Tâm', email: 'tam.vo@congty.vn', roles: ['HR', 'EMPLOYEE'] },
  { fullName: 'Vũ Minh Đức', email: 'duc.vu@congty.vn', roles: ['EMPLOYEE'] },
  { fullName: 'Vũ Hồng Nhung', email: 'nhung.vu@congty.vn', roles: ['ACCOUNTANT', 'EMPLOYEE'] },
  { fullName: 'Vương Đình Khôi', email: 'khoi.vuong@congty.vn', roles: ['EMPLOYEE'] },
];

async function api(path, token, init = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

let token = '';
let total = 0;
let persona = null;
let dataNote = '';
/** How many Accounts match these filters, as the API counts them: what the summary of the list must say. */
const countOf = async (filters = {}) => (await api(`/api/accounts?${new URLSearchParams({ size: '1', ...filters })}`, token)).total;
/** Every Account, whatever their number: the API gives at most 100 a page. */
async function everyAccount() {
  const all = [];
  for (let index = 0; ; index += 1) {
    const { items, total: count } = await api(`/api/accounts?size=100&page=${index}`, token);
    all.push(...items);
    if (items.length === 0 || all.length >= count) return all;
  }
}
try {
  token = (await api('/api/auth/login', null, { method: 'POST', body: { email: EMAIL, password: PASSWORD } })).accessToken;
  const before = await everyAccount();
  const known = new Map(before.map((account) => [account.email, account]));
  let created = 0;
  for (const person of PEOPLE) {
    if (known.has(person.email)) continue;
    const account = await api('/api/accounts', token, { method: 'POST', body: { ...person, password: TEMP_PASSWORD, employeeId: null } });
    known.set(account.email, account);
    created += 1;
  }
  // Locking a locked Account answers 200, so a re-run needs no check.
  for (const email of LOCKED) await api(`/api/accounts/${known.get(email).id}/lock`, token, { method: 'POST' });
  total = await countOf();
  persona = [...known.values()].find((account) => account.demoPersona) ?? null;
  const personas = [...known.values()].filter((account) => account.demoPersona).length;
  dataNote = `the database had ${before.length} Account(s), ${personas} of them demo personas; this run created ${created} through the API and locked 2, ${total} in all`;
  // The 25 Accounts above are there now, so there is always a second page.
  if (total <= PAGE_SIZE) throw new Error(`the flow needs a second page of Accounts, the database has ${total}`);
} catch (error) {
  report.push('**Preparing data through the API: FAILED**', '', '```', String(error).slice(0, 1500), '```', '', 'Result: FAILED.');
  console.error(`FAILED preparing data\n${error}`);
  await finish(1);
}
// Page 2 as the server cuts it.
const page2 = { from: PAGE_SIZE + 1, to: Math.min(2 * PAGE_SIZE, total) };

const table = () => page.getByRole('table', { name: 'Danh sách tài khoản' });
const row = (name) => table().getByRole('row').filter({ hasText: name });
// Waits until the table has this many body rows (the header row is one more).
const expectRows = (count) => table().getByRole('row').nth(count).waitFor().then(() => table().getByRole('row').nth(count + 1).waitFor({ state: 'detached' }));
const summary = (from, to, of) => page.getByRole('navigation', { name: 'Phân trang' }).getByText(`Hiển thị ${from}–${to} trên ${of} tài khoản`, { exact: true });
/** The summary of the first page of a filtered list with `count` matches. */
const firstPageOf = (count) => summary(1, Math.min(PAGE_SIZE, count), count);
const searchBox = () => page.getByRole('searchbox', { name: 'Tìm tài khoản' });
const nav = () => page.getByRole('navigation', { name: 'Điều hướng chính' });
const heading = (name, level = 1) => page.getByRole('heading', { level, name });
async function choose(filter, option) {
  await page.getByRole('combobox', { name: filter }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
async function signIn(email, password) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
}
async function signOut() {
  await page.getByRole('button', { name: /Menu Tài khoản/ }).click();
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
  await heading('Đăng nhập').waitFor();
}
function expectUrl(pattern, what) {
  if (!pattern.test(page.url())) throw new Error(`${what}: the URL is ${page.url()}`);
}

await step('Sign in as Admin and open Accounts and roles from the sidebar', async () => {
  await page.goto(`${BASE}/`);
  await signIn(EMAIL, PASSWORD);
  await heading('Tổng quan').waitFor();
  await nav().getByRole('link', { name: 'Tài khoản và vai trò' }).click();
  await heading('Tài khoản và vai trò').waitFor();
  await page.getByRole('tab', { name: 'Tài khoản', exact: true }).and(page.locator('[aria-selected="true"]')).waitFor();
  await firstPageOf(total).waitFor();
  return `${dataNote}; the header shows the Admin's full name`;
});
await step('The list: 20 Accounts a page, read-only', async () => {
  await expectRows(PAGE_SIZE);
  for (const header of ['Tài khoản', 'Vai trò', 'Phạm vi dữ liệu', 'Trạng thái', 'Ngày tạo']) await table().getByRole('columnheader', { name: header, exact: true }).waitFor();
  if ((await page.getByRole('button', { name: /Thêm tài khoản|Thao tác cho/ }).count()) !== 0) throw new Error('the read-only list has an action');
  return 'sorted by name; no add button and no row menu in this slice';
});
await step('Page 2 comes from the server and is in the URL', async () => {
  await page.getByRole('button', { name: 'Trang sau' }).click();
  await summary(page2.from, page2.to, total).waitFor();
  expectUrl(/[?&]page=2\b/, 'page 2');
  await expectRows(page2.to - PAGE_SIZE);
  return `GET /api/accounts?page=1&size=20 → ${page2.from}–${page2.to} of ${total}`;
});
await step('Search by email finds the own row, marked "Bạn", back on page 1', async () => {
  await searchBox().fill(EMAIL);
  await row(EMAIL).getByText('Bạn', { exact: true }).waitFor();
  await firstPageOf(await countOf({ q: EMAIL })).waitFor();
  if (/page=/.test(page.url())) throw new Error(`the page did not go back to 1: ${page.url()}`);
  return 'the query reaches the URL 300 ms after typing stops';
});
await step('Search without accents finds by name', async () => {
  await searchBox().fill('nguyen thi');
  await row(MANY_ROLES.email).getByText('+2', { exact: true }).waitFor();
  await row(MANY_ROLES.email).getByText('và 2 vai trò khác: PM, Nhân viên').waitFor({ state: 'attached' });
  await row('tung.bui@congty.vn').waitFor({ state: 'hidden' });
  await firstPageOf(await countOf({ q: 'nguyen thi' })).waitFor();
  expectUrl(/[?&]q=nguyen\+thi\b/, 'the search');
  return 'typed "nguyen thi"; an Account with four roles shows two and "+2", which names the rest';
});
if (persona) {
  await step('A demo persona row carries the "Persona demo" Badge', async () => {
    await searchBox().fill(persona.email);
    await row(persona.email).getByText('Persona demo', { exact: true }).waitFor();
    await firstPageOf(await countOf({ q: persona.email })).waitFor();
    return `${persona.fullName}, persona ${persona.demoPersona}`;
  });
} else {
  // No screenshot: there is nothing to show until the backend seeds the personas.
  report.push('**Persona Badge: skipped.** No Account of this database has `demoPersona`, so there is no "Persona demo" row to show.', '');
  console.log('skipped: persona Badge (no demo persona in the database)');
}
await step('Filter by role', async () => {
  await page.getByRole('button', { name: 'Xóa nội dung tìm' }).click();
  await choose('Vai trò', 'Kế toán');
  await row('ha.luong@congty.vn').waitFor();
  await row('nhung.vu@congty.vn').waitFor();
  await row('tung.bui@congty.vn').waitFor({ state: 'hidden' });
  await firstPageOf(await countOf({ role: 'ACCOUNTANT' })).waitFor();
  expectUrl(/[?&]role=ACCOUNTANT\b/, 'the role filter');
  return 'role "Kế toán": ?role=ACCOUNTANT';
});
await step('Filter by status', async () => {
  await choose('Vai trò', 'Tất cả vai trò');
  await choose('Trạng thái', 'Đã khóa');
  // Narrowed to this flow's Accounts, so the two it locked are on the page whatever else is locked.
  await searchBox().fill('congty');
  await row('nam.hoang@congty.vn').getByText('Đã khóa', { exact: true }).waitFor();
  await row('lan.ngo@congty.vn').getByText('Đã khóa', { exact: true }).waitFor();
  await firstPageOf(await countOf({ q: 'congty', status: 'LOCKED' })).waitFor();
  expectUrl(/[?&]status=LOCKED\b/, 'the status filter');
  return 'status "Đã khóa" with the search "congty": the two Accounts this flow locked';
});
await step('No match: the State block quotes the query', async () => {
  await searchBox().fill('khong co ai');
  await heading('Không có tài khoản nào khớp “khong co ai”', 2).waitFor();
  await table().waitFor({ state: 'hidden' });
  return 'the filters stay; the block offers "Xóa bộ lọc"';
});
await step('Clear filters brings the whole list back', async () => {
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).last().click();
  await firstPageOf(total).waitFor();
  if ((await searchBox().inputValue()) !== '') throw new Error('the search box is not empty');
  if (/[?&](q|role|status|page)=/.test(page.url())) throw new Error(`filters are still in the URL: ${page.url()}`);
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).waitFor({ state: 'hidden' });
});
await step('Reload keeps the search and the filters', async () => {
  await searchBox().fill('congty');
  await choose('Vai trò', 'Quản lý trực tiếp');
  await choose('Trạng thái', 'Đang hoạt động');
  await row('son.dinh@congty.vn').getByText('Đơn vị quản lý', { exact: true }).waitFor();
  const filters = { q: 'congty', role: 'LINE_MANAGER', status: 'ACTIVE' };
  await firstPageOf(await countOf(filters)).waitFor();
  // All three are in the URL before the reload: the search reaches it 300 ms after typing, the filters at once.
  await page.waitForURL((current) => ['q', 'role', 'status'].every((key) => current.searchParams.get(key) === filters[key]));
  if ((await searchBox().inputValue()) !== 'congty') throw new Error(`the search box lost its text before the reload: ${page.url()}`);
  const url = page.url();
  await page.reload();
  await row('son.dinh@congty.vn').waitFor();
  await row('tung.bui@congty.vn').waitFor({ state: 'hidden' });
  if (page.url() !== url) throw new Error(`the URL changed over the reload: ${url} → ${page.url()}`);
  if ((await searchBox().inputValue()) !== 'congty') throw new Error(`the search box lost its text over the reload: ${page.url()}`);
  await page.getByRole('combobox', { name: 'Vai trò' }).filter({ hasText: 'Quản lý trực tiếp' }).waitFor();
  await page.getByRole('combobox', { name: 'Trạng thái' }).filter({ hasText: 'Đang hoạt động' }).waitFor();
  await firstPageOf(await countOf(filters)).waitFor();
  return 'q, role and status live in the URL; a line manager has the data scope "Đơn vị quản lý"';
});
await step('Roles and permissions tab: placeholder until FE-4', async () => {
  await page.getByRole('tab', { name: 'Vai trò và quyền' }).click();
  await heading('Bảng vai trò và quyền chưa có', 2).waitFor();
  expectUrl(/[?&]view=roles\b/, 'the tab');
});
await step('An HR Account has no Accounts and roles item in the sidebar', async () => {
  await signOut();
  await signIn(HR.email, TEMP_PASSWORD);
  // Signing in returns to the page the last session ended on; the check is on the overview.
  await nav().getByRole('link', { name: 'Cơ cấu tổ chức' }).waitFor();
  await nav().getByRole('link', { name: 'Tổng quan' }).click();
  await heading('Tổng quan').waitFor();
  if ((await nav().getByRole('link', { name: 'Tài khoản và vai trò' }).count()) !== 0) throw new Error('HR sees the Accounts and roles item');
  if ((await nav().getByRole('link', { name: 'Thông tin công ty' }).count()) !== 0) throw new Error('HR sees the Company profile item');
  await page.getByRole('button', { name: `Menu Tài khoản: ${HR.fullName}` }).waitFor();
  return `signed in as ${HR.fullName} (HR, Nhân viên) with the temporary password; items come from the permissions of GET /api/me`;
});
await step('Opening /accounts by URL without the permission: denied', async () => {
  await page.goto(`${BASE}/accounts`);
  await heading('Bạn không có quyền xem Tài khoản và vai trò', 2).waitFor();
  if ((await page.getByRole('tablist').count()) !== 0) throw new Error('the denied page shows tabs');
  if ((await table().count()) !== 0) throw new Error('the denied page shows the list');
  return 'inside the shell, no tabs, no list';
});
await step('Phone 390: compact two-line rows and stacked filters', async () => {
  await signOut();
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(EMAIL, PASSWORD);
  await page.getByRole('button', { name: /Menu Tài khoản/ }).waitFor();
  await page.goto(`${BASE}/accounts`);
  const list = page.getByRole('list', { name: 'Danh sách tài khoản' });
  await firstPageOf(total).waitFor();
  await list.getByRole('listitem').nth(PAGE_SIZE - 1).waitFor();
  if ((await list.getByRole('listitem').count()) !== PAGE_SIZE) throw new Error('the phone list does not show 20 rows');
  if ((await table().count()) !== 0) throw new Error('the phone layout shows the table');
  return 'the data scope and the created date drop out';
});
await step('Phone 390: next page and a search', async () => {
  await page.getByRole('button', { name: 'Trang sau' }).click();
  await summary(page2.from, page2.to, total).waitFor();
  await searchBox().fill(EMAIL);
  await page.getByRole('list', { name: 'Danh sách tài khoản' }).getByRole('listitem').filter({ hasText: EMAIL }).getByText('Bạn', { exact: true }).waitFor();
  await firstPageOf(await countOf({ q: EMAIL })).waitFor();
  return 'previous / next only; then the own row found by email: "Bạn" sits on line two';
});

report.push(`Result: all ${n} steps passed.`);
await finish(0);
