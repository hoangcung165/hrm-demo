import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { DASHBOARD_TILES, tilesApi, tilesFail } from '@/test/dashboard-handlers';
import { EMPLOYEE_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW'], employeeId: '55555555-5555-4555-8555-555555555555' };
// 10:00 on the company's clock, whatever the zone of the machine.
const MORNING = new Date('2026-11-04T03:00:00Z');
const tile = (label: string) => within(screen.getByRole('list', { name: 'Số liệu chính' })).getByText(label).closest('li')!;

describe('Tổng quan', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
    vi.useFakeTimers({ toFake: ['Date'], now: MORNING });
  });
  afterEach(() => vi.useRealTimers());

  it('greets by the time of day and shows the numbers of the API in the stat tiles', async () => {
    server.use(tilesApi().handler);
    renderRoutes(routes, { session: HR, path: '/' });
    expect(screen.getByRole('heading', { level: 1, name: 'Chào buổi sáng, Mai' })).toBeInTheDocument();
    await waitFor(() => expect(tile('Nhân viên')).toHaveTextContent('186'));
    expect(tile('Nhân viên')).toHaveTextContent('Trong đó 12 đang thử việc');
    expect(tile('Làm việc hôm nay')).toHaveTextContent('183');
    expect(tile('Nghỉ phép hôm nay')).toHaveTextContent('4');
  });

  it('leads from a tile to the list behind it, already filtered', async () => {
    server.use(tilesApi().handler);
    renderRoutes(routes, { session: HR, path: '/' });
    await waitFor(() => expect(tile('Nhân viên')).toHaveTextContent('186'));
    expect(within(tile('Nhân viên')).getByRole('link')).toHaveAttribute('href', '/employees');
    expect(within(tile('Nghỉ phép hôm nay')).getByRole('link')).toHaveAttribute('href', `/leave-calendar?view=week&date=${DASHBOARD_TILES.date}`);
    // "Working today" is a figure, not a list.
    expect(within(tile('Làm việc hôm nay')).queryByRole('link')).not.toBeInTheDocument();
  });

  it('marks the tiles busy while they load', async () => {
    server.use(tilesApi(DASHBOARD_TILES, { delayMs: 50 }).handler);
    renderRoutes(routes, { session: HR, path: '/' });
    expect(await screen.findByRole('list', { name: 'Số liệu chính' })).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(screen.getByRole('list', { name: 'Số liệu chính' })).not.toHaveAttribute('aria-busy'), { timeout: 2000 });
  });

  it('names what failed and retries without hiding the rest of the page', async () => {
    server.use(tilesFail());
    renderRoutes(routes, { session: HR, path: '/' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được số liệu tổng quan');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    server.use(http.get('*/api/dashboard/tiles', () => HttpResponse.json(DASHBOARD_TILES)));
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(tile('Nhân viên')).toHaveTextContent('186'));
  });

  it('shows no tiles, and asks for none, to an Account that may not view Employees', async () => {
    const tiles = tilesApi();
    server.use(tiles.handler);
    renderRoutes(routes, { session: EMPLOYEE_ACCOUNT, path: '/' });
    expect(screen.getByRole('heading', { level: 1, name: 'Chào buổi sáng, Huy' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Số liệu chính' })).not.toBeInTheDocument();
    expect(tiles.calls()).toBe(0);
  });

  it('says so when the Account is not linked to an Employee', async () => {
    server.use(tilesApi().handler);
    renderRoutes(routes, { session: { ...HR, employeeId: null }, path: '/' });
    expect(screen.getByText('Tài khoản này chưa gắn với hồ sơ nhân viên')).toBeInTheDocument();
    await waitFor(() => expect(tile('Nhân viên')).toHaveTextContent('186'));
  });

  it('greets in the evening on the company clock', async () => {
    vi.setSystemTime(new Date('2026-11-04T12:30:00Z'));
    server.use(tilesApi().handler);
    renderRoutes(routes, { session: HR, path: '/' });
    expect(screen.getByRole('heading', { level: 1, name: 'Chào buổi tối, Mai' })).toBeInTheDocument();
  });
});
