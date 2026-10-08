import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { AccountRow } from '@/features/account/api';
import i18n from '@/i18n';
import { accountId, ACCOUNTS } from '@/test/account-fixtures';
import { accountApi } from '@/test/account-handlers';
import { employeeCreateApi } from '@/test/employee-create-handlers';
import { employeeId } from '@/test/employee-fixtures';
import { ADMIN_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

/** Lý Gia Huy's Account is linked to Lê Văn Hùng (NV00007). */
const LINKED: AccountRow[] = ACCOUNTS.map((account) =>
  account.fullName === 'Lý Gia Huy'
    ? { ...account, employee: { employeeId: employeeId(7), fullName: 'Lê Văn Hùng', employeeCode: 'NV00007', orgUnitName: 'Nhóm Web', status: 'OFFICIAL' } }
    : account,
);

const open = (accounts: AccountRow[] = LINKED) => {
  const api = accountApi(accounts);
  // `/api/employees/options` for the picker.
  server.use(...api.handlers, ...employeeCreateApi().handlers);
  return { api, ...renderRoutes(routes, { session: ADMIN_ACCOUNT, path: '/accounts' }) };
};
const table = async () => {
  const found = await screen.findByRole('table', { name: 'Danh sách tài khoản' });
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Đang tải danh sách tài khoản' })).not.toBeInTheDocument());
  return found;
};
const rowOf = async (name: string) => within(await table()).getByText(name).closest('tr')!;
async function openEdit(name: string) {
  await table();
  await userEvent.click(screen.getByRole('button', { name: `Thao tác cho ${name}` }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Sửa' }));
  return screen.findByRole('dialog', { name: `Sửa Tài khoản của ${name}` });
}
const pick = async (form: HTMLElement, search: string, option: string) => {
  if (search) await userEvent.type(within(form).getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' }), search);
  await userEvent.click(within(form).getByRole('combobox', { name: 'Nhân viên' }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
};

describe('AccountsPage: the Employee of an Account', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('shows the linked Employee on the row and in the dialog', async () => {
    open();
    expect(await rowOf('Lý Gia Huy')).toHaveTextContent('huy.ly@congty.vn · NV00007');
    const form = await openEdit('Lý Gia Huy');
    expect(within(form).getByRole('combobox', { name: 'Nhân viên' })).toHaveTextContent('Lê Văn Hùng · NV00007 · Nhóm Web');
  });

  it('links an Account to an Employee found by name, and the row says so', async () => {
    const { api } = open();
    const form = await openEdit('Đinh Công Sơn');
    await pick(form, 'hoa', 'Trần Đức Hòa · NV00016 · Nhân viên');
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.writes).toEqual([
      { method: 'PUT', id: accountId(3), body: { fullName: 'Đinh Công Sơn', email: 'son.dinh@congty.vn', roles: ['LINE_MANAGER', 'EMPLOYEE'], employeeId: employeeId(16) } },
    ]);
    await waitFor(async () => expect(await rowOf('Đinh Công Sơn')).toHaveTextContent('son.dinh@congty.vn · NV00016'));
  });

  it('says whose Account already has the Employee, under the field', async () => {
    const { api } = open();
    const form = await openEdit('Đinh Công Sơn');
    await pick(form, 'hung', 'Lê Văn Hùng · NV00007 · Nhân viên');
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await within(form).findByText('Nhân viên này đã gắn với Tài khoản của Lý Gia Huy. Chọn nhân viên khác.')).toBeInTheDocument();
    expect(within(form).getByRole('combobox', { name: 'Nhân viên' })).toHaveFocus();
    expect(api.writes).toHaveLength(1);
  });

  it('unlinks with "Không gắn nhân viên"', async () => {
    const { api } = open();
    const form = await openEdit('Lý Gia Huy');
    await pick(form, '', 'Không gắn nhân viên');
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(api.writes).toHaveLength(1));
    expect(api.writes[0]!.body.employeeId).toBeNull();
  });
});
