// Evidence for the project list and detail (HRM-15/FE-1, FE-2) against the real stack: /projects as the Admin at 1280 (every project,
// search without accents, "Chỉ dự án có người quá tải", the closed ones), then as the PM persona of "Demo as…" when the
// demo personas are on ("Tôi quản lý" first, and the compact rows and filter dialog at 390).
// The projects and allocations of the approved #15 artboards are added through the API when they are missing, with
// dates relative to today, on the example company's people (HRM_EXAMPLE_DATA on). Cao Minh Trí is 60% on DA-029 and
// 60% on DA-031 for a few weeks, so both show "1 quá tải". Use a throwaway database (CI does), never the demo one.
// Writes screenshots and a Markdown report; exits non-zero at the first step that fails.
//   BASE_URL (http://localhost:5173)  OUT (e2e-out)  IMG_BASE (image URL prefix)  HRM_ADMIN_PASSWORD
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';

mkdirSync(OUT, { recursive: true });
const report = ['### Projects (real backend, PostgreSQL)', ''];
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
  if (!response.ok) {
    const error = new Error(`${init.method ?? 'GET'} ${path} → ${response.status} ${await response.text()}`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

async function finish(code) {
  writeFileSync(`${OUT}/report-projects.md`, report.join('\n'));
  await browser.close();
  process.exit(code);
}

async function step(title, run) {
  n += 1;
  const file = `projects-${String(n).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
  try {
    const note = await run();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
    report.push(`**${n}. ${title}**${note ? `: ${note}` : ''}`, '', `![${title}](${IMG_BASE}/${file}?raw=true)`, '');
    console.log(`ok ${n}. ${title}`);
  } catch (error) {
    await page.screenshot({ path: `${OUT}/${file}`, fullPage: true }).catch(() => {});
    report.push(`**${n}. ${title}: FAILED**`, '', '```', String(error).slice(0, 1500), '```', '', `![${title}](${IMG_BASE}/${file}?raw=true)`, '', 'Result: FAILED.');
    console.error(`FAILED ${n}. ${title}\n${error}`);
    await finish(1);
  }
}

// --- Data through the API, dates relative to today in the company's time zone. ---
const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
const day = (offset) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const PROJECTS = [
  { code: 'DA-031', name: 'Ứng dụng đặt lịch khám', client: 'Bệnh viện Đa khoa Tâm An', pm: 'Vũ Thị Lan', unit: 'Phòng Phát triển phần mềm', from: -40, to: 170, status: 'ACTIVE' },
  { code: 'DA-029', name: 'Cổng khách hàng bảo hiểm', client: 'Bảo hiểm Hướng Dương', pm: 'Vũ Thị Lan', unit: 'Phòng Phát triển phần mềm', from: -120, to: 60, status: 'ACTIVE' },
  { code: 'DA-027', name: 'Hệ thống bán hàng tại quầy', client: 'Bán lẻ Lúa Vàng', pm: 'Lương Văn Hiển', unit: 'Phòng Phần mềm Đà Nẵng', from: -160, to: 50, status: 'ACTIVE' },
  { code: 'DA-033', name: 'Nền tảng dữ liệu nội bộ', client: null, pm: 'Hoàng Gia Huy', unit: 'Phòng Phát triển phần mềm', from: 20, to: 200, status: 'PLANNED' },
  { code: 'DA-018', name: 'Ứng dụng hội viên', client: 'Bán lẻ Lúa Vàng', pm: 'Lương Văn Hiển', unit: 'Phòng Phần mềm Đà Nẵng', from: -430, to: -100, status: 'CLOSED' },
];
const ALLOCATIONS = [
  { project: 'DA-029', who: 'Cao Minh Trí', percent: 60, from: -100, to: 21 },
  { project: 'DA-031', who: 'Cao Minh Trí', percent: 60, from: 4, to: 80 },
  { project: 'DA-031', who: 'Vũ Thị Lan', percent: 50, from: -40, to: 170 },
  { project: 'DA-027', who: 'Phan Khánh Duy', percent: 30, from: -150, to: 50 },
];
let added = 0;
try {
  token = (await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })).accessToken;
  const employee = async (name) => {
    const found = (await api(`/api/employees?${new URLSearchParams({ q: name, size: '5' })}`)).items.find((each) => each.fullName === name);
    if (!found) throw new Error(`no Employee "${name}": the flow needs the example data (HRM_EXAMPLE_DATA on)`);
    return found.id;
  };
  const units = (await api('/api/org-units/options')).items;
  const unit = (name) => units.find((each) => each.name === name)?.id ?? units[0].id;
  const role = (await api('/api/catalogs/project-roles/items?page=0&size=50')).items.find((item) => item.active);
  const ids = {};
  for (const p of PROJECTS) {
    const existing = (await api(`/api/projects?${new URLSearchParams({ q: p.code, status: 'PLANNED,ACTIVE,ON_HOLD,CLOSED', size: '5' })}`)).items.find((each) => each.code === p.code);
    if (existing) {
      ids[p.code] = existing.id;
      continue;
    }
    const created = await api('/api/projects', {
      method: 'POST',
      body: { code: p.code, name: p.name, client: p.client, pmEmployeeId: await employee(p.pm), orgUnitId: unit(p.unit), startDate: day(p.from), endDate: day(p.to), status: p.status },
    });
    ids[p.code] = created.id;
    added += 1;
  }
  for (const a of ALLOCATIONS) {
    const current = (await api(`/api/projects/${ids[a.project]}/allocations`)).items;
    const who = await employee(a.who);
    if (current.some((each) => each.employee?.id === who)) continue;
    await api(`/api/projects/${ids[a.project]}/allocations`, {
      method: 'POST',
      body: { employeeId: who, projectRoleId: role.id, percent: a.percent, startDate: day(a.from), endDate: day(a.to) },
    });
  }
} catch (error) {
  report.push('**Preparing data through the API: FAILED**', '', '```', String(error).slice(0, 1500), '```', '', 'Result: FAILED.');
  console.error(`FAILED preparing data\n${error}`);
  await finish(1);
}

const list = () => page.getByRole('table', { name: 'Danh sách dự án' });
const rowOf = (name) => list().getByRole('row').filter({ has: page.getByRole('link', { name, exact: true }) });
const search = () => page.getByRole('searchbox', { name: 'Tìm theo mã, tên hoặc khách hàng' });
const shownNames = async () => list().locator('tbody tr a').allTextContents();
const expectOnly = async (names) => {
  await page.waitForFunction(
    (wanted) => {
      const shown = [...document.querySelectorAll('table tbody tr a')].map((a) => a.textContent);
      return shown.length === wanted.length && wanted.every((name) => shown.includes(name));
    },
    names,
  );
};

await step('Admin: every open project, newest start first, with the members and the overload', async () => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Dự án' }).click();
  await page.getByRole('heading', { level: 1, name: 'Dự án' }).waitFor();
  await rowOf('Ứng dụng đặt lịch khám').waitFor();
  const names = await shownNames();
  for (const p of PROJECTS.filter((each) => each.status !== 'CLOSED')) {
    if (!names.includes(p.name)) throw new Error(`"${p.name}" is not listed: [${names.join(', ')}]`);
  }
  if (names.includes('Ứng dụng hội viên')) throw new Error('a closed project is listed by default');
  await rowOf('Ứng dụng đặt lịch khám').getByText('1 quá tải').waitFor();
  await rowOf('Cổng khách hàng bảo hiểm').getByText('1 quá tải').waitFor();
  await rowOf('Nền tảng dữ liệu nội bộ').getByText(/Dự án nội bộ/).waitFor();
  await page.getByText(/Ẩn \d+ dự án đã đóng\./).waitFor();
  return `GET /api/projects (status: every one but CLOSED); ${names.length} row(s); ${added} project(s) added through the API`;
});

await step('Search without accents: "lua vang"', async () => {
  await search().fill('lua vang');
  await page.waitForURL(/[?&]q=lua\+vang/);
  await expectOnly(['Hệ thống bán hàng tại quầy']);
  return 'q=lua vang finds the client "Bán lẻ Lúa Vàng" among the open projects';
});

await step('"Chỉ dự án có người quá tải"', async () => {
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click();
  await rowOf('Ứng dụng đặt lịch khám').waitFor();
  await page.getByText('Chỉ dự án có người quá tải', { exact: true }).click();
  await page.waitForURL(/[?&]overloaded=true/);
  await expectOnly(['Ứng dụng đặt lịch khám', 'Cổng khách hàng bảo hiểm']);
  return 'overloaded=true: the two projects that share Cao Minh Trí at 120%';
});

await step('Status "Đã đóng"', async () => {
  await page.getByText('Chỉ dự án có người quá tải', { exact: true }).click();
  await page.waitForURL((url) => !url.search.includes('overloaded'));
  await page.getByRole('combobox', { name: 'Trạng thái' }).click();
  await page.getByRole('option', { name: 'Đã đóng' }).click();
  await page.waitForURL(/[?&]status=CLOSED/);
  await rowOf('Ứng dụng hội viên').waitFor();
  await rowOf('Ứng dụng hội viên').getByText('Không còn ai').waitFor();
  return 'status=CLOSED; a closed project has nobody left';
});

await step('A closed project: its detail says so', async () => {
  await rowOf('Ứng dụng hội viên').getByRole('link', { name: 'Ứng dụng hội viên' }).click();
  await page.getByRole('heading', { level: 1, name: 'Ứng dụng hội viên' }).waitFor();
  await page.getByText('Dự án đã đóng', { exact: true }).waitFor();
  return 'GET /api/projects/{id}; the closed notice';
});

await step('Project detail: facts, the overload alert, members with their peak load', async () => {
  await page.goto(`${BASE}/projects`);
  await rowOf('Ứng dụng đặt lịch khám').getByRole('link', { name: 'Ứng dụng đặt lịch khám' }).click();
  await page.getByRole('heading', { level: 1, name: 'Ứng dụng đặt lịch khám' }).waitFor();
  await page.getByRole('region', { name: 'Thông tin dự án' }).getByText('Vũ Thị Lan').waitFor();
  const alert = page.getByRole('alert').filter({ hasText: 'Cao Minh Trí quá tải 120%' });
  await alert.waitFor();
  await alert.getByText(/trùng với Cổng khách hàng bảo hiểm \(60%\)/).waitFor();
  const table = page.getByRole('table', { name: 'Phân bổ của dự án Ứng dụng đặt lịch khám' });
  const tri = table.getByRole('row').filter({ hasText: 'Cao Minh Trí' });
  await tri.getByRole('img', { name: 'Tải phân bổ 120%, quá tải' }).waitFor();
  await tri.getByText(/^Bắt đầu /).waitFor();
  await page.getByRole('list', { name: 'Chú giải Tải phân bổ' }).waitFor();
  return 'GET /api/projects/{id} and /allocations?ended=false; Trí is 120% where DA-029 and DA-031 overlap';
});

await step('Project detail: the "Phân bổ đã kết thúc" tab', async () => {
  await page.getByRole('tab', { name: /Phân bổ đã kết thúc/ }).click();
  await page.waitForURL(/[?&]tab=ended/);
  await page.getByRole('heading', { name: 'Chưa có phân bổ nào kết thúc' }).or(page.getByRole('table', { name: /Phân bổ của dự án/ })).first().waitFor();
  return '/allocations?ended=true';
});

const me = await api('/api/me').catch(() => null);
const personas = me?.demo?.enabled ? ((await api('/api/auth/demo/personas').catch(() => ({ personas: [] }))).personas ?? []) : [];
const pm = personas.find((each) => each.persona === 'PROJECT_MANAGER' && each.available);
if (pm) {
  await step('As the PM persona: "Tôi quản lý" first, with both tab counts', async () => {
    await page.goto(`${BASE}/projects`);
    await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
    await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(pm.fullName) }).click();
    await page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(new RegExp(`Đang dùng Tài khoản của ${pm.fullName}`)).waitFor();
    await page.goto(`${BASE}/projects`);
    const mine = page.getByRole('tab', { name: /Tôi quản lý/ });
    await mine.waitFor();
    if ((await mine.getAttribute('aria-selected')) !== 'true') throw new Error('"Tôi quản lý" is not the first tab shown');
    await expectOnly(['Ứng dụng đặt lịch khám', 'Cổng khách hàng bảo hiểm']);
    return `switched to ${pm.fullName} through "Demo as…"; mine=true lists the projects they manage`;
  });
  await step('As the PM persona: another PM\'s project is read-only', async () => {
    await page.goto(`${BASE}/projects?tab=all`);
    await rowOf('Hệ thống bán hàng tại quầy').getByRole('link', { name: 'Hệ thống bán hàng tại quầy' }).click();
    await page.getByRole('heading', { level: 1, name: 'Hệ thống bán hàng tại quầy' }).waitFor();
    await page.getByText('Bạn chỉ xem được dự án này').waitFor();
    await page.getByText(/Chỉ Lương Văn Hiển, PM của dự án/).waitFor();
    return 'canEdit=false: the notice names the PM';
  });
  await step('At 390: compact rows, the view-only note, and the filter dialog', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/projects`);
    const rows = page.getByRole('list', { name: 'Danh sách dự án' });
    await rows.getByRole('link', { name: 'Ứng dụng đặt lịch khám' }).waitFor();
    await page.getByText('Trên điện thoại chỉ xem dự án và thành viên.', { exact: false }).waitFor();
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    if (!fits) throw new Error('the page scrolls sideways at 390');
    await page.screenshot({ path: `${OUT}/projects-${String(n).padStart(2, '0')}a-rows.png`, fullPage: true });
    report.push(`![Compact rows at 390](${IMG_BASE}/projects-${String(n).padStart(2, '0')}a-rows.png?raw=true)`, '');
    await page.getByRole('button', { name: 'Lọc' }).click();
    await page.getByRole('dialog', { name: 'Lọc dự án' }).waitFor();
    return 'no sideways scroll at 390';
  });
  await step('At 390: the project detail with its members', async () => {
    await page.keyboard.press('Escape');
    await page.goto(`${BASE}/projects`);
    await page.getByRole('list', { name: 'Danh sách dự án' }).getByRole('link', { name: 'Ứng dụng đặt lịch khám' }).click();
    await page.getByRole('heading', { level: 1, name: 'Ứng dụng đặt lịch khám' }).waitFor();
    await page.getByRole('list', { name: 'Phân bổ của dự án Ứng dụng đặt lịch khám' }).getByText('Cao Minh Trí').waitFor();
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    if (!fits) throw new Error('the detail scrolls sideways at 390');
    return 'compact rows of the members; no sideways scroll';
  });
} else {
  report.push('_PM persona and 390: skipped, the demo personas are off._', '');
}

report.push('Result: passed.');
await finish(0);
