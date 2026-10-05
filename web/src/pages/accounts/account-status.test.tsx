import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import type { Account } from '@/features/auth/account';
import { accountId, ACCOUNTS } from '@/test/account-fixtures';
import { accountApi } from '@/test/account-handlers';
import { problem } from '@/test/auth-handlers';
import { ADMIN_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const openPage = (search = '', session: Account = ADMIN_ACCOUNT) => renderRoutes(routes, { session, path: `/accounts${search}` });
const table = async () => {
  const found = await screen.findByRole('table', { name: 'Danh sách tài khoản' });
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Đang tải danh sách tài khoản' })).not.toBeInTheDocument());
  return found;
};
const rowOf = async (name: string) => within(await table()).getByText(name).closest('tr')!;
const statusOf = async (name: string) => (await rowOf(name)).cells[3]!.textContent;
const menuButton = (name: string) => screen.getByRole('button', { name: `Thao tác cho ${name}` });
/** Opens the row menu and gives the texts of its items. */
async function menuOf(name: string) {
  await table();
  await userEvent.click(menuButton(name));
  const menu = await screen.findByRole('menu', { name: `Thao tác cho ${name}` });
  return { menu, items: within(menu).getAllByRole('menuitem').map((item) => item.textContent) };
}
async function choose(name: string, item: string) {
  const { menu } = await menuOf(name);
  await userEvent.click(within(menu).getByRole('menuitem', { name: item }));
}
const noDialog = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
const TUNG = { name: 'Bùi Thanh Tùng', id: accountId(1) };
const NAM = { name: 'Hoàng Văn Nam', id: accountId(7) };
const passwordBox = (dialog: HTMLElement) => within(dialog).getByLabelText(/^Mật khẩu tạm mới/);
const noteOf = (control: HTMLElement) => document.getElementById(control.getAttribute('aria-describedby')!.split(' ')[0]!)!;

describe('AccountsPage: lock, unlock and set a temporary password', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('offers each kind of row its own menu', async () => {
    // One persona locked, to see its unlock item.
    const accounts = ACCOUNTS.map((account) => (account.email === 'demo.accountant@hrm.local' ? { ...account, status: 'LOCKED' as const } : account));
    server.use(...accountApi(accounts).handlers);
    openPage();
    const close = () => userEvent.keyboard('{Escape}');
    // Another active Account: everything, the lock last and destructive, after a separator.
    const active = await menuOf(TUNG.name);
    expect(active.items).toEqual(['Sửa', 'Đặt mật khẩu tạm', 'Khóa tài khoản']);
    expect(within(active.menu).getAllByRole('separator')).toHaveLength(1);
    await close();
    expect((await menuOf(NAM.name)).items).toEqual(['Sửa', 'Đặt mật khẩu tạm', 'Mở khóa']);
    await close();
    // The own Account: no password, lock or unlock.
    const own = await menuOf(ADMIN_ACCOUNT.fullName);
    expect(own.items).toEqual(['Sửa']);
    expect(within(own.menu).queryByRole('separator')).not.toBeInTheDocument();
    await close();
    // A demo persona: only its lock.
    const persona = await menuOf('Lê Văn Hùng');
    expect(persona.items).toEqual(['Khóa tài khoản']);
    expect(within(persona.menu).queryByRole('separator')).not.toBeInTheDocument();
    await close();
    expect((await menuOf('Hoàng Thị Thu')).items).toEqual(['Mở khóa']);
  });

  it('has no row menu without ACCOUNT_EDIT', async () => {
    server.use(...accountApi().handlers);
    openPage('', { ...ADMIN_ACCOUNT, permissions: ADMIN_ACCOUNT.permissions.filter((permission) => permission !== 'ACCOUNT_EDIT') });
    await table();
    expect(screen.queryByRole('button', { name: /^Thao tác cho/ })).not.toBeInTheDocument();
  });

  it('asks before locking; cancel changes nothing and returns focus to the row menu button', async () => {
    const api = accountApi();
    server.use(...api.handlers);
    openPage();
    await choose(TUNG.name, 'Khóa tài khoản');
    const dialog = await screen.findByRole('dialog', { name: 'Khóa Tài khoản của Bùi Thanh Tùng?' });
    expect(within(dialog).getByText('Bùi Thanh Tùng sẽ không đăng nhập được. Phiên đang mở sẽ kết thúc trong tối đa 15 phút. Bạn có thể mở khóa bất cứ lúc nào.')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }));
    await noDialog();
    expect(api.statusCalls).toEqual([]);
    expect(await statusOf(TUNG.name)).toBe('Đang hoạt động');
    expect(menuButton(TUNG.name)).toHaveFocus();
  });

  it('locks an Account: the call, the toast, the row and the focus', async () => {
    const api = accountApi();
    server.use(...api.handlers);
    openPage();
    await choose(TUNG.name, 'Khóa tài khoản');
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Khóa tài khoản' }));
    await noDialog();
    expect(api.statusCalls).toEqual([{ action: 'lock', id: TUNG.id }]);
    expect(within(toastRegion()).getByText('Đã khóa Tài khoản của Bùi Thanh Tùng')).toBeInTheDocument();
    await waitFor(async () => expect(await statusOf(TUNG.name)).toBe('Đã khóa'));
    await waitFor(() => expect(menuButton(TUNG.name)).toHaveFocus());
    // The menu now offers the way back.
    expect((await menuOf(TUNG.name)).items).toEqual(['Sửa', 'Đặt mật khẩu tạm', 'Mở khóa']);
  });

  it('locks a demo persona', async () => {
    const api = accountApi();
    server.use(...api.handlers);
    openPage();
    await choose('Lê Văn Hùng', 'Khóa tài khoản');
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Khóa Tài khoản của Lê Văn Hùng?' })).getByRole('button', { name: 'Khóa tài khoản' }));
    await waitFor(async () => expect(await statusOf('Lê Văn Hùng')).toBe('Đã khóa'));
    expect(api.statusCalls).toEqual([{ action: 'lock', id: accountId(9) }]);
  });

  it('says why the last active Admin cannot be locked, and leaves the status as it was', async () => {
    server.use(http.post('*/api/accounts/:id/lock', () => problem(409, 'account.last_admin')), ...accountApi().handlers);
    openPage();
    await choose(TUNG.name, 'Khóa tài khoản');
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Khóa tài khoản' }));
    const alert = await within(toastRegion()).findByRole('alert');
    expect(alert).toHaveTextContent('Không khóa được Tài khoản của Bùi Thanh Tùng');
    expect(alert).toHaveTextContent('Đây là Tài khoản Admin duy nhất đang hoạt động. Gán vai trò Admin cho một Tài khoản khác trước.');
    await noDialog();
    expect(await statusOf(TUNG.name)).toBe('Đang hoạt động');
    expect(menuButton(TUNG.name)).toHaveFocus();
  });

  it('unlocks at once, without a confirm', async () => {
    const api = accountApi();
    server.use(...api.handlers);
    openPage();
    await choose(NAM.name, 'Mở khóa');
    await waitFor(() => expect(api.statusCalls).toEqual([{ action: 'unlock', id: NAM.id }]));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await within(toastRegion()).findByText('Đã mở khóa Tài khoản của Hoàng Văn Nam')).toBeInTheDocument();
    await waitFor(async () => expect(await statusOf(NAM.name)).toBe('Đang hoạt động'));
    expect(menuButton(NAM.name)).toHaveFocus();
  });

  it('moves focus to the add button when the unlocked row leaves the filtered list', async () => {
    server.use(...accountApi().handlers);
    openPage('?status=LOCKED');
    await choose(NAM.name, 'Mở khóa');
    await waitFor(() => expect(within(screen.getByRole('table')).queryByText(NAM.name)).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Thêm tài khoản' })).toHaveFocus());
  });

  it('sets a temporary password: validation, the call, the toast, and a locked Account stays locked', async () => {
    const api = accountApi();
    server.use(...api.handlers);
    openPage();
    await choose(NAM.name, 'Đặt mật khẩu tạm');
    const dialog = await screen.findByRole('dialog', { name: 'Đặt mật khẩu tạm cho Hoàng Văn Nam' });
    expect(within(dialog).getByText('Hoàng Văn Nam sẽ phải đăng nhập lại trên mọi thiết bị bằng mật khẩu này. Giao mật khẩu cho họ và nhắc đổi mật khẩu sau khi đăng nhập.')).toBeInTheDocument();
    const field = passwordBox(dialog);
    expect(field).toHaveFocus();
    // Shown while typing; no "repeat" field.
    expect(field).toHaveAttribute('type', 'text');
    expect(field).toHaveAttribute('autocomplete', 'new-password');
    expect(noteOf(field)).toHaveTextContent('8 đến 72 ký tự.');
    const submit = within(dialog).getByRole('button', { name: 'Đặt mật khẩu tạm' });
    await userEvent.click(submit);
    expect(noteOf(field)).toHaveTextContent('Nhập mật khẩu tạm.');
    await userEvent.type(field, 'ngan-7');
    expect(noteOf(field)).toHaveTextContent('Mật khẩu phải có ít nhất 8 ký tự.');
    expect(api.statusCalls).toEqual([]);
    await userEvent.type(field, '-2026');
    await userEvent.click(submit);
    await noDialog();
    expect(api.statusCalls).toEqual([{ action: 'password', id: NAM.id, body: { password: 'ngan-7-2026' } }]);
    expect(within(toastRegion()).getByText('Đã đặt mật khẩu tạm cho Hoàng Văn Nam')).toBeInTheDocument();
    expect(within(toastRegion()).getByText('Hoàng Văn Nam đã bị đăng xuất trên mọi thiết bị. Giao mật khẩu tạm cho họ.')).toBeInTheDocument();
    expect(await statusOf(NAM.name)).toBe('Đã khóa');
    await waitFor(() => expect(menuButton(NAM.name)).toHaveFocus());
  });

  it('shows a password the server refuses under the field, and keeps the dialog', async () => {
    server.use(http.put('*/api/accounts/:id/password', () => problem(400, 'validation.invalid', { errors: [{ field: 'password', code: 'Size' }] })), ...accountApi().handlers);
    openPage();
    await choose(TUNG.name, 'Đặt mật khẩu tạm');
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(passwordBox(dialog), 'Tam-2026-tung');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đặt mật khẩu tạm' }));
    await waitFor(() => expect(noteOf(passwordBox(dialog))).toHaveTextContent('Mật khẩu quá dài. Dùng tối đa 72 ký tự.'));
    expect(passwordBox(dialog)).toHaveValue('Tam-2026-tung');
    expect(passwordBox(dialog)).toHaveFocus();
    expect(within(toastRegion()).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the password dialog open on a network failure, with what was typed', async () => {
    server.use(http.put('*/api/accounts/:id/password', () => HttpResponse.error()), ...accountApi().handlers);
    openPage();
    await choose(TUNG.name, 'Đặt mật khẩu tạm');
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(passwordBox(dialog), 'Tam-2026-tung');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đặt mật khẩu tạm' }));
    const alert = await within(toastRegion()).findByRole('alert');
    expect(alert).toHaveTextContent('Không đặt được mật khẩu tạm cho Bùi Thanh Tùng');
    expect(alert).toHaveTextContent('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
    expect(screen.getByRole('dialog', { name: 'Đặt mật khẩu tạm cho Bùi Thanh Tùng' })).toBeInTheDocument();
    expect(passwordBox(dialog)).toHaveValue('Tam-2026-tung');
  });

  it.each([
    ['account.cannot_lock_self', 'Khóa tài khoản', 'lock', 'Bạn không tự khóa Tài khoản của mình được.'],
    ['account.cannot_unlock_self', 'Mở khóa', 'unlock', 'Bạn không tự mở khóa Tài khoản của mình được.'],
    ['account.cannot_set_own_password', 'Đặt mật khẩu tạm', 'password', 'Bạn không đặt mật khẩu tạm cho Tài khoản của mình được. Dùng Đổi mật khẩu trong menu Tài khoản.'],
    ['account.demo_persona_not_editable', 'Đặt mật khẩu tạm', 'password', 'Đây là persona demo. Không sửa hoặc đặt mật khẩu cho Tài khoản này được.'],
  ])('explains %s in the failure toast, should the server ever answer it', async (code, item, action, text) => {
    const refuse = () => problem(409, code);
    server.use(http.post(`*/api/accounts/:id/${action}`, refuse), http.put('*/api/accounts/:id/password', refuse), ...accountApi().handlers);
    openPage();
    const target = item === 'Mở khóa' ? NAM : TUNG;
    const before = await statusOf(target.name);
    await choose(target.name, item);
    if (action === 'lock') await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Khóa tài khoản' }));
    if (action === 'password') {
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(passwordBox(dialog), 'Tam-2026-tung');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Đặt mật khẩu tạm' }));
    }
    expect(await within(toastRegion()).findByRole('alert')).toHaveTextContent(text);
    // The password dialog stays open after a failure.
    if (action === 'password') await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy' }));
    expect(await statusOf(target.name)).toBe(before);
  });

  it('reloads the list when the Account is gone', async () => {
    const api = accountApi();
    server.use(http.post('*/api/accounts/:id/unlock', () => problem(404, 'account.not_found')), ...api.handlers);
    openPage();
    await table();
    const before = api.requests.length;
    await choose(NAM.name, 'Mở khóa');
    const alert = await within(toastRegion()).findByRole('alert');
    expect(alert).toHaveTextContent('Không mở khóa được Tài khoản của Hoàng Văn Nam');
    expect(alert).toHaveTextContent('Tài khoản này không còn tồn tại. Danh sách đã được tải lại.');
    await waitFor(() => expect(api.requests.length).toBeGreaterThan(before));
    expect(await statusOf(NAM.name)).toBe('Đã khóa');
  });

  it('shows the denied state when an action answers 403', async () => {
    server.use(http.post('*/api/accounts/:id/lock', () => problem(403, 'auth.forbidden')), ...accountApi().handlers);
    openPage();
    await choose(TUNG.name, 'Khóa tài khoản');
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Khóa tài khoản' }));
    expect(await screen.findByRole('heading', { name: 'Bạn không có quyền xem Tài khoản và vai trò' })).toBeInTheDocument();
    expect(within(toastRegion()).getByRole('alert')).toHaveTextContent('Bạn không có quyền thực hiện việc này.');
    await noDialog();
  });

  it('is translated to English', async () => {
    await i18n.changeLanguage('en');
    server.use(...accountApi().handlers);
    openPage();
    await screen.findByRole('table', { name: 'Account list' });
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Bùi Thanh Tùng' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Edit', 'Set temporary password', 'Lock account']);
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Lock account' }));
    const dialog = await screen.findByRole('dialog', { name: "Lock Bùi Thanh Tùng's account?" });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lock account' }));
    expect(await within(toastRegion()).findByText("Locked Bùi Thanh Tùng's account")).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Bùi Thanh Tùng' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Set temporary password' }));
    expect(await screen.findByRole('dialog', { name: 'Set a temporary password for Bùi Thanh Tùng' })).toBeInTheDocument();
  });
});
