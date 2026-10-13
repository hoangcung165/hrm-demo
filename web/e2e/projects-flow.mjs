// Evidence for the project list, detail and allocations (HRM-15/FE-1 to FE-4) against the real stack: /projects as the Admin at 1280 (every project,
// search without accents, "Chỉ dự án có người quá tải", the closed ones), then as the PM persona of "Demo as…" when the
// demo personas are on ("Tôi quản lý" first at 1440, the own project with its overload and "Phân bổ nhân sự", another
// PM's project read-only, the compact rows and filter dialog at 390, and the Giám đốc persona editing another PM's project).
// The projects and allocations of the approved #15 artboards are seeded with the example data (HRM_EXAMPLE_DATA on,
// `ExampleProjects`); any that are missing are added through the API, with dates relative to today, on the example
// company's people. Cao Minh Trí is 60% on DA-029 and
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

// --- Create, edit and close (HRM-15/FE-3): a new project with a code of its own on every run. ---
const NEW_CODE = `E2E-${Date.now().toString(36).toUpperCase()}`;
const NEW_NAME = `Cổng đối tác ${NEW_CODE}`;
const dialog = (name) => page.getByRole('dialog', { name, exact: true });
const dmy = (offset) => day(offset).split('-').reverse().join('/');
const toasts = () => page.getByRole('region', { name: 'Thông báo kết quả thao tác' });

await step('"Tạo dự án": a taken code is refused on its field', async () => {
  await page.goto(`${BASE}/projects`);
  await page.getByRole('button', { name: 'Tạo dự án' }).click();
  const form = dialog('Tạo dự án');
  await form.waitFor();
  await form.getByRole('textbox', { name: /^Mã dự án/ }).fill('DA-031');
  await form.getByRole('textbox', { name: /^Tên dự án/ }).fill(NEW_NAME);
  await form.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã nhân viên' }).fill('Vũ Thị Lan');
  await form.getByRole('combobox', { name: 'PM' }).click();
  await page.getByRole('option', { name: /^Vũ Thị Lan/ }).first().click();
  await form.getByRole('button', { name: /^Phòng ban phụ trách: / }).click();
  const units = page.getByRole('dialog', { name: 'Phòng ban phụ trách' });
  await units.getByRole('searchbox', { name: 'Tìm phòng ban' }).fill('phat trien phan mem');
  await units.getByRole('treeitem', { name: 'Phòng Phát triển phần mềm' }).click();
  await form.getByLabel(/^Ngày bắt đầu/).fill(day(-5));
  await form.getByLabel(/^Ngày kết thúc/).fill(day(-10));
  await form.getByRole('textbox', { name: /^Ngân sách nhân sự/ }).fill('1.200.000.000');
  await form.getByRole('button', { name: 'Tạo dự án' }).click();
  await form.getByText('Ngày kết thúc phải từ ngày bắt đầu trở đi.').waitFor();
  await form.getByLabel(/^Ngày kết thúc/).fill(day(190));
  await form.getByRole('button', { name: 'Tạo dự án' }).click();
  await form.getByText('Mã dự án này đã có. Chọn mã khác.').waitFor();
  return 'the end date before the start is refused in the form; POST /api/projects with DA-031 → 409 project.code_taken on "Mã dự án"';
});

await step('"Tạo dự án": the new project opens', async () => {
  const form = dialog('Tạo dự án');
  await form.getByRole('textbox', { name: /^Mã dự án/ }).fill(NEW_CODE);
  await form.getByRole('button', { name: 'Tạo dự án' }).click();
  await page.getByRole('heading', { level: 1, name: NEW_NAME }).waitFor();
  await page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(`Đã tạo dự án ${NEW_CODE}`).waitFor();
  await page.getByText(`${NEW_CODE} · Dự án nội bộ`).waitFor();
  await page.getByRole('region', { name: 'Thông tin dự án' }).getByText('1.200.000.000 ₫').waitFor();
  return `POST /api/projects → 201; ${NEW_CODE}, Lên kế hoạch, PM Vũ Thị Lan`;
});

await step('"Sửa dự án": the code is read-only, the new name is saved', async () => {
  await page.getByRole('button', { name: 'Sửa dự án' }).click();
  const form = dialog('Sửa dự án');
  await form.waitFor();
  if ((await form.getByRole('textbox', { name: /^Mã dự án/ }).getAttribute('readonly')) === null) throw new Error('the code can be edited');
  await form.getByRole('textbox', { name: /^Tên dự án/ }).fill(`${NEW_NAME} (giai đoạn 1)`);
  await form.getByRole('textbox', { name: /^Khách hàng/ }).fill('Công ty Hải Âu');
  await form.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await page.getByRole('heading', { level: 1, name: `${NEW_NAME} (giai đoạn 1)` }).waitFor();
  await page.getByText(`${NEW_CODE} · Công ty Hải Âu`).waitFor();
  return 'PUT /api/projects/{id} → 200';
});

// --- Allocate, edit, delete and end early (HRM-15/FE-4) on the project just created: it started 5 days ago and is
// fresh on every run. Phan Khánh Duy is 30% on DA-027 until day 50, so 80% for days 1–40 makes 110%. ---
const DUY = 'Phan Khánh Duy';
const members = () => page.getByRole('table', { name: /^Phân bổ của dự án / });
const memberRow = () => members().getByRole('row').filter({ hasText: DUY });
const rowAction = async (item) => {
  await memberRow().getByRole('button', { name: `Thao tác với phân bổ của ${DUY}` }).click();
  await page.getByRole('menuitem', { name: item }).click();
};
const allocate = async ({ percent, from, to }) => {
  await page.getByRole('button', { name: 'Phân bổ nhân sự' }).click();
  const form = dialog('Phân bổ nhân sự');
  await form.waitFor();
  await form.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã nhân viên' }).fill(DUY);
  await form.getByRole('combobox', { name: /^Nhân viên/ }).click();
  await page.getByRole('option', { name: new RegExp(`^${DUY}`) }).click();
  await form.getByRole('combobox', { name: /^Vai trò dự án/ }).click();
  await page.getByRole('option').first().click();
  await form.getByRole('textbox', { name: /^Phần trăm thời gian/ }).fill(String(percent));
  await form.getByLabel(/^Từ ngày/).fill(day(from));
  await form.getByLabel(/^Đến ngày/).fill(day(to));
  return form;
};

await step('"Phân bổ nhân sự": an overload names the person, the period and the project, and still saves', async () => {
  const form = await allocate({ percent: 80, from: 1, to: 40 });
  const alert = form.getByRole('alert').filter({ hasText: `${DUY} sẽ quá tải` });
  await alert.waitFor();
  await alert.getByText(/Trùng với Hệ thống bán hàng tại quầy \(30%\)/).waitFor();
  await alert.getByText(/Giảm còn \d+%/).waitFor();
  await form.getByText(/^Quá tải:/).first().waitFor();
  await form.getByRole('button', { name: 'Vẫn lưu khi quá tải' }).click();
  await toasts().getByText(`Đã lưu phân bổ của ${DUY}, nhưng người này quá tải`).waitFor();
  await form.waitFor({ state: 'detached' });
  await page.getByRole('alert').filter({ hasText: `${DUY} quá tải` }).waitFor();
  return 'POST …/allocations/try after each change, then POST …/allocations → 201 with check.overloaded; the alert is on the project';
});

await step('"Sửa phân bổ": lowering the percent clears the overload', async () => {
  await rowAction('Sửa phân bổ');
  const form = dialog('Sửa phân bổ');
  await form.waitFor();
  await form.getByRole('textbox', { name: /^Phần trăm thời gian/ }).fill('60');
  await form.getByText(`Không ai bị quá tải. Tải phân bổ cao nhất của ${DUY} là 90%.`).waitFor();
  await form.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await form.waitFor({ state: 'detached' });
  await toasts().getByText(`Đã lưu phân bổ của ${DUY}`, { exact: true }).waitFor();
  await page.getByRole('alert').filter({ hasText: `${DUY} quá tải` }).waitFor({ state: 'detached' });
  return 'PUT …/allocations/{id}; the person is fixed; the project alert is gone';
});

await step('"Xóa phân bổ": allowed before the start only', async () => {
  await rowAction('Xóa phân bổ');
  const confirm = dialog(`Xóa phân bổ của ${DUY}?`);
  await confirm.waitFor();
  await confirm.getByRole('button', { name: 'Xóa phân bổ' }).click();
  await toasts().getByText(`Đã xóa phân bổ của ${DUY}`).waitFor();
  await memberRow().waitFor({ state: 'detached' });
  return 'DELETE …/allocations/{id} → 204; the row is gone';
});

await step('"Phân bổ nhân sự": dates outside the project are refused on their fields', async () => {
  const form = await allocate({ percent: 20, from: -3, to: 60 });
  await form.getByLabel(/^Từ ngày/).fill(day(-30));
  await form.getByRole('button', { name: 'Phân bổ' }).click();
  await form.getByText(/^Ngày phải nằm trong thời gian của dự án \(/).first().waitFor();
  await form.getByLabel(/^Từ ngày/).fill(day(-3));
  await form.getByText(`Không ai bị quá tải. Tải phân bổ cao nhất của ${DUY} là 50%.`).waitFor();
  await form.getByRole('button', { name: 'Phân bổ' }).click();
  await toasts().getByText(`Đã phân bổ ${DUY} vào dự án`).waitFor();
  await memberRow().waitFor();
  return 'the range error from the project dates; no overload shows the peak (50%); POST …/allocations → 201';
});

await step('"Kết thúc sớm": a running allocation ends earlier, and cannot be deleted', async () => {
  await memberRow().getByRole('button', { name: `Thao tác với phân bổ của ${DUY}` }).click();
  const deleteItem = page.getByRole('menuitem', { name: 'Xóa phân bổ' });
  if ((await deleteItem.getAttribute('aria-disabled')) !== 'true') throw new Error('a started allocation can be deleted');
  await page.getByText('Phân bổ đã bắt đầu nên không xóa được.', { exact: false }).waitFor();
  await page.getByRole('menuitem', { name: 'Kết thúc sớm' }).click();
  const form = dialog(`Kết thúc sớm phân bổ của ${DUY}?`);
  await form.waitFor();
  await form.getByLabel(/^Ngày làm cuối cùng/).fill(day(20));
  await form.getByRole('button', { name: 'Kết thúc phân bổ' }).click();
  await toasts().getByText(`Đã kết thúc phân bổ của ${DUY}, ngày cuối ${dmy(20)}`).waitFor();
  await memberRow().getByText(new RegExp(`– ${dmy(20)}`)).waitFor();
  return `POST …/allocations/{id}/end; the range now ends ${dmy(20)}`;
});

await step('"Sửa dự án": shortening the dates names the allocations to cut', async () => {
  await page.goto(`${BASE}/projects`);
  await rowOf('Ứng dụng đặt lịch khám').getByRole('link', { name: 'Ứng dụng đặt lịch khám' }).click();
  await page.getByRole('button', { name: 'Sửa dự án' }).click();
  const form = dialog('Sửa dự án');
  await form.getByLabel(/^Ngày kết thúc/).fill(day(60));
  await form.getByText(/phân bổ sẽ bị cắt theo ngày mới/).waitFor();
  await form.getByText(/Cao Minh Trí|Vũ Thị Lan/).first().waitFor();
  await form.getByText(/phân bổ sẽ bị cắt theo ngày mới/).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/projects-${String(n).padStart(2, '0')}a-shorten.png`, fullPage: true });
  report.push(`![Shorten warning](${IMG_BASE}/projects-${String(n).padStart(2, '0')}a-shorten.png?raw=true)`, '');
  await form.getByRole('button', { name: 'Hủy' }).click();
  await form.waitFor({ state: 'detached' });
  return 'a warning before saving; cancelled, nothing saved';
});

await step('Closing a project asks first, then the project shows as closed', async () => {
  await page.goto(`${BASE}/projects`);
  await search().fill(NEW_CODE);
  await rowOf(`${NEW_NAME} (giai đoạn 1)`).getByRole('link').click();
  await page.getByRole('button', { name: 'Sửa dự án' }).click();
  const form = dialog('Sửa dự án');
  await form.getByRole('combobox', { name: 'Trạng thái' }).click();
  await page.getByRole('option', { name: 'Đã đóng' }).click();
  await form.getByRole('button', { name: 'Lưu thay đổi' }).click();
  const confirm = dialog(`Đóng dự án ${NEW_NAME} (giai đoạn 1)?`);
  await confirm.getByText(/Phân bổ của 1 người đang làm sẽ kết thúc hôm nay/).waitFor();
  await page.screenshot({ path: `${OUT}/projects-${String(n).padStart(2, '0')}a-close.png`, fullPage: true });
  report.push(`![Close confirmation](${IMG_BASE}/projects-${String(n).padStart(2, '0')}a-close.png?raw=true)`, '');
  await confirm.getByRole('button', { name: 'Đóng dự án' }).click();
  await page.getByText('Dự án đã đóng', { exact: true }).waitFor();
  await page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(/^Đã đóng dự án /).waitFor();
  return 'the confirm names the one running allocation, then PUT with status CLOSED; the closed notice';
});

const me = await api('/api/me').catch(() => null);
const personas = me?.demo?.enabled ? ((await api('/api/auth/demo/personas').catch(() => ({ personas: [] }))).personas ?? []) : [];
const pm = personas.find((each) => each.persona === 'PROJECT_MANAGER' && each.available);
if (pm) {
  await step('As the PM persona: "Tôi quản lý" first, with both tab counts', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
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
  await step('As the PM persona: the own project shows its overload and "Phân bổ nhân sự"', async () => {
    await rowOf('Ứng dụng đặt lịch khám').getByRole('link', { name: 'Ứng dụng đặt lịch khám' }).click();
    await page.getByRole('heading', { level: 1, name: 'Ứng dụng đặt lịch khám' }).waitFor();
    await page.getByRole('alert').filter({ hasText: 'Cao Minh Trí quá tải 120%' }).waitFor();
    await page.getByRole('button', { name: 'Sửa dự án' }).waitFor();
    await page.getByRole('button', { name: 'Phân bổ nhân sự' }).waitFor();
    const table = page.getByRole('table', { name: 'Phân bổ của dự án Ứng dụng đặt lịch khám' });
    await table.getByRole('button', { name: 'Thao tác với phân bổ của Cao Minh Trí' }).waitFor();
    return 'canEdit=true: the button and the row menus are there, and the example overload shows';
  });
  await step('As the PM persona: another PM\'s project is read-only', async () => {
    await page.goto(`${BASE}/projects?tab=all`);
    await rowOf('Hệ thống bán hàng tại quầy').getByRole('link', { name: 'Hệ thống bán hàng tại quầy' }).click();
    await page.getByRole('heading', { level: 1, name: 'Hệ thống bán hàng tại quầy' }).waitFor();
    await page.getByText('Bạn chỉ xem được dự án này').waitFor();
    await page.getByText(/Chỉ Lương Văn Hiển, PM của dự án/).waitFor();
    if ((await page.getByRole('button', { name: 'Phân bổ nhân sự' }).count()) > 0) throw new Error('"Phân bổ nhân sự" on another PM\'s project');
    if ((await page.getByRole('button', { name: /^Thao tác với phân bổ/ }).count()) > 0) throw new Error('row menus on another PM\'s project');
    return 'canEdit=false: the notice names the PM; neither the allocate button nor the row menus';
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

const director = personas.find((each) => each.persona === 'DIRECTOR' && each.available);
if (director) {
  await step('As the Giám đốc persona: edits another PM\'s project and allocates', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/projects`);
    await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
    await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(director.fullName) }).click();
    await page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(new RegExp(`Đang dùng Tài khoản của ${director.fullName}`)).waitFor();
    await page.goto(`${BASE}/projects?tab=all`);
    await rowOf('Hệ thống bán hàng tại quầy').getByRole('link', { name: 'Hệ thống bán hàng tại quầy' }).click();
    await page.getByRole('heading', { level: 1, name: 'Hệ thống bán hàng tại quầy' }).waitFor();
    await page.getByRole('button', { name: 'Phân bổ nhân sự' }).waitFor();
    await page.getByRole('button', { name: 'Sửa dự án' }).click();
    const form = dialog('Sửa dự án');
    await form.waitFor();
    await form.getByRole('textbox', { name: /^Ngân sách nhân sự/ }).fill('500.000.000');
    await form.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await page.getByRole('region', { name: 'Thông tin dự án' }).getByText('500.000.000 ₫').waitFor();
    return 'PROJECT_EDIT_ALL: the Giám đốc edits a project of Lương Văn Hiển (PUT /api/projects/{id} → 200) and may allocate on it';
  });
}

report.push('Result: passed.');
await finish(0);
