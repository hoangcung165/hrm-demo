import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import { meOk, problem, refreshFails, refreshOk, tokens } from '@/test/auth-handlers';
import { renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const email = () => screen.getByRole('textbox', { name: 'Email' });
const password = () => screen.getByLabelText('Mật khẩu');
const submit = () => screen.getByRole('button', { name: 'Đăng nhập' });

describe('LoginPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('renders the form with labelled fields and a link to forgot password', () => {
    renderRoutes(routes, { session: null, path: '/login' });
    expect(screen.getByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeInTheDocument();
    expect(email()).toHaveAttribute('autocomplete', 'username');
    expect(password()).toHaveAttribute('type', 'password');
    expect(screen.getByRole('link', { name: 'Quên mật khẩu?' })).toHaveAttribute('href', '/forgot-password');
  });

  it('validates the fields before calling the API', async () => {
    renderRoutes(routes, { session: null, path: '/login' });
    await userEvent.type(email(), 'mai.tran@');
    await userEvent.click(submit());
    expect(await screen.findByText('Nhập email đúng định dạng, ví dụ an.nguyen@congty.vn.')).toBeInTheDocument();
    expect(screen.getByText('Nhập mật khẩu.')).toBeInTheDocument();
    expect(email()).toBeInvalid();
  });

  it('shows the backend error for wrong credentials', async () => {
    server.use(http.post('*/api/auth/login', () => problem(401, 'auth.invalid_credentials')));
    renderRoutes(routes, { session: null, path: '/login' });
    await userEvent.type(email(), 'mai.tran@congty.vn');
    await userEvent.type(password(), 'sai-mat-khau');
    await userEvent.click(submit());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Email hoặc mật khẩu không đúng.');
    expect(alert).toHaveTextContent('Kiểm tra lại, hoặc đặt lại mật khẩu nếu bạn đã quên.');
  });

  it('shows the locked-account message', async () => {
    server.use(http.post('*/api/auth/login', () => problem(401, 'auth.account_locked')));
    renderRoutes(routes, { session: null, path: '/login' });
    await userEvent.type(email(), 'mai.tran@congty.vn');
    await userEvent.type(password(), 'matkhau-2026');
    await userEvent.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent('Tài khoản đã bị khóa. Liên hệ phòng Nhân sự để mở lại.');
  });

  it('signs in, sends the credentials and opens the page the user came for', async () => {
    let body: unknown;
    server.use(
      http.post('*/api/auth/login', async ({ request }) => {
        body = await request.json();
        return tokens();
      }),
      meOk(),
    );
    renderRoutes(routes, { session: null, path: '/employees' });
    // Signed out: the guard sends the visitor to the login page first.
    await userEvent.type(await screen.findByRole('textbox', { name: 'Email' }), 'mai.tran@congty.vn');
    await userEvent.type(password(), 'matkhau-2026');
    await userEvent.click(submit());
    const nav = await screen.findByRole('navigation', { name: 'Điều hướng chính' });
    expect(within(nav).getByRole('link', { name: 'Nhân viên' })).toHaveAttribute('aria-current', 'page');
    expect(body).toEqual({ email: 'mai.tran@congty.vn', password: 'matkhau-2026' });
    expect(screen.getByRole('button', { name: 'Menu Tài khoản: mai.tran@congty.vn' })).toBeInTheDocument();
  });

  it('reads the Access scope of the Account from /api/me', async () => {
    server.use(http.post('*/api/auth/login', () => tokens()), meOk());
    const { queryClient } = renderRoutes(routes, { session: null, path: '/login' });
    await userEvent.type(email(), 'mai.tran@congty.vn');
    await userEvent.type(password(), 'matkhau-2026');
    await userEvent.click(submit());
    await screen.findByRole('navigation', { name: 'Điều hướng chính' });
    expect(queryClient.getQueryData(['session'])).toMatchObject({ dataScope: 'COMPANY', permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW'] });
  });

  it('restores the session from the refresh cookie on page load', async () => {
    server.use(refreshOk(), meOk());
    renderRoutes(routes, { session: 'restore' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Tổng quan' })).toBeInTheDocument();
  });

  it('goes to the login page when there is no session to restore', async () => {
    server.use(refreshFails());
    renderRoutes(routes, { session: 'restore' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeInTheDocument();
  });

  it('sends a signed-in user away from the login page', async () => {
    renderRoutes(routes, { path: '/login' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Tổng quan' })).toBeInTheDocument();
  });
});
