import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import i18n from '@/i18n';
import { employeeCreateApi } from '@/test/employee-create-handlers';
import { employeeId } from '@/test/employee-fixtures';
import { orgStructure, unitId } from '@/test/org-unit-fixtures';
import { CYCLE_HEAD_ID, orgUnitApi } from '@/test/org-unit-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const open = (code: string) => {
  const org = orgUnitApi(orgStructure({ filled: true }));
  // `/api/employees/options` for the picker.
  server.use(...org.handlers, ...employeeCreateApi().handlers);
  return { org, ...renderRoutes(routes, { session: HR_ACCOUNT, path: `/org?unit=${unitId(code)}` }) };
};
const detail = (name: string) => screen.findByRole('region', { name });
const editDialog = async (name: string) => {
  await userEvent.click(within(await detail(name)).getByRole('button', { name: 'Sửa' }));
  return screen.findByRole('dialog', { name: `Sửa ${name}` });
};
const pickHead = async (form: HTMLElement, search: string, option: string) => {
  await userEvent.type(within(form).getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' }), search);
  await userEvent.click(within(form).getByRole('combobox', { name: 'Trưởng đơn vị' }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
};

describe('OrgPage: the unit head', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('picks the head among the active Employees by name, saves it, and shows it on the unit', async () => {
    const { org } = open('DATA');
    const form = await editDialog('Nhóm Dữ liệu');
    await pickHead(form, 'khoa', 'Nguyễn Văn Khoa · NV00002 · Trưởng phòng');
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(org.writes).toEqual([{ method: 'PUT', id: unitId('DATA'), body: { name: 'Nhóm Dữ liệu', code: 'DATA', type: 'TEAM', headEmployeeId: employeeId(2) } }]);
    expect(await within(await detail('Nhóm Dữ liệu')).findByText('Nguyễn Văn Khoa')).toBeInTheDocument();
  });

  it('clears the head with "Chưa có Trưởng đơn vị"', async () => {
    const { org } = open('DATA');
    const form = await editDialog('Nhóm Dữ liệu');
    await userEvent.click(within(form).getByRole('combobox', { name: 'Trưởng đơn vị' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Chưa có Trưởng đơn vị' }));
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(org.writes).toHaveLength(1));
    expect(org.writes[0]!.body.headEmployeeId).toBeNull();
  });

  it('puts a head that would close a manager loop under the field', async () => {
    const { org } = open('DATA');
    const form = await editDialog('Nhóm Dữ liệu');
    expect(CYCLE_HEAD_ID).toBe(employeeId(1));
    await pickHead(form, 'bao', 'Phạm Quốc Bảo · NV00001 · Giám đốc');
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu thay đổi' }));
    expect(
      await within(form).findByText('Người này đang do một nhân viên của đơn vị quản lý, nên làm Trưởng đơn vị sẽ tạo vòng Quản lý trực tiếp. Chọn người khác.'),
    ).toBeInTheDocument();
    expect(within(form).getByRole('combobox', { name: 'Trưởng đơn vị' })).toHaveFocus();
    expect(org.writes).toHaveLength(1);
  });
});
