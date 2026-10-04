import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import i18n from '@/i18n';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';

describe('AppShell', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('shows the navigation for the roles of the Account and the empty overview', () => {
    renderRoutes(routes);
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' });
    expect(within(nav).getByRole('link', { name: 'Tổng quan' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Nhân viên' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Tài khoản và vai trò' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Tổng quan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chưa có số liệu để hiển thị' })).toBeInTheDocument();
  });

  it('switches every label of the layout to English and remembers the choice', async () => {
    renderRoutes(routes);
    await userEvent.click(screen.getAllByRole('button', { name: 'English' })[0]!);
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Employees' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveAttribute('placeholder', 'Search employees, projects, contracts');
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    expect(screen.queryByText('Tổng quan')).not.toBeInTheDocument();
    expect(localStorage.getItem('hrm.lang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('opens the Account menu with who is signed in', async () => {
    renderRoutes(routes);
    await userEvent.click(screen.getByRole('button', { name: `Menu Tài khoản: ${HR_ACCOUNT.name}` }));
    const menu = await screen.findByRole('menu', { name: `Menu Tài khoản: ${HR_ACCOUNT.name}` });
    expect(within(menu).getByText(HR_ACCOUNT.email)).toBeInTheDocument();
    expect(within(menu).getByText('HR')).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Hồ sơ của tôi' })).toBeInTheDocument();
  });

  it('shows the not-found state inside the shell for a route that does not exist yet', () => {
    renderRoutes(routes, { path: '/employees' });
    expect(screen.getByRole('link', { name: 'Nhân viên' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: 'Trang này chưa có' })).toBeInTheDocument();
  });

  it('opens the navigation drawer on mobile', async () => {
    renderRoutes(routes);
    await userEvent.click(screen.getByRole('button', { name: 'Mở menu điều hướng' }));
    const drawer = await screen.findByRole('dialog', { name: 'Điều hướng chính' });
    expect(within(drawer).getByRole('link', { name: 'Nghỉ phép' })).toBeInTheDocument();
    await userEvent.click(within(drawer).getByRole('button', { name: 'Đóng menu' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
