import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import type { RoleMatrix } from '@/features/role/api';
import i18n from '@/i18n';
import { accountListApi } from '@/test/account-handlers';
import { ADMIN_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { ROLE_MATRIX, roleApi } from '@/test/role-handlers';
import { server } from '@/test/server';

const LIST = 'Xem danh sách Tài khoản và quyền của từng vai trò';
const EDIT = 'Thêm, sửa, đặt mật khẩu tạm, khóa và mở khóa Tài khoản';
const ACCOUNT_VIEW = 'Xem Tài khoản trong phạm vi dữ liệu';
/** HR also holds the Account list: the company's permissions differ from the defaults. */
const CUSTOMIZED: RoleMatrix = {
  ...ROLE_MATRIX,
  customized: true,
  roles: ROLE_MATRIX.roles.map((rule) => (rule.role === 'HR' ? { ...rule, permissions: [...rule.permissions.slice(0, 2), 'ACCOUNT_LIST', ...rule.permissions.slice(2)] } : rule)),
};
const VIEWER: Account = { ...ADMIN_ACCOUNT, permissions: ADMIN_ACCOUNT.permissions.filter((permission) => permission !== 'ACCOUNT_EDIT') };

async function open(initial: RoleMatrix = ROLE_MATRIX, { session = ADMIN_ACCOUNT, resetFails = false }: { session?: Account; resetFails?: boolean } = {}) {
  const api = roleApi(initial, { resetFails });
  server.use(...api.handlers, accountListApi().handler, http.get('*/api/me', () => HttpResponse.json(session)));
  const view = renderRoutes(routes, { session, path: '/accounts?view=roles' });
  await screen.findByRole('table', { name: 'Quyền của từng vai trò' });
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Đang tải vai trò và quyền' })).not.toBeInTheDocument());
  return { ...api, ...view };
}
const box = (role: string, permission: string) => screen.getByRole('checkbox', { name: `${role}: ${permission}` });
const resetButton = () => screen.queryByRole('button', { name: 'Khôi phục mặc định' });
const bar = () => screen.queryByRole('region', { name: 'Thay đổi chưa lưu' });
const leaveDialog = () => screen.findByRole('dialog', { name: 'Rời trang và bỏ thay đổi chưa lưu?' });

describe('AccountsPage: role matrix, reset, leave guards and keyboard', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  describe('Khôi phục mặc định', () => {
    it('is not offered while every role has its default permissions, nor to an Account that cannot edit', async () => {
      await open();
      expect(resetButton()).not.toBeInTheDocument();
    });

    it('is not offered read-only, even when customized', async () => {
      await open(CUSTOMIZED, { session: VIEWER });
      expect(screen.getByText('Bạn chỉ xem được quyền của từng vai trò')).toBeInTheDocument();
      expect(resetButton()).not.toBeInTheDocument();
    });

    it('asks first, then restores the defaults, drops unsaved changes and goes away', async () => {
      const api = await open(CUSTOMIZED);
      expect(box('HR', LIST)).toBeChecked();
      await userEvent.click(box('Giám đốc', EDIT));
      expect(bar()).toBeInTheDocument();
      // Staying keeps everything.
      await userEvent.click(resetButton()!);
      let dialog = await screen.findByRole('dialog', { name: 'Khôi phục quyền mặc định cho mọi vai trò?' });
      expect(dialog).toHaveTextContent('các thay đổi quyền đã lưu và chưa lưu đều bị bỏ');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }));
      expect(api.resets()).toBe(0);
      expect(box('Giám đốc', EDIT)).toBeChecked();
      // Confirming resets every role.
      await userEvent.click(resetButton()!);
      dialog = await screen.findByRole('dialog', { name: 'Khôi phục quyền mặc định cho mọi vai trò?' });
      await userEvent.click(within(dialog).getByRole('button', { name: 'Khôi phục mặc định' }));
      expect(await within(toastRegion()).findByText('Đã khôi phục quyền mặc định cho mọi vai trò')).toBeInTheDocument();
      expect(api.resets()).toBe(1);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(box('HR', LIST)).not.toBeChecked();
      expect(box('Giám đốc', EDIT)).not.toBeChecked();
      expect(box('Giám đốc', LIST)).not.toBeChecked();
      expect(bar()).not.toBeInTheDocument();
      expect(resetButton()).not.toBeInTheDocument();
      // The focus is not lost with the button.
      expect(document.activeElement).not.toBe(document.body);
    });

    it('says so and keeps the matrix when the reset fails', async () => {
      await open(CUSTOMIZED, { resetFails: true });
      await userEvent.click(resetButton()!);
      const dialog = await screen.findByRole('dialog', { name: 'Khôi phục quyền mặc định cho mọi vai trò?' });
      await userEvent.click(within(dialog).getByRole('button', { name: 'Khôi phục mặc định' }));
      expect(await within(toastRegion()).findByRole('alert')).toHaveTextContent('Chưa khôi phục được quyền mặc định');
      expect(box('HR', LIST)).toBeChecked();
      expect(resetButton()).toBeInTheDocument();
    });
  });

  describe('leaving with unsaved changes', () => {
    it('asks before switching to the Accounts tab: staying keeps the changes, leaving drops them', async () => {
      const { router } = await open();
      await userEvent.click(box('HR', LIST));
      await userEvent.click(screen.getByRole('tab', { name: 'Tài khoản' }));
      let dialog = await leaveDialog();
      expect(dialog).toHaveTextContent('1 thay đổi quyền chưa lưu sẽ bị mất.');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }));
      expect(router.state.location.search).toBe('?view=roles');
      expect(box('HR', LIST)).toBeChecked();
      expect(bar()).toBeInTheDocument();
      await userEvent.click(screen.getByRole('tab', { name: 'Tài khoản' }));
      dialog = await leaveDialog();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Rời trang' }));
      await waitFor(() => expect(router.state.location.search).toBe(''));
      expect(screen.getByRole('tab', { name: 'Tài khoản' })).toHaveAttribute('aria-selected', 'true');
    });

    it('asks before going to another page', async () => {
      const { router } = await open();
      await userEvent.click(box('HR', LIST));
      await userEvent.click(within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).getByRole('link', { name: 'Tổng quan' }));
      await userEvent.click(within(await leaveDialog()).getByRole('button', { name: 'Rời trang' }));
      await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    });

    it('lets the tab change without asking when nothing is changed', async () => {
      const { router } = await open();
      await userEvent.click(box('HR', LIST));
      await userEvent.click(box('HR', LIST));
      await userEvent.click(screen.getByRole('tab', { name: 'Tài khoản' }));
      await waitFor(() => expect(router.state.location.search).toBe(''));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('keyboard', () => {
    it('is one tab stop that starts at the first cell, locked cells included', async () => {
      await open();
      screen.getByRole('region', { name: 'Quyền của từng vai trò' }).focus();
      await userEvent.tab();
      expect(document.activeElement).toHaveTextContent('Admin: Xem Thông tin công ty. Có, không đổi được: vai trò Admin luôn có mọi quyền');
      // Tab leaves the matrix instead of walking its 49 cells.
      await userEvent.tab();
      expect(screen.getByRole('table', { name: 'Quyền của từng vai trò' })).not.toContainElement(document.activeElement as HTMLElement);
      await userEvent.tab({ shift: true });
      expect(document.activeElement).toHaveTextContent('Admin: Xem Thông tin công ty');
    });

    it('moves with the arrow keys, Home and End, and toggles with Space', async () => {
      await open();
      box('HR', LIST).focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(box('Quản lý trực tiếp', LIST)).toHaveFocus();
      await userEvent.keyboard('{ArrowDown}');
      expect(box('Quản lý trực tiếp', EDIT)).toHaveFocus();
      await userEvent.keyboard('{End}');
      expect(box('Nhân viên', EDIT)).toHaveFocus();
      // Never past the edge.
      await userEvent.keyboard('{ArrowRight}');
      expect(box('Nhân viên', EDIT)).toHaveFocus();
      await userEvent.keyboard(' ');
      expect(box('Nhân viên', EDIT)).toBeChecked();
      expect(box('Nhân viên', LIST)).toBeChecked();
      // The cell left holds the tab stop.
      expect(box('Nhân viên', EDIT)).toHaveAttribute('tabindex', '0');
      expect(box('HR', LIST)).toHaveAttribute('tabindex', '-1');
      await userEvent.keyboard('{Home}');
      expect(document.activeElement).toHaveTextContent(`Admin: ${EDIT}. Có, không đổi được`);
      await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowRight}');
      // A base permission: reached and read, but Space changes nothing.
      expect(document.activeElement).toHaveTextContent(`HR: ${ACCOUNT_VIEW}. Có, không đổi được: mọi Tài khoản đều có quyền này`);
      await userEvent.keyboard(' ');
      expect(within(bar()!).getByRole('status')).toHaveTextContent('2 thay đổi chưa lưu ở 1 vai trò');
      await userEvent.keyboard('{Control>}{End}{/Control}');
      expect(box('Nhân viên', 'Thêm, sửa, chuyển, ngừng hoạt động và xóa Đơn vị tổ chức')).toHaveFocus();
      expect(screen.getByRole('table', { name: 'Quyền của từng vai trò' })).toHaveAccessibleDescription('Dùng phím mũi tên để đi giữa các ô, phím cách để đánh dấu.');
    });
  });
});
