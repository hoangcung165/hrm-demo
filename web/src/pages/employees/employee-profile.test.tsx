import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { approvalApi } from '@/test/approval-handlers';
import { catalogApi } from '@/test/catalog-handlers';
import { employeeId } from '@/test/employee-fixtures';
import { employeeListApi } from '@/test/employee-handlers';
import { employeeProfileApi, employeeProfileFail, type EmployeeProfileApiOptions } from '@/test/employee-profile-handlers';
import { orgUnitsOk } from '@/test/org-unit-handlers';
import { EMPLOYEE_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'EMPLOYEE_EDIT', 'EMPLOYEE_SENSITIVE_VIEW'] };
const DIRECTOR: Account = { ...HR_ACCOUNT, roles: ['DIRECTOR'], permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'ORG_VIEW', 'EMPLOYEE_VIEW'] };

const open = (path: string, session: Account = HR, options: EmployeeProfileApiOptions = {}) => {
  const profiles = employeeProfileApi(options);
  server.use(profiles.handler, employeeListApi().handler, ...catalogApi().handlers, orgUnitsOk());
  return { profiles, ...renderRoutes(routes, { session, path }) };
};
const header = (name: string) => screen.findByRole('region', { name });
const card = (name: string) => screen.findByRole('region', { name });
/** The value cell next to a label in a detail list. */
const valueOf = (scope: HTMLElement, label: string) => within(scope).getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement;

describe('EmployeeProfilePage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('opens from the list with the header and its facts, and "Nhân viên" goes back to the filtered list', async () => {
    const { router } = open('/employees?status=ALL');
    await userEvent.click(await screen.findByRole('link', { name: 'Lê Văn Hùng' }));
    expect(router.state.location.pathname).toBe(`/employees/${employeeId(7)}`);
    const head = await header('Lê Văn Hùng');
    expect(within(head).getByRole('heading', { level: 1, name: 'Lê Văn Hùng' })).toBeInTheDocument();
    expect(within(head).getByText('Chính thức')).toBeInTheDocument();
    expect(within(head).getByText('NV00007 · Nhân viên · Nhóm Web')).toBeInTheDocument();
    expect(valueOf(head, 'Quản lý trực tiếp')).toHaveTextContent('Nguyễn Văn Khoa');
    expect(valueOf(head, 'Quản lý trực tiếp')).toHaveTextContent('Theo Trưởng đơn vị');
    expect(valueOf(head, 'Ngày vào làm')).toHaveTextContent('01/08/2018');
    expect(valueOf(head, 'Email')).toHaveTextContent('nv00007@mail.vn');
    expect(valueOf(head, 'Số điện thoại')).toHaveTextContent('0912 345 678');
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Cá nhân', 'Công việc', 'Hợp đồng', 'Lương và phụ cấp', 'Bảo hiểm', 'Ngân hàng', 'Người phụ thuộc', 'Kỹ năng', 'Dự án', 'Tài liệu',
    ]);
    expect(screen.getByRole('tab', { name: 'Cá nhân' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Cập nhật lần cuối 02/09/2026')).toBeInTheDocument();

    // A tab change keeps the way back to the list as it was.
    await userEvent.click(screen.getByRole('tab', { name: 'Công việc' }));
    await userEvent.click(within(screen.getByRole('main')).getByRole('link', { name: 'Nhân viên' }));
    expect(router.state.location.pathname).toBe('/employees');
    expect(router.state.location.search).toBe('?status=ALL');
  });

  it('shows the personal details with the age and the emergency contact, and "Sửa" for HR', async () => {
    open(`/employees/${employeeId(3)}`);
    const personal = await card('Thông tin cá nhân');
    expect(valueOf(personal, 'Ngày sinh')).toHaveTextContent(/^24\/05\/1994\d+ tuổi$/);
    expect(valueOf(personal, 'Giới tính')).toHaveTextContent('Nữ');
    expect(valueOf(personal, 'Địa chỉ')).toHaveTextContent('12 Nguyễn Hữu Thọ');
    expect(within(personal).getByRole('heading', { name: 'Liên hệ khẩn cấp' })).toBeInTheDocument();
    expect(within(personal).getByText('Nguyễn Văn Lực')).toBeInTheDocument();
    expect(within(personal).getByText('0983 112 456')).toBeInTheDocument();
    expect(within(personal).getByRole('button', { name: 'Sửa thông tin cá nhân' })).toBeEnabled();
    expect(within(await card('Giấy tờ định danh')).getByRole('button', { name: 'Sửa giấy tờ định danh' })).toBeInTheDocument();
  });

  it('masks full numbers and shows one at a time; leaving the tab masks them again', async () => {
    open(`/employees/${employeeId(7)}`);
    const identity = await card('Giấy tờ định danh');
    expect(within(identity).getByText('Bấm Hiện để xem số đầy đủ, từng số một.')).toBeInTheDocument();
    expect(valueOf(identity, 'Số CCCD')).toHaveTextContent('•••• 0007');
    expect(valueOf(identity, 'Ngày cấp')).toHaveTextContent('10/04/2021');
    const showId = within(identity).getByRole('button', { name: 'Hiện số CCCD' });
    expect(showId).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(showId);
    expect(valueOf(identity, 'Số CCCD')).toHaveTextContent('001194000007');
    expect(within(identity).getByRole('button', { name: 'Ẩn số CCCD' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(within(identity).getByRole('button', { name: 'Hiện số sổ BHXH' }));
    expect(valueOf(identity, 'Số sổ BHXH')).toHaveTextContent('0194000007');
    expect(valueOf(identity, 'Số CCCD')).toHaveTextContent('•••• 0007');

    await userEvent.click(screen.getByRole('tab', { name: 'Công việc' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Cá nhân' }));
    expect(valueOf(await card('Giấy tờ định danh'), 'Số sổ BHXH')).toHaveTextContent('•••• 0007');
  });

  it('without EMPLOYEE_SENSITIVE_VIEW: the masked numbers as sent, no "Hiện", no "Sửa"', async () => {
    open(`/employees/${employeeId(1)}`, DIRECTOR, { masked: true });
    const identity = await card('Giấy tờ định danh');
    expect(within(identity).getByText('Bạn không có quyền xem số đầy đủ.')).toBeInTheDocument();
    expect(valueOf(identity, 'Số CCCD')).toHaveTextContent('•••• 0001');
    expect(valueOf(identity, 'Mã số thuế')).toHaveTextContent('•••• 0001');
    expect(valueOf(identity, 'Số sổ BHXH')).toHaveTextContent('Chưa có');
    expect(within(identity).queryByRole('button')).not.toBeInTheDocument();
    expect(within(await card('Thông tin cá nhân')).queryByRole('button', { name: /^Sửa/ })).not.toBeInTheDocument();
  });

  it('the own profile: no list to go back to, the own numbers behind "Hiện", and the note', async () => {
    const own = employeeId(22);
    server.use(...approvalApi({ inbox: { WAITING: [], SENT: [], HANDLED: [] } }).handlers);
    open(`/employees/${own}`, { ...EMPLOYEE_ACCOUNT, employeeId: own }, { masked: true, ownId: own });
    const identity = await card('Giấy tờ định danh');
    expect(within(identity).getByText('Bấm Hiện để xem số của bạn.')).toBeInTheDocument();
    await userEvent.click(within(identity).getByRole('button', { name: 'Hiện số CCCD' }));
    expect(valueOf(identity, 'Số CCCD')).toHaveTextContent('001194000022');
    expect(screen.getByText('Bạn xem hồ sơ của chính mình. Cần đổi thông tin liên hệ thì bấm “Đề nghị cập nhật”; hồ sơ đổi sau khi được duyệt.')).toBeInTheDocument();
    expect(await within(await card('Thông tin cá nhân')).findByRole('button', { name: 'Đề nghị cập nhật' })).toBeInTheDocument();
    expect(within(screen.getByRole('main')).queryByRole('link', { name: 'Nhân viên' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Sửa/ })).not.toBeInTheDocument();
  });

  it('shows the job tab from the URL: unit with the unit above, manager, service, and the notes', async () => {
    const { router } = open(`/employees/${employeeId(7)}?tab=job`);
    const job = await card('Vị trí công việc');
    expect(screen.getByRole('tab', { name: 'Công việc' })).toHaveAttribute('aria-selected', 'true');
    expect(valueOf(job, 'Mã nhân viên')).toHaveTextContent('NV00007');
    await waitFor(() => expect(valueOf(job, 'Đơn vị tổ chức')).toHaveTextContent('Nhóm WebPhòng Phát triển phần mềm'));
    expect(valueOf(job, 'Chức danh')).toHaveTextContent('Nhân viên');
    expect(valueOf(job, 'Trạng thái')).toHaveTextContent('Chính thức');
    expect(valueOf(job, 'Quản lý trực tiếp')).toHaveTextContent('Nguyễn Văn KhoaTheo Trưởng đơn vị');
    expect(valueOf(job, 'Ngày vào làm')).toHaveTextContent(/^01\/08\/2018Thâm niên \d+ năm \d+ tháng$/);
    expect(within(job).getByRole('button', { name: 'Sửa vị trí công việc' })).toBeEnabled();
    expect(screen.getByText('Điều chuyển, bổ nhiệm và thử việc')).toBeInTheDocument();
    expect(screen.queryByText('Chưa có Quản lý trực tiếp')).not.toBeInTheDocument();

    // The director has no line manager; an assigned one says so.
    await router.navigate(`/employees/${employeeId(1)}?tab=job`);
    expect(await screen.findByText('Chưa có Quản lý trực tiếp')).toBeInTheDocument();
    expect(valueOf(await card('Vị trí công việc'), 'Đơn vị tổ chức')).toHaveTextContent('Trực thuộc công ty');
    await router.navigate(`/employees/${employeeId(19)}?tab=job`);
    await waitFor(() => expect(valueOf(screen.getByRole('region', { name: 'Vị trí công việc' }), 'Quản lý trực tiếp')).toHaveTextContent('Trịnh Văn PhúcGán riêng'));
  });

  it('opens the contracts tab and the salary tab with an empty period', async () => {
    server.use(http.get('*/api/employees/:employeeId/contracts', () => HttpResponse.json([])));
    server.use(http.get('*/api/employees/:employeeId/salary-profile', () => HttpResponse.json([])));
    const { router } = open(`/employees/${employeeId(7)}`);
    await header('Lê Văn Hùng');
    await userEvent.click(screen.getByRole('tab', { name: 'Hợp đồng' }));
    expect(router.state.location.search).toBe('?tab=contracts');
    expect(await screen.findByRole('heading', { name: 'Chưa có hợp đồng lao động' })).toBeInTheDocument();
    expect(screen.queryByText(/^Cập nhật lần cuối/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Lương và phụ cấp' }));
    expect(await screen.findByText('Không có Hồ sơ lương trong kỳ')).toBeInTheDocument();
  });

  it('shows the loading state, then 404, 403 and a load error with a retry', async () => {
    const view = open(`/employees/${employeeId(99)}`);
    expect(screen.getByRole('status', { name: 'Đang tải hồ sơ nhân viên' })).toHaveAttribute('aria-busy', 'true');
    expect(await screen.findByRole('heading', { name: 'Không tìm thấy nhân viên' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về danh sách nhân viên' })).toHaveAttribute('href', '/employees');
    view.unmount();

    const denied = open(`/employees/${employeeId(7)}`, HR, { denied: [employeeId(7)] });
    expect(await screen.findByRole('heading', { name: 'Bạn không xem được hồ sơ này' })).toBeInTheDocument();
    denied.unmount();

    // Not an id at all: no request.
    const bad = open('/employees/khong-phai-id');
    expect(screen.getByRole('heading', { name: 'Không tìm thấy nhân viên' })).toBeInTheDocument();
    expect(bad.profiles.requests).toEqual([]);
    bad.unmount();

    server.use(employeeProfileFail());
    renderRoutes(routes, { session: HR, path: `/employees/${employeeId(7)}` });
    expect(await screen.findByRole('heading', { name: 'Không tải được hồ sơ' })).toBeInTheDocument();
    server.use(employeeProfileApi().handler);
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await header('Lê Văn Hùng')).toBeInTheDocument();
  });
});
