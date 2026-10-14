import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import type { EmployeeProjectItem, EmployeeProjects } from '@/features/employee/profile-projects-api';
import i18n from '@/i18n';
import { problem } from '@/test/auth-handlers';
import { catalogApi } from '@/test/catalog-handlers';
import { employeeId } from '@/test/employee-fixtures';
import { employeeListApi } from '@/test/employee-handlers';
import { employeeProfileApi } from '@/test/employee-profile-handlers';
import { orgUnitsOk } from '@/test/org-unit-handlers';
import { settingsApi } from '@/test/resource-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const id = employeeId(7);
const base = [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW'] as Account['permissions'];
const HR: Account = { ...HR_ACCOUNT, permissions: [...base, 'PROJECT_VIEW', 'RESOURCE_VIEW'] };
/** Reads the profile but neither the projects nor the resources. */
const HR_NO_PROJECTS: Account = { ...HR_ACCOUNT, permissions: base };

const pm = { id: employeeId(3), code: 'NV00003', fullName: 'Hoàng Gia Bảo', orgUnitName: 'Phòng Phát triển phần mềm' };
const item = (over: Partial<EmployeeProjectItem>): EmployeeProjectItem => ({
  id: 'a1',
  projectId: 'p-031',
  projectCode: 'DA-031',
  projectName: 'Ứng dụng đặt lịch khám',
  client: 'Bệnh viện Đa khoa Tâm An',
  projectStatus: 'ACTIVE',
  pm,
  projectRole: { id: 'r1', code: 'DEV', name: 'Lập trình viên', active: true },
  percent: 60,
  startDate: '2026-09-01',
  endDate: '2026-12-31',
  status: 'RUNNING',
  ...over,
});
const data = (over: Partial<EmployeeProjects> = {}): EmployeeProjects => ({
  items: [
    item({ id: 'a-up', projectId: 'p-040', projectCode: 'DA-040', projectName: 'Cổng thanh toán', client: null, percent: 40, startDate: '2026-11-02', endDate: '2027-02-26', status: 'UPCOMING' }),
    item({}),
    item({ id: 'a-old', projectId: 'p-025', projectCode: 'DA-025', projectName: 'Triển khai ERP', percent: 100, startDate: '2026-01-05', endDate: '2026-08-31', status: 'ENDED', projectStatus: 'CLOSED' }),
  ],
  strip: {
    from: '2026-10-12',
    to: '2026-10-18',
    cells: Array.from({ length: 12 }, (_, i) => ({ from: `2026-10-${String(12 + i)}`, to: `2026-10-${String(18 + i)}`, peak: i === 1 ? 120 : 60 })),
    overloaded: true,
    firstOverload: {
      from: '2026-10-19',
      to: '2026-10-25',
      totalPercent: 120,
      overloaded: true,
      parts: [
        { projectId: 'p-029', projectCode: 'DA-029', projectName: 'Cổng bệnh nhân', percent: 60, thisProject: false },
        { projectId: 'p-031', projectCode: 'DA-031', projectName: 'Ứng dụng đặt lịch khám', percent: 60, thisProject: false },
      ],
    },
  },
  ...over,
});

/** `response`: the body, or a function that answers each request (a failure is a new Response every time). */
const open = (response: EmployeeProjects | (() => Response) = data(), account: Account = HR) => {
  const projects = http.get('*/api/employees/:employeeId/projects', () => (typeof response === 'function' ? response() : HttpResponse.json(response)));
  server.use(projects, employeeProfileApi().handler, employeeListApi().handler, ...catalogApi().handlers, orgUnitsOk(), ...settingsApi().handlers);
  return renderRoutes(routes, { session: account, path: `/employees/${id}?tab=projects` });
};
const history = async () => screen.findByRole('table', { name: /^Lịch sử tham gia dự án của / });

describe('Hồ sơ nhân viên: tab Dự án', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists the past, running and upcoming projects, newest first, with their status', async () => {
    open();
    const rows = within(await history()).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByText('Cổng thanh toán')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('DA-040 · Dự án nội bộ')).toBeInTheDocument();
    expect(within(rows[0]!).getByText(/^Bắt đầu 02\/11$/)).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Đang tham gia')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Lập trình viên')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('60%')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Hoàng Gia Bảo')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Đã kết thúc')).toBeInTheDocument();
  });

  it('draws 12 weeks with a number in each cell and says which projects add up in the overload', async () => {
    open();
    const strip = await screen.findByRole('list', { name: 'Tải phân bổ theo tuần' });
    expect(within(strip).getAllByRole('listitem')).toHaveLength(12);
    expect(within(strip).getAllByRole('img', { name: /quá tải/ })).toHaveLength(1);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Quá tải 120% từ 19/10 đến 25/10/2026');
    expect(alert).toHaveTextContent('DA-029 60% + DA-031 60%');
  });

  it('links the projects and the heatmap for someone who may open them', async () => {
    open();
    const table = await history();
    expect(within(table).getByRole('link', { name: 'Ứng dụng đặt lịch khám' })).toHaveAttribute('href', '/projects/p-031');
    expect(screen.getByRole('link', { name: 'Xem trên heatmap' })).toHaveAttribute('href', '/resources?tab=heatmap&q=NV00007');
  });

  it('shows no links to someone without PROJECT_VIEW and RESOURCE_VIEW, and still lists the history', async () => {
    open(data(), HR_NO_PROJECTS);
    const table = await history();
    expect(within(table).getByText('Ứng dụng đặt lịch khám')).toBeInTheDocument();
    expect(within(table).queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Xem trên heatmap' })).not.toBeInTheDocument();
  });

  it('has no alert when nobody is overloaded', async () => {
    const quiet = data();
    quiet.strip = { ...quiet.strip, overloaded: false, firstOverload: null, cells: quiet.strip.cells.map((cell) => ({ ...cell, peak: 60 })) };
    open(quiet);
    await history();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says the person is on no project, and still shows the strip', async () => {
    const none = data({ items: [] });
    none.strip = { ...none.strip, overloaded: false, firstOverload: null, cells: none.strip.cells.map((cell) => ({ ...cell, peak: 0 })) };
    open(none);
    expect(await screen.findByText('Chưa tham gia dự án nào')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: /^Lịch sử/ })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Tải phân bổ theo tuần' })).toBeInTheDocument();
  });

  it('follows the profile rules when the API refuses: a denied state, no table', async () => {
    open(() => problem(403, 'auth.forbidden'));
    expect(await screen.findByText('Bạn không xem được dự án của nhân viên này')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: /^Lịch sử/ })).not.toBeInTheDocument();
  });

  it('offers a retry when the projects cannot be loaded', async () => {
    const user = userEvent.setup();
    open(() => problem(500, 'error.unknown'));
    expect(await screen.findByText('Không tải được thông tin Dự án')).toBeInTheDocument();
    server.use(http.get('*/api/employees/:employeeId/projects', () => HttpResponse.json(data())));
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(screen.getByRole('table', { name: /^Lịch sử/ })).toBeInTheDocument());
  });

  it('colours the strip by the company thresholds, not the defaults', async () => {
    const strip = data();
    strip.strip = { ...strip.strip, overloaded: false, firstOverload: null, cells: strip.strip.cells.map((cell) => ({ ...cell, peak: 40 })) };
    open(strip);
    const cells = within(await screen.findByRole('list', { name: 'Tải phân bổ theo tuần' })).getAllByRole('img');
    // 40% is under the default bench threshold of 50%: the cell is the bench grey.
    expect(cells[0]!.className).toContain('bg-heat-bench');
  });
});
