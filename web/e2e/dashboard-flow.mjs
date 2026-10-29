// HRM-20: Tổng quan (the dashboard) against the real stack. Read only: it changes no data, so it can run on any
// database that has the example data; tiles are compared with the numbers of the API for the same Account.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'e2e-out';
const IMG_BASE = process.env.IMG_BASE ?? '.';
const EMAIL = process.env.HRM_ADMIN_EMAIL ?? 'admin@hrm.local';
const PASSWORD = process.env.HRM_ADMIN_PASSWORD ?? 'admin12345';
mkdirSync(OUT, { recursive: true });
const report = ['### Tổng quan (real backend, PostgreSQL)', ''];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(15_000);
let token;
let n = 0;
async function api(path, init = {}) {
  const response = await fetch(`${BASE}${path}`, { ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined });
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}
async function finish(code) {
  writeFileSync(`${OUT}/report-dashboard.md`, report.join('\n')); await browser.close(); process.exit(code);
}
async function step(title, run) {
  n += 1;
  const file = `dashboard-${String(n).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  try {
    const note = await run();
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
const tiles = () => page.getByRole('list', { name: 'Số liệu chính' });
const tileOf = (label) => tiles().getByRole('listitem').filter({ has: page.getByText(label, { exact: true }) });
const number = async (label) => Number((await tileOf(label).innerText()).split('\n').find((line) => /^\d+$/.test(line.trim())));

try {
  const login = await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } });
  token = login.accessToken;
  const me = await api('/api/me');

  await step('Admin: greeting and the stat tiles show the numbers of the API', async () => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await page.getByRole('heading', { level: 1, name: /^Chào buổi (sáng|chiều|tối), / }).waitFor();
    await tiles().waitFor();
    const expected = await api('/api/dashboard/tiles');
    await page.waitForFunction(() => !document.querySelector('[aria-label="Số liệu chính"][aria-busy="true"]'));
    for (const [label, value] of [['Nhân viên', expected.employees], ['Làm việc hôm nay', expected.workingToday], ['Nghỉ phép hôm nay', expected.onLeaveToday]]) {
      const shown = await number(label);
      if (shown !== value) throw new Error(`${label}: page shows ${shown}, API says ${value}`);
    }
    return `${expected.employees} Employees, ${expected.workingToday} working today, ${expected.onLeaveToday} on leave today, for ${expected.date}`;
  });

  await step('Admin: the keyboard reaches the tiles in reading order, with a visible focus', async () => {
    await page.goto(`${BASE}/`);
    await tiles().waitFor();
    await tileOf('Nhân viên').getByRole('link').focus();
    const order = [await page.evaluate(() => document.activeElement?.textContent ?? '')];
    await page.keyboard.press('Tab');
    order.push(await page.evaluate(() => document.activeElement?.textContent ?? ''));
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement).boxShadow);
    if (!ring || ring === 'none') throw new Error('The focused tile has no visible focus ring');
    const labels = ['Nhân viên', 'Nghỉ phép hôm nay'];
    if (!order[0].includes(labels[0]) || !order[1].includes(labels[1])) throw new Error(`Tab order was ${JSON.stringify(order)}`);
    return 'Tab goes from Nhân viên to Nghỉ phép hôm nay ("Làm việc hôm nay" is a figure, not a link)';
  });

  await step('Admin: the Employees tile opens the Employee list', async () => {
    await page.goto(`${BASE}/`);
    await tileOf('Nhân viên').getByRole('link').click();
    await page.waitForURL('**/employees');
    await page.getByRole('heading', { level: 1, name: 'Nhân viên' }).waitFor();
    return 'list opened at /employees';
  });

  await step('Admin: the on-leave tile opens the leave calendar on this week', async () => {
    await page.goto(`${BASE}/`);
    await tileOf('Nghỉ phép hôm nay').getByRole('link').click();
    await page.waitForURL(/\/leave-calendar\?view=week&date=\d{4}-\d{2}-\d{2}/);
    return 'calendar opened in the week view of today';
  });

  await step('Admin: the page at 390 stacks the tiles in one column', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/`);
    await tiles().waitFor();
    const widths = await tiles().locator('li > *').evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().width)));
    if (new Set(widths).size !== 1 || widths[0] < 300) throw new Error(`Tiles are not one full-width column: ${widths}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) throw new Error('The page scrolls sideways at 390');
    return `three tiles, each ${widths[0]}px wide, no sideways scroll`;
  });

  const personas = me.demo?.enabled ? (await api('/api/auth/demo/personas')).personas ?? [] : [];
  const employee = personas.find((item) => item.persona === 'EMPLOYEE' && item.available);
  if (employee) await step('Employee persona: greeting only, no tiles and no request for them', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    let asked = 0;
    await page.route('**/api/dashboard/tiles', (route) => { asked += 1; return route.continue(); });
    await page.goto(`${BASE}/`);
    await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
    await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(employee.fullName) }).click();
    await page.getByRole('heading', { level: 1, name: /^Chào buổi/ }).waitFor();
    await page.reload();
    await page.getByRole('heading', { level: 1, name: /^Chào buổi/ }).waitFor();
    if (await tiles().count()) throw new Error('The Employee persona sees the company tiles');
    if (asked !== 0) throw new Error('The Employee persona asked for the tiles');
    return `${employee.fullName} gets the greeting; the tiles API is not called`;
  });
  await finish(0);
} catch (error) {
  report.push('**Setup: FAILED**', '', '```', String(error).slice(0, 1500), '```', '', 'Result: FAILED.');
  console.error(error);
  await finish(1);
}
