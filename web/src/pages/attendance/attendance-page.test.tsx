import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { dailyApi, dailyData, type DailyApi } from '@/test/attendance-daily-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'ATTENDANCE_VIEW', 'ATTENDANCE_IMPORT'] };
const EMPLOYEE: Account = { ...HR_ACCOUNT, roles: ['EMPLOYEE'], dataScope: 'SELF', permissions: ['COMPANY_VIEW'], employeeId: '00000000-0000-4000-b000-000000000031' };
const WEEK = '/attendance?from=2026-10-12&to=2026-10-18';

const open = (api: DailyApi = dailyApi(), { session = HR, path = WEEK }: { session?: Account; path?: string } = {}) => {
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session, path }) };
};
const table = () => screen.findByRole('table', { name: /^Công theo ngày từ/ });

describe('AttendancePage: Công theo ngày', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('lists a group per person with the shift, In, Out, worked hours and marks; a night shift sits on its start day', async () => {
    const { api } = open();
    const list = await table();
    expect(await screen.findByText(/Log quẹt thẻ có đến 17\/10\/2026 06:03/)).toBeInTheDocument();
    expect(screen.getByText(/nhập lần cuối 21\/10\/2026 08:42/)).toBeInTheDocument();
    const rows = within(list).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Lưu Đức Mạnh');
    expect(rows[1]).toHaveTextContent('4 ngày đi làm · 1 muộn · 1 về sớm · 1 vắng');
    // T3 13/10 is the night shift: In that evening, Out on the next day with its date, 8:00 worked, a duplicate noted.
    expect(rows[2]).toHaveTextContent('T3 13/10');
    expect(rows[2]).toHaveTextContent('Ca đêm22:00 – 06:00 · qua đêm');
    expect(rows[2]).toHaveTextContent('21:58');
    expect(rows[2]).toHaveTextContent('06:02ngày 14/10');
    expect(rows[2]).toHaveTextContent('8:00');
    expect(rows[2]).toHaveTextContent('Quẹt trùng');
    expect(rows[3]).toHaveTextContent('Muộn 31 phút');
    expect(rows[4]).toHaveTextContent('Vắng');
    expect(list).toHaveTextContent('Thiếu quẹt ra');
    expect(list).toHaveTextContent('Nghỉ phép');
    expect(list).toHaveTextContent('Chưa có log');
    expect(screen.getByText('1–10 trên 12 nhân viên')).toBeInTheDocument();
    expect(api.queries[0]!.get('from')).toBe('2026-10-12');
    expect(api.queries[0]!.get('to')).toBe('2026-10-18');
    expect(api.queries[0]!.get('sort')).toBe('abnormal');
    expect(api.queries[0]!.has('abnormalOnly')).toBe(false);
  });

  it('keeps "Chỉ ngày bất thường" in the URL and asks the API for it', async () => {
    const { api, router } = open();
    await table();
    await userEvent.click(screen.getByRole('switch', { name: 'Chỉ ngày bất thường' }));
    await waitFor(() => expect(api.queries.at(-1)!.get('abnormalOnly')).toBe('true'));
    expect(router.state.location.search).toContain('abnormal=1');
  });

  it('shows the same list after a reload of a filtered URL', async () => {
    const { api } = open(dailyApi(), { path: `${WEEK}&abnormal=1&sort=name&q=tri&page=2` });
    await table();
    expect(screen.getByRole('switch', { name: 'Chỉ ngày bất thường' })).toBeChecked();
    expect(api.queries[0]!.get('abnormalOnly')).toBe('true');
    expect(api.queries[0]!.get('sort')).toBe('name');
    expect(api.queries[0]!.get('q')).toBe('tri');
    expect(api.queries[0]!.get('page')).toBe('1');
  });

  it('moves the period by its length with the arrows and goes back to this week', async () => {
    const { api, router } = open();
    await table();
    await userEvent.click(screen.getByRole('button', { name: 'Kỳ sau' }));
    await waitFor(() => expect(api.queries.at(-1)!.get('from')).toBe('2026-10-19'));
    expect(router.state.location.search).toContain('from=2026-10-19');
    await userEvent.click(screen.getByRole('button', { name: 'Tuần này' }));
    await waitFor(() => expect(router.state.location.search).not.toContain('from='));
  });

  it('opens a day in the drawer with the raw punches and how each was used', async () => {
    const { api } = open();
    await table();
    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết ngày T3 13/10 của Lưu Đức Mạnh' }));
    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByText('Lần quẹt 4')).toBeInTheDocument();
    expect(within(drawer).getByText('Ngoài khung ca')).toBeInTheDocument();
    expect(within(drawer).getByText('Trùng, gộp vào lần sau')).toBeInTheDocument();
    expect(within(drawer).getByText('14:05:12')).toBeInTheDocument();
    expect(within(drawer).getByText(/Nguồn: log-12-18-10.csv, nhập 21\/10\/2026 08:42 bởi Trần Thị Mai/)).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: 'Xem hồ sơ' })).toHaveAttribute('href', '/employees/00000000-0000-4000-b000-000000000034');
    expect(api.days).toEqual(['00000000-0000-4000-b000-000000000034/2026-10-13']);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('says the log does not cover the whole period', async () => {
    open();
    expect(await screen.findByText('Log chưa phủ hết kỳ đang xem')).toBeInTheDocument();
  });

  it('offers the import when there is no log at all, to HR only', async () => {
    open(dailyApi({ list: dailyData({ rows: [], total: 0, coveredUntil: null, lastImportAt: null }) }));
    expect(await screen.findByText('Chưa có lần quẹt nào')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Nhập log quẹt thẻ' }).length).toBeGreaterThan(0);
  });

  it('says there is no abnormal day, with a way back to all days', async () => {
    const { api } = open(dailyApi({ list: dailyData({ rows: [], total: 0 }) }), { path: `${WEEK}&abnormal=1` });
    expect(await screen.findByText('Không có ngày bất thường từ 12/10 – 18/10/2026')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xem tất cả các ngày' }));
    await waitFor(() => expect(api.queries.at(-1)!.has('abnormalOnly')).toBe(false));
  });

  it('says nothing matched a search and clears it', async () => {
    const { api } = open(dailyApi({ list: dailyData({ rows: [], total: 0 }) }), { path: `${WEEK}&q=hoang%20anh` });
    expect(await screen.findByText('Không tìm thấy “hoang anh”')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xóa tìm kiếm' }));
    await waitFor(() => expect(api.queries.at(-1)!.has('q')).toBe(false));
  });

  it('asks for a shorter period instead of calling the API when the range is over 62 days', async () => {
    const { api } = open(dailyApi(), { path: '/attendance?from=2026-08-01&to=2026-10-22' });
    expect(await screen.findByText('Kỳ dài hơn 62 ngày')).toBeInTheDocument();
    expect(screen.getByText('Chọn tối đa 62 ngày. Kỳ này là 83 ngày.')).toBeInTheDocument();
    expect(api.queries).toEqual([]);
  });

  it('shows an error with a retry', async () => {
    const api = dailyApi({ list: { status: 500, code: 'server.error' } });
    open(api);
    expect(await screen.findByText('Chưa tải được công theo ngày')).toBeInTheDocument();
    server.use(...dailyApi().handlers);
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await table();
  });

  it('shows the denied state when the API answers 403', async () => {
    open(dailyApi({ list: { status: 403, code: 'auth.forbidden' } }));
    expect(await screen.findByText('Bạn không có quyền xem công theo ngày')).toBeInTheDocument();
  });

  it('shows an Employee only their own days, without the filters', async () => {
    open(dailyApi(), { session: EMPLOYEE });
    await table();
    expect(screen.getByText('Chỉ hiện công của bạn')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nhập log quẹt thẻ' })).not.toBeInTheDocument();
  });

  it('explains an Account that is not linked to an Employee', async () => {
    const { api } = open(dailyApi(), { session: { ...EMPLOYEE, employeeId: null } });
    expect(await screen.findByText('Tài khoản chưa gắn với nhân viên')).toBeInTheDocument();
    expect(api.queries).toEqual([]);
  });

  it('reads in English', async () => {
    await i18n.changeLanguage('en');
    open();
    expect(await screen.findByRole('heading', { name: 'Daily attendance' })).toBeInTheDocument();
    const list = await screen.findByRole('table', { name: /^Daily attendance for/ });
    expect(list).toHaveTextContent('4 days worked · 1 late · 1 early leave · 1 absent');
    expect(list).toHaveTextContent('Late 31 min');
  });

  it('turns into a list with a "Lọc" dialog at 390', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)', addEventListener: () => {}, removeEventListener: () => {} }));
    try {
      const { api } = open();
      const agenda = await screen.findByRole('list', { name: /^Công theo ngày từ/ });
      expect(within(agenda).getAllByText('T3 13/10')).toHaveLength(2);
      expect(within(agenda).getByText('Ca đêm · 21:58 → 06:02 · 8:00')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Lọc' }));
      const dialog = await screen.findByRole('dialog', { name: 'Lọc' });
      await userEvent.type(within(dialog).getByRole('textbox', { name: 'Tìm nhân viên' }), 'tri');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Áp dụng' }));
      await waitFor(() => expect(api.queries.at(-1)!.get('q')).toBe('tri'));
      expect(screen.getByRole('button', { name: /^Lọc/ })).toHaveTextContent('(1)');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
