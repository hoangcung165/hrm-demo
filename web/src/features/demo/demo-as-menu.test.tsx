import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import i18n from '@/i18n';
import { demoApi, PERSONAS, personaAccount } from '@/test/demo-handlers';
import { ADMIN_ACCOUNT, HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const header = () => screen.getByRole('banner');
/** Opens the header menu once the button reads `name`: a persona's title shows only after the list has arrived. */
const openMenu = async (name: string | RegExp = /^Demo as/) => {
  await userEvent.click(await within(header()).findByRole('button', { name }));
  return screen.findByRole('menu');
};

describe('Demo as…', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('is not rendered, and reads nothing, while the demo flag is off', async () => {
    // No handler for the persona list: a request would fail the test.
    renderRoutes(routes, { session: HR_ACCOUNT });
    expect(within(header()).queryByRole('button', { name: /Demo as/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mở menu điều hướng' }));
    const drawer = await screen.findByRole('dialog', { name: 'Điều hướng chính' });
    expect(within(drawer).queryByRole('button', { name: /Demo as/ })).not.toBeInTheDocument();
  });

  it('names the active persona by title and lists every persona, the active one marked, an unavailable one disabled', async () => {
    server.use(...demoApi().handlers);
    renderRoutes(routes, { session: personaAccount('HR') });
    const button = await within(header()).findByRole('button', { name: 'Demo as: Trưởng phòng nhân sự' });
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    const menu = await openMenu('Demo as: Trưởng phòng nhân sự');
    expect(within(menu).getByText('Đăng nhập nhanh bằng persona')).toBeInTheDocument();
    const items = within(menu).getAllByRole('menuitem');
    const expected = [
      ['Đỗ Minh Quân', 'Admin · Quản trị hệ thống'],
      ['Trần Thị Mai', 'HR · Trưởng phòng nhân sự'],
      ['Lê Văn Hùng', 'Quản lý trực tiếp · Trưởng nhóm Web'],
      ['Vũ Thị Lan', 'PM · Quản lý dự án'],
      ['Hoàng Thị Thu', 'Tài khoản đã khóa hoặc chưa được tạo'],
      // Role and title are the same word: the title alone.
      ['Phạm Quốc Bảo', 'Giám đốc'],
      ['Nguyễn Văn An', 'Nhân viên · Lập trình viên'],
    ];
    expect(items).toHaveLength(expected.length);
    expected.forEach(([name, caption], index) => {
      expect(within(items[index]!).getByText(name!)).toBeInTheDocument();
      expect(within(items[index]!).getByText(caption!)).toBeInTheDocument();
    });
    expect(items[1]).toHaveAttribute('aria-current', 'true');
    expect(items.filter((item) => item.getAttribute('aria-current'))).toHaveLength(1);
    expect(items[4]).toHaveAttribute('aria-disabled', 'true');
  });

  it('reads "Demo as…" and marks no persona for a normal Account', async () => {
    server.use(...demoApi().handlers);
    renderRoutes(routes, { session: { ...ADMIN_ACCOUNT, demo: { enabled: true, persona: null } } });
    const menu = await openMenu('Demo as…');
    await within(menu).findByText('Đỗ Minh Quân');
    expect(within(menu).getAllByRole('menuitem').filter((item) => item.getAttribute('aria-current'))).toHaveLength(0);
  });

  it('switches in one click: new session, the overview, the new menu and a toast', async () => {
    const api = demoApi();
    server.use(...api.handlers);
    const { router, queryClient } = renderRoutes(routes, { session: personaAccount('HR'), path: '/company' });
    const menu = await openMenu('Demo as: Trưởng phòng nhân sự');
    await userEvent.click(await within(menu).findByRole('menuitem', { name: /Phạm Quốc Bảo/ }));
    expect(await within(toastRegion()).findByText('Đang dùng Tài khoản của Phạm Quốc Bảo (Giám đốc, Nhân viên)')).toBeInTheDocument();
    expect(api.signIns).toEqual(['DIRECTOR']);
    expect(router.state.location.pathname).toBe('/');
    expect(queryClient.getQueryData(['session'])).toMatchObject({ fullName: 'Phạm Quốc Bảo', demo: { persona: 'DIRECTOR' } });
    expect(within(header()).getByRole('button', { name: 'Menu Tài khoản: Phạm Quốc Bảo' })).toBeInTheDocument();
    expect(await within(header()).findByRole('button', { name: 'Demo as: Giám đốc' })).toBeEnabled();
    // The Director does not get the Account list in the navigation.
    expect(within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).queryByRole('link', { name: 'Tài khoản và vai trò' })).not.toBeInTheDocument();
  });

  it('keeps the session and reloads the list when the persona was locked meanwhile', async () => {
    let personas = PERSONAS;
    const api = demoApi({ personas: () => personas });
    server.use(...api.handlers);
    const { queryClient } = renderRoutes(routes, { session: personaAccount('HR') });
    const menu = await openMenu('Demo as: Trưởng phòng nhân sự');
    const pm = await within(menu).findByRole('menuitem', { name: /Vũ Thị Lan/ });
    const readsBefore = api.listReads();
    personas = PERSONAS.map((persona) => (persona.persona === 'PROJECT_MANAGER' ? { ...persona, available: false } : persona));
    await userEvent.click(pm);
    const alert = await within(toastRegion()).findByRole('alert');
    expect(alert).toHaveTextContent('Không chuyển được sang Vũ Thị Lan');
    expect(alert).toHaveTextContent('Persona này đang bị khóa hoặc chưa được tạo. Chọn persona khác.');
    expect(queryClient.getQueryData(['session'])).toMatchObject({ fullName: 'Trần Thị Mai' });
    await waitFor(() => expect(api.listReads()).toBeGreaterThan(readsBefore));
    const again = await openMenu('Demo as: Trưởng phòng nhân sự');
    await waitFor(() => expect(within(again).getByRole('menuitem', { name: /Vũ Thị Lan/ })).toHaveAttribute('aria-disabled', 'true'));
  });

  it('says so in the menu when the list cannot be loaded', async () => {
    server.use(...demoApi({ listFails: true }).handlers);
    renderRoutes(routes, { session: personaAccount('HR') });
    const menu = await openMenu('Demo as…');
    expect(await within(menu).findByText('Không tải được danh sách persona.')).toBeInTheDocument();
    expect(within(menu).queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('sits in the nav drawer, named by role, and closes the drawer after a switch', async () => {
    const api = demoApi();
    server.use(...api.handlers);
    renderRoutes(routes, { session: personaAccount('HR') });
    await userEvent.click(screen.getByRole('button', { name: 'Mở menu điều hướng' }));
    const drawer = await screen.findByRole('dialog', { name: 'Điều hướng chính' });
    await userEvent.click(within(drawer).getByRole('button', { name: 'Demo as: HR' }));
    const menu = await screen.findByRole('menu', { name: 'Demo as: HR' });
    await userEvent.click(await within(menu).findByRole('menuitem', { name: /Nguyễn Văn An/ }));
    expect(await within(toastRegion()).findByText('Đang dùng Tài khoản của Nguyễn Văn An (Nhân viên)')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.signIns).toEqual(['EMPLOYEE']);
  });
});
