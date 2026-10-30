import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { approvalApi } from '@/test/approval-handlers';
import { AN_ID, balancesOf, MINE, YEAR } from '@/test/leave-fixtures';
import { leaveApi, type LeaveApiOptions } from '@/test/leave-handlers';
import { notificationApi, NOTIFICATIONS } from '@/test/notification-handlers';
import { EMPLOYEE_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';
import type { NotificationItem } from '@/features/notification/api';

const AN: Account = { ...EMPLOYEE_ACCOUNT, fullName: 'Nguyễn Văn An', employeeId: AN_ID };
const block = (name: string) => screen.getByRole('region', { name });

type OpenOptions = { leave?: LeaveApiOptions; notifications?: NotificationItem[]; failNotifications?: boolean; session?: Account };
const notificationsFail = () => http.get('*/api/notifications', () => HttpResponse.json({ type: 'about:blank', status: 500, code: 'error.unknown' }, { status: 500 }));
function open({ leave, notifications, failNotifications = false, session = AN }: OpenOptions = {}) {
  const notes = notificationApi(notifications);
  server.use(...(failNotifications ? [notificationsFail()] : []), ...notes.handlers, ...leaveApi(leave).handlers, ...approvalApi().handlers);
  return { notes, ...renderRoutes(routes, { session, path: '/' }) };
}

describe('Tổng quan của Nhân viên', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('shows three shortcuts that lead to their screens', async () => {
    open();
    const shortcuts = screen.getByRole('list', { name: 'Lối tắt' });
    expect(within(shortcuts).getByRole('link', { name: 'Tạo đơn nghỉ' })).toHaveAttribute('href', '/leave/new');
    expect(within(shortcuts).getByRole('link', { name: 'Hồ sơ của tôi' })).toHaveAttribute('href', '/profile');
    expect(within(shortcuts).getByRole('link', { name: 'Đơn của tôi' })).toHaveAttribute('href', '/leave');
    await screen.findByRole('listitem', { name: `Phép năm ${YEAR}` });
  });

  it('reaches the shortcuts in order with the keyboard', async () => {
    const user = userEvent.setup();
    open();
    const links = within(screen.getByRole('list', { name: 'Lối tắt' })).getAllByRole('link');
    links[0]!.focus();
    await user.tab();
    expect(links[1]).toHaveFocus();
    await user.tab();
    expect(links[2]).toHaveFocus();
    await screen.findByRole('listitem', { name: `Phép năm ${YEAR}` });
  });

  it('opens a shortcut', async () => {
    const user = userEvent.setup();
    const { router } = open();
    await user.click(within(screen.getByRole('list', { name: 'Lối tắt' })).getByRole('link', { name: 'Tạo đơn nghỉ' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/leave/new'));
  });

  it('shows the Phép năm balance of /leave, in the same figures', async () => {
    const user = userEvent.setup();
    const { router } = open({ leave: { balances: balancesOf(7.5) } });
    const row = await screen.findByRole('listitem', { name: `Phép năm ${YEAR}` });
    expect(within(row).getByText('7,5')).toBeInTheDocument();
    expect(within(row).getByText('ngày còn lại')).toBeInTheDocument();
    expect(row).toHaveTextContent('Đang chờ 1,5 · Đã dùng 4');
    // Only a type with a limit has a balance: Nghỉ ốm and the others are not listed.
    expect(within(block('Số dư phép')).getAllByRole('listitem')).toHaveLength(1);
    await user.click(within(block('Số dư phép')).getByRole('link', { name: 'Xem chi tiết số dư phép' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/leave'));
    const card = await screen.findByRole('region', { name: `Phép năm ${YEAR}` });
    expect(within(card).getByText('7,5')).toBeInTheDocument();
  });

  it('shows a balance that went negative in danger, as /leave does', async () => {
    open({ leave: { balances: balancesOf(-1.5) } });
    const row = await screen.findByRole('listitem', { name: `Phép năm ${YEAR}` });
    expect(within(row).getByText('−1,5')).toHaveClass('text-danger');
    expect(within(row).getByText('ngày, đang ứng trước')).toBeInTheDocument();
  });

  it('lists the requests that wait or were returned, each with its status, and leaves out the approved one', async () => {
    open();
    const requests = await screen.findByRole('list', { name: 'Đơn đang chờ' });
    const rows = within(requests).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText('Chờ duyệt')).toBeInTheDocument();
    expect(within(rows[0]!).getByRole('link')).toHaveAttribute('href', `/leave/requests/${MINE[0]!.id}`);
    expect(rows[0]).toHaveTextContent(/\(chiều\) – .* · 1,5 ngày/);
    expect(within(rows[1]!).getByText('Cần bổ sung')).toBeInTheDocument();
    expect(within(block('Đơn đang chờ').querySelector('header')!).getByText('2')).toBeInTheDocument();
    expect(within(block('Đơn đang chờ')).getByRole('link', { name: 'Xem tất cả đơn của tôi' })).toHaveAttribute('href', '/leave');
  });

  it('says so when no request is waiting', async () => {
    open({ leave: { mine: [MINE[1]!] } });
    expect(await within(block('Đơn đang chờ')).findByText('Không có đơn nào đang chờ')).toBeInTheDocument();
    expect(within(block('Đơn đang chờ')).queryByRole('list')).not.toBeInTheDocument();
  });

  it('marks a block busy while it loads', async () => {
    server.use(http.get('*/api/leave-requests', async () => { await delay(60); return HttpResponse.json({ items: MINE, total: MINE.length }); }));
    open();
    expect(block('Đơn đang chờ')).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(block('Đơn đang chờ')).not.toHaveAttribute('aria-busy'));
  });

  it('names what failed, retries, and keeps the other blocks', async () => {
    const user = userEvent.setup();
    open({ leave: { failBalances: true } });
    expect(await within(block('Số dư phép')).findByRole('alert')).toHaveTextContent('Không tải được số dư phép');
    expect(await screen.findByRole('list', { name: 'Đơn đang chờ' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Lối tắt' })).toBeInTheDocument();
    server.use(http.get('*/api/leave-balances', () => HttpResponse.json(balancesOf())));
    await user.click(within(block('Số dư phép')).getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('listitem', { name: `Phép năm ${YEAR}` })).toBeInTheDocument();
  });

  it('lists the latest notifications, opens one and marks it read', async () => {
    const user = userEvent.setup();
    const { notes, router } = open();
    const list = await screen.findByRole('list', { name: 'Thông báo gần đây' });
    const links = within(list).getAllByRole('link');
    expect(links).toHaveLength(NOTIFICATIONS.length);
    expect(links[0]).toHaveTextContent('Nguyễn Văn An gửi cập nhật hồ sơ, chờ bạn duyệt');
    expect(within(list).getAllByRole('img', { name: 'Chưa đọc' })).toHaveLength(2);
    await user.click(links[0]!);
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/approvals\//));
    expect(notes.reads).toEqual(['n-1']);
  });

  it('shows at most five notifications', async () => {
    const many = Array.from({ length: 8 }, (_, index) => ({ ...NOTIFICATIONS[0]!, id: `n-${index + 10}`, read: true }));
    open({ notifications: many });
    const list = await screen.findByRole('list', { name: 'Thông báo gần đây' });
    expect(within(list).getAllByRole('link')).toHaveLength(5);
  });

  it('says so when there is no notification', async () => {
    open({ notifications: [] });
    expect(await within(block('Thông báo gần đây')).findByText('Chưa có thông báo nào')).toBeInTheDocument();
  });

  it('names a failed notification block and retries', async () => {
    const user = userEvent.setup();
    open({ failNotifications: true });
    expect(await within(block('Thông báo gần đây')).findByRole('alert')).toHaveTextContent('Không tải được thông báo');
    expect(screen.getByRole('list', { name: 'Lối tắt' })).toBeInTheDocument();
    server.use(...notificationApi().handlers);
    await user.click(within(block('Thông báo gần đây')).getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('list', { name: 'Thông báo gần đây' })).toBeInTheDocument();
  });

  it('shows nothing personal, and asks for nothing, to an Account without an Employee', async () => {
    const asked: string[] = [];
    server.events.on('request:start', ({ request }) => asked.push(new URL(request.url).pathname));
    open({ session: EMPLOYEE_ACCOUNT });
    expect(await screen.findByText('Tài khoản này chưa gắn với hồ sơ nhân viên')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Lối tắt' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Số dư phép' })).not.toBeInTheDocument();
    expect(asked.filter((path) => /leave-balances|leave-requests|\/api\/notifications$/.test(path))).toEqual([]);
    server.events.removeAllListeners();
  });

  it('leaves the company blocks to an Account that has them', async () => {
    open({ session: { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW'], employeeId: AN_ID } });
    await screen.findByRole('heading', { level: 1, name: /^Chào buổi/ });
    expect(screen.queryByRole('list', { name: 'Lối tắt' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Số dư phép' })).not.toBeInTheDocument();
  });

  it('is written in English too', async () => {
    await i18n.changeLanguage('en');
    open();
    const shortcuts = screen.getByRole('list', { name: 'Shortcuts' });
    expect(within(shortcuts).getByRole('link', { name: 'New leave request' })).toBeInTheDocument();
    expect(within(shortcuts).getByRole('link', { name: 'My profile' })).toBeInTheDocument();
    expect(within(shortcuts).getByRole('link', { name: 'My requests' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Leave balance' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Pending requests' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Recent notifications' })).toBeInTheDocument();
    await i18n.changeLanguage('vi');
  });
});
