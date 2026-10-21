import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import { problem } from '@/test/auth-handlers';
import { COMPANY, companyOk, LOGO_URL } from '@/test/company-handlers';
import { ADMIN_ACCOUNT, DIRECTOR_ACCOUNT, EMPLOYEE_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

describe('AppShell', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('shows the navigation for the roles of the Account and the empty overview', () => {
    renderRoutes(routes);
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' });
    expect(within(nav).getByRole('link', { name: 'Tổng quan' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Hợp đồng' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Tài khoản và vai trò' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Tổng quan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chưa có số liệu để hiển thị' })).toBeInTheDocument();
  });

  it('shows Org structure, Accounts and roles and Company profile by permission', () => {
    const links = (session: typeof HR_ACCOUNT) => {
      const view = renderRoutes(routes, { session });
      const names = within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).getAllByRole('link').map((link) => link.textContent);
      view.unmount();
      return names;
    };
    const three = ['Cơ cấu tổ chức', 'Tài khoản và vai trò', 'Thông tin công ty'];
    expect(links(ADMIN_ACCOUNT)).toEqual(expect.arrayContaining(three));
    // HR and the Director hold ORG_VIEW only.
    expect(links(HR_ACCOUNT).filter((name) => three.includes(name!))).toEqual(['Cơ cấu tổ chức']);
    expect(links(DIRECTOR_ACCOUNT).filter((name) => three.includes(name!))).toEqual(['Cơ cấu tổ chức']);
    expect(links(EMPLOYEE_ACCOUNT)).toEqual(['Tổng quan', 'Mốc cảnh báo sắp hết hạn', 'Nghỉ phép', 'Chấm công']);
    // The permission decides, not the role: an Admin without ACCOUNT_LIST does not get the item.
    expect(links({ ...ADMIN_ACCOUNT, permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW'] }).filter((name) => three.includes(name!))).toEqual([]);
  });

  it('shows the full name of the person in the header, and the email in the Account menu', async () => {
    renderRoutes(routes, { session: ADMIN_ACCOUNT });
    const button = screen.getByRole('button', { name: 'Menu Tài khoản: Quản trị viên' });
    expect(button).toHaveTextContent('Quản trị viên');
    expect(button).not.toHaveTextContent(ADMIN_ACCOUNT.email);
    await userEvent.click(button);
    const menu = await screen.findByRole('menu', { name: 'Menu Tài khoản: Quản trị viên' });
    expect(within(menu).getByText('Quản trị viên')).toBeInTheDocument();
    expect(within(menu).getByText(ADMIN_ACCOUNT.email)).toBeInTheDocument();
  });

  it('switches every label of the layout to English and remembers the choice', async () => {
    renderRoutes(routes);
    await userEvent.click(screen.getAllByRole('button', { name: 'English' })[0]!);
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Contracts' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveAttribute('placeholder', 'Search employees, projects, contracts');
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    expect(screen.queryByText('Tổng quan')).not.toBeInTheDocument();
    expect(localStorage.getItem('hrm.lang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('opens the Account menu with who is signed in', async () => {
    renderRoutes(routes);
    await userEvent.click(screen.getByRole('button', { name: `Menu Tài khoản: ${HR_ACCOUNT.fullName}` }));
    const menu = await screen.findByRole('menu', { name: `Menu Tài khoản: ${HR_ACCOUNT.fullName}` });
    expect(within(menu).getByText(HR_ACCOUNT.email)).toBeInTheDocument();
    expect(within(menu).getByText('HR')).toBeInTheDocument();
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Hồ sơ của tôi', 'Đổi mật khẩu', 'Đăng xuất']);
  });

  it('shows the not-found state inside the shell for a route that does not exist yet', () => {
    renderRoutes(routes, { path: '/contracts' });
    expect(screen.getByRole('link', { name: 'Hợp đồng' })).toHaveAttribute('aria-current', 'page');
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

  describe('company mark in the header', () => {
    const header = () => screen.getByRole('banner');

    it('reserves its space while the company loads, then shows the name with the fallback tile when there is no logo', async () => {
      renderRoutes(routes);
      expect(within(header()).getByRole('status', { name: 'Đang tải' })).toHaveAttribute('aria-busy', 'true');
      expect(await within(header()).findByText(COMPANY.name)).toBeInTheDocument();
      expect(within(header()).getByTitle(COMPANY.name)).toBeInTheDocument();
      expect(within(header()).queryByRole('presentation')).not.toBeInTheDocument();
      expect(within(header()).queryByRole('status')).not.toBeInTheDocument();
    });

    it('shows the logo when the company has one', async () => {
      server.use(companyOk({ ...COMPANY, logoUrl: LOGO_URL }));
      renderRoutes(routes);
      expect(await within(header()).findByText(COMPANY.name)).toBeInTheDocument();
      expect(within(header()).getByRole('presentation')).toHaveAttribute('src', LOGO_URL);
    });

    it('shows the fallback tile alone, and no error, when the company cannot be loaded', async () => {
      server.use(http.get('*/api/company', () => problem(500, 'unknown')));
      renderRoutes(routes);
      await waitFor(() => expect(within(header()).queryByRole('status')).not.toBeInTheDocument());
      expect(within(header()).queryByText(COMPANY.name)).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('stands in the mobile top bar after the menu button; the HRM lockup stays in the sidebar and the drawer', async () => {
      renderRoutes(routes);
      const name = await within(header()).findByText(COMPANY.name);
      const menuButton = within(header()).getByRole('button', { name: 'Mở menu điều hướng' });
      expect(menuButton.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(name.compareDocumentPosition(within(header()).getByRole('searchbox')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // The lockup is no longer in the header; it tops the sidebar, and the drawer once that is open.
      expect(within(header()).queryByRole('link', { name: 'HRM, về Tổng quan' })).not.toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: 'HRM, về Tổng quan' })).toHaveLength(1);
      await userEvent.click(menuButton);
      const drawer = await screen.findByRole('dialog', { name: 'Điều hướng chính' });
      expect(within(drawer).getByRole('link', { name: 'HRM, về Tổng quan' })).toBeInTheDocument();
    });
  });
});
