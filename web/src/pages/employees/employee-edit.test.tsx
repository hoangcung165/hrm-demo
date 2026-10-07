import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { catalogApi } from '@/test/catalog-handlers';
import { employeeCreateApi } from '@/test/employee-create-handlers';
import { employeeEditApi, type EmployeeEditApiOptions } from '@/test/employee-edit-handlers';
import { employeeId, positionId } from '@/test/employee-fixtures';
import { employeeListApi } from '@/test/employee-handlers';
import { employeeProfileApi } from '@/test/employee-profile-handlers';
import { unitId } from '@/test/org-unit-fixtures';
import { orgUnitsOk } from '@/test/org-unit-handlers';
import { HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'EMPLOYEE_EDIT', 'EMPLOYEE_SENSITIVE_VIEW'] };

const open = (number: number, tab = '', options: EmployeeEditApiOptions = {}) => {
  const profiles = employeeProfileApi();
  server.use(profiles.handler, employeeListApi().handler, ...catalogApi().handlers, orgUnitsOk());
  // After the profile handler, which would also answer /api/employees/default-manager and /options.
  server.use(...employeeCreateApi().handlers);
  const edit = employeeEditApi(options);
  server.use(edit.handler);
  return { edit, profiles, ...renderRoutes(routes, { session: HR, path: `/employees/${employeeId(number)}${tab ? `?tab=${tab}` : ''}` }) };
};
const card = (name: string) => screen.findByRole('region', { name });
const textbox = (scope: HTMLElement, name: string) => within(scope).getByRole('textbox', { name });
const toast = (text: string) => within(toastRegion()).findByText(text);
/** The Employee's name: the emergency contact's name field has the same label, under its own group. */
const nameBox = (scope: HTMLElement) => within(scope).getAllByRole('textbox', { name: 'Họ và tên' })[0]!;

describe('EmployeeProfilePage: cards edited in place', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('edits "Thông tin cá nhân" with the emergency contact, one card at a time, and saves it', async () => {
    const { edit } = open(7);
    await userEvent.click(within(await card('Thông tin cá nhân')).getByRole('button', { name: 'Sửa thông tin cá nhân' }));
    const form = await card('Thông tin cá nhân');
    expect(within(form).getByText('Đang sửa. Chuyển tab hoặc rời trang sẽ hỏi trước nếu còn thay đổi chưa lưu.')).toBeInTheDocument();
    expect(nameBox(form)).toHaveFocus();
    expect(nameBox(form)).toHaveValue('Lê Văn Hùng');
    // The other card waits.
    const identity = await card('Giấy tờ định danh');
    expect(within(identity).getByText('Lưu hoặc hủy phần đang sửa trước khi sửa phần này.')).toBeInTheDocument();
    expect(within(identity).queryByRole('button', { name: 'Sửa giấy tờ định danh' })).not.toBeInTheDocument();

    const [phone, contactPhone] = within(form).getAllByRole('textbox', { name: 'Số điện thoại' });
    expect(contactPhone).toHaveValue('0983112456');
    await userEvent.clear(phone!);
    await userEvent.type(phone!, '0938 204 117');
    await userEvent.clear(textbox(form, 'Quan hệ'));
    await userEvent.type(textbox(form, 'Quan hệ'), 'Mẹ');
    expect(within(form).getByText('2 thay đổi: Số điện thoại, Quan hệ')).toBeInTheDocument();
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu thông tin cá nhân' }));

    expect(await toast('Đã lưu thông tin cá nhân của Lê Văn Hùng.')).toBeInTheDocument();
    expect(edit.writes).toEqual([
      {
        part: 'personal',
        id: employeeId(7),
        body: {
          fullName: 'Lê Văn Hùng',
          personal: {
            dateOfBirth: '1994-05-24',
            gender: 'MALE',
            personalEmail: 'nv00007@mail.vn',
            phone: '0938 204 117',
            address: 'Căn 1208, tòa B, 12 Nguyễn Hữu Thọ, Phường Tân Hưng, TP. Hồ Chí Minh',
            emergencyContact: { name: 'Nguyễn Văn Lực', relationship: 'Mẹ', phone: '0983112456' },
          },
        },
      },
    ]);
    const read = await card('Thông tin cá nhân');
    await waitFor(() => expect(within(read).getByText('Mẹ')).toBeInTheDocument());
    expect(within(read).getByRole('button', { name: 'Sửa thông tin cá nhân' })).toBeInTheDocument();
    expect(within(await card('Giấy tờ định danh')).getByRole('button', { name: 'Sửa giấy tờ định danh' })).toBeInTheDocument();
  });

  it('checks the card on save, puts server errors under their fields, and "Hủy" drops the changes', async () => {
    const { edit } = open(7, '', { invalid: [{ field: 'personal.emergencyContact.phone', code: 'invalid' }, { field: 'personal.dateOfBirth', code: 'under_age' }] });
    await userEvent.click(within(await card('Thông tin cá nhân')).getByRole('button', { name: 'Sửa thông tin cá nhân' }));
    const form = await card('Thông tin cá nhân');
    await userEvent.clear(nameBox(form));
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu thông tin cá nhân' }));
    expect(within(form).getByText('Nhập họ và tên.')).toBeInTheDocument();
    expect(within(form).getByText('Chưa lưu được: 1 trường cần sửa.')).toBeInTheDocument();
    expect(nameBox(form)).toHaveFocus();
    expect(edit.writes).toEqual([]);

    await userEvent.type(nameBox(form), 'Lê Văn Hùng');
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu thông tin cá nhân' }));
    expect(await within(form).findByText('Nhân viên phải đủ 15 tuổi vào ngày vào làm.')).toBeInTheDocument();
    expect(within(form).getByText('Số điện thoại gồm 10 chữ số và bắt đầu bằng 0, ví dụ 0912 345 678.')).toBeInTheDocument();
    expect(within(form).getByLabelText(/^Ngày sinh/)).toHaveFocus();

    await userEvent.click(within(form).getByRole('button', { name: 'Hủy' }));
    expect(within(await card('Thông tin cá nhân')).getByRole('button', { name: 'Sửa thông tin cá nhân' })).toBeInTheDocument();
    expect(edit.writes).toHaveLength(1);
  });

  it('edits the identity numbers from their full values: a CCCD already held, then saved', async () => {
    const { edit } = open(7);
    await userEvent.click(within(await card('Giấy tờ định danh')).getByRole('button', { name: 'Sửa giấy tờ định danh' }));
    const form = await card('Giấy tờ định danh');
    expect(textbox(form, 'Số CCCD')).toHaveValue('001194000007');
    expect(textbox(form, 'Số CCCD')).toHaveFocus();
    expect(within(form).getByRole('checkbox', { name: 'Dùng số CCCD làm mã số thuế' })).toBeChecked();
    expect(textbox(form, 'Số sổ BHXH')).toHaveValue('0194000007');

    await userEvent.clear(textbox(form, 'Số CCCD'));
    await userEvent.type(textbox(form, 'Số CCCD'), '001194000003');
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu giấy tờ định danh' }));
    expect(await within(form).findByText('Số CCCD này đã có ở hồ sơ Trần Thị Mai (NV00003). Kiểm tra lại số trên thẻ.')).toBeInTheDocument();
    expect(textbox(form, 'Số CCCD')).toHaveFocus();

    await userEvent.clear(textbox(form, 'Số CCCD'));
    await userEvent.type(textbox(form, 'Số CCCD'), '001194099999');
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu giấy tờ định danh' }));
    expect(await toast('Đã lưu giấy tờ định danh của Lê Văn Hùng.')).toBeInTheDocument();
    expect(edit.writes.at(-1)).toEqual({
      part: 'identity',
      id: employeeId(7),
      body: {
        idNumber: '001194099999',
        idIssueDate: '2021-04-10',
        idIssuePlace: 'Cục Cảnh sát quản lý hành chính về trật tự xã hội',
        taxCode: '001194099999',
        socialInsuranceNumber: '0194000007',
      },
    });
    const read = await card('Giấy tờ định danh');
    await waitFor(() => expect(within(read).getAllByText('•••• 9999')).toHaveLength(2));
  });

  it('maps the unprefixed paths of the identity save', async () => {
    open(7, '', { invalid: [{ field: 'socialInsuranceNumber', code: 'not_id_number' }] });
    await userEvent.click(within(await card('Giấy tờ định danh')).getByRole('button', { name: 'Sửa giấy tờ định danh' }));
    const form = await card('Giấy tờ định danh');
    await userEvent.clear(textbox(form, 'Số sổ BHXH'));
    await userEvent.type(textbox(form, 'Số sổ BHXH'), '0194000008');
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu giấy tờ định danh' }));
    expect(await within(form).findByText('Số sổ BHXH 12 số phải trùng số CCCD.')).toBeInTheDocument();
    expect(textbox(form, 'Số sổ BHXH')).toHaveFocus();
  });

  it('edits the job: Thử việc to Chính thức, keeping a position deactivated since', async () => {
    const { edit } = open(23, 'job');
    await userEvent.click(within(await card('Vị trí công việc')).getByRole('button', { name: 'Sửa vị trí công việc' }));
    const form = await card('Vị trí công việc');
    expect(textbox(form, 'Mã nhân viên')).toHaveValue('NV00023');
    expect(textbox(form, 'Mã nhân viên')).toBeDisabled();
    expect(within(form).getByRole('combobox', { name: 'Chức danh' })).toHaveTextContent('Thực tập sinh (ngừng hoạt động)');
    await userEvent.click(within(form).getByRole('combobox', { name: 'Trạng thái' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Chính thức' }));
    expect(within(form).getByText('1 thay đổi: Trạng thái')).toBeInTheDocument();
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu thông tin công việc' }));

    expect(await toast('Đã lưu thông tin công việc của Mạc Thị Quỳnh.')).toBeInTheDocument();
    expect(edit.writes).toEqual([
      { part: 'job', id: employeeId(23), body: { orgUnitId: unitId('WEB'), positionId: positionId('TTS'), managerId: null, hireDate: '2026-08-18', status: 'OFFICIAL' } },
    ]);
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Mạc Thị Quỳnh' })).getByText('Chính thức')).toBeInTheDocument());
  });

  it('puts a manager who reports to the Employee under the picker; an Employee who left has no "Sửa"', async () => {
    const view = open(2, 'job');
    await userEvent.click(within(await card('Vị trí công việc')).getByRole('button', { name: 'Sửa vị trí công việc' }));
    const form = await card('Vị trí công việc');
    await userEvent.click(within(form).getByRole('radio', { name: 'Chọn người khác' }));
    await userEvent.type(within(form).getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' }), 'hung');
    await userEvent.click(within(form).getByRole('combobox', { name: 'Người quản lý' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Lê Văn Hùng · NV00007 · Nhân viên' }));
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu thông tin công việc' }));
    expect(
      await within(form).findByText('Người này đang do nhân viên này quản lý (trực tiếp hoặc qua người khác), nên không làm Quản lý trực tiếp được. Chọn người khác.'),
    ).toBeInTheDocument();
    expect(within(form).getByRole('combobox', { name: 'Người quản lý' })).toHaveFocus();
    view.unmount();

    open(12, 'job');
    expect(within(await card('Vị trí công việc')).queryByRole('button', { name: 'Sửa vị trí công việc' })).not.toBeInTheDocument();
  });

  it('asks before a tab switch drops unsaved changes', async () => {
    const { router } = open(7);
    await userEvent.click(within(await card('Thông tin cá nhân')).getByRole('button', { name: 'Sửa thông tin cá nhân' }));
    await userEvent.type(textbox(await card('Thông tin cá nhân'), 'Địa chỉ'), ', tầng 3');
    await userEvent.click(screen.getByRole('tab', { name: 'Công việc' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bỏ thay đổi chưa lưu?' });
    expect(within(dialog).getByText('Thông tin cá nhân của Lê Văn Hùng còn thay đổi chưa lưu. Chuyển tab hoặc rời trang sẽ bỏ các thay đổi này.')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bỏ thay đổi' }));
    await waitFor(() => expect(router.state.location.search).toBe('?tab=job'));
    expect(await card('Vị trí công việc')).toBeInTheDocument();
  });

  it('closes the card and reloads the profile when the save is refused (403)', async () => {
    const { profiles } = open(7, '', { status: 403 });
    await userEvent.click(within(await card('Thông tin cá nhân')).getByRole('button', { name: 'Sửa thông tin cá nhân' }));
    await userEvent.type(textbox(await card('Thông tin cá nhân'), 'Địa chỉ'), ', tầng 3');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thông tin cá nhân' }));
    expect(await toast('Chưa lưu được thông tin cá nhân của Lê Văn Hùng.')).toBeInTheDocument();
    await waitFor(() => expect(profiles.requests).toHaveLength(2));
    expect(within(await card('Thông tin cá nhân')).getByRole('button', { name: 'Sửa thông tin cá nhân' })).toBeInTheDocument();
  });
});
