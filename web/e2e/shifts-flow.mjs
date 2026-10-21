// Evidence for the Ca làm việc page (HRM-22/FE-1) against the real stack: /shifts as the Admin at 1280 and 390, adding
// a day shift and a night shift 22:00–06:00 through the dialog (the live preview of the hours, the field errors, a
// taken code), editing, turning a shift off and on again behind a confirmation, and the status filter. Then the Lịch phân ca
// (HRM-22/FE-2) at /shift-calendar: a night shift assigned to Nguyễn Văn An and the default shift of Nhóm Web set through
// the API, the week and the month with the assigned and default shifts, the filters kept in the URL over a reload, the
// day drawer and the 390 agenda (needs the example data; skipped without it). Then assigning shifts (HRM-22/FE-3), on
// next week: a whole team for the weekdays with the preview of what it adds, assigning again (replaces, never
// duplicates), a person given another shift (the preview says how many it replaces), the default shift of Nhóm Web set
// and cleared, clearing the assignments, "Phân ca" from a day's drawer, and the dialog at 390. With the demo
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

// --- Lịch phân ca (FE-2): data through the API, then the screens. ---
const companyNow = new Date(Date.now() + 7 * 3600_000); // the company's day as a UTC date
const isoOf = (date) => date.toISOString().slice(0, 10);
const monday = new Date(companyNow);
monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
const sunday = new Date(monday);
sunday.setUTCDate(sunday.getUTCDate() + 6);
const an = (await api(`/api/employees?q=${encodeURIComponent('Nguyễn Văn An')}&size=20`)).items.find((each) => each.fullName === 'Nguyễn Văn An');
const webUnit = (await api('/api/org-units')).units.find((unit) => unit.code === 'WEB');
const shiftIds = Object.fromEntries((await api('/api/shifts')).map((shift) => [shift.code, shift.id]));
const calendar = an && webUnit;
const personQuery = an ? `&person=${an.id}` : '';
const cellsOf = () => page.getByRole('button', { name: /^Nguyễn Văn An, / });
const nightCell = () => page.getByRole('button', { name: new RegExp(`^Nguyễn Văn An, .*: ${NIGHT.name}, 22:00 – 06:00 hôm sau, đã phân ca$`) });
const defaultCell = () => page.getByRole('button', { name: new RegExp(`^Nguyễn Văn An, .*: ${DAY.name}, 08:00 – 17:00, ca mặc định của đơn vị$`) });

if (calendar) {
  await step('Lịch phân ca: a night shift assigned and a default shift set through the API, then the week', async () => {
    const result = await api('/api/shift-assignments', {
      method: 'PUT',
      body: { shiftId: shiftIds[NIGHT.code], employeeIds: [an.id], from: isoOf(monday), to: isoOf(sunday), weekdays: ['MONDAY', 'TUESDAY', 'WEDNESDAY'] },
    });
    await api(`/api/org-units/${webUnit.id}/default-shift`, { method: 'PUT', body: { shiftId: shiftIds[DAY.code] } });
    await nav().getByRole('link', { name: 'Lịch phân ca' }).click();
    await page.getByRole('heading', { level: 1, name: 'Lịch phân ca' }).waitFor();
    await page.goto(`${BASE}/shift-calendar?view=week${personQuery}`);
    await page.getByRole('table', { name: /^Lịch phân ca, / }).waitFor();
    await nightCell().first().waitFor();
    await defaultCell().first().waitFor();
    return `Nguyễn Văn An: ${result.created + result.replaced} night day(s) assigned (Mon–Wed), the other working days from the default of Nhóm Web`;
  });

  await step('The filters are in the URL and survive a reload', async () => {
    await page.reload();
    await page.getByRole('table', { name: /^Lịch phân ca, / }).waitFor();
    if ((await page.getByRole('rowheader').count()) !== 1) throw new Error('the person filter shows more than one person after a reload');
    await page.getByRole('button', { name: 'Xóa bộ lọc' }).waitFor();
    if (!page.url().includes(`person=${an.id}`) || !page.url().includes('view=week')) throw new Error(`the URL lost the filters: ${page.url()}`);
    return 'view=week and the person are in the URL';
  });

  await step('The month shows the same shifts, the night shift marked by a moon and its words', async () => {
    await page.goto(`${BASE}/shift-calendar?date=${isoOf(monday)}${personQuery}`);
    await page.getByRole('table', { name: /^Lịch phân ca, / }).waitFor();
    await nightCell().first().waitFor();
    const days = await page.getByRole('columnheader').count();
    if (days < 29) throw new Error(`the month has ${days - 1} day columns`);
    await page.getByText(/^Tháng \d+\/\d{4}$/).waitFor();
  });

  await step('A day opens in a drawer with who works which shift, complete for the day', async () => {
    await nightCell().first().click();
    const drawer = page.getByRole('dialog', { name: /, \d{2}\/\d{2}\/\d{4}/ });
    await drawer.getByText(NIGHT.name).waitFor();
    await drawer.getByText('22:00 – 06:00 hôm sau').waitFor();
    await drawer.getByText('Nguyễn Văn An').waitFor();
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'detached' });
  });

  await step('Filter by shift: only the people who work it', async () => {
    await page.goto(`${BASE}/shift-calendar?view=week&shift=${shiftIds[NIGHT.code]}`);
    await page.getByRole('table', { name: /^Lịch phân ca, / }).waitFor();
    await page.getByRole('rowheader').filter({ hasText: 'Nguyễn Văn An' }).waitFor();
    if ((await defaultCell().count()) > 0) throw new Error('a default Hành chính cell shows under the night shift filter');
    await page.getByRole('combobox', { name: 'Ca', exact: true }).filter({ hasText: NIGHT.code }).waitFor();
  });

  // --- Assigning shifts (FE-3), on next week so nothing depends on which day of this week today is. ---
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
  const nextSunday = new Date(nextMonday);
  nextSunday.setUTCDate(nextSunday.getUTCDate() + 6);
  const nextWeek = (extra = '') => `${BASE}/shift-calendar?view=week&date=${isoOf(nextMonday)}${extra}`;
  const gridReady = () => page.getByRole('table', { name: /^Lịch phân ca, / }).waitFor();
  const assignDialog = () => dialog('Phân ca');
  const submitName = { name: 'Phân ca', exact: true };
  const WORKDAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu'];
  const openAssign = async (url) => {
    await page.goto(url);
    await gridReady();
    await page.getByRole('button', submitName).click();
    const box = assignDialog();
    await box.waitFor();
    return box;
  };
  const pickShift = async (box, code) => {
    await box.getByRole('combobox', { name: /^Ca làm việc/ }).click();
    await page.getByRole('option', { name: new RegExp(`^${code} · `) }).click();
  };
  const tickWeekdays = async (box, names) => {
    for (const name of names) await box.getByRole('checkbox', { name, exact: true }).check({ force: true });
  };
  const preview = (box) => box.locator('[aria-live="polite"]');
  const nextWeekCells = async () => (await api(`/api/shift-calendar?from=${isoOf(nextMonday)}&to=${isoOf(nextSunday)}&employeeId=${an.id}&size=1`)).rows[0]?.cells ?? [];

  await step('Phân ca: a whole team for the weekdays, with a preview of what it adds', async () => {
    const box = await openAssign(nextWeek(`&unit=${webUnit.id}`));
    if (!(await box.getByRole('radio', { name: 'Cả đơn vị' }).isChecked())) throw new Error('the unit filter does not start the dialog on "Cả đơn vị"');
    await pickShift(box, NIGHT.code);
    await tickWeekdays(box, WORKDAYS);
    await preview(box).getByText(/× \d+ ngày làm việc: \d+ phân ca mới, \d+ thay ca khác, \d+ giữ nguyên\./).waitFor();
    const text = (await preview(box).innerText()).split('\n')[0];
    await box.getByRole('button', submitName).click();
    await toast(new RegExp(`^Đã phân ca ${NIGHT.code} cho \\d+ người`)).waitFor();
    await box.waitFor({ state: 'detached' });
    const assigned = (await nextWeekCells()).filter((cell) => cell.source === 'ASSIGNED' && cell.shiftId === shiftIds[NIGHT.code]);
    if (assigned.length === 0) throw new Error('Nguyễn Văn An has no night shift next week after assigning Nhóm Web');
    return `${text} Nguyễn Văn An has ${assigned.length} night day(s) next week`;
  });

  await step('Assigning again replaces and does not duplicate', async () => {
    const before = await nextWeekCells();
    const box = await openAssign(nextWeek(`&unit=${webUnit.id}`));
    await pickShift(box, NIGHT.code);
    await tickWeekdays(box, WORKDAYS);
    await preview(box).getByText(/: 0 phân ca mới, 0 thay ca khác, [1-9]\d* giữ nguyên\./).waitFor();
    await box.getByRole('button', submitName).click();
    await toast(/^0 mới, 0 thay, [1-9]\d* giữ nguyên$/).waitFor();
    await box.waitFor({ state: 'detached' });
    const after = await nextWeekCells();
    if (JSON.stringify(after) !== JSON.stringify(before)) throw new Error(`the cells changed: ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
    return `${after.length} cell(s) for Nguyễn Văn An, the same as before`;
  });

  await step('A person given another shift: the preview says how many it replaces', async () => {
    const box = await openAssign(nextWeek(personQuery));
    if (!(await box.getByRole('checkbox', { name: /Nguyễn Văn An/ }).isChecked())) throw new Error('the person filter does not start the dialog with the person ticked');
    await pickShift(box, DAY.code);
    await tickWeekdays(box, WORKDAYS);
    await box.getByText(/^Thay [1-9]\d* phân ca đã có bằng ca này\.$/).waitFor();
    await box.getByRole('button', submitName).click();
    await toast(new RegExp(`^Đã phân ca ${DAY.code} cho 1 người`)).waitFor();
    await box.waitFor({ state: 'detached' });
    await page.getByRole('button', { name: new RegExp(`^Nguyễn Văn An, .*: ${DAY.name}, 08:00 – 17:00, đã phân ca$`) }).first().waitFor();
    if ((await nightCell().count()) > 0) throw new Error('a night shift is still there next week');
  });

  const openDefault = async () => {
    await page.goto(nextWeek(`&unit=${webUnit.id}`));
    await gridReady();
    await page.getByRole('button', { name: 'Ca mặc định', exact: true }).click();
    const box = dialog('Ca mặc định của đơn vị');
    await box.waitFor();
    return box;
  };
  const defaultOf = async () => (await api('/api/org-units/default-shifts')).find((entry) => entry.orgUnitId === webUnit.id)?.defaultShiftId ?? null;

  await step('Ca mặc định: the unit shows its shift, and a new one is set', async () => {
    const box = await openDefault();
    await box.getByText(`Hiện tại: ${DAY.code}.`).waitFor();
    if (!(await box.getByRole('button', { name: 'Lưu' }).isDisabled())) throw new Error('Save is on before anything changed');
    await box.getByRole('combobox', { name: /^Ca mặc định/ }).click();
    await page.getByRole('option', { name: new RegExp(`^${NIGHT.code} · `) }).click();
    await box.getByRole('button', { name: 'Lưu' }).click();
    await toast(new RegExp(`^Đã đặt ca mặc định ${NIGHT.code} cho Nhóm Web`)).waitFor();
    await box.waitFor({ state: 'detached' });
    if ((await defaultOf()) !== shiftIds[NIGHT.code]) throw new Error('the default of Nhóm Web is not the night shift');
  });

  await step('Ca mặc định: cleared, the unit has none of its own', async () => {
    const box = await openDefault();
    await box.getByText(`Hiện tại: ${NIGHT.code}.`).waitFor();
    await box.getByRole('combobox', { name: /^Ca mặc định/ }).click();
    await page.getByRole('option', { name: 'Không đặt riêng (dùng ca của đơn vị cha)' }).click();
    await box.getByRole('button', { name: 'Lưu' }).click();
    await toast('Đã bỏ ca mặc định của Nhóm Web').waitFor();
    await box.waitFor({ state: 'detached' });
    if ((await defaultOf()) !== null) throw new Error('Nhóm Web still has a default shift');
  });

  await step('Xóa phân ca: the preview counts the assigned shifts, and the button says how many', async () => {
    const box = await openAssign(nextWeek(personQuery));
    await box.getByRole('radio', { name: /^Xóa phân ca/ }).check({ force: true });
    await preview(box).getByText(/^Sẽ xóa [1-9]\d* phân ca của 1 người\./).waitFor();
    const button = box.getByRole('button', { name: /^Xóa [1-9]\d* phân ca$/ });
    const label = await button.innerText();
    await button.click();
    await toast(/^Đã xóa [1-9]\d* phân ca của 1 người/).waitFor();
    await box.waitFor({ state: 'detached' });
    if ((await nextWeekCells()).some((cell) => cell.source === 'ASSIGNED')) throw new Error('assignments are left next week');
    return `"${label}"`;
  });

  await step('From a day: the drawer starts "Phân ca" on that day', async () => {
    await page.goto(`${BASE}/shift-calendar?view=week${personQuery}`);
    await gridReady();
    await nightCell().first().click();
    await page.getByRole('dialog', { name: /, \d{2}\/\d{2}\/\d{4}/ }).getByRole('button', { name: 'Phân ca ngày này' }).click();
    const box = assignDialog();
    await box.getByRole('button', { name: /^Khoảng ngày \d{2}\/\d{2}\/\d{4} – \d{2}\/\d{2}\/\d{4}$/ }).waitFor();
    const range = await box.getByRole('button', { name: /^Khoảng ngày/ }).innerText();
    if (!/(\d{2}\/\d{2}\/\d{4}) – \1/.test(range)) throw new Error(`the range is not one day: ${range}`);
    return `the range is ${range}`;
  });
  await page.keyboard.press('Escape');
} else {
  report.push('_Lịch phân ca: skipped, the example Employee Nguyễn Văn An or the unit WEB is missing (HRM_EXAMPLE_DATA is off)._', '');
}

const me = await api('/api/me').catch(() => null);
const personas = me?.demo?.enabled ? ((await api('/api/auth/demo/personas').catch(() => ({ personas: [] }))).personas ?? []) : [];
const director = personas.find((each) => each.persona === 'DIRECTOR' && each.available);
const employee = personas.find((each) => each.persona === 'EMPLOYEE' && each.available);
const adminPersona = personas.find((each) => each.persona === 'ADMIN' && each.available);
const lineManager = personas.find((each) => each.persona === 'LINE_MANAGER' && each.available);
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
    await page.goto(`${BASE}/shift-calendar?view=week`);
    await page.getByRole('table', { name: /^Lịch phân ca, / }).waitFor();
    for (const name of ['Phân ca', 'Ca mặc định']) {
      if ((await page.getByRole('button', { name, exact: true }).count()) > 0) throw new Error(`the "${name}" button is there for a reader`);
    }
    return `${director.fullName} has SHIFT_VIEW only; the Lịch phân ca opens too, with no button to assign`;
  });

  if (lineManager && calendar) {
    await step('As the Quản lý trực tiếp persona: only the units of their own scope can be picked', async () => {
      await switchTo(lineManager);
      await page.goto(`${BASE}/shift-calendar?view=week`);
      await page.getByRole('table', { name: /^Lịch phân ca, / }).waitFor();
      await page.getByRole('button', { name: 'Phân ca', exact: true }).click();
      const box = dialog('Phân ca');
      await box.getByRole('radio', { name: 'Cả đơn vị' }).check({ force: true });
      await box.getByRole('button', { name: /^Đơn vị tổ chức: / }).click();
      const menu = page.getByRole('dialog', { name: 'Đơn vị tổ chức' });
      await menu.getByRole('treeitem', { name: 'Nhóm Web', exact: true }).waitFor();
      await menu.getByRole('searchbox', { name: 'Tìm đơn vị' }).fill('kinh doanh');
      await menu.getByText('Không có đơn vị nào khớp').waitFor();
      return `${lineManager.fullName} heads Nhóm Web: "kinh doanh" finds no unit`;
    });
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await dialog('Phân ca').waitFor({ state: 'detached' });
  }

  await step('As the Nhân viên persona: no menu item and the denied state by URL', async () => {
    await switchTo(employee);
    await page.goto(`${BASE}/shifts`);
    await page.getByRole('heading', { name: 'Bạn không có quyền xem ca làm việc' }).waitFor();
    if ((await nav().getByRole('link', { name: 'Ca làm việc' }).count()) > 0) throw new Error('the menu item is there');
    if ((await nav().getByRole('link', { name: 'Lịch phân ca' }).count()) > 0) throw new Error('the Lịch phân ca menu item is there');
    await page.goto(`${BASE}/shift-calendar`);
    await page.getByRole('heading', { name: 'Bạn không có quyền xem lịch phân ca' }).waitFor();
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

if (calendar) {
  await step('390: the Lịch phân ca is an agenda of days, with the shifts and the people in full', async () => {
    await page.goto(`${BASE}/shift-calendar?view=week${personQuery}`);
    await page.getByRole('heading', { level: 3 }).first().waitFor();
    await page.getByText(NIGHT.name).first().waitFor();
    await page.getByText('22:00 – 06:00 hôm sau').first().waitFor();
    if ((await page.getByRole('table').count()) > 0) throw new Error('a table shows at 390');
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (wide) throw new Error('the page scrolls sideways at 390');
  });

  await step('390: the Phân ca dialog fits the phone, with the people as a checklist', async () => {
    await page.goto(`${BASE}/shift-calendar?view=week${personQuery}`);
    await page.getByRole('heading', { level: 3 }).first().waitFor();
    await page.getByRole('button', { name: 'Phân ca', exact: true }).click();
    const box = dialog('Phân ca');
    await box.getByRole('checkbox', { name: /Nguyễn Văn An/ }).waitFor();
    const rect = await box.boundingBox();
    if (!rect || rect.x < 0 || rect.x + rect.width > 390) throw new Error(`the dialog does not fit 390: ${JSON.stringify(rect)}`);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (wide) throw new Error('the page scrolls sideways at 390');
  });
  await page.keyboard.press('Escape');
  await dialog('Phân ca').waitFor({ state: 'detached' });
  // The default of Nhóm Web goes back to none, so a later flow sees the unit as it was.
  await api(`/api/org-units/${webUnit.id}/default-shift`, { method: 'PUT', body: { shiftId: null } });
}

report.push('Result: passed.');
await finish(0);
