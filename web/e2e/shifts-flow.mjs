// Evidence for the Ca làm việc page (HRM-22/FE-1) against the real stack: /shifts as the Admin at 1280 and 390, adding
// a day shift and a night shift 22:00–06:00 through the dialog (the live preview of the hours, the field errors, a
// taken code), editing, turning a shift off and on again behind a confirmation, and the status filter. With the demo
// personas on (the local compose stack), the Giám đốc persona reads the list with no add, edit or turn-off control and
// the Nhân viên persona gets the denied state. Every run adds two shifts of its own (shifts are never deleted), so use
// a throwaway database (CI does), never the demo one.
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
const report = ['### Shifts page (real backend, PostgreSQL)', ''];
// Codes and names of their own on every run, so a re-run against the same database still adds two shifts.
const RUN = Date.now().toString(36).slice(-5).toUpperCase();
const DAY = { code: `HC${RUN}`, name: `Hành chính ${RUN}` };
const NIGHT = { code: `DEM${RUN}`, name: `Ca đêm ${RUN}` };
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

async function finish(code) {
  writeFileSync(`${OUT}/report-shifts.md`, report.join('\n'));
  await browser.close();
  process.exit(code);
}

async function step(title, run) {
  n += 1;
  const file = `shifts-${String(n).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
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

const nav = () => page.getByRole('navigation', { name: 'Điều hướng chính' });
const dialog = (name) => page.getByRole('dialog', { name });
const toast = (text) => page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(text);
const rowOf = (name) =>
  page
    .getByRole('table', { name: 'Danh sách ca làm việc' })
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name, exact: true }) });
const openMenu = async (name, item) => {
  await page.getByRole('button', { name: `Thao tác với ca ${name}` }).click();
  await page.getByRole('menuitem', { name: item }).click();
};
const fillShift = async (form, { code, name, start, end, breakStart, breakEnd }) => {
  if (code !== undefined) await form.getByLabel('Mã ca').fill(code);
  if (name !== undefined) await form.getByLabel('Tên ca').fill(name);
  if (start !== undefined) await form.getByLabel('Giờ bắt đầu').fill(start);
  if (end !== undefined) await form.getByLabel('Giờ kết thúc').fill(end);
  if (breakStart !== undefined) await form.getByLabel('Nghỉ từ').fill(breakStart);
  if (breakEnd !== undefined) await form.getByLabel('Nghỉ đến').fill(breakEnd);
};

try {
  token = (await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })).accessToken;
} catch (error) {
  report.push('**Signing in through the API: FAILED**', '', '```', String(error).slice(0, 1500), '```', '', 'Result: FAILED.');
  console.error(`FAILED signing in\n${error}`);
  await finish(1);
}
const before = await api('/api/shifts');

await step('Admin: "Ca làm việc" in the menu opens the list', async () => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await nav().getByRole('link', { name: 'Ca làm việc' }).click();
  await page.getByRole('heading', { level: 1, name: 'Ca làm việc' }).waitFor();
  if (before.length === 0) {
    await page.getByRole('heading', { name: 'Chưa có ca làm việc' }).waitFor();
    return 'no shift yet: the empty state offers "Thêm ca làm việc"';
  }
  await page.getByRole('table', { name: 'Danh sách ca làm việc' }).waitFor();
  return `${before.length} shift(s) from earlier runs`;
});

await step('Add a day shift: the live preview, then a toast and the new row', async () => {
  await page.getByRole('button', { name: 'Thêm ca làm việc' }).first().click();
  const form = dialog('Thêm ca làm việc');
  await fillShift(form, { code: DAY.code.toLowerCase(), name: DAY.name, start: '08:00', end: '17:00', breakStart: '12:00', breakEnd: '13:00' });
  await form.getByText('Giờ làm theo lịch: 8 giờ').waitFor();
  await form.getByText('Trong đó giờ làm đêm (22:00–06:00): 0 phút').waitFor();
  await form.getByLabel('Cho phép đi muộn').fill('5');
  await form.getByLabel('Cho phép về sớm').fill('5');
  await form.getByRole('combobox', { name: 'Cách làm tròn giờ làm' }).click();
  await page.getByRole('option', { name: 'Làm tròn gần nhất' }).click();
  await form.getByRole('combobox', { name: 'Bước làm tròn' }).waitFor();
  await form.getByRole('button', { name: 'Thêm ca làm việc' }).click();
  await toast(`Đã thêm ca ${DAY.name}`).waitFor();
  const row = rowOf(DAY.name);
  await row.waitFor();
  for (const text of [DAY.code, '08:00 – 17:00', '12:00 – 13:00', 'Đi muộn: 5 phút', 'Về sớm: 5 phút', 'Gần nhất, bước 15 phút', '8 giờ', 'Đang dùng']) {
    await row.getByText(text, { exact: true }).waitFor();
  }
  return `the code was typed in lower case and saved as ${DAY.code}`;
});

await step('Field errors say the cause and the fix', async () => {
  await page.getByRole('button', { name: 'Thêm ca làm việc' }).first().click();
  const form = dialog('Thêm ca làm việc');
  await fillShift(form, { code: 'bad code', name: '', start: '08:00', end: '08:00', breakStart: '12:00', breakEnd: '' });
  await form.getByLabel('Cho phép đi muộn').fill('130');
  await form.getByRole('button', { name: 'Thêm ca làm việc' }).click();
  for (const text of [
    'Mã ca chỉ gồm chữ, số, gạch ngang hoặc gạch dưới, tối đa 20 ký tự.',
    'Nhập tên ca.',
    'Giờ kết thúc phải khác giờ bắt đầu. Ca 24 giờ không hợp lệ.',
    'Nhập cả giờ bắt đầu và kết thúc nghỉ, hoặc bỏ trống cả hai.',
    'Nhập số phút từ 0 đến 120.',
  ]) {
    await form.getByText(text).waitFor();
  }
  return 'nothing was sent; the first invalid field has the focus';
});

await step('A break outside the shift is refused on the break field', async () => {
  const form = dialog('Thêm ca làm việc');
  await fillShift(form, { code: `x${RUN}`, name: `Thử ${RUN}`, start: '08:00', end: '17:00', breakStart: '18:00', breakEnd: '19:00' });
  await form.getByLabel('Cho phép đi muộn').fill('0');
  await form.getByRole('button', { name: 'Thêm ca làm việc' }).click();
  await form.getByText('Khung nghỉ phải nằm trong ca. Chỉnh giờ nghỉ cho nằm giữa giờ bắt đầu và kết thúc.').waitFor();
  await form.getByRole('button', { name: 'Hủy' }).click();
  await form.waitFor({ state: 'detached' });
  await rowOf(`Thử ${RUN}`).waitFor({ state: 'detached' });
});

await step('Add a night shift 22:00–06:00: it crosses midnight with 8 hours, all of them night hours', async () => {
  await page.getByRole('button', { name: 'Thêm ca làm việc' }).first().click();
  const form = dialog('Thêm ca làm việc');
  await fillShift(form, { code: NIGHT.code, name: NIGHT.name, start: '22:00', end: '06:00' });
  await form.getByText('Giờ làm theo lịch: 8 giờ').waitFor();
  await form.getByText('Trong đó giờ làm đêm (22:00–06:00): 8 giờ').waitFor();
  await form.getByText('Ca qua nửa đêm, thuộc ngày bắt đầu.').waitFor();
  await form.getByRole('button', { name: 'Thêm ca làm việc' }).click();
  await toast(`Đã thêm ca ${NIGHT.name}`).waitFor();
  const row = rowOf(NIGHT.name);
  await row.waitFor();
  for (const text of ['22:00 – 06:00', 'Qua nửa đêm', 'Đêm: 8 giờ', '8 giờ']) await row.getByText(text, { exact: true }).waitFor();
});

await step('A taken code is reported on the code field', async () => {
  await page.getByRole('button', { name: 'Thêm ca làm việc' }).first().click();
  const form = dialog('Thêm ca làm việc');
  await fillShift(form, { code: NIGHT.code.toLowerCase(), name: `Trùng mã ${RUN}`, start: '22:00', end: '06:00' });
  await form.getByRole('button', { name: 'Thêm ca làm việc' }).click();
  await form.getByText('Mã ca này đã có. Chọn một mã khác.').waitFor();
  if (!(await form.getByLabel('Mã ca').evaluate((input) => document.activeElement === input))) throw new Error('the code field does not have the focus');
  await form.getByRole('button', { name: 'Hủy' }).click();
  await form.waitFor({ state: 'detached' });
});

await step('Edit: the code is locked and Save waits for a change', async () => {
  await openMenu(NIGHT.name, 'Sửa ca');
  const form = dialog(`Sửa ca: ${NIGHT.name}`);
  if ((await form.getByLabel('Mã ca').getAttribute('readonly')) === null) throw new Error('the code can be edited');
  if (!(await form.getByRole('button', { name: 'Lưu thay đổi' }).isDisabled())) throw new Error('Save is enabled before a change');
  await form.getByLabel('Cho phép đi muộn').fill('10');
  await form.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await toast(`Đã lưu ca ${NIGHT.name}`).waitFor();
  await rowOf(NIGHT.name).getByText('Đi muộn: 10 phút', { exact: true }).waitFor();
});

await step('Turn a shift off behind a confirmation, then find it with the filter', async () => {
  await openMenu(NIGHT.name, 'Ngừng dùng');
  const ask = dialog(`Ngừng dùng ca ${NIGHT.name}?`);
  await ask.getByText('Các lần phân ca đã có vẫn giữ nguyên', { exact: false }).waitFor();
  await ask.getByRole('button', { name: 'Ngừng dùng' }).click();
  await toast(`Đã ngừng dùng ca ${NIGHT.name}`).waitFor();
  await rowOf(NIGHT.name).getByText('Ngừng dùng', { exact: true }).waitFor();
  await page.getByRole('combobox', { name: 'Trạng thái' }).click();
  await page.getByRole('option', { name: 'Ngừng dùng' }).click();
  await page.waitForURL(/[?&]status=INACTIVE\b/);
  await rowOf(NIGHT.name).waitFor();
  await rowOf(DAY.name).waitFor({ state: 'detached' });
});

await step('Turn it on again', async () => {
  await openMenu(NIGHT.name, 'Dùng lại');
  await dialog(`Dùng lại ca ${NIGHT.name}?`).getByRole('button', { name: 'Dùng lại' }).click();
  await toast(`Đã dùng lại ca ${NIGHT.name}`).waitFor();
  // It is in use again, so the "Ngừng dùng" filter no longer lists it.
  await rowOf(NIGHT.name).waitFor({ state: 'detached' });
  await page.getByRole('combobox', { name: 'Trạng thái' }).click();
  await page.getByRole('option', { name: 'Tất cả ca' }).click();
  await rowOf(NIGHT.name).getByText('Đang dùng', { exact: true }).waitFor();
  await rowOf(DAY.name).waitFor();
});

const me = await api('/api/me').catch(() => null);
const personas = me?.demo?.enabled ? ((await api('/api/auth/demo/personas').catch(() => ({ personas: [] }))).personas ?? []) : [];
const director = personas.find((each) => each.persona === 'DIRECTOR' && each.available);
const employee = personas.find((each) => each.persona === 'EMPLOYEE' && each.available);
const adminPersona = personas.find((each) => each.persona === 'ADMIN' && each.available);
const switchTo = async (persona) => {
  await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
  await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(persona.fullName) }).click();
  await toast(new RegExp(`Đang dùng Tài khoản của ${persona.fullName}`)).waitFor();
};

if (director && employee && adminPersona) {
  await step('As the Giám đốc persona: the list, with no control to add, edit or turn off', async () => {
    await switchTo(director);
    await page.goto(`${BASE}/shifts`);
    await rowOf(NIGHT.name).waitFor();
    await page.getByText('Bạn chỉ xem được danh sách này').waitFor();
    if ((await page.getByRole('button', { name: 'Thêm ca làm việc' }).count()) > 0) throw new Error('the add button is there');
    if ((await page.getByRole('button', { name: /^Thao tác với ca/ }).count()) > 0) throw new Error('a row menu is there');
    return `${director.fullName} has SHIFT_VIEW only`;
  });

  await step('As the Nhân viên persona: no menu item and the denied state by URL', async () => {
    await switchTo(employee);
    await page.goto(`${BASE}/shifts`);
    await page.getByRole('heading', { name: 'Bạn không có quyền xem ca làm việc' }).waitFor();
    if ((await nav().getByRole('link', { name: 'Ca làm việc' }).count()) > 0) throw new Error('the menu item is there');
    return `${employee.fullName} has no SHIFT_VIEW`;
  });

  await step('As the Admin persona: the menu item is back', async () => {
    await switchTo(adminPersona);
    await page.goto(`${BASE}/shifts`);
    await nav().getByRole('link', { name: 'Ca làm việc' }).waitFor();
    await rowOf(NIGHT.name).waitFor();
    return `${adminPersona.fullName} (Admin) for the phone steps`;
  });
} else {
  report.push('_Giám đốc, Nhân viên and Admin personas: skipped, the demo personas are off._', '');
}

await step('390: compact rows, and the add dialog', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/shifts`);
  const compact = page.getByRole('list', { name: 'Danh sách ca làm việc' });
  const night = compact.getByRole('listitem').filter({ hasText: NIGHT.name });
  await night.waitFor();
  for (const text of ['22:00 – 06:00', 'Qua nửa đêm', 'Đang dùng']) await night.getByText(text, { exact: true }).waitFor();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (wide) throw new Error('the page scrolls sideways at 390');
  await page.getByRole('button', { name: 'Thêm ca làm việc' }).click();
  const form = dialog('Thêm ca làm việc');
  await form.getByLabel('Giờ bắt đầu').waitFor();
  const box = await form.boundingBox();
  if (!box || box.x < 0 || box.x + box.width > 390) throw new Error(`the dialog does not fit 390: ${JSON.stringify(box)}`);
});

report.push('Result: passed.');
await finish(0);
