import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import { problem } from '@/test/auth-handlers';
import { ADMIN_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { ROLE_MATRIX, roleApi } from '@/test/role-handlers';
import { server } from '@/test/server';

const LIST = 'Xem danh sách Tài khoản và quyền của từng vai trò';
const EDIT = 'Thêm, sửa, đặt mật khẩu tạm, khóa và mở khóa Tài khoản';
const ORG_VIEW = 'Xem Cơ cấu tổ chức và Sơ đồ tổ chức';
const ORG_EDIT = 'Thêm, sửa, chuyển, ngừng hoạt động và xóa Đơn vị tổ chức';
/** The Admin's own Account after each `GET /api/me`. */
const me = (calls: { count: number }) =>
  http.get('*/api/me', () => {
    calls.count += 1;
    return HttpResponse.json(ADMIN_ACCOUNT);
  });
async function open(...extra: Parameters<typeof server.use>) {
  const api = roleApi();
  const meCalls = { count: 0 };
  server.use(...extra, ...api.handlers, me(meCalls));
  renderRoutes(routes, { session: ADMIN_ACCOUNT, path: '/accounts?view=roles' });
  await screen.findByRole('checkbox', { name: `HR: ${LIST}` });
  return { ...api, meCalls };
}
const box = (role: string, permission: string) => screen.getByRole('checkbox', { name: `${role}: ${permission}` });
const header = (role: string) => screen.getByRole('columnheader', { name: new RegExp(`^${role}`) });
const bar = () => screen.getByRole('region', { name: 'Thay đổi chưa lưu' });
const noBar = () => expect(screen.queryByRole('region', { name: 'Thay đổi chưa lưu' })).not.toBeInTheDocument();
const saveButton = () => within(bar()).getByRole('button', { name: 'Lưu thay đổi' });

describe('AccountsPage: editing the role matrix', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('gives an editor boxes, explains the locked column and rows once, and names every cell', async () => {
    await open();
    expect(screen.getByText('Đánh dấu ô để cấp quyền cho vai trò, rồi lưu')).toBeInTheDocument();
    // 6 editable roles × 5 permissions that are not base; one tab stop for all of them (keyboard: role-matrix-guards.test.tsx).
    expect(screen.getAllByRole('checkbox')).toHaveLength(30);
    expect(box('HR', ORG_VIEW)).toBeChecked();
    expect(box('HR', LIST)).not.toBeChecked();
    expect(header('Admin')).toHaveTextContent('Đủ mọi quyền');
    expect(screen.getByRole('rowheader', { name: /^Xem Thông tin công ty/ })).toHaveTextContent('Mọi Tài khoản đều có');
    expect(screen.getByRole('rowheader', { name: /^Phạm vi dữ liệu/ })).toHaveTextContent('Cố định theo vai trò');
    // Locked cells are read, not operated: no box, a name with the reason.
    expect(screen.queryByRole('checkbox', { name: /^Admin:/ })).not.toBeInTheDocument();
    expect(screen.getByText(`Admin: ${LIST}. Có, không đổi được: vai trò Admin luôn có mọi quyền`)).toBeInTheDocument();
    expect(screen.getByText('HR: Xem Thông tin công ty. Có, không đổi được: mọi Tài khoản đều có quyền này')).toBeInTheDocument();
    expect(screen.getByText('Đánh dấu để cấp quyền')).toBeInTheDocument();
    expect(screen.getByText('Có, không đổi được')).toBeInTheDocument();
    noBar();
  });

  it('marks a changed cell, counts it in the column header and the Save bar, and clears it when ticked back', async () => {
    await open();
    await userEvent.click(box('HR', LIST));
    expect(box('HR', LIST)).toBeChecked();
    expect(box('HR', LIST)).toHaveFocus();
    expect(box('HR', LIST)).toHaveAccessibleDescription('Đã đổi, chưa lưu');
    expect(box('HR', LIST).closest('td')).toHaveClass('bg-warning-soft');
    expect(header('HR')).toHaveTextContent('1 thay đổi');
    expect(within(bar()).getByRole('status')).toHaveTextContent('1 thay đổi chưa lưu ở 1 vai tròHR');
    expect(screen.getAllByText('Đã đổi, chưa lưu').some((item) => item.closest('li'))).toBe(true);
    await userEvent.click(box('Kế toán', ORG_VIEW));
    expect(within(bar()).getByRole('status')).toHaveTextContent('2 thay đổi chưa lưu ở 2 vai tròHR, Kế toán');
    // Back to the saved value: no mark, no count.
    await userEvent.click(box('HR', LIST));
    expect(box('HR', LIST)).toHaveAccessibleDescription('');
    expect(header('HR')).not.toHaveTextContent('thay đổi');
    await userEvent.keyboard(' ');
    await userEvent.click(box('Kế toán', ORG_VIEW));
    await userEvent.click(box('HR', LIST));
    noBar();
  });

  it('ticks what a permission requires, and unticks what requires a permission', async () => {
    await open();
    // Edit needs list: both change.
    await userEvent.click(box('Giám đốc', EDIT));
    expect(box('Giám đốc', LIST)).toBeChecked();
    expect(box('Giám đốc', LIST)).toHaveAccessibleDescription('Đã đổi, chưa lưu');
    expect(header('Giám đốc')).toHaveTextContent('2 thay đổi');
    // Unticking the view takes the edit along.
    await userEvent.click(box('Giám đốc', LIST));
    expect(box('Giám đốc', EDIT)).not.toBeChecked();
    expect(header('Giám đốc')).not.toHaveTextContent('thay đổi');
    await userEvent.click(box('HR', ORG_VIEW));
    expect(box('HR', ORG_EDIT)).not.toBeChecked();
    expect(within(bar()).getByRole('status')).toHaveTextContent('2 thay đổi chưa lưu ở 1 vai trò');
    // Ticking the view again does not bring the edit back.
    await userEvent.click(box('HR', ORG_VIEW));
    expect(box('HR', ORG_VIEW)).toBeChecked();
    expect(box('HR', ORG_EDIT)).not.toBeChecked();
    expect(header('HR')).toHaveTextContent('1 thay đổi');
  });

  it('discards every change without asking', async () => {
    const api = await open();
    await userEvent.click(box('HR', EDIT));
    await userEvent.click(within(bar()).getByRole('button', { name: 'Hủy thay đổi' }));
    noBar();
    expect(box('HR', EDIT)).not.toBeChecked();
    expect(box('HR', LIST)).not.toBeChecked();
    expect(api.saves).toEqual([]);
    expect(screen.getByRole('region', { name: 'Quyền của từng vai trò' })).toHaveFocus();
    // Unticking the last change from the matrix keeps the focus on its box.
    await userEvent.click(box('HR', LIST));
    await userEvent.click(box('HR', LIST));
    noBar();
    expect(box('HR', LIST)).toHaveFocus();
  });

  it('saves the changed roles together with their full lists, never Admin, then shows what the server holds', async () => {
    const api = roleApi(undefined, { delayMs: 60 });
    const meCalls = { count: 0 };
    server.use(...api.handlers, me(meCalls));
    renderRoutes(routes, { session: ADMIN_ACCOUNT, path: '/accounts?view=roles' });
    await userEvent.click(await screen.findByRole('checkbox', { name: `HR: ${EDIT}` }));
    await userEvent.click(box('Kế toán', ORG_VIEW));
    await userEvent.click(saveButton());
    // Saving: the bar says so, nothing can be changed.
    expect(within(bar()).getByRole('status')).toHaveTextContent('Đang lưu 3 thay đổi…');
    expect(bar()).toHaveAttribute('aria-busy', 'true');
    // The buttons look disabled and ignore clicks, but keep the focus.
    expect(saveButton()).toHaveAttribute('aria-disabled', 'true');
    expect(saveButton()).toHaveFocus();
    expect(within(bar()).getByRole('button', { name: 'Hủy thay đổi' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(within(bar()).getByRole('button', { name: 'Hủy thay đổi' }));
    await userEvent.click(saveButton());
    expect(box('Kế toán', ORG_VIEW)).toBeChecked();
    expect(box('HR', LIST)).toBeDisabled();
    expect(screen.getByRole('region', { name: 'Quyền của từng vai trò' })).toHaveAttribute('aria-busy', 'true');
    await waitFor(noBar);
    expect(api.saves).toEqual([
      {
        roles: [
          { role: 'HR', permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'ACCOUNT_LIST', 'ACCOUNT_EDIT', 'ORG_VIEW', 'ORG_EDIT'] },
          { role: 'ACCOUNTANT', permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'ORG_VIEW'] },
        ],
      },
    ]);
    // The bar took the focus along: it goes to the matrix.
    expect(screen.getByRole('region', { name: 'Quyền của từng vai trò' })).toHaveFocus();
    const toast = within(toastRegion()).getByText('Đã lưu quyền của 2 vai trò: HR, Kế toán');
    expect(toast).toBeInTheDocument();
    expect(within(toastRegion()).getByText('Áp dụng từ yêu cầu tiếp theo của từng người, không cần đăng nhập lại.')).toBeInTheDocument();
    expect(box('HR', EDIT)).toBeChecked();
    expect(box('HR', EDIT)).toBeEnabled();
    expect(box('HR', EDIT)).toHaveAccessibleDescription('');
    expect(header('HR')).not.toHaveTextContent('thay đổi');
    // The shell follows the new permissions.
    await waitFor(() => expect(meCalls.count).toBe(1));
  });

  it('keeps every change when the save fails, says nothing was saved, and saves on the next try', async () => {
    let fail = true;
    const api = await open(http.put('*/api/roles/permissions', () => (fail ? HttpResponse.error() : undefined)));
    await userEvent.click(box('HR', LIST));
    await userEvent.click(saveButton());
    const alert = await within(bar()).findByRole('alert');
    expect(alert).toHaveTextContent('Chưa lưu được 1 thay đổi');
    expect(alert).toHaveTextContent('Không kết nối được máy chủ. Chưa có thay đổi nào được lưu; kiểm tra mạng rồi lưu lại.');
    expect(within(toastRegion()).queryByRole('alert')).not.toBeInTheDocument();
    expect(box('HR', LIST)).toBeChecked();
    expect(box('HR', LIST)).toHaveAccessibleDescription('Đã đổi, chưa lưu');
    expect(saveButton()).not.toHaveAttribute('aria-disabled');
    fail = false;
    await userEvent.click(saveButton());
    await waitFor(noBar);
    expect(api.saves).toHaveLength(1);
    expect(within(toastRegion()).getByText('Đã lưu quyền của 1 vai trò: HR')).toBeInTheDocument();
  });

  it.each(['role_permission.role_locked', 'role_permission.dependency_missing'])('reloads the matrix when the server refuses with %s', async (code) => {
    let reads = 0;
    await open(
      http.put('*/api/roles/permissions', () => problem(409, code)),
      http.get('*/api/roles', () => {
        reads += 1;
        return undefined;
      }),
    );
    const before = reads;
    await userEvent.click(box('HR', LIST));
    await userEvent.click(saveButton());
    expect(await within(bar()).findByRole('alert')).toHaveTextContent('Quyền này không đổi được. Bảng đã được tải lại.');
    await waitFor(() => expect(reads).toBeGreaterThan(before));
  });

  it('offers only a dismiss when the reloaded matrix leaves nothing to save', async () => {
    // Another Admin saved the same change meanwhile: after the reload no cell differs.
    let refused = false;
    const hrHasList = { ...ROLE_MATRIX, roles: ROLE_MATRIX.roles.map((rule) => (rule.role === 'HR' ? { ...rule, permissions: [...rule.permissions, 'ACCOUNT_LIST' as const] } : rule)) };
    await open(
      http.put('*/api/roles/permissions', () => {
        refused = true;
        return problem(409, 'role_permission.dependency_missing');
      }),
      http.get('*/api/roles', () => (refused ? HttpResponse.json(hrHasList) : undefined)),
    );
    await userEvent.click(box('HR', LIST));
    await userEvent.click(saveButton());
    const alert = await within(bar()).findByRole('alert');
    await waitFor(() => expect(alert).toHaveTextContent('Chưa lưu được thay đổiQuyền này không đổi được. Bảng đã được tải lại.'));
    expect(within(bar()).queryByRole('button', { name: 'Lưu thay đổi' })).not.toBeInTheDocument();
    expect(box('HR', LIST)).toHaveAccessibleDescription('');
    await userEvent.click(within(bar()).getByRole('button', { name: 'Hủy thay đổi' }));
    noBar();
  });

  it('turns read-only when the save answers 403 and the Account no longer has ACCOUNT_EDIT', async () => {
    const viewer = { ...ADMIN_ACCOUNT, permissions: ADMIN_ACCOUNT.permissions.filter((permission) => permission !== 'ACCOUNT_EDIT') };
    await open(
      http.put('*/api/roles/permissions', () => problem(403, 'auth.forbidden')),
      http.get('*/api/me', () => HttpResponse.json(viewer)),
    );
    await userEvent.click(box('HR', LIST));
    await userEvent.click(saveButton());
    expect(await screen.findByText('Bạn chỉ xem được quyền của từng vai trò')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    noBar();
  });

  it('is translated to English', async () => {
    await i18n.changeLanguage('en');
    const api = roleApi();
    server.use(...api.handlers, me({ count: 0 }));
    renderRoutes(routes, { session: ADMIN_ACCOUNT, path: '/accounts?view=roles' });
    await userEvent.click(await screen.findByRole('checkbox', { name: 'HR: View the account list and the permissions of each role' }));
    expect(screen.getByRole('columnheader', { name: /^Admin/ })).toHaveTextContent('Has every permission');
    expect(screen.getByRole('columnheader', { name: /^HR/ })).toHaveTextContent('1 change');
    const region = screen.getByRole('region', { name: 'Unsaved changes' });
    expect(within(region).getByRole('status')).toHaveTextContent('1 unsaved change in 1 roleHR');
    await userEvent.click(within(region).getByRole('button', { name: 'Save changes' }));
    expect(await within(toastRegion()).findByText('Saved the permissions of 1 role: HR')).toBeInTheDocument();
  });
});
