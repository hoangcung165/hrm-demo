// Evidence for HRM-39 (mobile check-in) against the real stack. Needs the demo personas and the example data on (the
// local compose stack). FE-1: as Nguyễn Văn An (Nhân viên persona) at 390, the Chấm công hôm nay card on Tổng quan,
// the consent screen on first use (the box left unticked, then accepted), the card after a check-in inside and one
// outside the zone (both sent through the API: the camera step is FE-2), the card on a desktop, and withdrawing the
// consent from Hồ sơ của tôi, after which the check-in asks for it again. Every run stores two mobile punches for An
// today and consent records; use a throwaway database (CI does), never the demo one. Writes screenshots and a Markdown
// report; exits non-zero at the first step that fails.
//   BASE_URL (http://localhost:5173)  OUT (e2e-out)  IMG_BASE (image URL prefix)  HRM_ADMIN_PASSWORD
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';
const PLACE = 'Văn phòng chính';
// A 48 × 48 grey placeholder PNG, never a face (the photo the example data uses too).
const PHOTO = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAABq0lEQVR42s3Ox1JCQRCF4fPY5hwxkESy5JxBMGPOceUD+CRaNZsu9ELPjHCn6tt1VZ8fY464UTC+kTAKJjaTRsHkVsoomNpOGwXTzoxRMOPKGgWz7pxRMOfJGwXz3oJRsLBTVPb6+WVF+ScWfSUFfVIohc9Y2i3LYtYIss+x7K9IkaoRpP5jJVDlU6gR+BNYDdb4lIP4E1gL1ZmUawTmCtbDDSbNIOYKHJEmk2YQcwUb0RaTZhBzBZt7+0yaQcwVbMXaTJpBzBVsxztMmkHMFTgTB0yaQcwVuJKHTJpBzBW4U0d8yjX8CXjSx3zKQfwJeDMnUhRqpP5jJ3sqS6pG9jl8uTMFzBqFz9jNd9XUux99Un6uam/hL5xL+VmSJfUfgeIFk0IKxVxBsHQ5kGYKNXALofJVf/9YI/SfQ7hybeXfUyirUUSqN1aGGmQ1imjt9k9DrRH+3MVe/e63EdQIv6cRa9z3GFmN0LOOePOhx4iDetaRaD1SI64RaACS+0+ULUE0AKn2M2VLEA1AuvNC2RJEA5A5eKVsCaIByB6+UbYE0QDkjt4pW4JowDdZe3G7RqnNFwAAAABJRU5ErkJggg==', 'base64');

mkdirSync(OUT, { recursive: true });
const report = ['### Mobile check-in (real backend, PostgreSQL)', ''];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(15_000);
let n = 0;
let token = '';

async function call(path, { method = 'GET', body, as = token } = {}) {
  const multipart = body instanceof FormData;
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(multipart || body === undefined ? {} : { 'Content-Type': 'application/json' }), Authorization: `Bearer ${as}` },
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
  anToken = (await call('/api/auth/demo/sign-in', { method: 'POST', body: { persona: 'EMPLOYEE' } })).accessToken;
  await call('/api/attendance/mobile-checkin/consent', { method: 'DELETE', as: anToken });
} catch (error) {
  report.push('**Preparing data through the API: FAILED**', '', '```', String(error).slice(0, 1500), '```', '', 'Result: FAILED.');
  console.error(`FAILED preparing data\n${error}`);
  await finish(1);
}

/** A mobile check-in of An `metersNorth` of the office, as the camera step will send it. */
async function checkIn(metersNorth) {
  const form = new FormData();
  form.append('photo', new Blob([PHOTO], { type: 'image/png' }), 'checkin.png');
  form.append('latitude', String(office.latitude + metersNorth / 111_195));
  form.append('longitude', String(office.longitude));
  form.append('accuracyMeters', '14');
  return call('/api/attendance/mobile-checkin', { method: 'POST', body: form, as: anToken });
}

const main = () => page.getByRole('main');
const card = () => main().getByRole('region', { name: 'Chấm công hôm nay' });
const consentTitle = () => main().getByRole('heading', { level: 1, name: /^(Trước lần chấm công đầu tiên|Đồng ý lại trước khi chấm công)$/ });
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

await step('Ticked and accepted: the acceptance is stored with its date', async () => {
  await main().getByText(AGREE).click();
  await main().getByRole('button', { name: 'Đồng ý và chấm công' }).click();
  await main().getByRole('heading', { name: 'Bạn đã đồng ý chấm công bằng điện thoại' }).waitFor();
  const consent = await call('/api/attendance/mobile-checkin/consent', { as: anToken });
  if (!consent.accepted || !consent.acceptedAt) throw new Error(`not stored: ${JSON.stringify(consent)}`);
  return `accepted at ${consent.acceptedAt}, wording ${consent.noticeVersion}`;
});

await step('After a check-in inside the zone and one 1.4 km away (sent through the API): the punches on the card', async () => {
  const inside = await checkIn(40);
  await page.waitForTimeout(1_100);
  const outside = await checkIn(1_400);
  if (inside.outsideLocation || !outside.outsideLocation) throw new Error(`zones not as expected: ${JSON.stringify([inside, outside])}`);
  await page.goto(`${BASE}/`);
  const punches = card().getByRole('list', { name: 'Lần quẹt hôm nay' });
  await punches.getByText('Ngoài vùng').first().waitFor();
  await punches.getByText('Trong vùng').first().waitFor();
  await card().getByText('Quản lý trực tiếp sẽ xem lại lần quẹt có đánh dấu.').waitFor();
  await card().getByRole('link', { name: 'Chấm công ra' }).waitFor();
});

await step('The same card on a desktop (1280)', async () => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await card().getByRole('link', { name: 'Chấm công ra' }).waitFor();
});

await step('Hồ sơ của tôi at 390: the consent in force, and "Rút lại đồng ý" asks first', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/profile`);
  const section = main().getByRole('region', { name: 'Chấm công bằng điện thoại' });
  await section.getByText('Đã đồng ý').waitFor();
  await section.getByRole('button', { name: 'Rút lại đồng ý' }).click();
  await page.getByRole('dialog', { name: 'Rút lại đồng ý chấm công bằng điện thoại?' }).waitFor();
});

await step('Withdrawn: the profile says so and the check-in asks for the consent again', async () => {
  await page.getByRole('dialog').getByRole('button', { name: 'Rút lại đồng ý' }).click();
  await page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText('Đã rút lại đồng ý chấm công bằng điện thoại').waitFor();
  const section = main().getByRole('region', { name: 'Chấm công bằng điện thoại' });
  await section.getByText('Chưa đồng ý').waitFor();
  await section.getByRole('link', { name: 'Xem và đồng ý' }).click();
  await main().getByRole('heading', { level: 1, name: 'Đồng ý lại trước khi chấm công' }).waitFor();
  const consent = await call('/api/attendance/mobile-checkin/consent', { as: anToken });
  if (consent.accepted || !consent.withdrawnAt) throw new Error(`not withdrawn: ${JSON.stringify(consent)}`);
});

report.push('Result: passed.');
await finish(0);
