// End-to-end check of the sign-in and password screens against the real stack:
// backend (dev profile), PostgreSQL, Mailpit and the Vite dev server. Writes screenshots and a Markdown
// report; exits non-zero at the first step that fails. It changes the Admin password, so run it only
// against a throwaway database (CI does).
//   BASE_URL (http://localhost:5173)  MAILPIT_URL (http://localhost:8025)  OUT (e2e-out)  IMG_BASE (image URL prefix)
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';
const CHANGED = 'changed-password-1';
const RESET = 'reset-password-2';

mkdirSync(OUT, { recursive: true });
const report = ['### Auth screens end to end (real backend, PostgreSQL, Mailpit)', ''];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(15_000);
let n = 0;

async function step(title, run) {
  n += 1;
  const file = `${String(n).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
  try {
    const note = await run();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${file}` });
    report.push(`**${n}. ${title}**${note ? `: ${note}` : ''}`, '', `![${title}](${IMG_BASE}/${file}?raw=true)`, '');
    console.log(`ok ${n}. ${title}`);
  } catch (error) {
    await page.screenshot({ path: `${OUT}/${file}` }).catch(() => {});
    report.push(`**${n}. ${title}: FAILED**`, '', '```', String(error).slice(0, 1500), '```', '', `![${title}](${IMG_BASE}/${file}?raw=true)`, '');
    report.push('Result: FAILED.');
    writeFileSync(`${OUT}/report.md`, report.join('\n'));
    console.error(`FAILED ${n}. ${title}\n${error}`);
    await browser.close();
    process.exit(1);
  }
}

const heading = (name) => page.getByRole('heading', { level: 1, name });
const password = () => page.getByLabel('Mật khẩu', { exact: true });
async function signIn(pw) {
  await page.getByLabel('Email').fill(EMAIL);
  await password().fill(pw);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
}
const openAccountMenu = () => page.getByRole('button', { name: /Menu Tài khoản/ }).click();

await step('Signed out visitor is sent to the login page', async () => {
  await page.goto(`${BASE}/employees`);
  await heading('Đăng nhập').waitFor();
});
await step('Wrong password shows the error from the backend', async () => {
  await signIn('not-the-password');
  await page.getByRole('alert').filter({ hasText: 'Email hoặc mật khẩu không đúng.' }).waitFor();
});
await step('Sign in opens the page the visitor came for', async () => {
  await signIn(PASSWORD);
  await page.getByRole('heading', { name: 'Trang này chưa có' }).waitFor();
  await page.getByRole('link', { name: 'Nhân viên' }).and(page.locator('[aria-current="page"]')).waitFor();
  return `signed in as ${EMAIL}, back on /employees`;
});
await step('Reloading the page keeps the session', async () => {
  await page.goto(`${BASE}/`);
  await heading('Tổng quan').waitFor();
  await page.reload();
  await heading('Tổng quan').waitFor();
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  if (/eyJ/.test(stored)) throw new Error('an access token was found in web storage');
  return 'restored through the refresh cookie; no token in localStorage or sessionStorage';
});
await step('Account menu', async () => {
  await openAccountMenu();
  await page.getByRole('menuitem', { name: 'Đổi mật khẩu' }).waitFor();
});
await step('Change password with a wrong current password', async () => {
  await page.getByRole('menuitem', { name: 'Đổi mật khẩu' }).click();
  const dialog = page.getByRole('dialog', { name: 'Đổi mật khẩu' });
  await dialog.getByLabel('Mật khẩu hiện tại').fill('not-the-password');
  await dialog.getByLabel('Mật khẩu mới', { exact: true }).fill(CHANGED);
  await dialog.getByLabel('Nhập lại mật khẩu mới').fill(CHANGED);
  await dialog.getByRole('button', { name: 'Đổi mật khẩu' }).click();
  await dialog.getByText('Mật khẩu hiện tại không đúng.').waitFor();
});
await step('Change password signs out and confirms on the login page', async () => {
  const dialog = page.getByRole('dialog', { name: 'Đổi mật khẩu' });
  await dialog.getByLabel('Mật khẩu hiện tại').fill(PASSWORD);
  await dialog.getByRole('button', { name: 'Đổi mật khẩu' }).click();
  await heading('Đăng nhập').waitFor();
  await page.getByRole('status').filter({ hasText: 'Đã đặt mật khẩu mới.' }).waitFor();
});
await step('The old password no longer works', async () => {
  await signIn(PASSWORD);
  await page.getByRole('alert').filter({ hasText: 'Email hoặc mật khẩu không đúng.' }).waitFor();
});
await step('Sign in with the changed password', async () => {
  await signIn(CHANGED);
  await heading('Tổng quan').waitFor();
});
await step('Sign out returns to the login page', async () => {
  await openAccountMenu();
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
  await heading('Đăng nhập').waitFor();
  await page.reload();
  await heading('Đăng nhập').waitFor();
  return 'still signed out after a reload';
});
await step('Forgot password', async () => {
  await page.getByRole('link', { name: 'Quên mật khẩu?' }).click();
  await heading('Quên mật khẩu?').waitFor();
  await page.getByLabel('Email').fill(EMAIL);
});
await step('Mail sent panel', async () => {
  await page.getByRole('button', { name: 'Gửi liên kết đặt lại' }).click();
  await heading('Kiểm tra hộp thư của bạn').waitFor();
});

let resetLink = '';
await step('The reset mail arrived in Mailpit', async () => {
  let message;
  for (let attempt = 0; attempt < 20 && !message; attempt += 1) {
    const list = await (await fetch(`${MAILPIT}/api/v1/messages`)).json();
    message = list.messages?.[0];
    if (!message) await page.waitForTimeout(500);
  }
  if (!message) throw new Error('no mail in Mailpit');
  const full = await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)).json();
  resetLink = /https?:\/\/\S+\/reset-password\?token=[\w-]+/.exec(full.Text ?? '')?.[0] ?? '';
  if (!resetLink) throw new Error('no reset link in the mail');
  await page.goto(`${MAILPIT}/view/${message.ID}`).catch(() => {});
  await page.waitForTimeout(1500);
  return `to ${message.To?.[0]?.Address}, subject "${message.Subject}" (screenshot: Mailpit web UI)`;
});
await step('Reset link opens the new password form', async () => {
  // The mail links to HRM_APP_URL; keep its path and token, use the URL under test.
  const url = new URL(resetLink);
  await page.goto(`${BASE}${url.pathname}${url.search}`);
  await heading('Đặt mật khẩu mới').waitFor();
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('short-7');
  await page.getByLabel('Nhập lại mật khẩu mới').fill('different');
  await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
  await page.getByText('Mật khẩu phải có ít nhất 8 ký tự.').waitFor();
  await page.getByText('Hai mật khẩu chưa khớp. Nhập lại cho giống nhau.').waitFor();
  return 'client-side validation shown';
});
await step('Saving the new password confirms on the login page', async () => {
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill(RESET);
  await page.getByLabel('Nhập lại mật khẩu mới').fill(RESET);
  await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
  await heading('Đăng nhập').waitFor();
  await page.getByRole('status').filter({ hasText: 'Đã đặt mật khẩu mới.' }).waitFor();
});
await step('Sign in with the reset password', async () => {
  await signIn(RESET);
  await heading('Tổng quan').waitFor();
});
await step('The used reset link is rejected', async () => {
  await openAccountMenu();
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
  await heading('Đăng nhập').waitFor();
  const url = new URL(resetLink);
  await page.goto(`${BASE}${url.pathname}${url.search}`);
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('another-password-3');
  await page.getByLabel('Nhập lại mật khẩu mới').fill('another-password-3');
  await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
  await heading('Liên kết không còn dùng được').waitFor();
});
await step('English: login page after switching language', async () => {
  await page.getByRole('link', { name: 'Quay lại đăng nhập' }).click();
  await page.getByRole('button', { name: 'English' }).click();
  await heading('Sign in').waitFor();
});

report.push(`Result: all ${n} steps passed.`);
writeFileSync(`${OUT}/report.md`, report.join('\n'));
await browser.close();
