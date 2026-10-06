// Evidence for "Demo as…" (HRM-04/FE-5) against the real stack with the demo flag on (the local compose stack):
// the Admin opens the persona menu at 1280, then switches through every available persona in one click each,
// ends as the Admin persona, and opens the menu from the nav drawer at 390.
// To show the disabled state it locks the Kế toán persona through the API at its start and unlocks it at its
// end, also when a step fails. Use a throwaway database (CI does), never the demo database.
// Writes screenshots and a Markdown report; exits non-zero at the first step that fails.
//   BASE_URL (http://localhost:5173)  OUT (e2e-out)  IMG_BASE (image URL prefix)  HRM_ADMIN_PASSWORD
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';
const LOCKED = 'ACCOUNTANT';
const ROLE_NAMES = { ADMIN: 'Admin', HR: 'HR', LINE_MANAGER: 'Quản lý trực tiếp', PROJECT_MANAGER: 'PM', ACCOUNTANT: 'Kế toán', DIRECTOR: 'Giám đốc', EMPLOYEE: 'Nhân viên' };

mkdirSync(OUT, { recursive: true });
const report = ['### Demo as… (real backend, PostgreSQL)', ''];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(15_000);
let n = 0;
let token = '';
let lockedId = null;

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
  // Whatever happened, the persona this flow locked is unlocked again.
  if (lockedId) await api(`/api/accounts/${lockedId}/unlock`, { method: 'POST' }).catch((error) => report.push('', `**Unlocking the ${LOCKED} persona FAILED:** ${String(error).slice(0, 300)}`));
  writeFileSync(`${OUT}/report-demo.md`, report.join('\n'));
  await browser.close();
  process.exit(code);
}

async function step(title, run) {
  n += 1;
  const file = `demo-${String(n).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
  try {
    const note = await run();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${file}` });
    report.push(`**${n}. ${title}**${note ? `: ${note}` : ''}`, '', `![${title}](${IMG_BASE}/${file}?raw=true)`, '');
    console.log(`ok ${n}. ${title}`);
  } catch (error) {
    await page.screenshot({ path: `${OUT}/${file}` }).catch(() => {});
    report.push(`**${n}. ${title}: FAILED**`, '', '```', String(error).slice(0, 1500), '```', '', `![${title}](${IMG_BASE}/${file}?raw=true)`, '', 'Result: FAILED.');
    console.error(`FAILED ${n}. ${title}\n${error}`);
    await finish(1);
  }
}

// --- Data through the API: the persona list, and one persona locked to show the disabled state. ---
let personas = [];
try {
  token = (await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })).accessToken;
  const me = await api('/api/me');
  if (!me.demo?.enabled) throw new Error('the demo flag is off (HRM_DEMO_PERSONAS): "Demo as…" is not there to test');
  const found = (await api(`/api/accounts?${new URLSearchParams({ q: `demo.${LOCKED.toLowerCase()}@hrm.local`, size: '1' })}`)).items[0];
  if (!found) throw new Error(`the ${LOCKED} persona Account is missing`);
  await api(`/api/accounts/${found.id}/lock`, { method: 'POST' });
  lockedId = found.id;
  personas = (await api('/api/auth/demo/personas')).personas;
  const unexpected = personas.filter((persona) => persona.available === (persona.persona === LOCKED));
  if (unexpected.length) throw new Error(`availability is not as prepared for: ${unexpected.map((persona) => persona.persona).join(', ')}`);
} catch (error) {
  report.push('**Preparing data through the API: FAILED**', '', '```', String(error).slice(0, 1500), '```', '', 'Result: FAILED.');
  console.error(`FAILED preparing data\n${error}`);
  await finish(1);
}

const header = () => page.getByRole('banner');
const toasts = () => page.getByRole('region', { name: 'Thông báo kết quả thao tác' });
const personaItem = (persona) => page.getByRole('menu').getByRole('menuitem', { name: new RegExp(persona.fullName) });

await step('Signed in as the Admin: "Demo as…" in the header, the menu lists the personas, the locked one disabled', async () => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await header().getByRole('button', { name: 'Demo as…' }).click();
  await page.getByRole('menu').getByText('Đăng nhập nhanh bằng persona').waitFor();
  const count = await page.getByRole('menu').getByRole('menuitem').count();
  if (count !== personas.length) throw new Error(`${count} items, expected ${personas.length}`);
  const locked = personas.find((persona) => persona.persona === LOCKED);
  if ((await personaItem(locked).getAttribute('aria-disabled')) !== 'true') throw new Error(`${locked.fullName} is not disabled`);
  return `${count} personas; ${locked.fullName} (${ROLE_NAMES[LOCKED]}) locked through the API and shown disabled`;
});

const order = [...personas.filter((persona) => persona.available && persona.persona !== 'ADMIN'), personas.find((persona) => persona.persona === 'ADMIN')];
for (const persona of order) {
  await step(`Switch to ${ROLE_NAMES[persona.persona]}`, async () => {
    if (await page.getByRole('menu').count() === 0) await header().getByRole('button', { name: /^Demo as/ }).click();
    await personaItem(persona).click();
    const roles = persona.roles.map((role) => ROLE_NAMES[role]).join(', ');
    await toasts().getByText(`Đang dùng Tài khoản của ${persona.fullName} (${roles})`).waitFor();
    await header().getByRole('button', { name: `Menu Tài khoản: ${persona.fullName}` }).waitFor();
    await header().getByRole('button', { name: `Demo as: ${persona.title}` }).waitFor();
    if (new URL(page.url()).pathname !== '/') throw new Error(`ended on ${page.url()}, not the overview`);
    const links = await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link').allTextContents();
    return `one click; the shell shows ${persona.fullName} and the navigation ${links.join(', ')}`;
  });
}

await step('At 390 "Demo as" sits in the nav drawer, named by role', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Mở menu điều hướng' }).click();
  const drawer = page.getByRole('dialog', { name: 'Điều hướng chính' });
  await drawer.getByRole('button', { name: 'Demo as: Admin' }).click();
  const current = page.getByRole('menu').getByRole('menuitem', { name: /Đỗ Minh Quân|Quản trị hệ thống/ });
  if ((await current.getAttribute('aria-current')) !== 'true') throw new Error('the Admin persona is not marked as current');
});

report.push('Result: passed.');
await finish(0);
