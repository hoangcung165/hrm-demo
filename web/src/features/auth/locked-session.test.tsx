// How an Account locked while signed in reaches the login page, and when the page may say "locked".
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import { setAccessToken } from '@/lib/api';
import { ME, problem, refreshFails, refreshOk } from '@/test/auth-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const LOCKED = 'Tài khoản đã bị khóa. Liên hệ quản trị viên để mở lại.';
const loginPage = () => screen.findByRole('heading', { level: 1, name: 'Đăng nhập' });
const home = () => screen.findByRole('heading', { level: 1, name: 'Tổng quan' });
const meLocked = () => http.get('*/api/me', () => problem(401, 'auth.account_locked'));
const returnToTab = () => document.dispatchEvent(new Event('visibilitychange'));
/** A signed-in tab: the session and a live access token. */
function signedIn() {
  setAccessToken('access-1');
  return renderRoutes(routes, { session: HR_ACCOUNT });
}

describe('a session that ends because the Account was locked', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('says so on the login page when GET /api/me refuses the restored session', async () => {
    server.use(refreshOk(), meLocked());
    renderRoutes(routes, { session: 'restore' });
    await loginPage();
    expect(screen.getByRole('alert')).toHaveTextContent(LOCKED);
  });

  it('says so when the refresh itself answers that the Account is locked', async () => {
    server.use(http.post('*/api/auth/refresh', () => problem(401, 'auth.account_locked')));
    renderRoutes(routes, { session: 'restore' });
    await loginPage();
    expect(screen.getByRole('alert')).toHaveTextContent(LOCKED);
  });

  it('ends the session and says so when a call answers 401 auth.account_locked mid-session, without trying a refresh', async () => {
    let refreshCalls = 0;
    server.use(
      meLocked(),
      http.post('*/api/auth/refresh', () => {
        refreshCalls += 1;
        return problem(401, 'auth.refresh_token_invalid');
      }),
    );
    signedIn();
    await home();
    // Coming back to the tab reads the Account again.
    returnToTab();
    await loginPage();
    expect(screen.getByRole('alert')).toHaveTextContent(LOCKED);
    expect(refreshCalls).toBe(0);
  });

  it('is translated to English', async () => {
    await i18n.changeLanguage('en');
    server.use(refreshOk(), meLocked());
    renderRoutes(routes, { session: 'restore' });
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(screen.getByRole('alert')).toHaveTextContent('This account is locked. Contact an administrator to unlock it.');
  });

  it('does not say "locked" for an ordinary expired session', async () => {
    server.use(http.get('*/api/me', () => problem(401, 'auth.unauthenticated')), refreshFails());
    signedIn();
    await home();
    returnToTab();
    await loginPage();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not say "locked" when the page is reloaded after the lock: the revoked refresh token gives no reason', async () => {
    server.use(refreshFails(), meLocked());
    renderRoutes(routes, { session: 'restore' });
    await loginPage();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('applies roles changed meanwhile on the return to the tab, at most once a minute', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/me', () => {
        calls += 1;
        return HttpResponse.json({ ...ME, fullName: 'Trần Thị Mai Anh' });
      }),
    );
    const { queryClient } = signedIn();
    await home();
    returnToTab();
    await waitFor(() => expect(queryClient.getQueryData(['session'])).toMatchObject({ fullName: 'Trần Thị Mai Anh' }));
    returnToTab();
    returnToTab();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls).toBe(1);
  });

  it('keeps the session when the re-check fails for another reason', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.error()));
    signedIn();
    await home();
    returnToTab();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByRole('heading', { level: 1, name: 'Tổng quan' })).toBeInTheDocument();
  });
});
