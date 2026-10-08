// Evidence for the org structure screens (HRM-03) against the real stack: signs in as the Admin, makes sure
// the database has a small org tree (created through the API when it is empty), then walks the /org page:
// the read-only views first (the unit tree, then the org chart of HRM-03/FE-4), then adding and editing a unit
// (HRM-03/FE-2) and finding it in the org chart, moving it (HRM-03/FE-3), and deactivating, reactivating and
// deleting it (HRM-03/FE-3b).
// The add step creates the code `AI` and the last delete step removes the unit again; a run that fails in between
// leaves it behind, so start from a fresh database (CI does).
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

mkdirSync(OUT, { recursive: true });
const report = ['### Org structure screens (real backend, PostgreSQL)', ''];
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
  writeFileSync(`${OUT}/report-org.md`, report.join('\n'));
  return browser.close().then(() => process.exit(code));
}

async function step(title, run) {
  n += 1;
  const file = `org-${String(n).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
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

// --- Data: use what the database has; create a small tree through the API when it has no unit. ---
async function api(path, token, init = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

let dataNote = '';
try {
  const { accessToken } = await api('/api/auth/login', null, { method: 'POST', body: { email: EMAIL, password: PASSWORD } });
  const before = await api('/api/org-units', accessToken);
  if (before.units.length === 0) {
    const create = (name, code, type, parentId = null) =>
      api('/api/org-units', accessToken, { method: 'POST', body: { name, code, type, parentId, headEmployeeId: null } });
    const dev = await create('Phòng Phát triển phần mềm', 'PTPM', 'DEPARTMENT');
    await create('Nhóm Web', 'WEB', 'TEAM', dev.id);
    await create('Nhóm Kiểm thử', 'QA', 'TEAM', dev.id);
    const game = await create('Nhóm Game', 'GAME', 'TEAM', dev.id);
    await api(`/api/org-units/${game.id}/deactivate`, accessToken, { method: 'POST' });
    await create('Phòng Kinh doanh', 'KD', 'DEPARTMENT');
    const branch = await create('Chi nhánh Đà Nẵng', 'CNDN', 'BRANCH');
    const dn = await create('Phòng Phần mềm Đà Nẵng', 'PMDN', 'DEPARTMENT', branch.id);
    await create('Nhóm Web Đà Nẵng', 'WEBDN', 'TEAM', dn.id);
    dataNote = 'the database had no unit, so this run created 8 through the API (3 levels, one inactive)';
  } else {
    dataNote = `the database already had ${before.units.length} units (example data)`;
  }
} catch (error) {
  report.push('**Preparing data through the API: FAILED**', '', '```', String(error).slice(0, 1500), '```', '', 'Result: FAILED.');
  console.error(`FAILED preparing data\n${error}`);
  await finish(1);
}

const tree = () => page.getByRole('tree', { name: 'Cây đơn vị' });
const row = (name) => tree().getByRole('treeitem', { name: new RegExp(`^${name},`) });

await step('Sign in and open Org structure', async () => {
  await page.goto(`${BASE}/org`);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('heading', { level: 1, name: 'Cơ cấu tổ chức' }).waitFor();
  await row('Phòng Phát triển phần mềm').waitFor();
  await row('Nhóm Web').waitFor();
  return `${dataNote}; the company is selected by default`;
});
await step('Select a unit: its detail and child units', async () => {
  await row('Phòng Phát triển phần mềm').click();
  await page.getByRole('heading', { level: 2, name: 'Phòng Phát triển phần mềm' }).waitFor();
  await page.getByRole('heading', { name: /Đơn vị con/ }).waitFor();
  if (!/unit=/.test(page.url())) throw new Error('the selected unit is not in the URL');
  return 'selection is in the URL (?unit=)';
});
await step('Reload keeps the selected unit', async () => {
  await page.reload();
  await page.getByRole('heading', { level: 2, name: 'Phòng Phát triển phần mềm' }).waitFor();
});
await step('Child link in the detail selects that unit', async () => {
  await page.getByRole('link', { name: 'Nhóm Game' }).click();
  await page.getByRole('heading', { level: 2, name: 'Nhóm Game' }).waitFor();
  return 'an inactive unit: Badge with icon and text in the tree and the detail';
});
await step('Search by name keeps the ancestors of the matches', async () => {
  await page.getByLabel('Tìm đơn vị').first().fill('da nang');
  await row('Chi nhánh Đà Nẵng').waitFor();
  await row('Phòng Kinh doanh').waitFor({ state: 'hidden' });
  return 'typed "da nang" without diacritics';
});
await step('Search without matches', async () => {
  await page.getByLabel('Tìm đơn vị').first().fill('thiết kế');
  await page.getByText('Không có đơn vị nào khớp “thiết kế”').first().waitFor();
});
await step('Hide inactive units', async () => {
  await page.getByLabel('Tìm đơn vị').first().fill('');
  await row('Nhóm Game').waitFor();
  await page.getByLabel('Hiện đơn vị ngừng hoạt động').uncheck({ force: true });
  await row('Nhóm Game').waitFor({ state: 'hidden' });
});
await step('Collapse all', async () => {
  await page.getByRole('button', { name: 'Thu gọn tất cả' }).click();
  await row('Nhóm Web').waitFor({ state: 'hidden' });
  await row('Phòng Phát triển phần mềm').waitFor();
  await page.getByRole('button', { name: 'Mở tất cả' }).waitFor();
});
// --- Org chart (HRM-03/FE-4). The chart fills the height the page has left and scrolls inside its viewport, so these
// steps use the artboard height (1270) to show all of it. ---
const DESKTOP = { width: 1440, height: 900 };
const CHART_DESKTOP = { width: 1440, height: 1270 };
const chart = () => page.getByRole('tree', { name: 'Sơ đồ tổ chức' });
const card = (name) => chart().getByRole('treeitem', { name: new RegExp(`^${name},`) });
const childToggle = (action, name) => page.getByRole('button', { name: new RegExp(`^${action} \\d+ đơn vị con của ${name}$`) });
const zoomLevel = () => page.getByRole('group', { name: 'Thu phóng' }).getByText(/%$/);
const openChartTab = async () => {
  await page.getByRole('tab', { name: 'Sơ đồ tổ chức' }).click();
  await chart().waitFor();
};
await step('Org chart tab: the company on top, its units in a row, deeper levels stacked', async () => {
  await page.setViewportSize(CHART_DESKTOP);
  await openChartTab();
  if (!/view=chart/.test(page.url())) throw new Error('the tab is not in the URL');
  await card('Phòng Phát triển phần mềm').waitFor();
  await card('Nhóm Web').waitFor();
  if (await page.getByLabel('Hiện đơn vị ngừng hoạt động').isChecked()) throw new Error('inactive units are shown by default');
  if ((await card('Nhóm Game').count()) !== 0) throw new Error('the inactive Nhóm Game is in the chart by default');
  return 'every unit open, inactive units hidden; with the example data each card shows its head and headcount';
});
await step('Org chart: collapse the child units of one unit', async () => {
  await childToggle('Thu gọn', 'Phòng Phát triển phần mềm').click();
  await card('Nhóm Web').waitFor({ state: 'hidden' });
  await childToggle('Mở', 'Phòng Phát triển phần mềm').and(page.locator('[aria-expanded="false"]')).waitFor();
  await card('Chi nhánh Đà Nẵng').waitFor();
  return 'the toggle pill on the card; the other branches stay open';
});
await step('Org chart: collapse all keeps the first row', async () => {
  await page.getByRole('button', { name: 'Thu gọn tất cả' }).click();
  await card('Phòng Phần mềm Đà Nẵng').waitFor({ state: 'hidden' });
  await card('Chi nhánh Đà Nẵng').waitFor();
});
await step('Org chart: expand all and show inactive units', async () => {
  await page.getByRole('button', { name: 'Mở tất cả' }).click();
  await card('Nhóm Web').waitFor();
  await page.getByLabel('Hiện đơn vị ngừng hoạt động').check({ force: true });
  await card('Nhóm Game').getByText('Ngừng hoạt động', { exact: true }).waitFor();
  return 'the inactive unit: dashed border, muted name, Badge with icon and text; here it is also the unit selected in the tree (blue border)';
});
await step('Org chart: zoom out to 50 percent from the keyboard', async () => {
  await page.setViewportSize(DESKTOP);
  await page.getByRole('button', { name: 'Thu nhỏ' }).focus();
  for (let press = 0; press < 5; press += 1) await page.keyboard.press('Enter');
  await zoomLevel().filter({ hasText: /^50%$/ }).waitFor();
  await page.getByRole('button', { name: 'Thu nhỏ' }).and(page.locator(':disabled')).waitFor();
  return 'five steps of 10 with Enter on the zoom-out button; it is disabled at the 50% limit';
});
await step('Org chart: zoom in to 150 percent, the chart pans inside its viewport', async () => {
  for (let press = 0; press < 10; press += 1) await page.getByRole('button', { name: 'Phóng to' }).click();
  await zoomLevel().filter({ hasText: /^150%$/ }).waitFor();
  await page.getByRole('button', { name: 'Phóng to' }).and(page.locator(':disabled')).waitFor();
});
await step('Org chart: fit to screen shows the whole chart', async () => {
  await page.getByRole('button', { name: 'Vừa màn hình' }).click();
  await page.waitForTimeout(300);
  // The viewport is the scrolling element around the chart: after a fit nothing is left to scroll.
  const overflow = await chart().evaluate((tree) => {
    const view = tree.parentElement.parentElement;
    return { x: view.scrollWidth - view.clientWidth, y: view.scrollHeight - view.clientHeight };
  });
  if (overflow.x > 0 || overflow.y > 0) throw new Error(`the chart still scrolls after a fit: ${JSON.stringify(overflow)}`);
  return `at 1440 × 900 the chart fits at ${await zoomLevel().innerText()}`;
});
await step('Org chart: a unit name opens the unit in the tree tab', async () => {
  await chart().getByRole('link', { name: 'Chi nhánh Đà Nẵng', exact: true }).click();
  await page.getByRole('heading', { level: 2, name: 'Chi nhánh Đà Nẵng' }).waitFor();
  await page.getByRole('tab', { name: 'Cây đơn vị' }).and(page.locator('[aria-selected="true"]')).waitFor();
  if (/view=chart/.test(page.url()) || !/unit=/.test(page.url())) throw new Error(`the URL is not the unit in the tree tab: ${page.url()}`);
  return 'the URL keeps ?unit= and drops view=chart';
});
// --- Add and edit a unit (HRM-03/FE-2). `QA` is taken by "Nhóm Kiểm thử" in the example data and in the fallback data above. ---
const addDialog = () => page.getByRole('dialog', { name: 'Thêm đơn vị' });
await step('Add a child unit: the dialog with the parent prefilled', async () => {
  await page.getByRole('tab', { name: 'Cây đơn vị' }).click();
  await row('Phòng Phát triển phần mềm').click();
  await page.getByRole('heading', { level: 2, name: 'Phòng Phát triển phần mềm' }).waitFor();
  await page.getByRole('button', { name: 'Thêm đơn vị con' }).click();
  await addDialog().getByRole('combobox', { name: 'Đơn vị cha' }).filter({ hasText: 'Phòng Phát triển phần mềm' }).waitFor();
  await addDialog().getByRole('combobox', { name: 'Trưởng đơn vị' }).and(page.locator(':disabled')).waitFor();
  return 'the head stays disabled until employees exist (HRM-06)';
});
await step('Submit the empty form: validation messages', async () => {
  await addDialog().getByRole('button', { name: 'Thêm đơn vị', exact: true }).click();
  await addDialog().getByText('Nhập tên đơn vị.').waitFor();
  await addDialog().getByText('Nhập mã đơn vị.').waitFor();
  await addDialog().getByText('Chọn loại đơn vị.').waitFor();
});
await step('Duplicate code names the unit that holds it', async () => {
  await addDialog().getByLabel('Tên đơn vị').fill('Nhóm Trí tuệ nhân tạo');
  await addDialog().getByLabel('Mã đơn vị').fill('qa');
  await addDialog().getByRole('combobox', { name: 'Loại' }).click();
  await page.getByRole('option', { name: 'Nhóm', exact: true }).click();
  await addDialog().getByRole('button', { name: 'Thêm đơn vị', exact: true }).click();
  await addDialog().getByText('Mã QA đã dùng cho Nhóm Kiểm thử. Nhập mã khác.').waitFor();
  return 'typed "qa"; the code is upper-cased, the answer is 409 org_unit.code_taken with the holder';
});
await step('Save the new unit: toast, and the unit selected in the tree', async () => {
  await addDialog().getByLabel('Mã đơn vị').fill('AI');
  await addDialog().getByRole('button', { name: 'Thêm đơn vị', exact: true }).click();
  await addDialog().waitFor({ state: 'hidden' });
  await page.getByText('Đã thêm Nhóm Trí tuệ nhân tạo').waitFor();
  await page.getByText('Thuộc Phòng Phát triển phần mềm').waitFor();
  await page.getByRole('heading', { level: 2, name: 'Nhóm Trí tuệ nhân tạo' }).waitFor();
  if ((await row('Nhóm Trí tuệ nhân tạo').getAttribute('aria-selected')) !== 'true') throw new Error('the new unit is not selected in the tree');
});
await step('Edit the unit: the dialog, parent read-only', async () => {
  await page.getByRole('button', { name: 'Sửa', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Sửa Nhóm Trí tuệ nhân tạo' });
  await dialog.getByRole('combobox', { name: 'Đơn vị cha' }).and(page.locator(':disabled')).waitFor();
  await dialog.getByText('Dùng Chuyển đơn vị để đổi đơn vị cha.').waitFor();
  await dialog.getByLabel('Tên đơn vị').fill('Nhóm AI ứng dụng');
});
await step('Save the edit: toast, tree and detail show the new name', async () => {
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByText('Đã lưu Nhóm AI ứng dụng').waitFor();
  await page.getByRole('heading', { level: 2, name: 'Nhóm AI ứng dụng' }).waitFor();
  await row('Nhóm AI ứng dụng').waitFor();
});
// --- The unit added above, in the org chart (HRM-03/FE-4). ---
await step('The new unit in the org chart, under its parent and selected', async () => {
  await page.setViewportSize(CHART_DESKTOP);
  await openChartTab();
  const added = card('Nhóm AI ứng dụng');
  await added.and(page.locator('[aria-selected="true"][aria-level="3"]')).waitFor();
  await added.getByText('Chưa có trưởng đơn vị').waitFor();
  await added.getByText('0 nhân viên').waitFor();
  return 'the unit selected in the tree is carried over (?unit=); no head and no employees yet';
});
await step('From the chart back to the tree: the new unit is still selected', async () => {
  await chart().getByRole('link', { name: 'Nhóm AI ứng dụng', exact: true }).click();
  await page.setViewportSize(DESKTOP);
  await page.getByRole('heading', { level: 2, name: 'Nhóm AI ứng dụng' }).waitFor();
  if ((await row('Nhóm AI ứng dụng').getAttribute('aria-selected')) !== 'true') throw new Error('the new unit is not selected in the tree');
});
// --- Move the unit (HRM-03/FE-3): "Nhóm AI ứng dụng" goes from Phòng Phát triển phần mềm to Chi nhánh Đà Nẵng, then under the company. ---
const moveDialog = () => page.getByRole('dialog', { name: 'Chuyển Nhóm AI ứng dụng' });
const picker = () => moveDialog().getByRole('tree', { name: 'Đơn vị cha mới' });
const choice = (name) => picker().getByRole('treeitem', { name, exact: true });
const detail = () => page.getByRole('region', { name: 'Nhóm AI ứng dụng' });
async function expectRow(name, attribute, value) {
  const actual = await row(name).getAttribute(attribute);
  if (actual !== value) throw new Error(`${name}: ${attribute} is ${actual}, expected ${value}`);
}
await step('Move the unit: the picker says which rows cannot be chosen', async () => {
  await detail().getByRole('button', { name: 'Chuyển đơn vị' }).click();
  await moveDialog().getByText('Chọn đơn vị cha mới.').waitFor();
  await choice('Phòng Phát triển phần mềm').and(page.locator('[aria-disabled="true"]')).getByText('Đơn vị cha hiện tại').waitFor();
  await choice('Nhóm AI ứng dụng').and(page.locator('[aria-disabled="true"]')).getByText('Đang chuyển').waitFor();
  await choice('Chi nhánh Đà Nẵng').and(page.locator(':not([aria-disabled])')).waitFor();
  if ((await choice('Nhóm Game').count()) !== 0) throw new Error('the inactive Nhóm Game is listed as a target');
  await moveDialog().getByText('Đơn vị ngừng hoạt động không hiện ở đây.').waitFor();
  return 'the company and the active units; the current parent and the unit itself are disabled with the reason';
});
await step('Move to Chi nhanh Da Nang: toast, the unit under its new parent', async () => {
  await choice('Chi nhánh Đà Nẵng').click();
  await choice('Chi nhánh Đà Nẵng').and(page.locator('[aria-checked="true"]')).waitFor();
  await moveDialog().getByRole('button', { name: 'Chuyển đơn vị' }).click();
  await moveDialog().waitFor({ state: 'hidden' });
  await page.getByText('Từ Phòng Phát triển phần mềm sang Chi nhánh Đà Nẵng').waitFor();
  await page.getByText('Đã chuyển Nhóm AI ứng dụng').first().waitFor();
  await detail().getByRole('link', { name: 'Chi nhánh Đà Nẵng' }).waitFor();
  await expectRow('Nhóm AI ứng dụng', 'aria-selected', 'true');
  await expectRow('Nhóm AI ứng dụng', 'aria-level', '3');
  return 'POST /api/org-units/{id}/move; the unit stays selected';
});
await step('Move under the company with the keyboard', async () => {
  await detail().getByRole('button', { name: 'Chuyển đơn vị' }).click();
  await choice('Chi nhánh Đà Nẵng').and(page.locator('[aria-disabled="true"]')).getByText('Đơn vị cha hiện tại').waitFor();
  // Focus starts on the first row of the picker, the company: Space chooses it.
  const company = picker().getByRole('treeitem').first();
  await company.and(page.locator(':focus')).waitFor();
  await page.keyboard.press('Space');
  await company.and(page.locator('[aria-checked="true"]')).waitFor();
  await moveDialog().getByRole('button', { name: 'Chuyển đơn vị' }).click();
  await moveDialog().waitFor({ state: 'hidden' });
  await page.getByText('Từ Chi nhánh Đà Nẵng sang').waitFor();
  await detail().getByRole('link', { name: 'Chi nhánh Đà Nẵng' }).waitFor({ state: 'hidden' });
  await expectRow('Nhóm AI ứng dụng', 'aria-selected', 'true');
  await expectRow('Nhóm AI ứng dụng', 'aria-level', '2');
  return 'parentId null: the unit is now directly under the company';
});
// --- Deactivate, reactivate and delete (HRM-03/FE-3b). "Phòng Phát triển phần mềm" has child units in the example data and in
// the fallback data (and Employees in the example data), so it cannot be deleted; "Nhóm AI ứng dụng" (now directly under
// the company) is empty. ---
const moreButton = (name) => page.getByRole('button', { name: `Thao tác khác cho ${name}` });
const moreItem = (name) => page.getByRole('menuitem', { name });
const statusDialog = (name) => page.getByRole('dialog', { name });
await step('More menu of a unit: deactivate and the destructive delete', async () => {
  await row('Phòng Phát triển phần mềm').click();
  await page.getByRole('heading', { level: 2, name: 'Phòng Phát triển phần mềm' }).waitFor();
  await moreButton('Phòng Phát triển phần mềm').click();
  await moreItem('Ngừng hoạt động').waitFor();
  await moreItem('Xóa đơn vị').hover();
  return 'the three-dot button ends the action row';
});
await step('Delete is blocked for a unit with child units: the counts and the offer to deactivate', async () => {
  await moreItem('Xóa đơn vị').click();
  const dialog = statusDialog('Không xóa được Phòng Phát triển phần mềm');
  // With the example data the unit also has Employees of its own: "Đơn vị còn 2 nhân viên và 6 đơn vị con."
  await dialog.getByText(/Đơn vị còn (\d+ nhân viên và )?\d+ đơn vị con\./).waitFor();
  await dialog.getByRole('button', { name: 'Ngừng hoạt động' }).waitFor();
  await dialog.getByRole('button', { name: 'Đóng' }).waitFor();
  return 'decided from the loaded tree, no request is sent';
});
await step('Deactivate the unit: the confirm names it and says what happens', async () => {
  await statusDialog('Không xóa được Phòng Phát triển phần mềm').getByRole('button', { name: 'Đóng' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await row('Phòng Phát triển phần mềm').waitFor();
  await row('Nhóm AI ứng dụng').click();
  await page.getByRole('heading', { level: 2, name: 'Nhóm AI ứng dụng' }).waitFor();
  await moreButton('Nhóm AI ứng dụng').click();
  await moreItem('Ngừng hoạt động').click();
  await statusDialog('Ngừng hoạt động Nhóm AI ứng dụng?').getByText('Bạn có thể kích hoạt lại bất cứ lúc nào.').waitFor();
  return 'closing the blocked dialog left Phòng Phát triển phần mềm as it was';
});
await step('Deactivated: toast, inactive Badge, the unit still selected', async () => {
  await statusDialog('Ngừng hoạt động Nhóm AI ứng dụng?').getByRole('button', { name: 'Ngừng hoạt động' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByText('Đã ngừng hoạt động Nhóm AI ứng dụng').waitFor();
  await detail().getByText('Ngừng hoạt động', { exact: true }).waitFor();
  await detail().getByRole('button', { name: 'Kích hoạt lại' }).waitFor();
  await tree().getByRole('treeitem', { name: /^Nhóm AI ứng dụng,.*Ngừng hoạt động$/ }).waitFor();
  await expectRow('Nhóm AI ứng dụng', 'aria-selected', 'true');
  return 'POST /api/org-units/{id}/deactivate; the action row is now Kích hoạt lại, Sửa, more';
});
await step('Reactivate at once: toast, active Badge, the full action row', async () => {
  await detail().getByRole('button', { name: 'Kích hoạt lại' }).click();
  await page.getByText('Đã kích hoạt lại Nhóm AI ứng dụng').waitFor();
  await detail().getByText('Đang hoạt động', { exact: true }).waitFor();
  await detail().getByRole('button', { name: 'Chuyển đơn vị' }).waitFor();
  await expectRow('Nhóm AI ứng dụng', 'aria-selected', 'true');
  return 'POST /api/org-units/{id}/reactivate, without a confirm';
});
await step('Delete the empty unit: the confirm with the danger button', async () => {
  await moreButton('Nhóm AI ứng dụng').click();
  await moreItem('Xóa đơn vị').click();
  const dialog = statusDialog('Xóa Nhóm AI ứng dụng?');
  await dialog.getByText('Nhóm AI ứng dụng không có nhân viên và đơn vị con. Sau khi xóa không thể khôi phục.').waitFor();
  await dialog.getByRole('button', { name: 'Xóa đơn vị' }).waitFor();
});
await step('Deleted: toast, the unit is gone from the tree, the company selected', async () => {
  await statusDialog('Xóa Nhóm AI ứng dụng?').getByRole('button', { name: 'Xóa đơn vị' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByText('Đã xóa Nhóm AI ứng dụng').waitFor();
  await row('Nhóm AI ứng dụng').waitFor({ state: 'hidden' });
  // The unit was directly under the company: the company (the first row) becomes the selection.
  await tree().getByRole('treeitem').first().and(page.locator('[aria-selected="true"]')).waitFor();
  if (/unit=/.test(page.url())) throw new Error('the deleted unit is still in the URL');
  return 'DELETE /api/org-units/{id} → 204; the selection moves to the parent';
});
await step('Narrow window 1024: detail under the tree', async () => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.getByRole('tab', { name: 'Cây đơn vị' }).click();
  await row('Phòng Phát triển phần mềm').waitFor();
  const expandAll = page.getByRole('button', { name: 'Mở tất cả' });
  if (await expandAll.isVisible()) await expandAll.click();
  await row('Nhóm Web').waitFor();
});
await step('Phone 390: compact tree', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await row('Phòng Phát triển phần mềm').waitFor();
});
await step('Phone 390: the org chart at 100 percent, centred on the company', async () => {
  await openChartTab();
  await card('Phòng Phát triển phần mềm').waitFor();
  // The success toast of the delete step closes itself after 5s; without it the chart is in full view.
  await page.getByText('Đã xóa Nhóm AI ứng dụng').waitFor({ state: 'hidden' });
  return 'the chart is wider than the phone: it pans by touch inside its viewport';
});
await step('Phone 390: the org chart fitted to the screen', async () => {
  await page.getByRole('button', { name: 'Vừa màn hình' }).click();
  await page.waitForTimeout(300);
  return `the whole chart at ${await zoomLevel().innerText()}; zooming in from here goes back to the 50% step`;
});

report.push(`Result: all ${n} steps passed.`);
await finish(0);
