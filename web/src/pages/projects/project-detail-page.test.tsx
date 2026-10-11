import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { orgUnitOptionsOk } from '@/test/org-unit-handlers';
import { DA031_CURRENT, DA031_ENDED, LAN_EMPLOYEE_ID, projectDetail, projectId } from '@/test/project-fixtures';
import { allocationsApi, projectDetailOk, projectDetailStatus, projectListApi } from '@/test/project-handlers';
import { EMPLOYEE_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const PM: Account = {
  ...HR_ACCOUNT,
  fullName: 'Vũ Thị Lan',
  roles: ['PROJECT_MANAGER', 'EMPLOYEE'],
  dataScope: 'SELF',
  permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'PROJECT_VIEW', 'PROJECT_EDIT'],
  employeeId: LAN_EMPLOYEE_ID,
};
const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'PROJECT_VIEW'] };
const EMPTY = { items: [], currentCount: 0, endedCount: 0 };

const open = (code = 'DA-031', session: Account = PM, allocations = allocationsApi(DA031_CURRENT, DA031_ENDED), project = projectDetail(code), search = '') => {
  server.use(projectDetailOk([project]), allocations.handler, projectListApi().handler, orgUnitOptionsOk());
  return { allocations, ...renderRoutes(routes, { session, path: `/projects/${project.id}${search}` }) };
};
const table = async () => {
  const found = await screen.findByRole('table', { name: 'Phân bổ của dự án Ứng dụng đặt lịch khám' });
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Đang tải phân bổ' })).not.toBeInTheDocument());
  return found;
};
const rowOf = async (name: string) => within(await table()).getByText(name).closest('tr')!;

describe('ProjectDetailPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('shows the breadcrumb, the title, the facts and the members of the artboard', async () => {
    open();
    expect(await screen.findByRole('heading', { level: 1, name: 'Ứng dụng đặt lịch khám' })).toBeInTheDocument();
    const crumbs = screen.getByRole('navigation', { name: 'Đường dẫn' });
    expect(within(crumbs).getByRole('link', { name: 'Dự án' })).toHaveAttribute('href', '/projects');
    expect(within(crumbs).getByText('DA-031')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('DA-031 · Bệnh viện Đa khoa Tâm An')).toBeInTheDocument();
    expect(screen.getByText('Đang chạy')).toBeInTheDocument();

    const facts = screen.getByRole('region', { name: 'Thông tin dự án' });
    expect(facts).toHaveTextContent('Vũ Thị Lan');
    expect(facts).toHaveTextContent('01/09/2026 – 31/03/20277 tháng');
    expect(facts).toHaveTextContent('2.400.000.000 ₫');
    expect(facts).toHaveTextContent('6 đang làm1 sắp vào');

    expect(within(await table()).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Nhân viên', 'Vai trò dự án', 'Phân bổ', 'Khoảng ngày', 'Tải phân bổ cao nhất',
    ]);
    const tri = await rowOf('Cao Minh Trí');
    expect(tri).toHaveTextContent('Lập trình viên');
    expect(tri).toHaveTextContent('60%');
    expect(tri).toHaveTextContent('14/10/2026 – 31/12/2026');
    expect(within(tri).getByRole('img', { name: 'Tải phân bổ 120%, quá tải' })).toBeInTheDocument();
    expect(tri).toHaveTextContent('14/10 – 31/10/2026');
    expect(tri).toHaveTextContent('Bắt đầu 14/10');
    expect(within(await rowOf('Dương Thị Hạnh')).getByRole('img', { name: 'Tải phân bổ 40%' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Chú giải Tải phân bổ' })).toHaveTextContent('Dưới 100%');
  });

  it('names who is overloaded, when, and which project overlaps', async () => {
    open();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Cao Minh Trí quá tải 120% từ 14/10 đến 31/10/2026');
    expect(alert).toHaveTextContent('Phân bổ ở dự án này (60%) trùng với Cổng khách hàng bảo hiểm (60%).');
  });

  it('shows the tab counts and the ended allocations under their tab, in the URL', async () => {
    const { allocations, router } = open();
    const current = await screen.findByRole('tab', { name: /Thành viên/ });
    await waitFor(() => expect(current).toHaveTextContent('Thành viên7'));
    expect(screen.getByRole('tab', { name: /Phân bổ đã kết thúc/ })).toHaveTextContent('Phân bổ đã kết thúc2');
    await userEvent.click(screen.getByRole('tab', { name: /Phân bổ đã kết thúc/ }));
    expect(await screen.findByText('Hoàng Gia Huy')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?tab=ended');
    expect(allocations.requests).toContain('ended=true');
  });

  it('tells a PM who opens another PM\'s project that they can only view it; HR sees no notice', async () => {
    const hiens = projectDetail('DA-027', { canEdit: false });
    open('DA-027', PM, allocationsApi(EMPTY, EMPTY), hiens);
    expect(await screen.findByText('Bạn chỉ xem được dự án này')).toBeInTheDocument();
    expect(screen.getByText(/Chỉ Lương Văn Hiển, PM của dự án/)).toBeInTheDocument();
  });

  it('HR reading a project sees no read-only notice', async () => {
    open('DA-031', HR, allocationsApi(DA031_CURRENT, DA031_ENDED), projectDetail('DA-031', { canEdit: false }));
    await table();
    expect(screen.queryByText('Bạn chỉ xem được dự án này')).not.toBeInTheDocument();
  });

  it('a closed project says so; a project without members says how to add them', async () => {
    open('DA-018', HR, allocationsApi(EMPTY, EMPTY), projectDetail('DA-018'));
    expect(await screen.findByText('Dự án đã đóng')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Dự án chưa có thành viên' })).toBeInTheDocument();
  });

  it('offers a retry when the members cannot be loaded', async () => {
    open('DA-031', PM, allocationsApi(DA031_CURRENT, DA031_ENDED, { fail: true }));
    expect(await screen.findByRole('heading', { name: 'Không tải được thành viên của dự án' })).toBeInTheDocument();
    server.use(allocationsApi(DA031_CURRENT, DA031_ENDED).handler);
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await rowOf('Cao Minh Trí')).toBeInTheDocument();
  });

  it('an unknown project, a malformed id, a refusal and a missing permission each get their state', async () => {
    server.use(projectDetailStatus(404, 'project.not_found'));
    const first = renderRoutes(routes, { session: PM, path: `/projects/${projectId('DA-099')}` });
    expect(await screen.findByRole('heading', { name: 'Không tìm thấy dự án' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về danh sách dự án' })).toHaveAttribute('href', '/projects');
    first.unmount();

    const second = renderRoutes(routes, { session: PM, path: '/projects/not-an-id' });
    expect(await screen.findByRole('heading', { name: 'Không tìm thấy dự án' })).toBeInTheDocument();
    second.unmount();

    server.use(projectDetailStatus(403, 'auth.forbidden'));
    const third = renderRoutes(routes, { session: PM, path: `/projects/${projectId('DA-031')}` });
    expect(await screen.findByRole('heading', { name: 'Bạn không xem được danh sách dự án' })).toBeInTheDocument();
    third.unmount();

    renderRoutes(routes, { session: EMPLOYEE_ACCOUNT, path: `/projects/${projectId('DA-031')}` });
    expect(await screen.findByRole('heading', { name: 'Bạn không xem được danh sách dự án' })).toBeInTheDocument();
  });

  it('a row of the project list opens the project', async () => {
    server.use(projectDetailOk([projectDetail('DA-031')]), allocationsApi(DA031_CURRENT, DA031_ENDED).handler, projectListApi().handler, orgUnitOptionsOk());
    const { router } = renderRoutes(routes, { session: PM, path: '/projects' });
    await userEvent.click(await screen.findByRole('link', { name: 'Ứng dụng đặt lịch khám' }));
    expect(router.state.location.pathname).toBe(`/projects/${projectId('DA-031')}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Ứng dụng đặt lịch khám' })).toBeInTheDocument();
  });
});
