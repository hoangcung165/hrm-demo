import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { teamApi, teamFail, teamForbidden, TEAM_MEMBERS, teamOf } from '@/test/dashboard-team-handlers';
import { EMPLOYEE_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';
import { http, HttpResponse } from 'msw';

const MANAGER: Account = { ...HR_ACCOUNT, fullName: 'Lê Văn Hùng', roles: ['LINE_MANAGER', 'EMPLOYEE'], dataScope: 'ORG_UNIT', permissions: [...HR_ACCOUNT.permissions.filter((p) => p !== 'RESOURCE_VIEW'), 'EMPLOYEE_VIEW'], employeeId: '55555555-5555-4555-8555-555555555555' };
const WITH_HEATMAP: Account = { ...MANAGER, permissions: [...MANAGER.permissions, 'RESOURCE_VIEW'] };
const block = () => screen.getByRole('region', { name: /^Nhóm của tôi/ });
const rowOf = (name: string) => within(block()).getByText(name).closest('li')!;
const open = (session: Account = MANAGER, api = teamApi()) => {
  server.use(api.handler);
  renderRoutes(routes, { session, path: '/' });
  return api;
};

describe('Tổng quan: Nhóm của tôi', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('lists every member with this week\'s load, the count and the week', async () => {
    open();
    await within(await screen.findByRole('region', { name: /^Nhóm của tôi/ })).findByText('Cao Minh Trí');
    expect(within(block()).getByRole('heading', { name: 'Nhóm của tôi' }).parentElement).toHaveTextContent('4');
    expect(block()).toHaveTextContent('Tải phân bổ tuần 02/11 – 08/11/2026');
    expect(within(block()).getAllByRole('listitem').length).toBeGreaterThanOrEqual(4);
    expect(within(rowOf('Cao Minh Trí')).getByRole('link', { name: /Cao Minh Trí/ })).toHaveAttribute('href', '/employees/e-41');
  });

  it('never shows a load by colour alone: the percent is in the cell and read out with its level', async () => {
    open();
    await screen.findByText('Cao Minh Trí');
    const over = within(rowOf('Cao Minh Trí')).getByRole('img', { name: 'Tải phân bổ 120%, quá tải' });
    expect(over).toHaveTextContent('120%');
    const bench = within(rowOf('Mạc Thị Quỳnh')).getByRole('img', { name: 'Tải phân bổ 40%' });
    expect(bench).toHaveTextContent('40%');
    expect(within(rowOf('Nguyễn Văn An')).getByRole('img', { name: 'Tải phân bổ 80%' })).toHaveTextContent('80%');
  });

  it('names the upcoming leave, and says so when there is none', async () => {
    open();
    await screen.findByText('Mạc Thị Quỳnh');
    expect(rowOf('Mạc Thị Quỳnh')).toHaveTextContent('Phép năm · 05/11 – 06/11/2026');
    expect(rowOf('Mạc Thị Quỳnh')).toHaveTextContent('Phép năm · 16/11/2026');
    expect(rowOf('Nguyễn Văn An')).toHaveTextContent('Phép năm · 10/11/2026');
    expect(rowOf('Cao Minh Trí')).toHaveTextContent('Không có lịch nghỉ trong 30 ngày tới');
  });

  it('counts the leave beyond the two a row names', async () => {
    const leave = (day: string) => ({ leaveType: { id: 'lt-pn', code: 'PN', name: 'Phép năm', active: true }, startDate: day, endDate: day });
    const [first] = TEAM_MEMBERS;
    open(MANAGER, teamApi([{ ...first!, upcomingLeave: [leave('2026-11-03'), leave('2026-11-10'), leave('2026-11-17'), leave('2026-11-24')] }]));
    await screen.findByText('Cao Minh Trí');
    expect(rowOf('Cao Minh Trí')).toHaveTextContent('và 2 lần nghỉ nữa');
  });

  it('leads from the load to the person\'s heatmap row only for an Account that may open the Heatmap', async () => {
    open(WITH_HEATMAP);
    await screen.findByText('Cao Minh Trí');
    expect(within(block()).getByRole('link', { name: 'Xem heatmap Tải phân bổ' })).toHaveAttribute('href', '/resources?tab=heatmap');
    expect(within(rowOf('Cao Minh Trí')).getByRole('link', { name: 'Xem Tải phân bổ 120% của Cao Minh Trí trên heatmap' })).toHaveAttribute('href', `/resources?tab=heatmap&q=${encodeURIComponent('Cao Minh Trí')}`);
  });

  it('shows the load without a heatmap link for an Account that may not open the Heatmap', async () => {
    open(MANAGER);
    await screen.findByText('Cao Minh Trí');
    expect(within(block()).queryByRole('link', { name: /heatmap/i })).not.toBeInTheDocument();
    expect(within(rowOf('Cao Minh Trí')).getByRole('img', { name: 'Tải phân bổ 120%, quá tải' })).toBeInTheDocument();
  });

  it('shows the first ten and the rest after "Xem thêm"', async () => {
    const many = Array.from({ length: 12 }, (_, n) => ({ ...TEAM_MEMBERS[0]!, employee: { ...TEAM_MEMBERS[0]!.employee, id: `e-9${n}`, code: `NV009${n}`, fullName: `Người ${String(n).padStart(2, '0')}` } }));
    const user = userEvent.setup();
    open(MANAGER, teamApi(many));
    await screen.findByText('Người 00');
    expect(within(block()).queryByText('Người 11')).not.toBeInTheDocument();
    await user.click(within(block()).getByRole('button', { name: 'Xem thêm 2 người' }));
    expect(within(block()).getByText('Người 11')).toBeInTheDocument();
    expect(within(block()).queryByRole('button', { name: /Xem thêm/ })).not.toBeInTheDocument();
  });

  it('says the team is empty when nobody belongs to the unit', async () => {
    server.use(http.get('*/api/dashboard/team', () => HttpResponse.json(teamOf([]))));
    renderRoutes(routes, { session: MANAGER, path: '/' });
    expect(await within(await screen.findByRole('region', { name: /^Nhóm của tôi/ })).findByText('Nhóm chưa có ai')).toBeInTheDocument();
  });

  it('fails on its own with a retry that loads the team', async () => {
    const user = userEvent.setup();
    server.use(teamFail());
    renderRoutes(routes, { session: MANAGER, path: '/' });
    expect(await within(await screen.findByRole('region', { name: /^Nhóm của tôi/ })).findByText('Không tải được nhóm của bạn')).toBeInTheDocument();
    // The rest of the page is still there.
    expect(screen.getByRole('heading', { level: 1, name: /^Chào buổi/ })).toBeInTheDocument();
    server.use(teamApi().handler);
    await user.click(within(block()).getByRole('button', { name: 'Thử lại' }));
    expect(await within(block()).findByText('Cao Minh Trí')).toBeInTheDocument();
  });

  it('has no block, and no error, for a Quản lý trực tiếp who heads no unit', async () => {
    server.use(teamForbidden());
    renderRoutes(routes, { session: MANAGER, path: '/' });
    await waitFor(() => expect(screen.queryByRole('region', { name: /^Nhóm của tôi/ })).not.toBeInTheDocument());
    await screen.findByRole('heading', { level: 1, name: /^Chào buổi/ });
    await waitFor(() => expect(screen.queryByText('Không tải được nhóm của bạn')).not.toBeInTheDocument());
  });

  it('does not ask for a team of an Account that is not a Quản lý trực tiếp', async () => {
    const api = teamApi();
    server.use(api.handler);
    renderRoutes(routes, { session: { ...EMPLOYEE_ACCOUNT, employeeId: '55555555-5555-4555-8555-555555555555' }, path: '/' });
    await screen.findByRole('heading', { level: 1, name: /^Chào buổi/ });
    expect(screen.queryByRole('region', { name: /^Nhóm của tôi/ })).not.toBeInTheDocument();
    expect(api.calls()).toBe(0);
  });

  it('has the same strings in English', async () => {
    await i18n.changeLanguage('en');
    open();
    const region = await screen.findByRole('region', { name: /^My team/ });
    expect(await within(region).findByText('Cao Minh Trí')).toBeInTheDocument();
    expect(within(region).getByRole('img', { name: 'Allocation load 120%, overloaded' })).toBeInTheDocument();
    expect(region).toHaveTextContent('No leave in the next 30 days');
  });
});
