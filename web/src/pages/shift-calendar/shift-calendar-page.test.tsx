import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';
import { shiftApi } from '@/test/shift-handlers';
import { AN, LAN, shiftCalendarApi, type ShiftCalendarOptions } from '@/test/shift-calendar-handlers';
import { CA_DEM, HANH_CHINH, SHIFTS } from '@/test/shift-fixtures';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'SHIFT_VIEW', 'SHIFT_EDIT', 'SHIFT_ASSIGN'] };
// The week of Monday 12/10/2026 to Sunday 18/10/2026, and the month around it.
const WEEK = '/shift-calendar?view=week&date=2026-10-14';

const open = (path = WEEK, options: ShiftCalendarOptions = {}, session: Account = HR) => {
  const api = shiftCalendarApi(options);
  server.use(...api.handlers, ...shiftApi(SHIFTS).handlers);
  return { api, ...renderRoutes(routes, { session, path }) };
};
const grid = () => screen.findByRole('table', { name: /^Lịch phân ca, / });
const rowOf = async (name: string) => within(await grid()).getByRole('rowheader', { name: new RegExp(name) }).closest('tr') as HTMLElement;
const asPhone = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)', addEventListener: () => {}, removeEventListener: () => {} }));

describe('ShiftCalendarPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows the week with people down the side and the days across', async () => {
    const { api } = open(WEEK, { holidays: { '2026-10-15': 'Ngày thử nghiệm' } });
    const table = await grid();
    expect(await within(table).findByRole('columnheader', { name: /T2.*12/ })).toBeInTheDocument();
    expect(within(table).getAllByRole('columnheader')).toHaveLength(8);
    expect(screen.getByText('12/10 – 18/10/2026')).toBeInTheDocument();
    expect(api.requests.at(-1)!.get('from')).toBe('2026-10-12');
    expect(api.requests.at(-1)!.get('to')).toBe('2026-10-18');
    // By name; a holiday and the weekly day off are told in words.
    const names = within(table).getAllByRole('rowheader').map((header) => header.textContent);
    expect(names[0]).toContain('Cao Minh Trí');
    expect(within(table).getByRole('columnheader', { name: /T5.*15.*Lễ.*Ngày lễ: Ngày thử nghiệm/ })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: /CN.*18.*Ngày nghỉ hằng tuần/ })).toBeInTheDocument();
  });

  it('shows the shifts exactly as the API returns them, an assigned one apart from a default one', async () => {
    open();
    const an = await rowOf('Nguyễn Văn An');
    // Nguyễn Văn An: the default Hành chính on weekdays only.
    expect(within(an).getAllByRole('button')).toHaveLength(5);
    expect(within(an).getAllByRole('button')[0]).toHaveAccessibleName('Nguyễn Văn An, 12/10/2026: Hành chính, 08:00 – 17:00, ca mặc định của đơn vị');
    const hung = await rowOf('Lê Văn Hùng');
    expect(within(hung).getAllByRole('button')[0]).toHaveAccessibleName('Lê Văn Hùng, 12/10/2026: Ca sáng, 06:00 – 14:00, đã phân ca');
    expect(within(await rowOf('Vũ Thị Lan')).queryAllByRole('button')).toHaveLength(0);
  });

  it('shows a night shift on its start day with its end time on the next day', async () => {
    open();
    const tri = await rowOf('Cao Minh Trí');
    const cells = within(tri).getAllByRole('button');
    expect(cells).toHaveLength(3);
    expect(cells[0]).toHaveAccessibleName('Cao Minh Trí, 12/10/2026: Ca đêm, 22:00 – 06:00 hôm sau, đã phân ca');
    expect(within(cells[0]!).getByText('DEM')).toBeInTheDocument();
  });

  it('shows the whole month of the date in the URL, and moves by month', async () => {
    const user = userEvent.setup();
    const { api } = open('/shift-calendar?date=2026-10-14');
    const table = await grid();
    expect(within(table).getAllByRole('columnheader')).toHaveLength(32);
    expect(screen.getByText('Tháng 10/2026')).toBeInTheDocument();
    expect(api.requests.at(-1)!.get('from')).toBe('2026-10-01');
    expect(api.requests.at(-1)!.get('to')).toBe('2026-10-31');
    await user.click(screen.getByRole('button', { name: 'Tháng sau' }));
    expect(await screen.findByText('Tháng 11/2026')).toBeInTheDocument();
    await waitFor(() => expect(api.requests.at(-1)!.get('from')).toBe('2026-11-01'));
    expect(await screen.findByRole('button', { name: 'Hôm nay' })).toBeInTheDocument();
  });

  it('keeps the view, the day and the filters in the URL: a reload shows the same range', async () => {
    const { api, router } = open(`/shift-calendar?view=week&date=2026-10-14&shift=${HANH_CHINH.id}&person=${AN.id}`);
    await grid();
    const sent = api.requests.at(-1)!;
    expect([sent.get('from'), sent.get('to'), sent.get('shiftId'), sent.get('employeeId')]).toEqual(['2026-10-12', '2026-10-18', HANH_CHINH.id, AN.id]);
    expect(await screen.findByRole('button', { name: 'Xóa bộ lọc' })).toBeInTheDocument();
    expect(await screen.findByRole('combobox', { name: 'Ca' })).toHaveTextContent('HC · Hành chính');
    // The person is named from the answer.
    expect(await screen.findByText('Nguyễn Văn An · NV00021')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    await waitFor(() => expect(router.state.location.search).toBe('?view=week&date=2026-10-14'));
  });

  it('filters by shift from the menu', async () => {
    const user = userEvent.setup();
    const { api, router } = open();
    await grid();
    await user.click(await screen.findByRole('combobox', { name: 'Ca' }));
    await user.click(await screen.findByRole('option', { name: /DEM · Ca đêm/ }));
    await waitFor(() => expect(router.state.location.search).toContain(`shift=${CA_DEM.id}`));
    await waitFor(() => expect(api.requests.at(-1)!.get('shiftId')).toBe(CA_DEM.id));
    const table = await grid();
    await waitFor(() => expect(within(table).getAllByRole('rowheader')).toHaveLength(1));
    expect(within(table).getByRole('rowheader')).toHaveTextContent('Cao Minh Trí');
  });

  it('opens a day in a drawer with who works which shift, from a cell and from its header', async () => {
    const user = userEvent.setup();
    const { api } = open();
    const tri = await rowOf('Cao Minh Trí');
    await user.click(within(tri).getAllByRole('button')[0]!);
    const drawer = await screen.findByRole('dialog', { name: /Thứ Hai, 12\/10\/2026/ });
    const sent = api.requests.at(-1)!;
    expect([sent.get('from'), sent.get('to'), sent.get('page'), sent.get('size')]).toEqual(['2026-10-12', '2026-10-12', '0', '500']);
    expect(await within(drawer).findByText('3 người có ca')).toBeInTheDocument();
    for (const name of ['Ca sáng', 'Hành chính', 'Ca đêm']) expect(within(drawer).getByText(name)).toBeInTheDocument();
    expect(within(drawer).getByText('06:00 – 14:00')).toBeInTheDocument();
    expect(within(drawer).getByText('22:00 – 06:00 hôm sau')).toBeInTheDocument();
    expect(within(drawer).getByText('ca mặc định của đơn vị')).toBeInTheDocument();
    expect(within(drawer).getByText('Cao Minh Trí')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Thứ Hai/ })).not.toBeInTheDocument());
    await user.click(within(await grid()).getByRole('button', { name: /^T7.*17/ }));
    expect(await screen.findByText('Không ai có ca trong ngày này.')).toBeInTheDocument();
  });

  it('pages by person and keeps the page in the URL', async () => {
    const user = userEvent.setup();
    const { api, router } = open(WEEK, { extraPeople: 30 });
    await grid();
    expect(await screen.findByText('Hiển thị 1–25 trên 34 nhân viên')).toBeInTheDocument();
    expect(api.requests.at(-1)!.get('size')).toBe('25');
    await user.click(screen.getByRole('button', { name: /^Trang 2|^2$/ }));
    await waitFor(() => expect(router.state.location.search).toContain('page=2'));
    expect(await screen.findByText('Hiển thị 26–34 trên 34 nhân viên')).toBeInTheDocument();
    expect(api.requests.at(-1)!.get('page')).toBe('1');
  });

  it('at 390: an agenda of the days with a shift, with the people under each shift in full', async () => {
    asPhone();
    const { api } = open(WEEK, { holidays: { '2026-10-15': 'Ngày thử nghiệm' } });
    const list = await screen.findByRole('list', { name: '12/10 – 18/10/2026' });
    expect(api.requests.at(-1)!.get('size')).toBe('10');
    const days = within(list).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    expect(days).toEqual(['Thứ Hai, 12/10/2026', 'Thứ Ba, 13/10/2026', 'Thứ Tư, 14/10/2026', 'Thứ Năm, 15/10/2026', 'Thứ Sáu, 16/10/2026']);
    const monday = within(list).getAllByRole('listitem')[0]!;
    expect(within(monday).getByText('Cao Minh Trí')).toBeInTheDocument();
    expect(within(monday).getByText('22:00 – 06:00 hôm sau')).toBeInTheDocument();
    expect(within(list).getByText('Ngày lễ: Ngày thử nghiệm')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('says the Account may not view the calendar, and asks the server for nothing', async () => {
    const { api } = open(WEEK, {}, HR_ACCOUNT);
    expect(await screen.findByText('Bạn không có quyền xem lịch phân ca')).toBeInTheDocument();
    expect(api.requests).toEqual([]);
  });

  it('says so when the server refuses the calendar', async () => {
    open(WEEK, { fail: { status: 403, code: 'auth.forbidden' } });
    expect(await screen.findByText('Bạn không có quyền xem lịch phân ca')).toBeInTheDocument();
  });

  it('says the calendar did not load and loads it on retry', async () => {
    const user = userEvent.setup();
    open(WEEK, { fail: { status: 500, code: 'internal' } });
    expect(await screen.findByText('Không tải được lịch phân ca')).toBeInTheDocument();
    server.use(...shiftCalendarApi().handlers);
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await rowOf('Nguyễn Văn An')).toBeInTheDocument();
  });

  it('says so when the people shown have no shift in the period', async () => {
    open(`/shift-calendar?view=week&date=2026-10-14&person=${LAN.id}`);
    expect(await screen.findByText('Chưa có ca nào trong 12/10 – 18/10/2026 cho những người này.')).toBeInTheDocument();
    expect(within(await rowOf('Vũ Thị Lan')).queryAllByRole('button')).toHaveLength(0);
  });

  it('shows the empty state when the filters leave nobody', async () => {
    open('/shift-calendar?view=week&date=2026-10-14&person=00000000-0000-4000-e000-000000999999');
    expect(await screen.findByText('Không có nhân viên nào khớp bộ lọc. Bỏ bớt bộ lọc để xem thêm.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('writes the page in English', async () => {
    await i18n.changeLanguage('en');
    open();
    expect(await screen.findByRole('heading', { level: 1, name: 'Shift calendar' })).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: /^Shift calendar, / });
    expect(within(table).getByRole('columnheader', { name: /Sun.*18/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next week' })).toBeInTheDocument();
    await i18n.changeLanguage('vi');
  });
});
