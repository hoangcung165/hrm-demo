import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { catalogApi } from '@/test/catalog-handlers';
import { employeeCreateApi, type EmployeeCreateApiOptions } from '@/test/employee-create-handlers';
import { employeeId, positionId } from '@/test/employee-fixtures';
import { employeeListApi } from '@/test/employee-handlers';
import { employeeProfileApi } from '@/test/employee-profile-handlers';
import { unitId } from '@/test/org-unit-fixtures';
import { orgUnitsOk } from '@/test/org-unit-handlers';
import { HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'EMPLOYEE_EDIT', 'EMPLOYEE_SENSITIVE_VIEW'] };
const DIRECTOR: Account = { ...HR_ACCOUNT, roles: ['DIRECTOR'], permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'ORG_VIEW', 'EMPLOYEE_VIEW'] };

const open = (options: EmployeeCreateApiOptions = {}, session: Account = HR) => {
  server.use(employeeProfileApi().handler, employeeListApi().handler, ...catalogApi().handlers, orgUnitsOk());
  // After the profile handler, which would also answer /api/employees/next-code.
  const api = employeeCreateApi(options);
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session, path: '/employees/new' }) };
};
const textbox = (name: string) => screen.getByRole('textbox', { name });
const setDate = (label: RegExp, value: string) => {
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};
const choose = async (filter: string, option: string) => {
  await userEvent.click(screen.getByRole('combobox', { name: filter }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
};
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Thêm nhân viên' }));

/** Every required field, the unit Nhóm Kiểm thử, and `idNumber` as the CCCD. */
async function fillValid(idNumber = '079 301 004 512') {
  await userEvent.type(await screen.findByRole('textbox', { name: 'Họ và tên' }), 'Trần Ngọc  Bảo Châu');
  setDate(/^Ngày sinh/, '2001-11-07');
  await userEvent.click(screen.getByRole('radio', { name: 'Nữ' }));
  await userEvent.type(textbox('Số CCCD'), idNumber);
  await userEvent.click(screen.getByRole('button', { name: /^Đơn vị tổ chức: / }));
  const menu = await screen.findByRole('dialog', { name: 'Đơn vị tổ chức' });
  await userEvent.type(within(menu).getByRole('searchbox', { name: 'Tìm đơn vị' }), 'kiem thu');
  await userEvent.click(within(menu).getByRole('treeitem', { name: 'Nhóm Kiểm thử' }));
  await choose('Chức danh', 'Nhân viên');
  setDate(/^Ngày vào làm/, '2026-09-01');
}

describe('EmployeeCreatePage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('needs EMPLOYEE_EDIT', () => {
    renderRoutes(routes, { session: DIRECTOR, path: '/employees/new' });
    expect(screen.getByRole('heading', { name: 'Bạn không thêm được nhân viên' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Họ và tên' })).not.toBeInTheDocument();
  });

  it('starts with the expected code, Thử việc, directly under the company, the MST taken from the CCCD', async () => {
    open();
    expect(screen.getByRole('heading', { level: 1, name: 'Thêm nhân viên' })).toBeInTheDocument();
    await waitFor(() => expect(textbox('Mã nhân viên')).toHaveValue('NV00027'));
    expect(textbox('Mã nhân viên')).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Trạng thái' })).toHaveTextContent('Thử việc');
    expect(screen.getByRole('button', { name: /^Đơn vị tổ chức: / })).toHaveAccessibleName('Đơn vị tổ chức: Trực thuộc công ty');
    expect(await screen.findByRole('radio', { name: 'Theo Trưởng đơn vị. Chưa có ai' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Dùng số CCCD làm mã số thuế' })).toBeChecked();
    expect(screen.queryByRole('textbox', { name: 'Mã số thuế' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Dùng số CCCD làm mã số thuế' }));
    expect(textbox('Mã số thuế')).toBeInTheDocument();
  });

  it('checks the fields on submit, says how many to fix, and focuses the first', async () => {
    const { api } = open();
    await screen.findByRole('textbox', { name: 'Họ và tên' });
    await submit();
    expect(await screen.findByText('Chưa thêm được nhân viên')).toBeInTheDocument();
    expect(screen.getByText('Sửa 6 trường được đánh dấu bên dưới. Các thông tin khác bạn đã nhập vẫn được giữ.')).toBeInTheDocument();
    expect(textbox('Họ và tên')).toHaveFocus();
    for (const message of ['Nhập họ và tên.', 'Nhập ngày sinh, dạng dd/mm/yyyy.', 'Chọn giới tính.', 'Nhập số CCCD.', 'Chọn chức danh.', 'Nhập ngày vào làm, dạng dd/mm/yyyy.']) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
    await userEvent.type(textbox('Số CCCD'), '12345');
    await userEvent.type(textbox('Email'), 'chau.tran@mail');
    await userEvent.tab();
    expect(screen.getByText('Số CCCD gồm đúng 12 chữ số.')).toBeInTheDocument();
    expect(screen.getByText('Email chưa đúng dạng. Ví dụ: ten.ho@mail.vn')).toBeInTheDocument();
    expect(api.writes).toEqual([]);
  });

  it('adds the Employee, says so with the new code, and opens the profile', async () => {
    const { api, router } = open();
    await fillValid();
    expect(screen.getByText('Phòng Phát triển phần mềm › Nhóm Kiểm thử')).toBeInTheDocument();
    expect(await screen.findByRole('radio', { name: /Bùi Thị Ngọc Lan/ })).toBeChecked();
    await submit();
    await waitFor(() => expect(router.state.location.pathname).toBe(`/employees/${employeeId(27)}`));
    expect(api.writes).toEqual([
      {
        fullName: 'Trần Ngọc Bảo Châu',
        personal: { dateOfBirth: '2001-11-07', gender: 'FEMALE', personalEmail: null, phone: null, address: null, emergencyContact: null },
        identity: { idNumber: '079301004512', idIssueDate: null, idIssuePlace: null, taxCode: '079301004512', socialInsuranceNumber: null },
        job: { orgUnitId: unitId('QA'), positionId: positionId('NV'), managerId: null, hireDate: '2026-09-01', status: 'PROBATION' },
      },
    ]);
    expect(within(toastRegion()).getByText('Đã thêm nhân viên Trần Ngọc Bảo Châu (NV00027).')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Trần Ngọc Bảo Châu' })).toBeInTheDocument();
  });

  it('puts a CCCD held by another Employee under its field, naming the holder', async () => {
    const { api } = open();
    await fillValid('001194000007');
    await submit();
    expect(await screen.findByText('Số CCCD này đã có ở hồ sơ Lê Văn Hùng (NV00007). Kiểm tra lại số trên thẻ.')).toBeInTheDocument();
    expect(textbox('Số CCCD')).toHaveFocus();
    expect(screen.getByText('Sửa 1 trường được đánh dấu bên dưới. Các thông tin khác bạn đã nhập vẫn được giữ.')).toBeInTheDocument();
    expect(api.writes).toHaveLength(1);
    // Correcting the number clears the message.
    await userEvent.clear(textbox('Số CCCD'));
    await userEvent.type(textbox('Số CCCD'), '079301004512');
    expect(screen.queryByText(/Số CCCD này đã có/)).not.toBeInTheDocument();
  });

  it('maps the server field errors and the 409 codes onto the fields', async () => {
    const view = open({ invalid: [{ field: 'job.hireDate', code: 'out_of_range' }, { field: 'identity.taxCode', code: 'not_id_number' }] });
    await fillValid();
    await submit();
    expect(await screen.findByText('Ngày vào làm không được quá 365 ngày tới.')).toBeInTheDocument();
    // The MST field is hidden while it follows the CCCD: its error goes to the CCCD, which is first and has focus.
    expect(screen.getByText('Mã số thuế 12 số phải trùng số CCCD. Nhập mã 10 số, hoặc chọn Dùng số CCCD.')).toBeInTheDocument();
    expect(textbox('Số CCCD')).toHaveFocus();
    view.unmount();

    open({ conflict: 'employee.position_inactive' });
    await fillValid();
    await submit();
    expect(await screen.findByText('Chức danh này đã ngừng hoạt động. Chọn chức danh khác.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Chức danh' })).toHaveFocus();
  });

  it('chooses another line manager from the picker, and asks for one when none is chosen', async () => {
    const { api } = open();
    await fillValid();
    await userEvent.click(screen.getByRole('radio', { name: 'Chọn người khác' }));
    await submit();
    expect(await screen.findByText('Chọn Quản lý trực tiếp.')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' }), 'khoa');
    await choose('Người quản lý', 'Nguyễn Văn Khoa · NV00002 · Trưởng phòng');
    await submit();
    await waitFor(() => expect(api.writes).toHaveLength(1));
    expect(api.writes[0]!.job.managerId).toBe(employeeId(2));
  });

  it('checks a typed MST, and asks before leaving with input', async () => {
    const { router } = open();
    await screen.findByRole('textbox', { name: 'Họ và tên' });
    await userEvent.click(screen.getByRole('checkbox', { name: 'Dùng số CCCD làm mã số thuế' }));
    await userEvent.type(textbox('Mã số thuế'), '0123456789-001');
    await userEvent.tab();
    expect(screen.getByText('Mã số thuế gồm 10 chữ số, hoặc là số CCCD. Mã dạng 0123456789-001 là của đơn vị, không phải cá nhân.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bỏ thông tin đang nhập?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bỏ thay đổi' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/employees'));
  });
});
