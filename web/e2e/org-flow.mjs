// Evidence for the org structure screens (HRM-03) against the real stack: signs in as the Admin, makes sure
// the database has a small org tree (created through the API when it is empty), then walks the /org page.
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
await step('Org chart tab (placeholder until FE-4)', async () => {
  await page.getByRole('tab', { name: 'Sơ đồ tổ chức' }).click();
  await page.getByRole('heading', { name: 'Sơ đồ tổ chức đang được xây dựng' }).waitFor();
  if (!/view=chart/.test(page.url())) throw new Error('the tab is not in the URL');
});
await step('Narrow window 1024: detail under the tree', async () => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.getByRole('tab', { name: 'Cây đơn vị' }).click();
  await page.getByRole('button', { name: 'Mở tất cả' }).click();
  await row('Nhóm Web').waitFor();
});
await step('Phone 390: compact tree', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await row('Phòng Phát triển phần mềm').waitFor();
});

report.push(`Result: all ${n} steps passed.`);
await finish(0);
