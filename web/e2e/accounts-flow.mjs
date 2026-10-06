// Evidence for the Accounts and roles screens (HRM-04) against the real stack: signs in as the Admin, makes sure the
// database has enough Accounts for two pages (created through the API; a re-run creates only the missing ones), then
// walks the Account list (HRM-04/FE-1): paging, search, filters, the states, the roles tab, an Account without the
// permission, and the phone layout; adding and editing an Account through the dialogs (HRM-04/FE-2); and locking,
// unlocking and setting a temporary password, with what the Account itself then sees in a second browser (HRM-04/FE-3).
// It does not depend on how many other Accounts exist or how they sort (the demo personas may or may not be seeded):
// every count it checks is read from GET /api/accounts with the same filters, and rows are found by searching.
// It leaves its 25 Accounts, and one more per run (added through the dialog, with an email of its own), behind with a
// known temporary password: use a throwaway database (CI does).
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
async function capture(path, shown = page) {
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

function finish(code) {
  writeFileSync(`${OUT}/report-accounts.md`, report.join('\n'));
  return browser.close().then(() => process.exit(code));
}

/** `shown` is the page of the screenshot: the Admin's, or the second browser of the Account being locked. */
async function step(title, run, shown = page) {
  n += 1;
  const file = `accounts-${String(n).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
  try {
    const note = await run();
    await page.waitForTimeout(300);
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
// Page 2 as the server cuts it. `total` grows by one when the flow adds an Account through the dialog.
const secondPage = () => ({ from: PAGE_SIZE + 1, to: Math.min(2 * PAGE_SIZE, total) });

const table = () => page.getByRole('table', { name: 'Danh sách tài khoản' });
const row = (name) => table().getByRole('row').filter({ hasText: name });
// The own row by its "Bạn" mark: the Admin's email is also the end of a demo persona's (demo.admin@hrm.local).
const own = (rows) => rows.filter({ has: page.getByText('Bạn', { exact: true }) });
const ownRow = () => own(row(EMAIL));
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
async function signIn(email, password, on = page) {
  await on.getByLabel('Email').fill(email);
  await on.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await on.getByRole('button', { name: 'Đăng nhập' }).click();
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
await step('The list: 20 Accounts a page, with the add button and the row menus of an Admin', async () => {
  await expectRows(PAGE_SIZE);
  for (const header of ['Tài khoản', 'Vai trò', 'Phạm vi dữ liệu', 'Trạng thái', 'Ngày tạo']) await table().getByRole('columnheader', { name: header, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Thêm tài khoản' }).waitFor();
  await table().getByRole('button', { name: /^Thao tác cho/ }).first().waitFor();
  return 'sorted by name; the actions column shows with ACCOUNT_EDIT';
});
await step('Page 2 comes from the server and is in the URL', async () => {
  await page.getByRole('button', { name: 'Trang sau' }).click();
  const page2 = secondPage();
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
// --- Add and edit an Account (HRM-04/FE-2). The new Account gets an email of its own on every run, so a re-run
// does not depend on what an earlier run left behind. ---
const NEW = { fullName: 'Phan Thị Yến', email: `yen.phan.${Date.now().toString(36)}@congty.vn`, renamed: 'Phan Thị Yến Nhi', password: 'Tam-thoi-2027' };
const addDialog = () => page.getByRole('dialog', { name: 'Thêm tài khoản' });
const editDialog = (name) => page.getByRole('dialog', { name: `Sửa Tài khoản của ${name}` });
const roleBox = (dialog, name) => dialog.getByRole('checkbox', { name, exact: true });
const openRowMenu = async (email, item) => {
  await row(email).getByRole('button', { name: /^Thao tác cho/ }).click();
  await page.getByRole('menuitem', { name: item, exact: true }).click();
};
await step('Add dialog: opened from the header button, Nhan vien ticked', async () => {
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).first().click();
  await firstPageOf(total).waitFor();
  await page.getByRole('button', { name: 'Thêm tài khoản' }).click();
  await addDialog().getByLabel('Họ và tên').and(page.locator(':focus')).waitFor();
  if (!(await roleBox(addDialog(), 'Nhân viên').isChecked())) throw new Error('Nhân viên is not ticked');
  await addDialog().getByRole('combobox', { name: 'Nhân viên' }).and(page.locator(':disabled')).waitFor();
  return 'focus starts in the first field; the Employee stays disabled until employees exist (HRM-06)';
});
await step('Add dialog: validation messages under the fields and the role group', async () => {
  await roleBox(addDialog(), 'Nhân viên').uncheck({ force: true });
  await addDialog().getByLabel('Email').fill('yen.phan@');
  await addDialog().getByLabel('Mật khẩu tạm').fill('ngan-7');
  await addDialog().getByRole('button', { name: 'Thêm tài khoản' }).click();
  await addDialog().getByText('Nhập họ và tên.').waitFor();
  await addDialog().getByText('Nhập email đúng định dạng, ví dụ an.nguyen@congty.vn.').waitFor();
  await addDialog().getByText('Mật khẩu phải có ít nhất 8 ký tự.').waitFor();
  await addDialog().getByRole('group', { name: /^Vai trò/ }).getByRole('alert').filter({ hasText: 'Chọn ít nhất một vai trò.' }).waitFor();
  return 'nothing is sent while the form is invalid';
});
await step('Add dialog: an email that is taken names whose Account holds it', async () => {
  await addDialog().getByLabel('Họ và tên').fill(NEW.fullName);
  await addDialog().getByLabel('Email').fill('Tung.Bui@congty.vn');
  await addDialog().getByLabel('Mật khẩu tạm').fill(TEMP_PASSWORD);
  await roleBox(addDialog(), 'HR').check({ force: true });
  await roleBox(addDialog(), 'Nhân viên').check({ force: true });
  await addDialog().getByRole('button', { name: 'Thêm tài khoản' }).click();
  await addDialog().getByText('Email tung.bui@congty.vn đã dùng cho Tài khoản của Bùi Thanh Tùng. Nhập email khác.').waitFor();
  if ((await addDialog().getByLabel('Họ và tên').inputValue()) !== NEW.fullName) throw new Error('the dialog lost what was typed');
  return '409 account.email_taken with the holder; the dialog stays open with what was typed';
});
await step('Add: saved, the toast says to hand over the password, the Account is in the list', async () => {
  await addDialog().getByLabel('Email').fill(NEW.email);
  await addDialog().getByRole('button', { name: 'Thêm tài khoản' }).click();
  await addDialog().waitFor({ state: 'hidden' });
  await page.getByText(`Đã thêm Tài khoản cho ${NEW.fullName}`).waitFor();
  await page.getByText(`Giao mật khẩu tạm cho ${NEW.fullName} và nhắc đổi mật khẩu sau khi đăng nhập.`).waitFor();
  await page.getByRole('button', { name: 'Thêm tài khoản' }).and(page.locator(':focus')).waitFor();
  total = await countOf();
  await firstPageOf(total).waitFor();
  await searchBox().fill(NEW.email);
  await row(NEW.email).getByText('HR', { exact: true }).waitFor();
  await row(NEW.email).getByText('Đang hoạt động', { exact: true }).waitFor();
  return `POST /api/accounts → 201 (${NEW.email}); focus is back on the add button; the list reloaded, ${total} Accounts now`;
});
await step('Edit dialog: opened from the row menu, save disabled until something changes', async () => {
  await openRowMenu(NEW.email, 'Sửa');
  await editDialog(NEW.fullName).getByText('Trạng thái và mật khẩu không đổi ở đây.').waitFor();
  await editDialog(NEW.fullName).getByRole('button', { name: 'Lưu thay đổi' }).and(page.locator(':disabled')).waitFor();
  if ((await editDialog(NEW.fullName).getByLabel('Mật khẩu tạm').count()) !== 0) throw new Error('the edit dialog has a password field');
  await editDialog(NEW.fullName).getByLabel('Họ và tên').fill(NEW.renamed);
  await roleBox(editDialog(NEW.fullName), 'PM').check({ force: true });
  await editDialog(NEW.fullName).getByRole('button', { name: 'Lưu thay đổi' }).and(page.locator(':enabled')).waitFor();
  return 'prefilled from the row; no password field; the name and a role changed';
});
await step('Edit: saved, the list shows the new name and roles', async () => {
  await editDialog(NEW.fullName).getByRole('button', { name: 'Lưu thay đổi' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByText(`Đã lưu Tài khoản của ${NEW.renamed}`).waitFor();
  await row(NEW.email).getByText(NEW.renamed, { exact: true }).waitFor();
  await row(NEW.email).getByText('PM', { exact: true }).waitFor();
  await row(NEW.email).getByRole('button', { name: `Thao tác cho ${NEW.renamed}` }).and(page.locator(':focus')).waitFor();
  return 'PUT /api/accounts/{id}; focus is back on the menu button of the row';
});
await step('Edit the own Account: the Admin role is ticked and locked', async () => {
  await searchBox().fill(EMAIL);
  await row(EMAIL).getByText('Bạn', { exact: true }).waitFor();
  await ownRow().getByRole('button', { name: /^Thao tác cho/ }).click();
  await page.getByRole('menuitem', { name: 'Sửa', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /^Sửa Tài khoản của/ });
  await roleBox(dialog, 'Admin').and(page.locator(':checked:disabled')).waitFor();
  await dialog.getByText('Bạn không tự bỏ vai trò Admin của mình được.', { exact: false }).waitFor();
  await dialog.getByRole('button', { name: 'Lưu thay đổi' }).and(page.locator(':disabled')).waitFor();
  return 'nothing is saved here';
});
// --- Lock, unlock and set a temporary password (HRM-04/FE-3), on the Account added above. A second browser is that
// Account's own: it shows what the person sees when locked while signed in, and which password works afterwards. ---
const LOCKED_TEXT = 'Tài khoản đã bị khóa. Liên hệ quản trị viên để mở lại.';
const theirs = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
theirs.setDefaultTimeout(15_000);
const menuItems = () => page.getByRole('menu').getByRole('menuitem').allTextContents();
/** Opens the row menu and checks that it offers exactly these items. */
async function expectMenu(ofRow, items) {
  await ofRow.getByRole('button', { name: /^Thao tác cho/ }).click();
  await page.getByRole('menu').waitFor();
  const found = await menuItems();
  if (found.join('|') !== items.join('|')) throw new Error(`the menu offers [${found.join(', ')}], not [${items.join(', ')}]`);
}
const closeMenu = async () => {
  await page.keyboard.press('Escape');
  await page.getByRole('menu').waitFor({ state: 'hidden' });
};
const lockDialog = () => page.getByRole('dialog', { name: `Khóa Tài khoản của ${NEW.renamed}?` });
const passwordDialog = () => page.getByRole('dialog', { name: `Đặt mật khẩu tạm cho ${NEW.renamed}` });
const rowButtonFocused = () => row(NEW.email).getByRole('button', { name: `Thao tác cho ${NEW.renamed}` }).and(page.locator(':focus')).waitFor();
await step('Row menu of the own Account: only "Sua"', async () => {
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await expectMenu(ownRow(), ['Sửa']);
  return 'no lock, unlock or temporary password for oneself';
});
if (persona) {
  await step('Row menu of a demo persona: only its lock or unlock', async () => {
    await closeMenu();
    await searchBox().fill(persona.email);
    await row(persona.email).getByText('Persona demo', { exact: true }).waitFor();
    const locked = (await row(persona.email).getByText('Đã khóa', { exact: true }).count()) > 0;
    await expectMenu(row(persona.email), [locked ? 'Mở khóa' : 'Khóa tài khoản']);
    return `${persona.fullName}: no edit and no temporary password`;
  });
} else {
  report.push('**Row menu of a demo persona: skipped.** No Account of this database has `demoPersona`.', '');
  console.log('skipped: persona row menu (no demo persona in the database)');
}
await step('Row menu of another active Account: edit, temporary password, then the lock', async () => {
  // The Account signs in in its own browser first, so the lock below catches it signed in.
  await theirs.goto(`${BASE}/`);
  await signIn(NEW.email, TEMP_PASSWORD, theirs);
  await theirs.getByRole('heading', { level: 1, name: 'Tổng quan' }).waitFor();
  await closeMenu();
  await searchBox().fill(NEW.email);
  await row(NEW.email).getByText('Đang hoạt động', { exact: true }).waitFor();
  await expectMenu(row(NEW.email), ['Sửa', 'Đặt mật khẩu tạm', 'Khóa tài khoản']);
  return `${NEW.renamed} is signed in in a second browser meanwhile`;
});
await step('Lock: a confirm dialog with a danger button', async () => {
  await page.getByRole('menuitem', { name: 'Khóa tài khoản', exact: true }).click();
  await lockDialog().getByText(`${NEW.renamed} sẽ không đăng nhập được. Phiên đang mở sẽ kết thúc trong tối đa 15 phút. Bạn có thể mở khóa bất cứ lúc nào.`).waitFor();
  await lockDialog().getByRole('button', { name: 'Khóa tài khoản' }).waitFor();
});
await step('Lock: confirmed, the toast, the row shows "Da khoa"', async () => {
  await lockDialog().getByRole('button', { name: 'Khóa tài khoản' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByText(`Đã khóa Tài khoản của ${NEW.renamed}`).waitFor();
  await row(NEW.email).getByText('Đã khóa', { exact: true }).waitFor();
  await rowButtonFocused();
  return 'POST /api/accounts/{id}/lock; focus is back on the menu button of the row';
});
await step('The locked Account, still signed in: back on its tab it lands on the login page with the reason', async () => {
  // Coming back to the tab makes the app read GET /api/me again; the backend refuses a locked Account there even
  // while its access token is still valid, so this needs no 15 minute wait.
  await theirs.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await theirs.getByRole('heading', { level: 1, name: 'Đăng nhập' }).waitFor();
  await theirs.getByRole('alert').filter({ hasText: LOCKED_TEXT }).waitFor();
  return 'GET /api/me → 401 auth.account_locked ends the session; nothing was typed on this page';
}, theirs);
await step('The locked Account cannot sign in: the same Alert', async () => {
  await theirs.reload();
  await theirs.getByRole('heading', { level: 1, name: 'Đăng nhập' }).waitFor();
  // After a reload the reason is not known any more (the revoked refresh token only says "invalid"): no Alert.
  if ((await theirs.getByRole('alert').count()) !== 0) throw new Error('the login page shows an Alert after a reload');
  await signIn(NEW.email, TEMP_PASSWORD, theirs);
  await theirs.getByRole('alert').filter({ hasText: LOCKED_TEXT }).waitFor();
  return 'POST /api/auth/login → 401 auth.account_locked, with the right password';
}, theirs);
await step('Unlock: at once, without a confirm; the row is "Dang hoat dong" again', async () => {
  await expectMenu(row(NEW.email), ['Sửa', 'Đặt mật khẩu tạm', 'Mở khóa']);
  await page.getByRole('menuitem', { name: 'Mở khóa', exact: true }).click();
  await page.getByText(`Đã mở khóa Tài khoản của ${NEW.renamed}`).waitFor();
  await row(NEW.email).getByText('Đang hoạt động', { exact: true }).waitFor();
  if ((await page.getByRole('dialog').count()) !== 0) throw new Error('unlocking opened a dialog');
  await rowButtonFocused();
  return 'POST /api/accounts/{id}/unlock';
});
await step('The unlocked Account signs in again', async () => {
  await signIn(NEW.email, TEMP_PASSWORD, theirs);
  await theirs.getByRole('heading', { level: 1, name: 'Tổng quan' }).waitFor();
  return 'with the password it had';
}, theirs);
await step('Set a temporary password: the dialog, the field shown, a password that is too short', async () => {
  await openRowMenu(NEW.email, 'Đặt mật khẩu tạm');
  const field = passwordDialog().getByLabel('Mật khẩu tạm mới');
  await field.and(page.locator(':focus')).waitFor();
  if ((await field.getAttribute('type')) !== 'text') throw new Error('the temporary password is hidden');
  await passwordDialog().getByText(`${NEW.renamed} sẽ phải đăng nhập lại trên mọi thiết bị bằng mật khẩu này.`, { exact: false }).waitFor();
  await field.fill('ngan-7');
  await passwordDialog().getByRole('button', { name: 'Đặt mật khẩu tạm' }).click();
  await passwordDialog().getByText('Mật khẩu phải có ít nhất 8 ký tự.').waitFor();
  return 'nothing is sent while it is invalid';
});
await step('Set a temporary password: saved, the toast says the person was signed out', async () => {
  await passwordDialog().getByLabel('Mật khẩu tạm mới').fill(NEW.password);
  await passwordDialog().getByRole('button', { name: 'Đặt mật khẩu tạm' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByText(`Đã đặt mật khẩu tạm cho ${NEW.renamed}`).waitFor();
  await page.getByText(`${NEW.renamed} đã bị đăng xuất trên mọi thiết bị.`).waitFor();
  await row(NEW.email).getByText('Đang hoạt động', { exact: true }).waitFor();
  await rowButtonFocused();
  return 'PUT /api/accounts/{id}/password → 204';
});
await step('After the new temporary password: the old one is refused', async () => {
  // The session of the second browser was ended: a reload cannot restore it.
  await theirs.reload();
  await theirs.getByRole('heading', { level: 1, name: 'Đăng nhập' }).waitFor();
  await signIn(NEW.email, TEMP_PASSWORD, theirs);
  await theirs.getByRole('alert').filter({ hasText: 'Email hoặc mật khẩu không đúng.' }).waitFor();
  return 'the reload lands on the login page; the old password answers 401 auth.invalid_credentials';
}, theirs);
await step('After the new temporary password: the new one signs in', async () => {
  await signIn(NEW.email, NEW.password, theirs);
  await theirs.getByRole('heading', { level: 1, name: 'Tổng quan' }).waitFor();
  await theirs.getByRole('button', { name: `Menu Tài khoản: ${NEW.renamed}` }).waitFor();
}, theirs);
await theirs.context().close();
await step('Roles and permissions tab: the role matrix', async () => {
  await page.getByRole('tab', { name: 'Vai trò và quyền' }).click();
  await page.getByRole('table', { name: 'Quyền của từng vai trò' }).getByRole('rowheader', { name: /^Phạm vi dữ liệu/ }).waitFor();
  expectUrl(/[?&]view=roles\b/, 'the tab');
  return 'walked in roles-flow.mjs';
});
await step('The new Account signs in with its temporary password and has no Accounts and roles item', async () => {
  await signOut();
  await signIn(NEW.email, NEW.password);
  // Signing in returns to the page the last session ended on; the check is on the overview.
  await nav().getByRole('link', { name: 'Cơ cấu tổ chức' }).waitFor();
  await nav().getByRole('link', { name: 'Tổng quan' }).click();
  await heading('Tổng quan').waitFor();
  if ((await nav().getByRole('link', { name: 'Tài khoản và vai trò' }).count()) !== 0) throw new Error('HR sees the Accounts and roles item');
  if ((await nav().getByRole('link', { name: 'Thông tin công ty' }).count()) !== 0) throw new Error('HR sees the Company profile item');
  await page.getByRole('button', { name: `Menu Tài khoản: ${NEW.renamed}` }).waitFor();
  return `signed in as ${NEW.renamed} (HR, PM, Nhân viên), the Account added and edited above; items come from the permissions of GET /api/me`;
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
  await summary(secondPage().from, secondPage().to, total).waitFor();
  await searchBox().fill(EMAIL);
  await page.getByRole('list', { name: 'Danh sách tài khoản' }).getByRole('listitem').filter({ hasText: EMAIL }).getByText('Bạn', { exact: true }).waitFor();
  await firstPageOf(await countOf({ q: EMAIL })).waitFor();
  return 'previous / next only; then the own row found by email: "Bạn" sits on line two';
});
await step('Phone 390: the edit dialog from the row action button', async () => {
  const item = own(page.getByRole('list', { name: 'Danh sách tài khoản' }).getByRole('listitem'));
  await item.getByRole('button', { name: /^Thao tác cho/ }).click();
  await page.getByRole('menuitem', { name: 'Sửa', exact: true }).click();
  await roleBox(page.getByRole('dialog', { name: /^Sửa Tài khoản của/ }), 'Admin').and(page.locator(':checked:disabled')).waitFor();
  return 'one column; the own Account with the Admin role locked';
});
await step('Phone 390: the add dialog', async () => {
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Thêm tài khoản' }).click();
  await addDialog().getByLabel('Mật khẩu tạm').fill(TEMP_PASSWORD);
  await addDialog().getByRole('button', { name: 'Ẩn mật khẩu' }).waitFor();
  return 'one column; the temporary password is shown while the Admin types it';
});
const phoneItem = () => page.getByRole('list', { name: 'Danh sách tài khoản' }).getByRole('listitem').filter({ hasText: NEW.email });
const openPhoneMenu = async (item) => {
  await phoneItem().getByRole('button', { name: /^Thao tác cho/ }).click();
  if (item) await page.getByRole('menuitem', { name: item, exact: true }).click();
};
await step('Phone 390: the row menu of another Account', async () => {
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await searchBox().fill(NEW.email);
  await phoneItem().getByText('Đang hoạt động', { exact: true }).waitFor();
  await openPhoneMenu();
  await page.getByRole('menu').waitFor();
  const found = await menuItems();
  if (found.join('|') !== 'Sửa|Đặt mật khẩu tạm|Khóa tài khoản') throw new Error(`the menu offers [${found.join(', ')}]`);
});
await step('Phone 390: the lock confirm dialog', async () => {
  await page.getByRole('menuitem', { name: 'Khóa tài khoản', exact: true }).click();
  await lockDialog().getByRole('button', { name: 'Khóa tài khoản' }).waitFor();
  return 'cancelled afterwards: the Account stays active';
});
await step('Phone 390: the set temporary password dialog', async () => {
  await lockDialog().getByRole('button', { name: 'Hủy' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await phoneItem().getByText('Đang hoạt động', { exact: true }).waitFor();
  await openPhoneMenu('Đặt mật khẩu tạm');
  await passwordDialog().getByLabel('Mật khẩu tạm mới').fill(NEW.password);
  await passwordDialog().getByRole('button', { name: 'Ẩn mật khẩu' }).waitFor();
  return 'not sent';
});

report.push(`Result: all ${n} steps passed.`);
await finish(0);
