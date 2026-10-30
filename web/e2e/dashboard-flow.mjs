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
// The resource tiles: "75%" or "12" in the Vietnamese format (comma for decimals, dot for thousands).
const resourceTiles = () => page.getByRole('list', { name: 'Nguồn lực tuần này' });
const resourceTile = (label) => resourceTiles().getByRole('listitem').filter({ has: page.getByText(label, { exact: true }) });
const figure = async (label) => {
  const line = (await resourceTile(label).innerText()).split('\n').map((text) => text.trim()).find((text) => /^\d[\d.,]*%?$/.test(text));
  return line === undefined ? null : Number(line.replace('%', '').replace(/\./g, '').replace(',', '.'));
};
const widget = (name) => page.getByRole('region', { name });

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

  await step('Admin: the resource tiles equal the Nguồn lực overview and lead to its filtered views', async () => {
    await page.goto(`${BASE}/`);
    await resourceTiles().waitFor();
    await page.waitForFunction(() => !document.querySelector('[aria-label="Nguồn lực tuần này"][aria-busy="true"]'));
    const overview = await api('/api/resources/overview');
    const expected = [['Tải phân bổ trung bình', overview.tiles.averageLoad], ['Bench', overview.tiles.bench], ['Quá tải', overview.tiles.overloadedNow]];
    for (const [label, value] of expected) {
      const shown = await figure(label);
      if (value === null ? shown !== null : shown !== value) throw new Error(`${label}: page shows ${shown}, the overview says ${value}`);
    }
    await resourceTile('Bench').getByRole('link').click();
    await page.waitForURL(/\/resources\?tab=bench/);
    await page.goBack();
    await resourceTile('Quá tải').getByRole('link').click();
    await page.waitForURL(/\/resources\?(?=.*tab=heatmap)(?=.*level=OVER)/);
    return `average ${overview.tiles.averageLoad ?? 'none'}, Bench ${overview.tiles.bench}, Quá tải ${overview.tiles.overloadedNow} for ${overview.weekFrom}; Bench and Quá tải open their filtered lists`;
  });

  await step('Admin: running projects, Nhân viên theo đơn vị and the joins and leaves show their numbers', async () => {
    await page.goto(`${BASE}/`);
    const headcount = await api('/api/dashboard/headcount');
    const overview = await api('/api/resources/overview');
    const units = widget('Nhân viên theo đơn vị').getByRole('list', { name: 'Nhân viên theo đơn vị' });
    await units.waitFor();
    const unitRows = await units.getByRole('listitem').all();
    const wanted = Math.min(headcount.byUnit.length, 8);
    if (unitRows.length !== wanted) throw new Error(`${unitRows.length} unit rows, expected ${wanted}`);
    const first = headcount.byUnit[0];
    const text = await unitRows[0].innerText();
    if (!text.includes(first.orgUnitName ?? 'Trực thuộc công ty') || !text.split('\n').some((line) => line.trim() === String(first.count))) throw new Error(`The first unit row reads "${text}", the API says ${JSON.stringify(first)}`);
    const flow = widget('Vào làm và nghỉ việc').getByRole('list').first();
    await flow.waitFor();
    const sentences = await flow.locator('.sr-only').allInnerTexts();
    if (sentences.length !== 6) throw new Error(`${sentences.length} months, expected 6`);
    const last = headcount.months.at(-1);
    if (!sentences.at(-1).endsWith(`${last.joins} vào làm, ${last.leaves} nghỉ việc`)) throw new Error(`The last month reads "${sentences.at(-1)}", the API says ${JSON.stringify(last)}`);
    const projects = widget('Dự án đang chạy');
    await projects.getByRole('heading', { level: 2 }).waitFor();
    await page.waitForFunction(() => !document.querySelector('section[aria-busy="true"]'));
    if (overview.projects.length === 0) await projects.getByText('Chưa có dự án đang chạy').waitFor();
    else {
      const rows = await projects.getByRole('listitem').all();
      if (rows.length !== Math.min(overview.projects.length, 8)) throw new Error(`${rows.length} project rows for ${overview.projects.length} projects`);
      const top = [...overview.projects].sort((a, b) => b.headcount - a.headcount)[0];
      const topText = await rows[0].innerText();
      if (!topText.includes(top.name) || !topText.includes(`${top.headcount} người`)) throw new Error(`The first project row reads "${topText}", the API says ${JSON.stringify(top)}`);
    }
    await flow.getByRole('listitem').nth(2).hover();
    await page.getByText(/^Tháng \d{2}\/\d{4}$/).first().waitFor();
    return `${unitRows.length} unit rows (largest: ${first.orgUnitName ?? 'directly under the company'}, ${first.count}), 6 months (last: +${last.joins} −${last.leaves}), ${overview.projects.length} running projects; a month opens its tooltip on hover`;
  });

  await step('Admin: Nghỉ hôm nay and Sắp hết hạn show what the API returns and open their lists', async () => {
    await page.goto(`${BASE}/`);
    const leave = await api('/api/dashboard/leave-today');
    const expiry = await api('/api/expiry?page=0&size=5');
    const countOf = async (name) => Number((await widget(name).getByRole('heading', { level: 2 }).locator('xpath=..').innerText()).replace(/\D/g, ''));
    await widget('Nghỉ hôm nay').waitFor();
    await page.waitForFunction(() => !document.querySelector('section[aria-busy="true"]'));
    if (leave.entries.length === 0) await widget('Nghỉ hôm nay').getByText('Hôm nay không ai nghỉ').waitFor();
    else {
      const names = await widget('Nghỉ hôm nay').getByRole('listitem').getByRole('link').allInnerTexts();
      const wanted = leave.entries.slice(0, 5).map((entry) => entry.employee.fullName);
      if (JSON.stringify(names) !== JSON.stringify(wanted)) throw new Error(`Nghỉ hôm nay lists ${JSON.stringify(names)}, the API says ${JSON.stringify(wanted)}`);
      if ((await countOf('Nghỉ hôm nay')) !== leave.entries.length) throw new Error('The count of Nghỉ hôm nay is not the total');
    }
    if (expiry.items.length === 0) await widget('Sắp hết hạn').getByText('Chưa có mục sắp hết hạn').waitFor();
    else {
      const names = await widget('Sắp hết hạn').getByRole('listitem').getByRole('link').allInnerTexts();
      const wanted = expiry.items.map((item) => item.employeeName);
      if (JSON.stringify(names) !== JSON.stringify(wanted)) throw new Error(`Sắp hết hạn lists ${JSON.stringify(names)}, the API says ${JSON.stringify(wanted)}`);
      if ((await countOf('Sắp hết hạn')) !== expiry.total) throw new Error(`The count of Sắp hết hạn is not the total ${expiry.total}`);
      const first = await widget('Sắp hết hạn').getByRole('listitem').first().innerText();
      if (!first.includes(expiry.items[0].daysRemaining <= 0 ? 'Hết hạn hôm nay' : `Còn ${expiry.items[0].daysRemaining} ngày`)) throw new Error(`The first expiry row has no days left: "${first}"`);
    }
    await page.screenshot({ path: `${OUT}/dashboard-attention-blocks.png` });
    await widget('Nghỉ hôm nay').getByRole('link', { name: 'Lịch nghỉ hôm nay' }).click();
    await page.waitForURL(/\/leave-calendar\?view=week&date=\d{4}-\d{2}-\d{2}/);
    await page.goBack();
    await widget('Sắp hết hạn').getByRole('link', { name: 'Xem tất cả giấy tờ sắp hết hạn' }).click();
    await page.waitForURL('**/expiry');
    return `${leave.entries.length} on leave today, ${expiry.total} expiring (5 shown, soonest first); the heads open the leave calendar on this week and /expiry. The blocks: ![blocks](${IMG_BASE}/dashboard-attention-blocks.png?raw=true)`;
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

  await step('Admin: the charts at 390 keep their numbers, the bars go under the labels and nothing scrolls sideways', async () => {
    await page.goto(`${BASE}/`);
    const units = widget('Nhân viên theo đơn vị').getByRole('list', { name: 'Nhân viên theo đơn vị' });
    await units.waitFor();
    const row = units.getByRole('listitem').first();
    const [label, track] = await Promise.all([row.locator('a, span').first().boundingBox(), row.locator('[aria-hidden="true"]').first().boundingBox()]);
    if (track.y <= label.y) throw new Error('The bar is not under the label');
    const flow = widget('Vào làm và nghỉ việc').getByRole('list').first();
    await flow.waitFor();
    const columns = await flow.getByRole('listitem').evaluateAll((items) => items.map((item) => item.getBoundingClientRect()).map(({ left, right }) => [Math.round(left), Math.round(right)]));
    if (columns.some(([left, right]) => left < 0 || right > 390)) throw new Error(`A month column leaves the screen: ${JSON.stringify(columns)}`);
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('The page scrolls sideways at 390');
    return 'bars under the labels, six month columns inside the screen, no sideways scroll';
  });

  await step('Admin: the two lists at 390 keep 56px rows and nothing scrolls sideways', async () => {
    await page.goto(`${BASE}/`);
    await widget('Nghỉ hôm nay').waitFor();
    await page.waitForFunction(() => !document.querySelector('section[aria-busy="true"]'));
    for (const name of ['Nghỉ hôm nay', 'Sắp hết hạn']) {
      const heights = await widget(name).getByRole('listitem').evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().height)));
      if (heights.some((height) => height < 56)) throw new Error(`${name}: a row is under 56px: ${heights}`);
    }
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('The page scrolls sideways at 390');
    return 'rows at least 56px high, no sideways scroll';
  });

  const personas = me.demo?.enabled ? (await api('/api/auth/demo/personas')).personas ?? [] : [];
  const employee = personas.find((item) => item.persona === 'EMPLOYEE' && item.available);
  if (employee) await step('Employee persona: greeting only, no tiles and no request for them', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    let asked = 0;
    let resourcesAsked = 0;
    await page.route('**/api/dashboard/tiles', (route) => { asked += 1; return route.continue(); });
    await page.route(/\/api\/(resources\/overview|dashboard\/headcount|dashboard\/leave-today|expiry(\?|$))/, (route) => { resourcesAsked += 1; return route.continue(); });
    await page.goto(`${BASE}/`);
    await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
    await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(employee.fullName) }).click();
    await page.getByRole('banner').getByRole('button', { name: `Menu Tài khoản: ${employee.fullName}` }).waitFor();
    await page.getByRole('heading', { level: 1, name: /^Chào buổi/ }).waitFor();
    // The Admin page asked for the tiles before the switch; only what the Employee persona asks counts.
    await page.reload();
    asked = 0;
    resourcesAsked = 0;
    await page.getByRole('heading', { level: 1, name: /^Chào buổi/ }).waitFor();
    await page.waitForLoadState('networkidle');
    if (await tiles().count()) throw new Error('The Employee persona sees the company tiles');
    if (asked !== 0) throw new Error('The Employee persona asked for the tiles');
    if (await widget('Nghỉ hôm nay').count() || await widget('Sắp hết hạn').count() || await widget('Dự án đang chạy').count() || await resourceTiles().count() || await widget('Nhân viên theo đơn vị').count()) throw new Error('The Employee persona sees a resource or headcount block');
    if (resourcesAsked !== 0) throw new Error('The Employee persona asked for the resource overview, the headcount, the leave of the day or the expiries');
    return `${employee.fullName} gets the greeting; the tiles, resource and headcount APIs are not called`;
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
      await page.getByRole('banner').getByRole('button', { name: `Menu Tài khoản: ${lineManager.fullName}` }).waitFor();
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
        // A level that is not the last logs LEVEL_APPROVED; the last one logs APPROVED, as the inbox does.
        if (!detail.log.some((entry) => ['LEVEL_APPROVED', 'APPROVED'].includes(entry.event) && entry.actor)) throw new Error(`The request has no approval record by a person: ${JSON.stringify(detail.log.map((entry) => entry.event))}`);
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
    // HRM-20/FE-5: "Nhóm của tôi", the members of the units the Line manager heads.
    const team = () => page.getByRole('region', { name: /^Nhóm của tôi/ });
    let expectedTeam = null;
    await step('Line manager persona: Nhóm của tôi lists the members with this week\'s load, as the API has it', async () => {
      await signInAs('LINE_MANAGER');
      try { expectedTeam = await api('/api/dashboard/team'); } catch (error) { if (!String(error).includes('→ 403')) throw error; }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/`);
      await page.getByRole('heading', { level: 1, name: /^Chào buổi/ }).waitFor();
      if (!expectedTeam) {
        await page.waitForLoadState('networkidle');
        if (await team().count()) throw new Error('A Line manager who heads no unit sees the block');
        return 'the persona heads no unit: the API says 403 and the page has no block';
      }
      await team().waitFor();
      if (expectedTeam.members.length === 0) {
        await team().getByText('Nhóm chưa có ai').waitFor();
        return 'the unit has nobody: the block says "Nhóm chưa có ai"';
      }
      const first = expectedTeam.members[0];
      await team().getByText(first.employee.fullName).waitFor();
      const count = Number((await team().getByRole('heading', { level: 2 }).locator('xpath=..').innerText()).replace(/\D/g, ''));
      if (count !== expectedTeam.members.length) throw new Error(`The count is ${count}, the API has ${expectedTeam.members.length} members`);
      // Only the people of the unit and below: every member of the API is on the page (up to the ten it shows first).
      for (const member of expectedTeam.members.slice(0, 10)) {
        const row = team().locator('li').filter({ has: page.getByText(member.employee.fullName, { exact: true }) }).first();
        const cell = row.getByRole('img', { name: /^Tải phân bổ / });
        const shown = (await cell.innerText()).trim();
        if (!shown.startsWith(`${member.load}`)) throw new Error(`${member.employee.fullName}: the cell says ${shown}, the API says ${member.load}%`);
      }
      return `${expectedTeam.members.length} members for the week ${expectedTeam.weekFrom} to ${expectedTeam.weekTo}, every cell shows the API's percent`;
    });
    if (expectedTeam && expectedTeam.members.length > 0) {
      await step('Line manager persona: every load is a number as well as a colour, and a name opens the profile', async () => {
        const cells = team().getByRole('img', { name: /^Tải phân bổ / });
        const labels = await cells.evaluateAll((items) => items.map((item) => item.textContent.trim()));
        if (labels.some((text) => !/\d+(,\d+)?%$/.test(text))) throw new Error(`A cell has no percent: ${JSON.stringify(labels)}`);
        const over = expectedTeam.members.filter((member) => member.load > 100).length;
        if (over && (await team().getByRole('img', { name: /quá tải$/ }).count()) !== Math.min(over, 10)) throw new Error('An overloaded cell is not read out as "quá tải"');
        const name = expectedTeam.members[0].employee.fullName;
        await team().getByRole('link', { name: new RegExp(name) }).first().click();
        await page.waitForURL(`**/employees/${expectedTeam.members[0].employee.id}`);
        return `${labels.length} cells with a percent${over ? `, ${over} read out as overloaded` : ''}; ${name} opened the profile`;
      });
      await step('Line manager persona: Nhóm của tôi at 390 stacks each member and does not scroll sideways', async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`${BASE}/`);
        await team().waitFor();
        const row = team().locator('li').filter({ has: page.getByRole('img', { name: /^Tải phân bổ / }) }).first();
        await row.waitFor();
        const [name, cell] = await Promise.all([row.getByRole('link').first().boundingBox(), row.getByRole('img', { name: /^Tải phân bổ / }).boundingBox()]);
        if (cell.y <= name.y) throw new Error('The load is not under the name');
        if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('The page scrolls sideways at 390');
        return 'the load sits under the name, no sideways scroll';
      });
    }
  }
  await finish(0);
} catch (error) {
  report.push('**Setup: FAILED**', '', '```', String(error).slice(0, 1500), '```', '', 'Result: FAILED.');
  console.error(error);
  await finish(1);
}
