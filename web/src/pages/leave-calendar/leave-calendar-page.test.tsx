import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { companyToday } from '@/lib/company-time';
import { AN_ID } from '@/test/leave-fixtures';
import { leaveApi } from '@/test/leave-handlers';
import { leaveCalendarApi, monthDay, type LeaveCalendarOptions } from '@/test/leave-calendar-handlers';
import { orgUnitOptionsOk } from '@/test/org-unit-handlers';
import { projectListApi } from '@/test/project-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

/** HR who may list people and projects: both filters show. */
const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'PROJECT_VIEW'] };
const EMPLOYEE: Account = { ...HR_ACCOUNT, roles: ['EMPLOYEE'], dataScope: 'SELF', permissions: ['COMPANY_VIEW'], employeeId: AN_ID };

const asPhone = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)', addEventListener: () => {}, removeEventListener: () => {} }));

const open = (options: LeaveCalendarOptions = {}, session: Account = HR, path = '/leave-calendar') => {
  const calendar = leaveCalendarApi(options);
  server.use(calendar.handler, orgUnitOptionsOk(), projectListApi().handler, ...leaveApi().handlers);
  return { calendar, ...renderRoutes(routes, { session, path }) };
};

const monthName = () => `Tháng ${format(companyToday(), 'M')}/${format(companyToday(), 'yyyy')}`;

describe('LeaveCalendarPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('draws the month with the people off, the half days named and the holiday marked', async () => {
    open();
    expect(await screen.findByRole('heading', { name: 'Lịch nghỉ phép' })).toBeInTheDocument();
    const grid = await screen.findByRole('table', { name: `Lịch nghỉ phép ${monthName()}` });
    expect(within(grid).getAllByRole('columnheader')).toHaveLength(7);
    expect(await within(grid).findAllByText(/Nguyễn Văn An/)).toHaveLength(2);
    expect(within(grid).getByText(/Cao Minh Trí/)).toHaveTextContent('Nghỉ ốm · sáng');
    expect(within(grid).getByText(/Lê Văn Hùng/)).toHaveTextContent('Việc riêng có lương');
    expect(within(grid).queryByText(/Vũ Thị Lan/)).not.toBeInTheDocument();
    expect(within(grid).getByText('Lễ: Giỗ Tổ Hùng Vương')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Chú giải' })).toBeInTheDocument();
  });

  it('tells waiting leave from approved leave in words, not only by look', async () => {
    open();
    const grid = await screen.findByRole('table');
    const tri = (await within(grid).findByText(/Cao Minh Trí/)).closest('li')!;
    expect(within(tri).getByText('Chờ duyệt')).toHaveClass('sr-only');
    const an = within(grid).getAllByText(/Nguyễn Văn An/)[0]!.closest('li')!;
    expect(within(an).getByText('Đã duyệt')).toHaveClass('sr-only');
  });

  it('shows three people a day and says how many more; the day opens everyone in the drawer', async () => {
    const user = userEvent.setup();
    open();
    const grid = await screen.findByRole('table');
    expect(await within(grid).findByText('+1 người nữa')).toBeInTheDocument();
    await user.click(within(grid).getByRole('button', { name: new RegExp(`${monthDay(8).slice(8)}/${monthDay(8).slice(5, 7)}/\\d{4}, 4 người nghỉ`) }));
    const drawer = await screen.findByRole('dialog', { name: /01|0[2-9]|[12]\d|3[01]\/\d{2}\/\d{4}/ });
    expect(within(drawer).getAllByRole('listitem')).toHaveLength(4);
    expect(within(drawer).getByText('Lê Văn Hùng')).toBeInTheDocument();
    expect(within(drawer).getByText('Việc riêng có lương · cả ngày · Nhóm Web')).toBeInTheDocument();
    expect(within(drawer).getByText('Phép năm · buổi chiều · Phòng Phát triển phần mềm')).toBeInTheDocument();
    expect(within(drawer).getByText('Chờ duyệt')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('steps to the next month and back to today, asking the API for the padded weeks', async () => {
    const user = userEvent.setup();
    const { calendar } = open();
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Tháng sau' }));
    await waitFor(() => expect(calendar.queries.length).toBeGreaterThan(1));
    const next = new URLSearchParams(calendar.queries.at(-1));
    const first = new Date(`${next.get('from')}T00:00:00`);
    const days = (new Date(`${next.get('to')}T00:00:00`).getTime() - first.getTime()) / 86_400_000 + 1;
    expect(first.getDay()).toBe(1);
    expect(days % 7).toBe(0);
    expect(days).toBeLessThanOrEqual(42);
    await user.click(await screen.findByRole('button', { name: 'Hôm nay' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Hôm nay' })).not.toBeInTheDocument());
    expect(await screen.findByText(monthName())).toBeInTheDocument();
  });

  it('switches to the week view, which shows everyone and keeps the choice in the URL', async () => {
    const user = userEvent.setup();
    const { router } = open({}, HR, `/leave-calendar?date=${monthDay(8)}`);
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Tuần' }));
    expect(router.state.location.search).toContain('view=week');
    const grid = await screen.findByRole('table', { name: /Lịch nghỉ phép \d{2}\/\d{2} – \d{2}\/\d{2}\/\d{4}/ });
    await waitFor(() => expect(within(grid).queryByText(/người nữa/)).not.toBeInTheDocument());
    expect(await within(grid).findByText(/Lê Văn Hùng/)).toBeInTheDocument();
  });

  it('filters by project and by unit, and says when the filter leaves nobody', async () => {
    const user = userEvent.setup();
    const { calendar } = open();
    await screen.findByRole('table');
    await user.click(screen.getByRole('combobox', { name: 'Dự án' }));
    await user.click(await screen.findByRole('option', { name: /DA-031/ }));
    await waitFor(() => expect(calendar.queries.at(-1)).toContain('projectId='));
    const grid = await screen.findByRole('table');
    await waitFor(() => expect(within(grid).queryByText(/Lê Văn Hùng/)).not.toBeInTheDocument());
    expect(within(grid).getAllByText(/Nguyễn Văn An/)).toHaveLength(2);
  });

  it('has no unit or project filter for an Account that may not list them', async () => {
    open({}, EMPLOYEE);
    await screen.findByRole('table');
    expect(screen.queryByRole('combobox', { name: 'Dự án' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Phòng ban/ })).not.toBeInTheDocument();
  });

  it('says in words when nobody is off in the period', async () => {
    open({ entries: [] });
    expect(await screen.findByText(`Không ai nghỉ trong ${monthName()}`)).toBeInTheDocument();
    expect(screen.getByText('Đơn đang chờ duyệt và đơn đã duyệt đều hiện ở đây.')).toBeInTheDocument();
  });

  it('offers to retry when the calendar does not load', async () => {
    const user = userEvent.setup();
    open({ fail: true });
    expect(await screen.findByText('Không tải được lịch nghỉ phép')).toBeInTheDocument();
    server.use(leaveCalendarApi().handler);
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('shows the denied state when the API refuses the calendar', async () => {
    open({ deny: true });
    expect(await screen.findByText('Bạn không xem được lịch nghỉ phép')).toBeInTheDocument();
  });

  it('is an agenda of the days with leave at 390, the people in full', async () => {
    asPhone();
    open();
    const agenda = await screen.findByRole('list', { name: monthName() });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const days = within(agenda).getAllByRole('heading', { level: 3 });
    expect(days).toHaveLength(3);
    expect(within(agenda).getByText('Lễ: Giỗ Tổ Hùng Vương')).toBeInTheDocument();
    expect(within(agenda).getByText('Nghỉ ốm · buổi sáng · Nhóm Web')).toBeInTheDocument();
    expect(within(agenda).getAllByText('Chờ duyệt')).toHaveLength(1);
  });

  it('is linked from Nghỉ phép', async () => {
    const user = userEvent.setup();
    open({}, EMPLOYEE, '/leave');
    await user.click(await screen.findByRole('link', { name: 'Lịch nghỉ phép' }));
    expect(await screen.findByRole('heading', { name: 'Lịch nghỉ phép' })).toBeInTheDocument();
  });
});
