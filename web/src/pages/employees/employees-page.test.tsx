import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { catalogApi } from '@/test/catalog-handlers';
import { EMPLOYEES, employeeId } from '@/test/employee-fixtures';
import { employeeListApi, employeesDenied, employeesFail } from '@/test/employee-handlers';
import { orgUnitsOk } from '@/test/org-unit-handlers';
import { unitId } from '@/test/org-unit-fixtures';
import { ADMIN_ACCOUNT, EMPLOYEE_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

/** HR as the backend grants it from HRM-06 on. */
const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'EMPLOYEE_EDIT', 'EMPLOYEE_SENSITIVE_VIEW'] };
const ACCOUNTANT: Account = { ...HR_ACCOUNT, roles: ['ACCOUNTANT'], permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'EMPLOYEE_VIEW', 'EMPLOYEE_SENSITIVE_VIEW'] };
const LINE_MANAGER: Account = { ...HR_ACCOUNT, roles: ['LINE_MANAGER'], dataScope: 'ORG_UNIT', orgUnitIds: [unitId('WEB')], permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'EMPLOYEE_VIEW'] };

const open = (search = '', session: Account = HR, list = employeeListApi()) => {
  server.use(list.handler, ...catalogApi().handlers, orgUnitsOk());
  return { list, ...renderRoutes(routes, { session, path: `/employees${search}` }) };
};
/** The table once its rows are in (while loading it is a busy Skeleton table). */
const table = async () => {
  const found = await screen.findByRole('table', { name: 'Danh sách nhân viên' });
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Đang tải danh sách nhân viên' })).not.toBeInTheDocument());
  return found;
};
const bodyRows = async () => within(await table()).getAllByRole('row').slice(1);
const rowOf = async (name: string) => within(await table()).getByRole('link', { name }).closest('tr')!;
const cells = (row: HTMLElement) => within(row).getAllByRole('cell');

describe('EmployeesPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('lists the current Employees by code, 20 a page, with the columns of the artboard', async () => {
    const { list } = open('', HR, employeeListApi(EMPLOYEES, { delayMs: 50 }));
    expect(screen.getByRole('heading', { level: 1, name: 'Nhân viên' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).getByRole('link', { name: 'Nhân viên' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('status', { name: 'Đang tải danh sách nhân viên' })).toHaveAttribute('aria-busy', 'true');

    expect(await bodyRows()).toHaveLength(20);
    expect(list.requests).toEqual(['page=0&size=20&status=PROBATION%2COFFICIAL']);
    expect(within(await table()).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Nhân viên', 'Đơn vị', 'Chức danh', 'Quản lý trực tiếp', 'Ngày vào làm', 'Trạng thái',
    ]);
    expect(screen.getByText('Hiển thị 1–20 trên 24 nhân viên')).toBeInTheDocument();

    // The director sits directly under the company and has no line manager.
    const director = await rowOf('Phạm Quốc Bảo');
    expect(within(director).getByRole('link', { name: 'Phạm Quốc Bảo' })).toHaveAttribute('href', `/employees/${employeeId(1)}`);
    expect(cells(director)[0]).toHaveTextContent('NV00001');
    expect(cells(director).slice(1).map((cell) => cell.textContent)).toEqual(['Trực thuộc công ty', 'Giám đốc', 'Chưa có', '02/01/2018', 'Chính thức']);
    // A team member: the parent unit under the unit, and the effective line manager.
    const member = await rowOf('Lê Văn Hùng');
    expect(within(cells(member)[1]!).getByText('Nhóm Web')).toBeInTheDocument();
    expect(within(cells(member)[1]!).getByText('Phòng Phát triển phần mềm')).toBeInTheDocument();
    expect(cells(member)[3]).toHaveTextContent('Nguyễn Văn Khoa');

    expect(screen.getByRole('link', { name: 'Thêm nhân viên' })).toHaveAttribute('href', '/employees/new');
    expect(screen.queryByRole('button', { name: 'Xóa bộ lọc' })).not.toBeInTheDocument();
  });

  it('opens the profile from anywhere on the row, and "Thêm nhân viên" opens the create page', async () => {
    const { router } = open();
    await userEvent.click(cells(await rowOf('Trần Thị Mai'))[2]!);
    expect(router.state.location.pathname).toBe(`/employees/${employeeId(3)}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Hồ sơ nhân viên' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Về danh sách nhân viên' }));
    await userEvent.click(await screen.findByRole('link', { name: 'Thêm nhân viên' }));
    expect(router.state.location.pathname).toBe('/employees/new');
    expect(screen.getByRole('heading', { level: 1, name: 'Thêm nhân viên' })).toBeInTheDocument();
  });

  it('shows the empty company with "Thêm nhân viên" to HR, and says who adds them to a reader', async () => {
    const view = open('', HR, employeeListApi([]));
    expect(await screen.findByRole('heading', { name: 'Chưa có nhân viên nào' })).toBeInTheDocument();
    expect(screen.getByText('Thêm hồ sơ đầu tiên. Mã nhân viên được cấp tự động, bắt đầu từ NV00001.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Thêm nhân viên' })).toHaveLength(2);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    view.unmount();

    open('', ACCOUNTANT, employeeListApi([]));
    expect(await screen.findByText('Khi HR thêm hồ sơ, nhân viên sẽ hiện ở đây.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Thêm nhân viên' })).not.toBeInTheDocument();
  });

  it('offers a retry when the list cannot be loaded', async () => {
    server.use(employeesFail(), ...catalogApi().handlers, orgUnitsOk());
    renderRoutes(routes, { session: HR, path: '/employees' });
    expect(await screen.findByRole('heading', { name: 'Không tải được danh sách nhân viên' })).toBeInTheDocument();
    server.use(employeeListApi().handler);
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await bodyRows()).toHaveLength(20);
  });

  it('without EMPLOYEE_VIEW: no nav item, no request, and the no-permission state with the own profile', async () => {
    const own = employeeId(22);
    const { list } = open('', { ...EMPLOYEE_ACCOUNT, employeeId: own });
    expect(screen.getByRole('heading', { name: 'Bạn không xem được danh sách nhân viên' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hồ sơ của tôi' })).toHaveAttribute('href', `/employees/${own}`);
    expect(within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).queryByRole('link', { name: 'Nhân viên' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Thêm nhân viên' })).not.toBeInTheDocument();
    expect(list.requests).toEqual([]);
  });

  it('shows the no-permission state when the API refuses the list', async () => {
    server.use(employeesDenied(), ...catalogApi().handlers, orgUnitsOk());
    renderRoutes(routes, { session: ADMIN_ACCOUNT, path: '/employees' });
    expect(await screen.findByRole('heading', { name: 'Bạn không xem được danh sách nhân viên' })).toBeInTheDocument();
    // An Account with no Employee has no own profile to offer.
    expect(screen.queryByRole('link', { name: 'Hồ sơ của tôi' })).not.toBeInTheDocument();
  });

  it('tells a Line manager which units the list covers, naming them when the org tree is readable', async () => {
    const view = open('', LINE_MANAGER);
    await table();
    expect(screen.getByText('Bạn xem nhân viên của các đơn vị bạn phụ trách')).toBeInTheDocument();
    expect(screen.getByText('Danh sách gồm các đơn vị bạn là Trưởng đơn vị và các đơn vị bên dưới.')).toBeInTheDocument();
    // Without ORG_VIEW there is no unit filter, and without EMPLOYEE_EDIT no "Thêm nhân viên".
    expect(screen.queryByRole('button', { name: /^Đơn vị tổ chức/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Thêm nhân viên' })).not.toBeInTheDocument();
    view.unmount();

    open('', { ...LINE_MANAGER, permissions: [...LINE_MANAGER.permissions, 'ORG_VIEW'] });
    expect(await screen.findByText('Bạn xem nhân viên của Nhóm Web')).toBeInTheDocument();
  });

  it('an Accountant reads the list without the unit filter and without "Thêm nhân viên"', async () => {
    open('', ACCOUNTANT);
    expect(await bodyRows()).toHaveLength(20);
    expect(screen.getByRole('combobox', { name: 'Chức danh' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Đơn vị tổ chức/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Thêm nhân viên' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Bạn xem nhân viên của/)).not.toBeInTheDocument();
  });

  it('the create page needs EMPLOYEE_EDIT', async () => {
    server.use(...catalogApi().handlers);
    renderRoutes(routes, { session: ACCOUNTANT, path: '/employees/new' });
    expect(screen.getByRole('heading', { name: 'Bạn không thêm được nhân viên' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về danh sách nhân viên' })).toHaveAttribute('href', '/employees');
  });
});
