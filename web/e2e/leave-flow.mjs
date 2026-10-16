// Evidence for Nghỉ phép (HRM-18) against the real stack. Needs the demo personas and the example data on (the local
// compose stack): Nguyễn Văn An (Nhân viên persona, Nhóm Web) asks for leave, Lê Văn Hùng (Line manager persona, head
// of Nhóm Web) approves it under the default Luồng phê duyệt "Nghỉ phép", Vũ Thị Lan (PM persona) is copied, Trần Thị
// Mai (HR persona) changes a policy.
// The browser, as the Admin (no Employee), gets the no-Employee state; as An: the balances and "Đơn của tôi", a
// Phép năm request from a Friday afternoon to the Monday (the weekend not counted, the balance after, the approver,
// a person copied), the over-balance block, a Nghỉ ốm half day that needs a file, sent with one; as Lan, the bell;
// as Hùng, the request in the approval inbox with the balance before/after, approved; as An, cancelling the approved
// request (the days come back) and, after Hùng returned another one through the API, editing and sending it again;
// as Hùng, the bell for the cancelled request; the 390 views; as Mai, "Cấu hình nghỉ phép": the Phép năm policy, a
// change of Việc riêng có lương saved from today and put back, a new type "Nghỉ bù" (once) turned off, and the denied
// state for An. Before it starts, An's requests left open by an earlier run are cancelled through the API.
// Use a throwaway database (CI does), never the demo database. Writes screenshots and a Markdown report; exits
// non-zero at the first step that fails.
//   BASE_URL (http://localhost:5173)  OUT (e2e-out)  IMG_BASE (image URL prefix)  HRM_ADMIN_PASSWORD
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';

mkdirSync(OUT, { recursive: true });
const report = ['### Nghỉ phép (real backend, PostgreSQL)', ''];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
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
  writeFileSync(`${OUT}/report-leave.md`, report.join('\n'));
  await browser.close();
  process.exit(code);
}

async function step(title, run) {
  n += 1;
  const slug = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const file = `leave-${String(n).padStart(2, '0')}-${slug}.png`;
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

// --- Dates: the company's today, then weekdays ahead of it. ---
const iso = (date) => date.toISOString().slice(0, 10);
const todayIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const plus = (day, days) => iso(new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000));
const weekday = (day) => new Date(`${day}T00:00:00Z`).getUTCDay();
/** The first `wanted` weekday (0 Sunday … 6 Saturday) at least `ahead` days from today. */
const next = (wanted, ahead) => {
  let day = plus(todayIso, ahead);
  while (weekday(day) !== wanted) day = plus(day, 1);
  return day;
};
const vn = (day) => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;
const friday = next(5, 14);
const monday = plus(friday, 3);
const sickDay = next(3, 21);
const personalDay = next(2, 28);
const personalLater = plus(personalDay, 2);

const signInAs = async (persona) => {
  token = (await api('/api/auth/demo/sign-in', { method: 'POST', body: { persona } })).accessToken;
};

// --- Data through the API: the personas, and An's requests left open by an earlier run. ---
let personas = [];
let returnedId = '';
const persona = (key) => personas.find((each) => each.persona === key);
try {
  token = (await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })).accessToken;
  personas = (await api('/api/auth/demo/personas')).personas;
  for (const key of ['EMPLOYEE', 'LINE_MANAGER', 'PROJECT_MANAGER', 'HR']) {
    if (!persona(key)?.available) throw new Error(`the ${key} persona is missing or locked (HRM_DEMO_PERSONAS, HRM_EXAMPLE_DATA)`);
  }
  await signInAs('EMPLOYEE');
  const year = Number(todayIso.slice(0, 4));
  for (const y of [year, year + 1]) {
    for (const item of (await api(`/api/leave-requests?year=${y}&size=100`)).items) {
      if (item.canCancel && item.startDate > todayIso) await api(`/api/leave-requests/${item.id}/cancel`, { method: 'POST', body: {} });
    }
  }
  // A Việc riêng có lương day that Hùng returns, for An to edit and send again.
  const types = (await api('/api/leave-types')).items;
  const personal = types.find((type) => type.code === 'VR');
  const sent = await api('/api/leave-requests', {
    method: 'POST',
    body: { leaveTypeId: personal.id, startDate: personalDay, startPart: 'FULL', endDate: personalDay, endPart: 'FULL', reason: 'Đưa con đi khám', cc: [], attachmentIds: [] },
  });
  returnedId = sent.id;
  await signInAs('LINE_MANAGER');
  await api(`/api/approvals/${returnedId}/return`, { method: 'POST', body: { comment: 'Hôm đó nhóm demo cho khách, đổi sang thứ Năm được không?' } });
} catch (error) {
  report.push('**Preparing data through the API: FAILED**', '', '```', String(error).slice(0, 1500), '```', '', 'Result: FAILED.');
  console.error(`FAILED preparing data\n${error}`);
  await finish(1);
}

const main = () => page.getByRole('main');
const nav = () => page.getByRole('navigation', { name: 'Điều hướng chính' });
const toast = (text) => page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(text);
const switchTo = async (key) => {
  const who = persona(key);
  await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
  await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(who.fullName) }).click();
  await page.getByRole('banner').getByRole('button', { name: `Menu Tài khoản: ${who.fullName}` }).waitFor();
};
const setDate = (label, value) => main().getByLabel(new RegExp(`^${label}`)).fill(value);
const choosePart = async (label, option) => {
  await main().getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option }).click();
};
const days = () => main().getByRole('region', { name: 'Số ngày nghỉ' });
const sendButton = () => main().getByRole('button', { name: 'Gửi đơn' });
const openBell = async () => {
  await page.getByRole('banner').getByRole('button', { name: /^Thông báo/ }).click();
  return page.getByRole('dialog', { name: 'Thông báo' });
};

await step('An Account without an Employee (the Admin) has no balance; it is pointed to the leave settings', async () => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).waitFor();
  await page.goto(`${BASE}/leave`);
  await main().getByText('Tài khoản này không có hồ sơ nhân viên').waitFor();
});

await step('As Nguyễn Văn An: the Phép năm balance card, the other types and "Đơn của tôi"', async () => {
  await switchTo('EMPLOYEE');
  await nav().getByRole('link', { name: 'Nghỉ phép' }).click();
  const card = main().getByRole('region', { name: /^Phép năm \d{4}$/ });
  await card.waitFor();
  const figure = await card.locator('.text-display').textContent();
  const bar = await card.getByRole('img').getAttribute('aria-label');
  await main().getByRole('region', { name: 'Nghỉ ốm' }).waitFor();
  return `${figure} ngày còn lại; bar "${bar}"`;
});

await step('Tạo đơn nghỉ: Phép năm from a Friday afternoon to the Monday counts 1,5 days, the weekend at 0', async () => {
  await main().getByRole('link', { name: 'Tạo đơn nghỉ' }).first().click();
  await main().getByRole('radio', { name: /Phép năm/ }).check({ force: true });
  await setDate('Từ ngày', friday);
  await choosePart('Buổi của ngày đầu', 'Buổi chiều');
  await setDate('Đến ngày', monday);
  await days().getByText('1,5 ngày').waitFor();
  await main().getByText(/^Sau đơn này Phép năm còn|^Đơn này dùng .* ngày ứng trước/).waitFor();
  await main().getByText('Lê Văn Hùng').first().waitFor();
  await main().getByLabel('Lý do (không bắt buộc)').fill('Về quê dự đám cưới em họ');
  await main().getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' }).fill('Vũ Thị Lan');
  await main().getByRole('combobox', { name: 'Thông báo cho (CC) (không bắt buộc)' }).click();
  await page.getByRole('option', { name: /Vũ Thị Lan/ }).click();
  await main().getByRole('list', { name: 'Người được báo' }).getByText('Vũ Thị Lan').waitFor();
  const rows = await days().getByRole('listitem').allTextContents();
  return `${vn(friday)} (chiều) – ${vn(monday)}; rows: ${rows.join(' | ')}`;
});

await step('Over the balance: the dates in error, the most that may be taken, "Gửi đơn" off', async () => {
  await setDate('Đến ngày', plus(friday, 45));
  await main().getByText(/^Vượt số dư /).waitFor();
  if (await sendButton().isEnabled()) throw new Error('"Gửi đơn" is on over the balance');
  const text = await main().getByText(/tối đa .* ngày\./).first().textContent();
  await setDate('Đến ngày', monday);
  return text;
});

await step('Gửi đơn: the toast names the approver; the request waits in "Đơn của tôi"', async () => {
  await days().getByText('1,5 ngày').waitFor();
  await sendButton().click();
  await toast('Đã gửi đơn nghỉ cho Lê Văn Hùng').waitFor();
  await page.waitForURL(`${BASE}/leave`);
  if (friday.slice(0, 4) !== todayIso.slice(0, 4)) await page.goto(`${BASE}/leave?year=${friday.slice(0, 4)}`);
  const table = main().getByRole('table', { name: /^Đơn nghỉ của tôi năm/ });
  await table.getByRole('row').filter({ hasText: vn(monday) }).getByText('Chờ duyệt').waitFor();
});

await step('Nghỉ ốm, one morning: a file is required; with a PDF attached the request goes', async () => {
  await page.goto(`${BASE}/leave/new`);
  await main().getByRole('radio', { name: /Nghỉ ốm/ }).check({ force: true });
  await setDate('Từ ngày', sickDay);
  await choosePart('Buổi của ngày đầu', 'Buổi sáng');
  await main().getByText('Nghỉ ốm cần giấy tờ đính kèm. Đính kèm ảnh hoặc PDF.').waitFor();
  await page.screenshot({ path: `${OUT}/leave-${String(n).padStart(2, '0')}-file-required.png`, fullPage: true });
  await main().locator('input[type="file"]').setInputFiles({ name: 'giay-kham-benh.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% e2e medical certificate\n') });
  await main().getByText('giay-kham-benh.pdf').waitFor();
  await days().getByText('0,5 ngày').waitFor();
  await sendButton().click();
  await toast('Đã gửi đơn nghỉ cho Lê Văn Hùng').waitFor();
  report.push(`![file required](${IMG_BASE}/leave-${String(n).padStart(2, '0')}-file-required.png?raw=true)`, '');
});

await step('As Vũ Thị Lan (copied): the bell says An sent a leave request and copied her', async () => {
  await switchTo('PROJECT_MANAGER');
  const panel = await openBell();
  await panel.getByText(/gửi đơn nghỉ và báo cho bạn/).first().waitFor();
  await page.keyboard.press('Escape');
});

await step('As Lê Văn Hùng: the request in the approval inbox, with the balance before and after and the unit', async () => {
  await switchTo('LINE_MANAGER');
  token = (await api('/api/auth/demo/sign-in', { method: 'POST', body: { persona: 'LINE_MANAGER' } })).accessToken;
  const waiting = (await api('/api/approvals?box=WAITING&type=LEAVE&size=50')).items.find((item) => item.sender.fullName === persona('EMPLOYEE').fullName && item.summary.startsWith('Phép năm'));
  if (!waiting) throw new Error('An\'s Phép năm request is not waiting for Hùng');
  await page.goto(`${BASE}/approvals/${waiting.id}`);
  await main().getByRole('region', { name: 'Đơn nghỉ' }).waitFor();
  await main().getByRole('region', { name: /^Số dư Phép năm của / }).getByText('Còn lại sau duyệt').waitFor();
  await main().getByRole('region', { name: /trong những ngày này$/ }).waitFor();
  return waiting.summary;
});

await step('Hùng approves; the steps end with "Trừ vào số dư"', async () => {
  await main().getByRole('region', { name: 'Quyết định của bạn' }).getByRole('button', { name: 'Duyệt' }).click();
  await page.waitForURL(/\/approvals/);
  await page.waitForTimeout(500);
});

await step('As An: the approved request; "Hủy đơn" says the days come back and Hùng is told', async () => {
  await switchTo('EMPLOYEE');
  await page.goto(`${BASE}/leave${friday.slice(0, 4) !== todayIso.slice(0, 4) ? `?year=${friday.slice(0, 4)}` : ''}`);
  const row = main().getByRole('table', { name: /^Đơn nghỉ của tôi năm/ }).getByRole('row').filter({ hasText: vn(monday) }).filter({ hasText: 'Đã duyệt' });
  await row.waitFor();
  await row.getByRole('link', { name: 'Phép năm' }).click();
  await main().getByRole('list', { name: 'Các bước duyệt' }).getByText('Trừ vào số dư').waitFor();
  await main().getByRole('button', { name: 'Hủy đơn' }).click();
  await page.getByRole('dialog').getByText(/Đơn đã duyệt. Hủy sẽ hoàn 1,5 ngày vào Phép năm và báo cho Lê Văn Hùng./).waitFor();
});

await step('Cancelled: the toast says the days went back; the request shows it', async () => {
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy đơn' }).click();
  await toast(/hoàn 1,5 ngày vào Phép năm/).waitFor();
  await main().getByText(/đã hoàn 1,5 ngày vào số dư/).waitFor();
});

await step('As Hùng: the bell says An cancelled a request he approved', async () => {
  await switchTo('LINE_MANAGER');
  const panel = await openBell();
  await panel.getByText(/đã hủy đơn nghỉ bạn đã duyệt/).first().waitFor();
  await page.keyboard.press('Escape');
});

await step('As An: the returned request says why; "Sửa đơn" opens it filled in', async () => {
  await switchTo('EMPLOYEE');
  await page.goto(`${BASE}/leave/requests/${returnedId}`);
  await main().getByText('Lê Văn Hùng trả về để bạn bổ sung').waitFor();
  await main().getByRole('link', { name: 'Sửa đơn' }).click();
  await main().getByRole('heading', { name: 'Sửa đơn nghỉ' }).waitFor();
  await setDate('Từ ngày', personalLater);
  await setDate('Đến ngày', personalLater);
  await days().getByText('1 ngày').waitFor();
});

await step('Gửi lại: the request waits again for Hùng', async () => {
  await main().getByRole('button', { name: 'Gửi lại' }).click();
  await toast('Đã gửi lại đơn nghỉ cho Lê Văn Hùng').waitFor();
  await page.waitForURL(`${BASE}/leave/requests/${returnedId}`);
  await main().getByText('Chờ duyệt').first().waitFor();
});

await step('390: "Nghỉ phép" with the balance, the compact rows and "Tạo đơn nghỉ" pinned to the bottom', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/leave`);
  await main().getByRole('region', { name: /^Phép năm \d{4}$/ }).waitFor();
  await main().getByRole('link', { name: 'Tạo đơn nghỉ' }).last().waitFor();
});

await step('390: Tạo đơn nghỉ in one column with the day breakdown and "Gửi đơn" pinned', async () => {
  await main().getByRole('link', { name: 'Tạo đơn nghỉ' }).last().click();
  await main().getByRole('radio', { name: /Phép năm/ }).check({ force: true });
  await setDate('Từ ngày', friday);
  await choosePart('Buổi của ngày đầu', 'Buổi chiều');
  await setDate('Đến ngày', monday);
  await days().getByText('1,5 ngày').waitFor();
});

await step('As Trần Thị Mai (HR): "Cấu hình nghỉ phép" from the sidebar, the Phép năm policy', async () => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${BASE}/`);
  await switchTo('HR');
  await nav().getByRole('link', { name: 'Cấu hình nghỉ phép' }).click();
  await main().getByRole('form', { name: 'Chính sách Phép năm' }).waitFor();
  const value = await main().getByLabel(/^Định mức phép năm/).inputValue();
  return `Định mức ${value} ngày`;
});

await step('Việc riêng có lương: "Tối đa mỗi đơn" 4 saved from today (then put back to 3)', async () => {
  await main().getByRole('navigation', { name: 'Loại nghỉ' }).getByRole('button', { name: /^Việc riêng có lương/ }).click();
  const form = main().getByRole('form', { name: 'Chính sách Việc riêng có lương' });
  const saved = () => page.waitForResponse((response) => response.url().endsWith('/policy') && response.request().method() === 'PUT');
  await form.getByLabel(/^Tối đa mỗi đơn/).fill('4');
  await Promise.all([saved(), form.getByRole('button', { name: 'Lưu chính sách' }).click()]);
  await toast('Đã lưu chính sách Việc riêng có lương').waitFor();
  await form.getByText(/^Đang áp dụng, từ /).waitFor();
  await page.screenshot({ path: `${OUT}/leave-${String(n).padStart(2, '0')}-saved.png`, fullPage: true });
  await form.getByLabel(/^Tối đa mỗi đơn/).fill('3');
  await Promise.all([saved(), form.getByRole('button', { name: 'Lưu chính sách' }).click()]);
  report.push(`![saved](${IMG_BASE}/leave-${String(n).padStart(2, '0')}-saved.png?raw=true)`, '');
});

await step('A new type "Nghỉ bù" (added once), turned off so requests do not offer it', async () => {
  const types = main().getByRole('navigation', { name: 'Loại nghỉ' });
  const existing = types.getByRole('button', { name: /^Nghỉ bù/ });
  if (!(await existing.count())) {
    await types.getByRole('button', { name: 'Thêm loại nghỉ' }).click();
    const form = main().getByRole('form', { name: 'Loại nghỉ mới' });
    await form.getByLabel(/^Tên loại nghỉ/).fill('Nghỉ bù');
    await form.getByLabel(/^Mã/).fill('NB');
    await form.getByRole('button', { name: 'Tạo loại nghỉ' }).click();
    await toast('Đã tạo loại nghỉ Nghỉ bù').waitFor();
  } else {
    await existing.click();
  }
  const form = main().getByRole('form', { name: 'Chính sách Nghỉ bù' });
  const active = form.getByRole('switch', { name: 'Đang dùng' });
  if ((await active.getAttribute('aria-checked')) === 'false') {
    await active.click();
    await toast('Đã bật Nghỉ bù').waitFor();
  }
  await active.click();
  await toast(/Đã tắt Nghỉ bù/).waitFor();
  await types.getByRole('button', { name: /^Nghỉ bù/ }).getByText('Đã tắt').waitFor();
});

await step('390: "Cấu hình nghỉ phép" with the types as a Select above the policy', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/leave-policies`);
  await main().getByRole('combobox', { name: 'Loại nghỉ' }).waitFor();
  await main().getByRole('form', { name: 'Chính sách Phép năm' }).waitFor();
});

await step('As An: no "Cấu hình nghỉ phép" in the sidebar, and the denied state by URL', async () => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await switchTo('EMPLOYEE');
  if (await nav().getByRole('link', { name: 'Cấu hình nghỉ phép' }).count()) throw new Error('An sees the leave settings');
  await page.goto(`${BASE}/leave-policies`);
  await main().getByText('Bạn không có quyền cấu hình nghỉ phép').waitFor();
});

report.push('Result: PASSED.');
await finish(0);
