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
    // The Admin page asked for the tiles before the switch; only what the Employee persona asks counts.
    await page.reload();
    asked = 0;
    await page.getByRole('heading', { level: 1, name: /^Chào buổi/ }).waitFor();
    await page.waitForLoadState('networkidle');
    if (await tiles().count()) throw new Error('The Employee persona sees the company tiles');
    if (asked !== 0) throw new Error('The Employee persona asked for the tiles');
    return `${employee.fullName} gets the greeting; the tiles API is not called`;
  });
  const lineManager = personas.find((item) => item.persona === 'LINE_MANAGER' && item.available);
  if (employee && lineManager) {
    const signInAs = async (persona) => { token = (await api('/api/auth/demo/sign-in', { method: 'POST', body: { persona } })).accessToken; };
    const block = () => page.getByRole('region', { name: /^Chờ bạn duyệt/ });
    const quickRow = () => block().locator('li').filter({ has: page.getByRole('button', { name: /^Duyệt / }) }).first();
    const countOf = async () => Number((await block().getByRole('heading', { level: 2 }).locator('xpath=..').innerText()).replace(/\D/g, ''));
    let waiting = 0;
    await step('Line manager persona: Chờ bạn duyệt lists what waits, with Duyệt and Từ chối on each row', async () => {
      // The Employee persona sends a profile update (a 409 means one is already open), which waits for its Line manager.
      await signInAs('EMPLOYEE');
      const { personal } = await api(`/api/employees/${(await api('/api/me')).employeeId}`);
      try {
        await api('/api/profile-update-requests', { method: 'POST', body: { personalEmail: personal.personalEmail, phone: `09${String(Date.now()).slice(-8)}`, address: personal.address ?? '12 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội', emergencyContact: personal.emergencyContact, note: 'Dashboard flow' } });
      } catch (error) { if (error.status !== 409) throw error; }
      await signInAs('LINE_MANAGER');
      const expected = await api('/api/dashboard/approvals?limit=5');
      waiting = expected.total;
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/`);
      await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
      await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(lineManager.fullName) }).click();
      await page.getByRole('heading', { level: 1, name: /^Chào buổi/ }).waitFor();
      if (waiting === 0) {
        await block().getByText('Bạn đã duyệt hết').waitFor();
        return 'nothing waits for the Line manager: the block says "Bạn đã duyệt hết"';
      }
      await quickRow().waitFor();
      const shown = await block().locator('li').count();
      if (shown !== Math.min(5, waiting)) throw new Error(`The block shows ${shown} rows for ${waiting} waiting`);
      if ((await countOf()) !== waiting) throw new Error(`The count is ${await countOf()}, the API says ${waiting}`);
      return `${waiting} waiting, ${shown} rows, the count is the total`;
    });
    if (waiting > 0) {
      await step('Line manager persona: Từ chối asks for a reason and Hủy leaves nothing behind', async () => {
        const row = quickRow();
        const rejectName = await row.getByRole('button', { name: /^Từ chối / }).getAttribute('aria-label');
        await row.getByRole('button', { name: /^Từ chối / }).click();
        const dialog = page.getByRole('dialog', { name: /^Từ chối .*\?$/ });
        await dialog.waitFor();
        await dialog.getByRole('button', { name: 'Từ chối', exact: true }).click();
        await dialog.getByText('Nhập lý do từ chối.').waitFor();
        await dialog.getByRole('button', { name: 'Hủy' }).click();
        await dialog.waitFor({ state: 'hidden' });
        const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
        if (focused !== rejectName) throw new Error(`Focus went to ${focused}, not back to "${rejectName}"`);
        if ((await countOf()) !== waiting) throw new Error('The count changed without a decision');
        return 'no reason, no request; Hủy returns focus to the same Từ chối';
      });
      await step('Line manager persona: Duyệt leaves the same record as the inbox, the row turns into its result and leaves', async () => {
        const row = quickRow();
        const href = await row.getByRole('link').first().getAttribute('href');
        const id = href.split('/').pop();
        await row.getByRole('button', { name: /^Duyệt / }).click();
        await block().getByText(/^Đã duyệt( cấp \d+)?/).first().waitFor();
        await page.screenshot({ path: `${OUT}/dashboard-result-row.png` });
        const detail = await api(`/api/approvals/${id}`);
        if (!detail.log.some((entry) => entry.event === 'LEVEL_APPROVED')) throw new Error('The request has no LEVEL_APPROVED record');
        await page.waitForFunction(([wanted]) => {
          const heading = [...document.querySelectorAll('section h2')].find((h) => h.textContent === 'Chờ bạn duyệt');
          return heading && Number(heading.parentElement.textContent.replace(/\D/g, '')) === wanted;
        }, [waiting - 1], { timeout: 10_000 });
        return `request ${id.slice(0, 8)} is now ${detail.status} at level ${detail.level}; after 4 s the row left and the count went from ${waiting} to ${waiting - 1}. The result row, right after the click: ![result row](${IMG_BASE}/dashboard-result-row.png?raw=true)`;
      });
      await step('Line manager persona: the block at 390 puts the buttons under the text', async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`${BASE}/`);
        if (await block().getByText('Bạn đã duyệt hết').count()) return 'no request left to show at 390';
        const row = quickRow();
        await row.waitFor();
        const [text, button] = await Promise.all([row.getByRole('link').first().boundingBox(), row.getByRole('button', { name: /^Duyệt / }).boundingBox()]);
        if (button.y <= text.y) throw new Error('The buttons are not under the text');
        if (button.height < 44) throw new Error(`The button is ${button.height}px high`);
        if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('The page scrolls sideways at 390');
        return 'buttons under the text, 44px high, no sideways scroll';
      });
    }
  }
  await finish(0);
} catch (error) {
  report.push('**Setup: FAILED**', '', '```', String(error).slice(0, 1500), '```', '', 'Result: FAILED.');
  console.error(error);
  await finish(1);
}
