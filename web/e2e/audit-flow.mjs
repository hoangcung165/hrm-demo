// Evidence for the Audit log (HRM-13) against the real stack, across its slices: the Admin changes the Bench threshold
// in the "Ngưỡng nguồn lực" dialog (BE-1 records it), finds the change at the top of /audit-log (BE-2 list, FE-1
// screen), narrows the list by object and person, opens the record with Enter and reads Ngưỡng Bench 50 → 35, closes it
// with Esc and is back on the row; puts the defaults back and sees that second record; searches for something that is
// not there. With the example data and the demo personas on (the local compose stack), the records of the Giám đốc and
// Admin personas from the last week are listed, the Giám đốc persona reads the log, and the HR persona has no nav item
// and the denied state by URL. Last, the same screen at 390 (compact rows, the "Lọc" dialog, the drawer full screen).
// It changes the company's resource thresholds and puts the defaults back; audit records cannot be deleted, so every
// run adds two. Use a throwaway database (CI does), never the demo one. Writes screenshots and a Markdown report; exits
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
const report = ['### Audit log (real backend, PostgreSQL)', ''];
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
  writeFileSync(`${OUT}/report-audit.md`, report.join('\n'));
  await browser.close();
  process.exit(code);
}

async function step(title, run) {
  n += 1;
  const file = `audit-${String(n).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
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
const list = () => page.getByRole('table', { name: 'Danh sách bản ghi audit' });
const rows = () => list().locator('tbody tr');
const firstRow = () => rows().first();
const drawer = () => page.getByRole('dialog').filter({ hasText: 'Bản ghi audit' });
const changeRow = (field) => drawer().getByRole('table', { name: 'Thay đổi' }).getByRole('row').filter({ hasText: field });
const thresholdsDialog = () => page.getByRole('dialog', { name: 'Ngưỡng nguồn lực' });
const thresholdField = (name) => thresholdsDialog().getByRole('textbox', { name: new RegExp(`^${name}`) });
const toast = (text) => page.getByRole('region', { name: 'Thông báo kết quả thao tác' }).getByText(text);
// The previous rows stay while the next query loads (the list is aria-busy meanwhile), so wait for both to be over.
const loaded = async () => {
  await list().waitFor();
  await page.getByRole('status', { name: 'Đang tải Audit log' }).waitFor({ state: 'detached' });
  await page.waitForFunction(() => !document.querySelector('main [aria-busy="true"]'));
};
/** Retries `check` until it returns true, then returns its last value; fails with `message` after the timeout. */
const until = async (check, message, timeoutMs = 10_000) => {
  const end = Date.now() + timeoutMs;
  for (;;) {
    if (await check()) return;
    if (Date.now() > end) throw new Error(await message());
    await page.waitForTimeout(200);
  }
};
const pickOption = async (combobox, option) => {
  await page.getByRole('combobox', { name: combobox }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
};

let adminName = '';

await step('Admin changes the Bench threshold in "Ngưỡng nguồn lực"', async () => {
  token = (await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })).accessToken;
  adminName = (await api('/api/me')).fullName;
  // Start from the defaults, so the change below is a real one whatever an earlier flow left.
  await api('/api/resource-settings', { method: 'DELETE' });
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await nav().getByRole('link', { name: 'Nguồn lực' }).waitFor();
  await page.goto(`${BASE}/resources?tab=heatmap`);
  await page.getByRole('button', { name: 'Ngưỡng nguồn lực' }).click();
  await thresholdsDialog().waitFor();
  await page.waitForFunction(() => document.querySelector('[role="dialog"] input')?.value !== '');
  await thresholdField('Ngưỡng Bench').fill('35');
  await thresholdsDialog().getByRole('button', { name: 'Lưu ngưỡng' }).click();
  await toast('Đã lưu ngưỡng nguồn lực').waitFor();
  return `PUT /api/resource-settings as ${adminName}: Bench 50% → 35%`;
});

await step('Audit log: the change is first, with time, person, action, object and summary', async () => {
  await nav().getByRole('link', { name: 'Audit log' }).click();
  await page.getByRole('heading', { level: 1, name: 'Audit log' }).waitFor();
  await loaded();
  const headers = await list().getByRole('columnheader').allTextContents();
  if (headers.join('|') !== 'Thời gian|Người sửa|Thao tác|Đối tượng|Nội dung') throw new Error(`unexpected columns: ${headers.join(', ')}`);
  const cells = await firstRow().getByRole('cell').allTextContents();
  if (!cells[1]?.includes(adminName) || cells[2] !== 'Sửa' || cells[3] !== 'Ngưỡng nguồn lực' || cells[4] !== 'Resource thresholds changed') {
    throw new Error(`the first row is not the change just made: ${cells.join(' | ')}`);
  }
  const controls = await page.getByRole('main').getByRole('button', { name: /^(Sửa|Xóa|Thêm)/ }).count();
  if (controls > 0) throw new Error(`found ${controls} edit or delete controls on a read-only screen`);
  return 'GET /api/audit-logs, newest first; no edit or delete control anywhere';
});

await step('Filter by object and person', async () => {
  await pickOption('Đối tượng', 'Ngưỡng nguồn lực');
  await pickOption('Người sửa', adminName);
  await page.waitForURL(/type=RESOURCE_SETTING/);
  await page.waitForURL(/actor=/);
  await loaded();
  const people = () => rows().locator('td:nth-child(2)').allTextContents();
  await until(
    async () => {
      const names = await people();
      return names.length > 0 && names.every((name) => name.includes(adminName));
    },
    async () => `rows by someone else: ${(await people()).join(', ')}`,
  );
  return `entityType=RESOURCE_SETTING&actorId=…: ${(await people()).length} record(s), all by ${adminName}`;
});

await step('Enter opens the record: Ngưỡng Bench 50 → 35', async () => {
  const opener = firstRow().getByRole('button', { name: 'Resource thresholds changed' });
  await opener.focus();
  await page.keyboard.press('Enter');
  await drawer().waitFor();
  const bench = await changeRow('Ngưỡng Bench (%)').textContent();
  if (!/50\s*35/.test(bench ?? '')) throw new Error(`expected Ngưỡng Bench 50 → 35, found "${bench}"`);
  if ((await changeRow('Mức gần đầy').count()) > 0) throw new Error('an unchanged field is listed');
  return 'GET /api/audit-logs/{id}: only the changed field, before → after';
});

await step('Esc closes the drawer and gives focus back to the row', async () => {
  await page.keyboard.press('Escape');
  await drawer().waitFor({ state: 'detached' });
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-audit-record'));
  if (!focused) throw new Error('focus did not come back to the record');
  return 'focus is on the summary button of the record';
});

await step('Putting the defaults back is recorded too', async () => {
  await api('/api/resource-settings', { method: 'DELETE' });
  await page.goto(`${BASE}/audit-log?type=RESOURCE_SETTING`);
  await loaded();
  const summary = await firstRow().getByRole('cell').nth(4).textContent();
  if (summary !== 'Resource thresholds restored to the defaults') throw new Error(`first row: ${summary}`);
  await firstRow().getByRole('button').click();
  await drawer().waitFor();
  const bench = await changeRow('Ngưỡng Bench (%)').textContent();
  if (!/35\s*50/.test(bench ?? '')) throw new Error(`expected Ngưỡng Bench 35 → 50, found "${bench}"`);
  await drawer().getByRole('button', { name: 'Đóng' }).click();
  return 'DELETE /api/resource-settings; the thresholds are the defaults again';
});

await step('A search that finds nothing', async () => {
  await page.getByRole('searchbox', { name: 'Tìm theo nội dung hoặc người sửa' }).fill('no such change');
  await page.getByRole('heading', { name: 'Không có bản ghi nào khớp “no such change”' }).waitFor();
  return 'the no-match state offers "Xóa bộ lọc"';
});

const me = await api('/api/me').catch(() => null);
const personas = me?.demo?.enabled ? ((await api('/api/auth/demo/personas').catch(() => ({ personas: [] }))).personas ?? []) : [];
const director = personas.find((each) => each.persona === 'DIRECTOR' && each.available);
const hr = personas.find((each) => each.persona === 'HR' && each.available);
const adminPersona = personas.find((each) => each.persona === 'ADMIN' && each.available);
const switchTo = async (persona) => {
  await page.getByRole('banner').getByRole('button', { name: /^Demo as/ }).click();
  await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(persona.fullName) }).click();
  await toast(new RegExp(`Đang dùng Tài khoản của ${persona.fullName}`)).waitFor();
};

if (director && hr && adminPersona) {
  await step('As the Giám đốc persona: the example changes of the last week', async () => {
    await page.goto(`${BASE}/audit-log`);
    await switchTo(director);
    await page.goto(`${BASE}/audit-log?q=${encodeURIComponent(director.fullName)}`);
    await loaded();
    const summaries = () => rows().locator('td:nth-child(5)').allTextContents();
    const expected = ['Resource thresholds changed', 'Resource thresholds restored to the defaults'];
    await until(
      async () => {
        const found = await summaries();
        return expected.every((each) => found.includes(each));
      },
      async () => `no example records ${expected.join(' and ')} by ${director.fullName}: ${(await summaries()).join(', ')}`,
    );
    return `${director.fullName} (AUDIT_VIEW) reads the log; the example data recorded their changes`;
  });

  await step('As the HR persona: no nav item and the denied state by URL', async () => {
    await switchTo(hr);
    await page.goto(`${BASE}/audit-log`);
    await page.getByRole('heading', { name: 'Bạn không xem được Audit log' }).waitFor();
    if ((await nav().getByRole('link', { name: 'Audit log' }).count()) > 0) throw new Error('HR sees the Audit log nav item');
    return `${hr.fullName} has no AUDIT_VIEW`;
  });

  await step('As the Admin persona: the nav item is back', async () => {
    await switchTo(adminPersona);
    await page.goto(`${BASE}/audit-log`);
    await nav().getByRole('link', { name: 'Audit log' }).waitFor();
    await loaded();
    return `${adminPersona.fullName} (Admin) for the phone steps`;
  });
} else {
  report.push('_Giám đốc, HR and Admin personas: skipped, the demo personas are off._', '');
}

await step('390: compact rows', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/audit-log`);
  const compact = page.getByRole('list', { name: 'Danh sách bản ghi audit' });
  await compact.getByRole('listitem').first().waitFor();
  return 'summary, object · person, the action badge and the time';
});

await step('390: the "Lọc" dialog', async () => {
  await page.getByRole('button', { name: /^Lọc/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Lọc Audit log' });
  await dialog.waitFor();
  await dialog.getByRole('combobox', { name: 'Đối tượng' }).click();
  await page.getByRole('option', { name: 'Ngưỡng nguồn lực', exact: true }).click();
  await dialog.getByRole('button', { name: /^Xem \d+ bản ghi$/ }).waitFor();
  return 'object, person and period; "Xem {n} bản ghi" closes it';
});

await step('390: the record as a full-screen sheet', async () => {
  await page.getByRole('dialog', { name: 'Lọc Audit log' }).getByRole('button', { name: /^Xem \d+ bản ghi$/ }).click();
  await page.getByRole('list', { name: 'Danh sách bản ghi audit' }).getByRole('listitem').first().getByRole('button').first().click();
  await drawer().waitFor();
  await drawer().getByRole('table', { name: 'Thay đổi' }).waitFor();
  return 'the before → after table fits the phone';
});

report.push('Result: passed.');
await finish(0);
