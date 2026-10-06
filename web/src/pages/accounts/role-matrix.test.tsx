import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import type { RoleMatrix } from '@/features/role/api';
import i18n from '@/i18n';
import { ADMIN_ACCOUNT, renderRoutes } from '@/test/render';
import { ROLE_MATRIX, roleMatrixDenied, roleMatrixFails, roleMatrixOk } from '@/test/role-handlers';
import { server } from '@/test/server';

const openTab = (session: Account = ADMIN_ACCOUNT) => renderRoutes(routes, { session, path: '/accounts?view=roles' });
/** The matrix once its rows are in (while loading it is in the document with Skeleton rows). */
const matrix = async (name = 'Quyền của từng vai trò') => {
  const found = await screen.findByRole('table', { name });
  await waitFor(() => expect(screen.queryByRole('status', { name: /^(Đang tải vai trò và quyền|Loading roles and permissions)$/ })).not.toBeInTheDocument());
  return found;
};
/** The texts of the cells of the row with this header, without the header. */
const valuesOf = (table: HTMLElement, header: string) =>
  within(within(table).getByRole('rowheader', { name: header }).closest('tr')!)
    .getAllByRole('cell')
    .map((cell) => cell.textContent);
const VIEWER: Account = { ...ADMIN_ACCOUNT, permissions: ADMIN_ACCOUNT.permissions.filter((permission) => permission !== 'ACCOUNT_EDIT') };

describe('AccountsPage: role and permission matrix', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('shows the 7 roles as columns and the data scope of each as the first row', async () => {
    server.use(roleMatrixOk());
    openTab();
    const table = await matrix();
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Quyền', 'Admin', 'HR', 'Quản lý trực tiếp', 'PM', 'Kế toán', 'Giám đốc', 'Nhân viên']);
    expect(valuesOf(table, 'Phạm vi dữ liệu')).toEqual(['Toàn công ty', 'Toàn công ty', 'Đơn vị quản lý', 'Bản thân', 'Toàn công ty', 'Toàn công ty', 'Bản thân']);
    expect(within(table).getAllByRole('row')[1]).toContainElement(within(table).getByRole('rowheader', { name: 'Phạm vi dữ liệu' }));
  });

  it('lists the permissions under their groups in the order of the API', async () => {
    server.use(roleMatrixOk());
    openTab();
    const table = await matrix();
    // Header cells of the body, top to bottom: the scope row, then each group row and its permissions.
    expect(within(table).getAllByRole('rowheader').map((header) => header.textContent)).toEqual([
      'Phạm vi dữ liệu',
      'Công ty',
      'Xem Thông tin công ty',
      'Sửa Thông tin công ty và logo',
      'Tài khoản',
      'Xem Tài khoản trong phạm vi dữ liệu',
      'Xem danh sách Tài khoản và quyền của từng vai trò',
      'Thêm, sửa, đặt mật khẩu tạm, khóa và mở khóa Tài khoản',
      'Cơ cấu tổ chức',
      'Xem Cơ cấu tổ chức và Sơ đồ tổ chức',
      'Thêm, sửa, chuyển, ngừng hoạt động và xóa Đơn vị tổ chức',
    ]);
    for (const group of ['Công ty', 'Tài khoản', 'Cơ cấu tổ chức']) expect(within(table).getByRole('rowheader', { name: group })).toHaveAttribute('scope', 'rowgroup');
  });

  it('says granted and not granted in text, not by colour alone', async () => {
    server.use(roleMatrixOk());
    openTab();
    const table = await matrix();
    // A base permission: every role. Admin: every permission.
    expect(valuesOf(table, 'Xem Thông tin công ty')).toEqual(Array(7).fill('Có'));
    expect(valuesOf(table, 'Sửa Thông tin công ty và logo')).toEqual(['Có', '–Không', '–Không', '–Không', '–Không', '–Không', '–Không']);
    expect(valuesOf(table, 'Xem Cơ cấu tổ chức và Sơ đồ tổ chức')).toEqual(['Có', 'Có', '–Không', '–Không', '–Không', 'Có', '–Không']);
    expect(valuesOf(table, 'Thêm, sửa, chuyển, ngừng hoạt động và xóa Đơn vị tổ chức')).toEqual(['Có', 'Có', '–Không', '–Không', '–Không', '–Không', '–Không']);
    // The dash and the check are decoration; the words are what is read.
    const cell = within(within(table).getByRole('rowheader', { name: 'Sửa Thông tin công ty và logo' }).closest('tr')!).getAllByRole('cell')[1]!;
    expect(within(cell).getByText('–')).toHaveAttribute('aria-hidden', 'true');
    // The legend and what each data scope means.
    expect(screen.getAllByRole('list')[0]).toHaveTextContent('Có–Không');
    expect(screen.getByText('bản ghi của nhân viên trong các đơn vị mà người này là Trưởng đơn vị, kể cả đơn vị con.')).toBeInTheDocument();
  });

  it('shows what the company stored: a role with a permission it does not have by default', async () => {
    const roles = ROLE_MATRIX.roles.map((rule) => (rule.role === 'HR' ? { ...rule, permissions: [...rule.permissions, 'ACCOUNT_LIST' as const] } : rule));
    server.use(roleMatrixOk({ ...ROLE_MATRIX, customized: true, roles }));
    openTab();
    expect(valuesOf(await matrix(), 'Xem danh sách Tài khoản và quyền của từng vai trò')).toEqual(['Có', 'Có', '–Không', '–Không', '–Không', '–Không', '–Không']);
  });

  it('is read-only for everyone: no checkbox, no add button, the same matrix without ACCOUNT_EDIT', async () => {
    server.use(roleMatrixOk());
    openTab(VIEWER);
    const table = await matrix();
    expect(within(table).getAllByRole('columnheader')).toHaveLength(8);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm tài khoản' })).not.toBeInTheDocument();
  });

  it('keeps the role columns over busy skeleton rows while loading', async () => {
    server.use(roleMatrixOk(ROLE_MATRIX, { delayMs: 50 }));
    openTab();
    const busy = await screen.findByRole('status', { name: 'Đang tải vai trò và quyền' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(within(busy).getAllByRole('columnheader')).toHaveLength(8);
    expect(within(busy).queryByRole('rowheader')).not.toBeInTheDocument();
    expect(await within(await matrix()).findByRole('rowheader', { name: 'Phạm vi dữ liệu' })).toBeInTheDocument();
    // The scroll container is a named region the keyboard can reach and scroll.
    const region = screen.getByRole('region', { name: 'Quyền của từng vai trò' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).not.toHaveAttribute('aria-busy');
  });

  it('offers a retry when the matrix cannot be loaded', async () => {
    server.use(roleMatrixFails());
    openTab();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được vai trò và quyền');
    expect(screen.getByRole('tab', { name: 'Vai trò và quyền' })).toHaveAttribute('aria-selected', 'true');
    server.use(roleMatrixOk());
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await matrix()).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the denied state without the permission, and when the API answers 403', async () => {
    const { unmount } = openTab({ ...ADMIN_ACCOUNT, permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW'] });
    expect(screen.getByRole('heading', { name: 'Bạn không có quyền xem Tài khoản và vai trò' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    unmount();
    // The permission went away after signing in.
    server.use(roleMatrixDenied());
    openTab();
    expect(await screen.findByRole('heading', { name: 'Bạn không có quyền xem Tài khoản và vai trò' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the swipe hint for a phone and a permission the app has no name for by its code', async () => {
    const added = { permission: 'LEAVE_VIEW', group: 'LEAVE', locked: null, requires: null } as unknown as RoleMatrix['permissions'][number];
    server.use(roleMatrixOk({ ...ROLE_MATRIX, permissions: [...ROLE_MATRIX.permissions, added] }));
    openTab();
    const table = await matrix();
    expect(screen.getByText('Vuốt ngang để xem các vai trò khác')).toHaveClass('md:hidden');
    expect(within(table).getByRole('rowheader', { name: 'LEAVE' })).toBeInTheDocument();
    expect(valuesOf(table, 'LEAVE_VIEW')).toEqual(['–Không', '–Không', '–Không', '–Không', '–Không', '–Không', '–Không']);
  });

  it('is translated to English', async () => {
    await i18n.changeLanguage('en');
    server.use(roleMatrixOk());
    openTab();
    const table = await matrix('Permissions of each role');
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Permission', 'Admin', 'HR', 'Line manager', 'PM', 'Accountant', 'Director', 'Employee']);
    expect(valuesOf(table, 'Data scope')[2]).toBe('Managed units');
    expect(within(table).getByRole('rowheader', { name: 'Org structure' })).toBeInTheDocument();
    expect(valuesOf(table, 'Edit company info and logo')).toEqual(['Yes', '–No', '–No', '–No', '–No', '–No', '–No']);
    expect(screen.getByText("only this person's own records.")).toBeInTheDocument();
  });
});
