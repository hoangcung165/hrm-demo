import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { formatDate } from '@/lib/format';
import { unitId } from '@/test/org-unit-fixtures';
import { orgUnitOptionsOk } from '@/test/org-unit-handlers';
import { DA031_CURRENT, DA031_ENDED, LAN_EMPLOYEE_ID, projectDetail, projectId } from '@/test/project-fixtures';
import { allocationsApi, projectDetailOk, projectListApi, projectWriteApi } from '@/test/project-handlers';
import { HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';
import { companyToday } from '@/lib/company-time';

const PM: Account = {
  ...HR_ACCOUNT,
  fullName: 'Vũ Thị Lan',
  roles: ['PROJECT_MANAGER', 'EMPLOYEE'],
  dataScope: 'SELF',
  permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'PROJECT_VIEW', 'PROJECT_EDIT'],
  employeeId: LAN_EMPLOYEE_ID,
};
const DIRECTOR: Account = { ...PM, fullName: 'Phạm Quang Minh', roles: ['DIRECTOR'], dataScope: 'COMPANY', permissions: [...PM.permissions, 'PROJECT_EDIT_ALL'], employeeId: null };
const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'PROJECT_VIEW'] };

const DA031 = projectDetail('DA-031');
const DA034 = { ...projectDetail('DA-031'), id: projectId('DA-034'), code: 'DA-034', name: 'Cổng đối tác' };

const setDate = (label: RegExp, value: string) => {
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};
const textbox = (name: RegExp) => screen.getByRole('textbox', { name });

function serve() {
  const write = projectWriteApi([DA031]);
  server.use(projectDetailOk([DA031, DA034]), allocationsApi(DA031_CURRENT, DA031_ENDED).handler, projectListApi().handler, orgUnitOptionsOk(), ...write.handlers);
  return write;
}

const openCreate = async (session: Account = PM) => {
  const write = serve();
  const rendered = renderRoutes(routes, { session, path: '/projects' });
  await userEvent.click(await screen.findByRole('button', { name: 'Tạo dự án' }));
  return { write, ...rendered, dialog: await screen.findByRole('dialog', { name: 'Tạo dự án' }) };
};
const openEdit = async () => {
  const write = serve();
  const rendered = renderRoutes(routes, { session: PM, path: `/projects/${DA031.id}` });
  await userEvent.click(await screen.findByRole('button', { name: 'Sửa dự án' }));
  return { write, ...rendered, dialog: await screen.findByRole('dialog', { name: 'Sửa dự án' }) };
};
const pickUnit = async (search: string, name: string) => {
  await userEvent.click(screen.getByRole('button', { name: /^Phòng ban phụ trách: / }));
  const menu = await screen.findByRole('dialog', { name: 'Phòng ban phụ trách' });
  await userEvent.type(within(menu).getByRole('searchbox', { name: 'Tìm phòng ban' }), search);
  await userEvent.click(within(menu).getByRole('treeitem', { name }));
};

describe('Project dialogs', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('a PM creates a project as its PM: required fields, a taken code on its field, then the new project opens', async () => {
    const { write, router, dialog } = await openCreate();
    const pm = within(dialog).getByRole('combobox', { name: 'PM' });
    expect(pm).toBeDisabled();
    expect(pm).toHaveTextContent('Vũ Thị Lan');
    expect(within(dialog).getByText('Bạn chỉ tạo và sửa dự án do chính mình làm PM.')).toBeInTheDocument();
    expect(textbox(/^Khách hàng/)).toHaveAttribute('placeholder', 'Để trống nếu là dự án nội bộ');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo dự án' }));
    expect(await within(dialog).findByText('Nhập mã dự án.')).toBeInTheDocument();
    expect(within(dialog).getByText('Nhập tên dự án.')).toBeInTheDocument();
    expect(within(dialog).getByText('Chọn phòng ban phụ trách.')).toBeInTheDocument();
    expect(within(dialog).getByText('Chọn ngày bắt đầu.')).toBeInTheDocument();
    expect(write.writes).toEqual([]);

    await userEvent.type(textbox(/^Mã dự án/), 'DA-031');
    await userEvent.type(textbox(/^Tên dự án/), 'Cổng đối tác');
    await pickUnit('phat trien', 'Phòng Phát triển phần mềm');
    setDate(/^Ngày bắt đầu/, '2026-11-01');
    setDate(/^Ngày kết thúc/, '2027-06-30');
    await userEvent.type(textbox(/^Ngân sách nhân sự/), '1.200.000.000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo dự án' }));
    expect(await within(dialog).findByText('Mã dự án này đã có. Chọn mã khác.')).toBeInTheDocument();
    await waitFor(() => expect(textbox(/^Mã dự án/)).toHaveFocus());

    await userEvent.clear(textbox(/^Mã dự án/));
    await userEvent.type(textbox(/^Mã dự án/), 'DA-034');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo dự án' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${projectId('DA-034')}`));
    expect(write.writes.at(-1)).toEqual({
      code: 'DA-034',
      name: 'Cổng đối tác',
      client: null,
      pmEmployeeId: LAN_EMPLOYEE_ID,
      orgUnitId: unitId('PTPM'),
      startDate: '2026-11-01',
      endDate: '2027-06-30',
      status: 'PLANNED',
      laborBudget: 1_200_000_000,
    });
    expect(within(toastRegion()).getByText('Đã tạo dự án DA-034')).toBeInTheDocument();
  });

  it('an end date before the start date is refused on the end date; a budget that is not a number too', async () => {
    const { dialog, write } = await openCreate();
    setDate(/^Ngày bắt đầu/, '2026-11-01');
    setDate(/^Ngày kết thúc/, '2026-10-01');
    await userEvent.type(textbox(/^Ngân sách nhân sự/), 'hai tỷ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo dự án' }));
    expect(await within(dialog).findByText('Ngày kết thúc phải từ ngày bắt đầu trở đi.')).toBeInTheDocument();
    expect(within(dialog).getByText('Ngân sách là số tiền VND, chỉ gồm chữ số.')).toBeInTheDocument();
    expect(write.writes).toEqual([]);
  });

  it('with "Quản lý mọi dự án" the PM is any active Employee, found by name', async () => {
    server.use(
      http.get('*/api/employees/options', () =>
        HttpResponse.json({ items: [{ id: '00000000-0000-4000-b000-000000000077', code: 'NV00077', fullName: 'Lương Văn Hiển', status: 'ACTIVE', orgUnitName: null, positionName: 'Trưởng nhóm' }], total: 1 }),
      ),
    );
    const { dialog } = await openCreate(DIRECTOR);
    const pm = within(dialog).getByRole('combobox', { name: 'PM' });
    expect(pm).toBeEnabled();
    await userEvent.type(within(dialog).getByRole('searchbox', { name: 'Tìm theo tên hoặc mã nhân viên' }), 'hien');
    await userEvent.click(pm);
    await userEvent.click(await screen.findByRole('option', { name: 'Lương Văn Hiển · NV00077 · Trưởng nhóm' }));
    expect(pm).toHaveTextContent('Lương Văn Hiển');
  });

  it('HR, who manages no project, has no "Tạo dự án"; nor has a PM on another PM\'s project "Sửa dự án"', async () => {
    serve();
    const first = renderRoutes(routes, { session: HR, path: '/projects' });
    expect(await screen.findByRole('table', { name: 'Danh sách dự án' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tạo dự án' })).not.toBeInTheDocument();
    first.unmount();

    server.use(projectDetailOk([projectDetail('DA-027', { canEdit: false })]));
    renderRoutes(routes, { session: PM, path: `/projects/${projectId('DA-027')}` });
    expect(await screen.findByText('Bạn chỉ xem được dự án này')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sửa dự án' })).not.toBeInTheDocument();
  });

  it('edits a project: the code is read-only, and the change is saved', async () => {
    const { dialog, write } = await openEdit();
    expect(textbox(/^Mã dự án/)).toHaveAttribute('readonly');
    expect(textbox(/^Mã dự án/)).toHaveValue('DA-031');
    expect(within(dialog).getByText('Không đổi được sau khi tạo.')).toBeInTheDocument();
    expect(textbox(/^Ngân sách nhân sự/)).toHaveValue('2.400.000.000');
    await userEvent.clear(textbox(/^Tên dự án/));
    await userEvent.type(textbox(/^Tên dự án/), 'Ứng dụng đặt lịch khám 2.0');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(write.writes.at(-1)).toMatchObject({ name: 'Ứng dụng đặt lịch khám 2.0', status: 'ACTIVE', laborBudget: 2_400_000_000, pmEmployeeId: LAN_EMPLOYEE_ID });
    expect(write.writes.at(-1)).not.toHaveProperty('code');
    expect(within(toastRegion()).getByText('Đã lưu dự án Ứng dụng đặt lịch khám 2.0')).toBeInTheDocument();
  });

  it('shortening the dates names the allocations that will be cut', async () => {
    const { dialog } = await openEdit();
    setDate(/^Ngày kết thúc/, '2026-12-31');
    const warning = await within(dialog).findByText('4 phân bổ sẽ bị cắt theo ngày mới');
    expect(warning.parentElement).toHaveTextContent(
      'Phân bổ của Vũ Thị Lan, Tô Thị Bích Ngọc, Quách Văn Long và 1 người khác sẽ được rút lại trong 01/09 – 31/12/2026 khi lưu.',
    );
    setDate(/^Ngày kết thúc/, '2027-03-31');
    await waitFor(() => expect(within(dialog).queryByText(/phân bổ sẽ bị cắt/)).not.toBeInTheDocument());
  });

  it('closing a project asks first, says what happens to the allocations, then saves', async () => {
    const { dialog, write } = await openEdit();
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Trạng thái' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Đã đóng' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    const confirm = await screen.findByRole('dialog', { name: 'Đóng dự án Ứng dụng đặt lịch khám?' });
    expect(confirm).toHaveTextContent(`Phân bổ của 6 người đang làm sẽ kết thúc hôm nay, ${formatDate(companyToday())}.`);
    expect(confirm).toHaveTextContent('1 người sắp vào sẽ bị xóa phân bổ.');
    expect(write.writes).toEqual([]);

    await userEvent.click(within(confirm).getByRole('button', { name: 'Hủy' }));
    expect(await screen.findByRole('dialog', { name: 'Sửa dự án' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: /^Đóng dự án/ })).getByRole('button', { name: 'Đóng dự án' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(write.writes).toHaveLength(1);
    expect(write.writes[0]).toMatchObject({ status: 'CLOSED' });
    expect(within(toastRegion()).getByText('Đã đóng dự án Ứng dụng đặt lịch khám')).toBeInTheDocument();
  });

  it('a save the server refuses keeps the dialog open with a toast', async () => {
    const write = projectWriteApi([DA031], { failWith: [500, 'error.unknown'] });
    server.use(projectDetailOk([DA031]), allocationsApi(DA031_CURRENT, DA031_ENDED).handler, orgUnitOptionsOk(), ...write.handlers);
    renderRoutes(routes, { session: PM, path: `/projects/${DA031.id}` });
    await userEvent.click(await screen.findByRole('button', { name: 'Sửa dự án' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sửa dự án' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await within(toastRegion()).findByText('Chưa lưu được dự án Ứng dụng đặt lịch khám')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Sửa dự án' })).toBeInTheDocument();
  });
});
