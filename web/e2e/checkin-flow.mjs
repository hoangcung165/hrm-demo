// Evidence for HRM-39 (mobile check-in) against the real stack. Needs the demo personas and the example data on (the
// local compose stack). As Nguyễn Văn An (Nhân viên persona) at 390: the Chấm công hôm nay card on Tổng quan, the
// consent screen on first use (the box left unticked, then accepted), the camera step (HRM-39/FE-2) with Chromium's fake
// camera and a fake position at Văn phòng chính: the Location chip, a refused location and a refused camera (nothing
// stored), a send that fails (nothing stored, then sent again), a check-in inside the zone with its toast and photo, and
// one 1.4 km away (allowed, with a warning); then the card on a desktop and withdrawing the consent from Hồ sơ của
// tôi, after which the check-in asks for it again. It clears An's Phân ca of yesterday and today first (the shifts flow
// leaves a night shift there), and every run stores two mobile punches for An today and consent records; use a
// throwaway database (CI does), never the demo one. HRM-39/FE-4, the end: as the Admin in a fresh browser, Hệ thống ›
// Địa điểm chấm công (the example places, the company-wide rules, the field errors, a taken name refused by the server, "Dùng
// vị trí hiện tại" from a fake position, adding, editing, making a place inactive behind a confirmation and active
// again, the page at 390), then the Nhân viên persona, who has no entry and gets the denied state; every run adds one
// place (a place is never deleted) and leaves it inactive. Writes screenshots and a Markdown report; exits non-zero at
// the first step that fails.
//   BASE_URL (http://localhost:5173)  OUT (e2e-out)  IMG_BASE (image URL prefix)  HRM_ADMIN_PASSWORD
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';
const PLACE = 'Văn phòng chính';

mkdirSync(OUT, { recursive: true });
const report = ['### Mobile check-in (real backend, PostgreSQL)', ''];
// Chromium's fake camera (a test pattern) and no permission prompt; the position is set once the office is known.
const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['geolocation', 'camera'] });
// A refusal the page can be made to meet: the sessionStorage flags survive a reload and are read at every call.
await context.addInitScript(() => {
  const flag = (name) => {
    try {
      return sessionStorage.getItem(name) === '1';
    } catch {
      return false;
    }
  };
  const geolocation = navigator.geolocation;
  const read = geolocation.getCurrentPosition.bind(geolocation);
  geolocation.getCurrentPosition = (ok, fail, options) =>
    flag('e2e-deny-location') ? fail({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }) : read(ok, fail, options);
  const media = navigator.mediaDevices;
  if (media) {
    const open = media.getUserMedia.bind(media);
    media.getUserMedia = (constraints) => (flag('e2e-deny-camera') ? Promise.reject(new DOMException('Permission denied', 'NotAllowedError')) : open(constraints));
  }
});
let page = await context.newPage();
page.setDefaultTimeout(15_000);
let n = 0;
let token = '';

async function call(path, { method = 'GET', body, as = token } = {}) {
  const multipart = body instanceof FormData;
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(multipart || body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(as ? { Authorization: `Bearer ${as}` } : {}) },
    body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function finish(code) {
  writeFileSync(`${OUT}/report-checkin.md`, report.join('\n'));
  await browser.close();
  process.exit(code);
}

async function step(title, run) {
  n += 1;
  const file = `checkin-${String(n).padStart(2, '0')}-${title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)}.png`;
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

// --- Data through the API: the personas, the example place, and An's consent withdrawn so the notice shows. ---
let an = null;
let anToken = '';
let office = null;
try {
  token = (await call('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD }, as: '' })).accessToken;
  const personas = (await call('/api/auth/demo/personas')).personas;
  an = personas.find((each) => each.persona === 'EMPLOYEE');
  if (!an?.available) throw new Error('the EMPLOYEE persona is missing or locked (HRM_DEMO_PERSONAS, HRM_EXAMPLE_DATA)');
  office = (await call('/api/attendance/locations?active=true')).find((each) => each.name === PLACE);
  if (!office) throw new Error(`no active Địa điểm chấm công "${PLACE}" (HRM_EXAMPLE_DATA)`);
  // The shifts flow gives An a night shift on Monday to Wednesday: today's punches would fall outside its Khung ca.
  // Without a Phân ca of their own today and yesterday, the card reads the day of Nhóm Web (or the calendar day).
  const employee = (await call(`/api/employees?${new URLSearchParams({ q: an.fullName, size: '5' })}`)).items.find((each) => each.fullName === an.fullName);
  if (!employee) throw new Error(`no Employee named ${an.fullName}`);
  const isoDay = (offset) => new Date(Date.now() + 7 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);
  await call('/api/shift-assignments', { method: 'DELETE', body: { employeeIds: [employee.id], from: isoDay(-1), to: isoDay(0) } });
  anToken = (await call('/api/auth/demo/sign-in', { method: 'POST', body: { persona: 'EMPLOYEE' } })).accessToken;
  await call('/api/attendance/mobile-checkin/consent', { method: 'DELETE', as: anToken });
} catch (error) {
  report.push('**Preparing data through the API: FAILED**', '', '```', String(error).slice(0, 1500), '```', '', 'Result: FAILED.');
  console.error(`FAILED preparing data\n${error}`);
  await finish(1);
}

/** Puts the phone `metersNorth` of the office: 111,195 m is one degree of latitude. */
const placePhone = (metersNorth) => context.setGeolocation({ latitude: office.latitude + metersNorth / 111_195, longitude: office.longitude, accuracy: 14 });
/** The punches An has today, read as An: what a step that must store nothing compares. */
const punchCount = async () => (await call('/api/attendance/mobile-checkin', { as: anToken })).punches.length;
const setFlag = (name, on) => page.evaluate(([key, value]) => (value ? sessionStorage.setItem(key, '1') : sessionStorage.removeItem(key)), [name, on]);

const main = () => page.getByRole('main');
const card = () => main().getByRole('region', { name: 'Chấm công hôm nay' });
const consentTitle = () => main().getByRole('heading', { level: 1, name: /^(Trước lần chấm công đầu tiên|Đồng ý lại trước khi chấm công)$/ });
const cameraTitle = () => main().getByRole('heading', { level: 1, name: /^Chấm công (vào|ra)$/ });
const shutter = () => main().getByRole('button', { name: /^Chụp ảnh và chấm công (vào|ra)$/ });
const chip = () => main().getByRole('status').filter({ hasText: /Trong vùng|Ngoài vùng|Chưa có vị trí|Đang đọc vị trí/ });
const AGREE = /^Tôi đã đọc và đồng ý cho .+ dùng vị trí và ảnh khi tôi chấm công\.$/;

await step('Sign in as the Admin and switch to Nguyễn Văn An (Nhân viên persona)', async () => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
  await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(an.fullName) }).click();
  await page.getByRole('banner').getByRole('button', { name: `Menu Tài khoản: ${an.fullName}` }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`);
  await card().getByRole('link', { name: /^Chấm công (vào|ra)$/ }).waitFor();
  return `${an.fullName} at 390`;
});

await step('Tổng quan at 390: the Chấm công hôm nay card with today\'s shift, the status and the way in', async () => {
  const text = await card().innerText();
  if (!text.includes('Giờ ghi nhận là giờ máy chủ')) throw new Error(`no server-time note in "${text}"`);
  return text.split('\n').filter(Boolean).slice(0, 3).join(' · ');
});

await step('The check-in asks for the consent first: what is collected, who sees it, how long (Decree 13/2023)', async () => {
  await card().getByRole('link', { name: /^Chấm công (vào|ra)$/ }).click();
  await consentTitle().waitFor();
  await main().getByRole('list', { name: 'Dữ liệu được thu thập khi chấm công' }).waitFor();
  await main().getByRole('checkbox', { name: AGREE }).waitFor({ state: 'attached' });
});

await step('Without the box ticked nothing is accepted: the box says why', async () => {
  await main().getByRole('button', { name: 'Đồng ý và chấm công' }).click();
  await main().getByText('Đánh dấu ô đồng ý ở trên để tiếp tục.').waitFor();
  const consent = await call('/api/attendance/mobile-checkin/consent', { as: anToken });
  if (consent.accepted) throw new Error('the consent was stored without the box ticked');
});

await step('Ticked and accepted: the acceptance is stored with its date, and the camera step opens', async () => {
  await placePhone(40);
  await main().getByText(AGREE).click();
  await main().getByRole('button', { name: 'Đồng ý và chấm công' }).click();
  await cameraTitle().waitFor();
  const consent = await call('/api/attendance/mobile-checkin/consent', { as: anToken });
  if (!consent.accepted || !consent.acceptedAt) throw new Error(`not stored: ${JSON.stringify(consent)}`);
  return `accepted at ${consent.acceptedAt}, wording ${consent.noticeVersion}`;
});

await step('The camera step at 390: the front camera and the Location chip, inside the zone', async () => {
  await chip().filter({ hasText: 'Trong vùng' }).waitFor();
  await page.waitForFunction(() => (document.querySelector('video')?.videoWidth ?? 0) > 0);
  if (!(await shutter().isEnabled())) throw new Error('the shutter is disabled with a camera and a position');
  return (await chip().innerText()).replace(/\n/g, ' · ');
});

const before = await punchCount();

await step('Location refused: the step says why, the shutter waits and nothing is stored', async () => {
  await setFlag('e2e-deny-location', true);
  await page.reload();
  await main().getByRole('alert').filter({ hasText: 'Chưa đọc được vị trí' }).waitFor();
  if (await shutter().isEnabled()) throw new Error('the shutter is enabled without a position');
  if ((await punchCount()) !== before) throw new Error('a punch was stored without a position');
});

await step('Allowed again: "Thử lại" reads the position', async () => {
  await setFlag('e2e-deny-location', false);
  await main().getByRole('button', { name: 'Thử lại' }).click();
  await chip().filter({ hasText: 'Trong vùng' }).waitFor();
  await shutter().waitFor();
});

await step('Camera refused: the step says why, the shutter waits and nothing is stored', async () => {
  await setFlag('e2e-deny-camera', true);
  await page.reload();
  await main().getByRole('alert').filter({ hasText: 'Chưa mở được camera' }).waitFor();
  if (await shutter().isEnabled()) throw new Error('the shutter is enabled without a camera');
  if ((await punchCount()) !== before) throw new Error('a punch was stored without a photo');
});

await step('Allowed again: "Thử lại" opens the camera', async () => {
  await setFlag('e2e-deny-camera', false);
  await main().getByRole('button', { name: 'Thử lại' }).click();
  await page.waitForFunction(() => (document.querySelector('video')?.videoWidth ?? 0) > 0);
  await chip().filter({ hasText: 'Trong vùng' }).waitFor();
});

let failSend = true;
await page.route('**/api/attendance/mobile-checkin', (route) => (failSend && route.request().method() === 'POST' ? route.abort('failed') : route.continue()));

await step('A send that fails: the photo stays on the screen, nothing is stored', async () => {
  await shutter().click();
  await main().getByRole('alert').filter({ hasText: 'Chưa gửi được lần quẹt' }).waitFor();
  await main().getByRole('img', { name: 'Ảnh vừa chụp' }).waitFor();
  if ((await punchCount()) !== before) throw new Error('a punch was stored by a send that failed');
});

await step('"Thử lại" sends the same photo: the toast names the time and place, the home shows the punch', async () => {
  failSend = false;
  await main().getByRole('button', { name: 'Thử lại' }).click();
  const toast = page.getByRole('region', { name: 'Thông báo kết quả thao tác' });
  await toast.getByText(/^Đã chấm công (vào|ra) lúc \d{2}:\d{2}$/).waitFor();
  await toast.getByText(new RegExp(`${PLACE} · cách`)).waitFor();
  const punches = card().getByRole('list', { name: 'Lần quẹt hôm nay' });
  await punches.getByText('Trong vùng').first().waitFor();
  await card().getByRole('link', { name: 'Chấm công ra' }).waitFor();
  if ((await punchCount()) !== before + 1) throw new Error('the punch was not stored exactly once');
});

await step('The photo of the punch opens on tap, and the Dialog says every view is recorded', async () => {
  await card().getByRole('button', { name: /^Xem ảnh lần quẹt lúc / }).first().click();
  const dialog = page.getByRole('dialog', { name: /^Ảnh lần quẹt lúc / });
  await dialog.getByText('Mỗi lần xem ảnh đều được ghi lại.').waitFor();
  const photo = dialog.getByRole('img', { name: /^Ảnh chấm công lúc / });
  await photo.waitFor();
  if (!(await photo.evaluate((img) => img.complete && img.naturalWidth > 0))) throw new Error('the photo did not load');
});

await step('1.4 km from the office: the check-in is allowed, with a warning that it will be reviewed', async () => {
  await page.getByRole('dialog').getByRole('button', { name: 'Đóng' }).click();
  await placePhone(1_400);
  await page.waitForTimeout(1_100);
  await card().getByRole('link', { name: 'Chấm công ra' }).click();
  await main().getByRole('alert').filter({ hasText: 'Bạn đang ngoài vùng chấm công' }).waitFor();
  await chip().filter({ hasText: 'Ngoài vùng' }).waitFor();
  if (!(await shutter().isEnabled())) throw new Error('the shutter is disabled outside the zone');
});

await step('Checked in outside the zone: the toast and the punch say so', async () => {
  await shutter().click();
  const toast = page.getByRole('region', { name: 'Thông báo kết quả thao tác' });
  await toast.getByText(/ngoài vùng, quản lý trực tiếp sẽ xem lại/).waitFor();
  const punches = card().getByRole('list', { name: 'Lần quẹt hôm nay' });
  await punches.getByText('Ngoài vùng').first().waitFor();
  await card().getByText('Quản lý trực tiếp sẽ xem lại lần quẹt có đánh dấu.').waitFor();
  if ((await punchCount()) !== before + 2) throw new Error('the second punch was not stored');
});

await step('The same card on a desktop (1280)', async () => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await card().getByRole('link', { name: 'Chấm công ra' }).waitFor();
});

await step('Hồ sơ của tôi at 390: the consent in force, and "Rút lại đồng ý" asks first', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/profile`);
  const section = main().getByRole('region', { name: 'Chấm công bằng điện thoại' });
  await section.getByText('Đã đồng ý', { exact: true }).waitFor();
  await section.getByRole('button', { name: 'Rút lại đồng ý' }).click();
  await page.getByRole('dialog', { name: 'Rút lại đồng ý chấm công bằng điện thoại?' }).waitFor();
});

await step('Withdrawn: the profile says so and the check-in asks for the consent again', async () => {
  await page.getByRole('dialog').getByRole('button', { name: 'Rút lại đồng ý' }).click();
  await page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText('Đã rút lại đồng ý chấm công bằng điện thoại').waitFor();
  const section = main().getByRole('region', { name: 'Chấm công bằng điện thoại' });
  await section.getByText('Chưa đồng ý', { exact: true }).waitFor();
  await section.getByRole('link', { name: 'Xem và đồng ý' }).click();
  await main().getByRole('heading', { level: 1, name: 'Đồng ý lại trước khi chấm công' }).waitFor();
  const consent = await call('/api/attendance/mobile-checkin/consent', { as: anToken });
  if (consent.accepted || !consent.withdrawnAt) throw new Error(`not withdrawn: ${JSON.stringify(consent)}`);
});

// ----- HRM-39/FE-4: Địa điểm chấm công (Admin, then the Nhân viên persona) -----
// A fresh browser for the Admin, with a fake position for "Dùng vị trí hiện tại".
const PLACE_NAME = `Kho Long Biên ${new Date().toISOString().slice(5, 16).replace(/\D/g, '')}`;
const FAKE_POSITION = { latitude: 21.04581, longitude: 105.88129, accuracy: 15 };
const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['geolocation'], geolocation: FAKE_POSITION });
page = await adminContext.newPage();
page.setDefaultTimeout(15_000);
token = (await call('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD }, as: '' })).accessToken;

const placesPath = '/attendance-locations';
const placeRow = (name) => main().getByRole('row').filter({ hasText: name });
const placeMenu = async (name, item) => {
  await placeRow(name).getByRole('button', { name: `Thao tác với địa điểm ${name}` }).click();
  await page.getByRole('menuitem', { name: item }).click();
};
const apiPlace = async () => (await call('/api/attendance/locations')).find((each) => each.name === PLACE_NAME);
const addDialog = () => page.getByRole('dialog', { name: 'Thêm địa điểm chấm công' });
const fillField = async (dialog, label, value) => {
  const field = dialog.getByLabel(new RegExp(`^${label}`));
  await field.fill(value);
  return field;
};

await step('Sign in as the Admin: the sidebar has Địa điểm chấm công, the page lists the example places', async () => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Địa điểm chấm công' }).click();
  await main().getByRole('heading', { level: 1, name: 'Địa điểm chấm công' }).waitFor();
  const table = main().getByRole('table', { name: 'Danh sách địa điểm chấm công' });
  await table.waitFor();
  const office = placeRow(PLACE);
  await office.getByText('150 m').waitFor();
  await office.getByText('Đang dùng').waitFor();
  await placeRow('Văn phòng Duy Tân (cũ)').getByText('Ngừng dùng').waitFor();
  const shown = Number((await office.getByRole('cell').nth(4).textContent()).replace(/\D/g, ''));
  const stored = (await call('/api/attendance/locations')).find((each) => each.name === PLACE).punchesLast30Days;
  if (shown !== stored) throw new Error(`the list shows ${shown} punches for ${PLACE}, the API ${stored}`);
  return `${PLACE}: ${stored} punches in 30 days`;
});

await step('The company-wide rules card shows who may check in, the accuracy, the photo and the consent count', async () => {
  const rules = main().getByRole('region', { name: 'Quy tắc chấm công bằng điện thoại' });
  await rules.getByText('Mọi nhân viên đã đồng ý').waitFor();
  await rules.getByText('Bắt buộc, camera trước').waitFor();
  const settings = await call('/api/attendance/mobile-checkin-settings');
  await rules.getByText(`${settings.maxAccuracyMeters} m`, { exact: true }).waitFor();
  await rules.getByText(settings.consentCount.toLocaleString('vi-VN'), { exact: true }).waitFor();
  return `${settings.maxAccuracyMeters} m, ${settings.consentCount} consents`;
});

await step('The add dialog says what is wrong on each field and stores nothing', async () => {
  const before = (await call('/api/attendance/locations')).length;
  await main().getByRole('button', { name: 'Thêm địa điểm chấm công' }).click();
  const dialog = addDialog();
  await dialog.waitFor();
  await fillField(dialog, 'Bán kính', '20');
  await dialog.getByRole('button', { name: 'Thêm địa điểm chấm công' }).click();
  await dialog.getByText('Nhập tên địa điểm.').waitFor();
  await dialog.getByText('Nhập vĩ độ, ví dụ 21.031.').waitFor();
  await dialog.getByText('Nhập kinh độ, ví dụ 105.789.').waitFor();
  await dialog.getByText('Bán kính từ 50 đến 1.000 mét.').waitFor();
  if (!(await dialog.getByLabel(/^Tên địa điểm/).evaluate((input) => input === document.activeElement))) throw new Error('the first invalid field did not take the focus');
  if ((await call('/api/attendance/locations')).length !== before) throw new Error('a place was stored by an invalid form');
});

await step('A name that is taken is refused by the server on its field, the dialog stays open', async () => {
  const dialog = addDialog();
  await fillField(dialog, 'Tên địa điểm', PLACE);
  await fillField(dialog, 'Vĩ độ', '21.03');
  await fillField(dialog, 'Kinh độ', '105.78');
  await fillField(dialog, 'Bán kính', '100');
  await dialog.getByRole('button', { name: 'Thêm địa điểm chấm công' }).click();
  await dialog.getByText(/Đã có địa điểm tên này/).waitFor();
});

await step('"Dùng vị trí hiện tại" fills the coordinates from this device; adding stores the place and shows it', async () => {
  const dialog = addDialog();
  await fillField(dialog, 'Tên địa điểm', PLACE_NAME);
  await fillField(dialog, 'Địa chỉ', 'Long Biên, Hà Nội');
  await dialog.getByRole('button', { name: 'Dùng vị trí hiện tại' }).click();
  await dialog.getByText(/Đã điền tọa độ, sai số khoảng 15 m/).waitFor();
  const latitude = await dialog.getByLabel(/^Vĩ độ/).inputValue();
  const longitude = await dialog.getByLabel(/^Kinh độ/).inputValue();
  if (latitude !== '21.04581' || longitude !== '105.88129') throw new Error(`coordinates ${latitude}, ${longitude}`);
  await fillField(dialog, 'Bán kính', '250');
  await dialog.getByRole('button', { name: 'Thêm địa điểm chấm công' }).click();
  await page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(`Đã thêm địa điểm ${PLACE_NAME}`).waitFor();
  const row = placeRow(PLACE_NAME);
  await row.getByText('21,04581; 105,88129').waitFor();
  await row.getByText('250 m').waitFor();
  const stored = await apiPlace();
  if (!stored || stored.radiusMeters !== 250 || !stored.active || stored.address !== 'Long Biên, Hà Nội') throw new Error(`stored ${JSON.stringify(stored)}`);
});

await step('Edit: Save waits for a change; the new radius is stored and shown', async () => {
  await placeMenu(PLACE_NAME, 'Sửa địa điểm');
  const dialog = page.getByRole('dialog', { name: `Sửa địa điểm: ${PLACE_NAME}` });
  await dialog.getByText('Sửa địa điểm không tính lại các lần chấm công đã lưu.').waitFor();
  const save = dialog.getByRole('button', { name: 'Lưu thay đổi' });
  if (!(await save.isDisabled())) throw new Error('Save is enabled before any change');
  await fillField(dialog, 'Bán kính', '300');
  await save.click();
  await page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(`Đã lưu địa điểm ${PLACE_NAME}`).waitFor();
  await placeRow(PLACE_NAME).getByText('300 m').waitFor();
  if ((await apiPlace())?.radiusMeters !== 300) throw new Error('the radius was not stored');
});

await step('Making a place inactive asks first; it can be used again; nothing offers to delete it', async () => {
  await placeMenu(PLACE_NAME, 'Ngừng dùng');
  const confirm = page.getByRole('dialog', { name: `Ngừng dùng địa điểm ${PLACE_NAME}?` });
  await confirm.waitFor();
  if ((await apiPlace())?.active !== true) throw new Error('the place changed before the confirmation');
  await confirm.getByRole('button', { name: 'Ngừng dùng' }).click();
  await placeRow(PLACE_NAME).getByText('Ngừng dùng').waitFor();
  await placeRow(PLACE_NAME).getByRole('button', { name: `Thao tác với địa điểm ${PLACE_NAME}` }).click();
  if ((await page.getByRole('menuitem', { name: /^Xóa/ }).count()) !== 0) throw new Error('a delete action is offered');
  await page.getByRole('menuitem', { name: 'Dùng lại' }).click();
  await page.getByRole('dialog', { name: `Dùng lại địa điểm ${PLACE_NAME}?` }).getByRole('button', { name: 'Dùng lại' }).click();
  await placeRow(PLACE_NAME).getByText('Đang dùng').waitFor();
  if ((await apiPlace())?.active !== true) throw new Error('the place was not made active again');
});

await step('At 390 the places are compact rows with their menu and the add dialog fits the screen', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}${placesPath}`);
  const list = main().getByRole('list', { name: 'Danh sách địa điểm chấm công' });
  await list.waitFor();
  const row = list.getByRole('listitem').filter({ hasText: PLACE });
  await row.getByText('Bán kính 150 m').waitFor();
  await row.getByRole('button', { name: `Thao tác với địa điểm ${PLACE}` }).waitFor();
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('the page scrolls sideways at 390');
  await main().getByRole('button', { name: 'Thêm địa điểm chấm công' }).click();
  const dialog = addDialog();
  await dialog.getByRole('button', { name: 'Dùng vị trí hiện tại' }).waitFor();
  const box = await dialog.boundingBox();
  if (!box || box.x < 0 || box.x + box.width > 390) throw new Error(`the dialog leaves the screen: ${JSON.stringify(box)}`);
});

await step('The Nhân viên persona has no entry in the sidebar, gets the denied state, and the API refuses it', async () => {
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
  await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(an.fullName) }).click();
  await page.getByRole('banner').getByRole('button', { name: `Menu Tài khoản: ${an.fullName}` }).waitFor();
  await page.goto(`${BASE}${placesPath}`);
  await main().getByText('Bạn không có quyền quản lý địa điểm chấm công').waitFor();
  if ((await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Địa điểm chấm công' }).count()) !== 0) throw new Error('the sidebar has an entry');
  if ((await main().getByRole('button', { name: 'Thêm địa điểm chấm công' }).count()) !== 0) throw new Error('the page offers to add');
  const refused = await fetch(`${BASE}/api/attendance/locations`, { headers: { Authorization: `Bearer ${anToken}` } });
  if (refused.status !== 403) throw new Error(`the API answered ${refused.status} to the Nhân viên persona`);
});

// A place is never deleted: this run's place is left inactive.
await call(`/api/attendance/locations/${(await apiPlace()).id}/deactivate`, { method: 'POST' });

report.push('Result: passed.');
await finish(0);
