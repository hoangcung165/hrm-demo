import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import { problem } from '@/test/auth-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const noContent = () => new HttpResponse(null, { status: 204 });

describe('password flows', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('forgot password: sends the email with the UI language and shows the "mail sent" panel', async () => {
    const calls: Array<{ body: unknown; language: string | null }> = [];
    server.use(
      http.post('*/api/auth/forgot-password', async ({ request }) => {
        calls.push({ body: await request.json(), language: request.headers.get('Accept-Language') });
        return noContent();
      }),
    );
    renderRoutes(routes, { session: null, path: '/forgot-password' });
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'mai.tran@congty.vn');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' }));

    expect(await screen.findByRole('heading', { name: 'Kiểm tra hộp thư của bạn' })).toBeInTheDocument();
    expect(screen.getByText('mai.tran@congty.vn')).toBeInTheDocument();
    expect(calls).toEqual([{ body: { email: 'mai.tran@congty.vn' }, language: 'vi' }]);

    await userEvent.click(screen.getByRole('button', { name: 'Gửi lại liên kết' }));
    expect(calls).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Quay lại đăng nhập' })).toHaveAttribute('href', '/login');
  });

  it('reset password: a link without a token shows the expired panel', () => {
    renderRoutes(routes, { session: null, path: '/reset-password' });
    expect(screen.getByRole('heading', { name: 'Liên kết không còn dùng được' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gửi liên kết mới' })).toHaveAttribute('href', '/forgot-password');
  });

  it('reset password: validates length and matching before calling the API', async () => {
    renderRoutes(routes, { session: null, path: '/reset-password?token=abc' });
    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'ngan-7');
    await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'khac-nhau');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }));
    expect(await screen.findByText('Mật khẩu phải có ít nhất 8 ký tự.')).toBeInTheDocument();
    expect(screen.getByText('Hai mật khẩu chưa khớp. Nhập lại cho giống nhau.')).toBeInTheDocument();
  });

  it('reset password: saves and lands on the login page with a confirmation', async () => {
    let body: unknown;
    server.use(
      http.post('*/api/auth/reset-password', async ({ request }) => {
        body = await request.json();
        return noContent();
      }),
    );
    renderRoutes(routes, { session: null, path: '/reset-password?token=abc' });
    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'matkhaumoi-2026');
    await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'matkhaumoi-2026');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Đã đặt mật khẩu mới. Đăng nhập bằng mật khẩu mới.');
    expect(body).toEqual({ token: 'abc', newPassword: 'matkhaumoi-2026' });
  });

  it('reset password: an expired or used token shows the expired panel', async () => {
    server.use(http.post('*/api/auth/reset-password', () => problem(400, 'auth.reset_token_invalid')));
    renderRoutes(routes, { session: null, path: '/reset-password?token=old' });
    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'matkhaumoi-2026');
    await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'matkhaumoi-2026');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }));
    expect(await screen.findByRole('heading', { name: 'Liên kết không còn dùng được' })).toBeInTheDocument();
  });

  async function openChangePassword() {
    await userEvent.click(screen.getByRole('button', { name: `Menu Tài khoản: ${HR_ACCOUNT.fullName}` }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Đổi mật khẩu' }));
    return screen.findByRole('dialog', { name: 'Đổi mật khẩu' });
  }

  it('change password: a wrong current password is shown under that field', async () => {
    server.use(http.post('*/api/auth/change-password', () => problem(400, 'auth.current_password_incorrect')));
    renderRoutes(routes);
    const dialog = await openChangePassword();
    await userEvent.type(within(dialog).getByLabelText('Mật khẩu hiện tại'), 'matkhau-cu');
    await userEvent.type(within(dialog).getByLabelText('Mật khẩu mới'), 'matkhaumoi-2026');
    await userEvent.type(within(dialog).getByLabelText('Nhập lại mật khẩu mới'), 'matkhaumoi-2026');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đổi mật khẩu' }));
    const current = within(dialog).getByLabelText('Mật khẩu hiện tại');
    await screen.findByText('Mật khẩu hiện tại không đúng.');
    expect(current).toBeInvalid();
    expect(current).toHaveAccessibleDescription('Mật khẩu hiện tại không đúng.');
  });

  it('change password: on success the user is signed out and sees the confirmation on the login page', async () => {
    let body: unknown;
    server.use(
      http.post('*/api/auth/change-password', async ({ request }) => {
        body = await request.json();
        return noContent();
      }),
    );
    renderRoutes(routes);
    const dialog = await openChangePassword();
    await userEvent.type(within(dialog).getByLabelText('Mật khẩu hiện tại'), 'matkhau-cu');
    await userEvent.type(within(dialog).getByLabelText('Mật khẩu mới'), 'matkhaumoi-2026');
    await userEvent.type(within(dialog).getByLabelText('Nhập lại mật khẩu mới'), 'matkhaumoi-2026');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đổi mật khẩu' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Đã đặt mật khẩu mới.');
    expect(body).toEqual({ currentPassword: 'matkhau-cu', newPassword: 'matkhaumoi-2026' });
  });

  it('sign out: calls the API and returns to the login page', async () => {
    let called = false;
    server.use(
      http.post('*/api/auth/logout', () => {
        called = true;
        return noContent();
      }),
    );
    renderRoutes(routes);
    await userEvent.click(screen.getByRole('button', { name: `Menu Tài khoản: ${HR_ACCOUNT.fullName}` }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Đăng xuất' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeInTheDocument();
    expect(called).toBe(true);
  });
});
