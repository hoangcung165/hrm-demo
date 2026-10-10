import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { approvalId } from '@/test/approval-fixtures';
import { approvalApi } from '@/test/approval-handlers';
import { notificationApi } from '@/test/notification-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const MAI: Account = { ...HR_ACCOUNT, employeeId: 'e-11' };

const open = (api = notificationApi()) => {
  server.use(...api.handlers, ...approvalApi().handlers);
  return { api, ...renderRoutes(routes, { session: MAI, path: '/approvals' }) };
};
const bell = () => within(screen.getByRole('banner')).findByRole('button', { name: /^Thông báo/ });

describe('NotificationBell', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('shows the unread count and lists the new and earlier notifications with who did what', async () => {
    const user = userEvent.setup();
    open();
    await waitFor(async () => expect(await bell()).toHaveAccessibleName('Thông báo, 2 chưa đọc'));
    await user.click(await bell());
    const panel = await screen.findByRole('dialog', { name: 'Thông báo' });
    const fresh = await within(panel).findByRole('group', { name: 'Mới' });
    expect(within(fresh).getAllByRole('link')).toHaveLength(2);
    expect(within(fresh).getAllByRole('link')[0]).toHaveTextContent('Nguyễn Văn An gửi cập nhật hồ sơ, chờ bạn duyệt');
    expect(within(fresh).getAllByRole('link')[0]).toHaveTextContent(/Hôm nay \d\d:\d\d · Số điện thoại, địa chỉ|Hôm qua/);
    expect(within(fresh).getAllByRole('link')[1]).toHaveTextContent('Phạm Quốc Bảo ủy quyền duyệt cho bạn');
    expect(within(fresh).getAllByRole('img', { name: 'Chưa đọc' })).toHaveLength(2);
    const earlier = within(panel).getByRole('group', { name: 'Trước đó' });
    expect(within(earlier).getByText('Lê Văn Hùng', { exact: false })).toBeInTheDocument();
    expect(within(earlier).getByText('Cập nhật hồ sơ của bạn đã được tự duyệt')).toBeInTheDocument();
  });

  it('opens the request of a notification, marks it read and lowers the count', async () => {
    const user = userEvent.setup();
    const { api, router } = open();
    await user.click(await bell());
    const panel = await screen.findByRole('dialog', { name: 'Thông báo' });
    await user.click(within(await within(panel).findByRole('group', { name: 'Mới' })).getAllByRole('link')[0]!);
    await waitFor(() => expect(router.state.location.pathname).toBe(`/approvals/${approvalId(1)}`));
    expect(api.reads).toEqual(['n-1']);
    expect(screen.queryByRole('dialog', { name: 'Thông báo' })).not.toBeInTheDocument();
    await waitFor(async () => expect(await bell()).toHaveAccessibleName('Thông báo, 1 chưa đọc'));
  });

  it('marks everything read at once', async () => {
    const user = userEvent.setup();
    const { api } = open();
    await user.click(await bell());
    const panel = await screen.findByRole('dialog', { name: 'Thông báo' });
    await user.click(await within(panel).findByRole('button', { name: 'Đánh dấu đã đọc hết' }));
    await waitFor(() => expect(within(panel).queryByRole('group', { name: 'Mới' })).not.toBeInTheDocument());
    expect(api.reads).toEqual(['all']);
    expect(await bell()).toHaveAccessibleName('Thông báo');
    expect(within(panel).getAllByRole('link', { name: /./ }).length).toBeGreaterThan(0);
  });

  it('says when there is nothing yet', async () => {
    const user = userEvent.setup();
    open(notificationApi([]));
    await user.click(await bell());
    expect(await screen.findByText('Chưa có thông báo nào')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở Hộp thư duyệt' })).toBeInTheDocument();
  });
});
