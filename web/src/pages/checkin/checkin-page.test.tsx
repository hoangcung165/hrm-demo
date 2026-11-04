import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { AN_ID } from '@/test/leave-fixtures';
import { ACCEPTED, checkinApi, WITHDRAWN, type CheckinApiOptions } from '@/test/mobile-checkin-handlers';
import { EMPLOYEE_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const AN: Account = { ...EMPLOYEE_ACCOUNT, fullName: 'Nguyễn Văn An', employeeId: AN_ID };
const AGREE = 'Tôi đã đọc và đồng ý cho Công ty Cổ phần Công nghệ Mẫu dùng vị trí và ảnh khi tôi chấm công.';

function open(options: CheckinApiOptions = {}) {
  const api = checkinApi(options);
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session: AN, path: '/checkin' }) };
}

describe('Chấm công: đồng ý lần đầu', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('explains what is collected, who sees it and how long, under Decree 13/2023', async () => {
    open();
    expect(await screen.findByRole('heading', { level: 1, name: 'Trước lần chấm công đầu tiên' })).toBeInTheDocument();
    expect(screen.getByText(/Nghị định 13\/2023\/NĐ-CP/)).toBeInTheDocument();
    const notice = screen.getByRole('list', { name: 'Dữ liệu được thu thập khi chấm công' });
    const items = within(notice).getAllByRole('listitem');
    ['Vị trí lúc bấm chấm công', 'Một ảnh mỗi lần chấm công', 'Ai xem được', 'Lưu bao lâu'].forEach((title, index) => expect(items[index]).toHaveTextContent(title));
    expect(items[2]).toHaveTextContent('Mỗi lần xem ảnh đều được ghi lại.');
    expect(await screen.findByRole('checkbox', { name: AGREE })).not.toBeChecked();
    expect(screen.getByText('Xem lại hoặc rút lại đồng ý trong Hồ sơ của tôi.')).toBeInTheDocument();
  });

  it('accepts nothing until the box is ticked', async () => {
    const user = userEvent.setup();
    const { api } = open();
    await user.click(await screen.findByRole('button', { name: 'Đồng ý và chấm công' }));
    const box = screen.getByRole('checkbox', { name: AGREE });
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription('Đánh dấu ô đồng ý ở trên để tiếp tục.');
    expect(api.accepts).toHaveLength(0);
    await user.click(box);
    expect(screen.queryByText('Đánh dấu ô đồng ý ở trên để tiếp tục.')).not.toBeInTheDocument();
  });

  it('stores the acceptance of the wording shown, then goes on to the check-in', async () => {
    const user = userEvent.setup();
    const { api } = open();
    await user.click(await screen.findByRole('checkbox', { name: AGREE }));
    await user.click(screen.getByRole('button', { name: 'Đồng ý và chấm công' }));
    expect(await screen.findByRole('heading', { name: 'Bạn đã đồng ý chấm công bằng điện thoại' })).toBeInTheDocument();
    expect(api.accepts).toEqual([{ noticeVersion: 1 }]);
    expect(api.consent().accepted).toBe(true);
  });

  it('"Để sau" goes back to Tổng quan and stores nothing', async () => {
    const user = userEvent.setup();
    const { api, router } = open();
    await user.click(await screen.findByRole('link', { name: 'Để sau' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(api.accepts).toHaveLength(0);
  });

  it('asks to read again when the wording changed meanwhile, and accepts the new one', async () => {
    const user = userEvent.setup();
    const { api } = open({ outdatedTo: 2 });
    await user.click(await screen.findByRole('checkbox', { name: AGREE }));
    await user.click(screen.getByRole('button', { name: 'Đồng ý và chấm công' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nội dung thông báo vừa được cập nhật');
    await waitFor(() => expect(screen.getByRole('checkbox', { name: AGREE })).not.toBeChecked());
    await user.click(screen.getByRole('checkbox', { name: AGREE }));
    await user.click(screen.getByRole('button', { name: 'Đồng ý và chấm công' }));
    await screen.findByRole('heading', { name: 'Bạn đã đồng ý chấm công bằng điện thoại' });
    expect(api.accepts).toEqual([{ noticeVersion: 1 }, { noticeVersion: 2 }]);
  });

  it('says the consent was not saved when the request fails, and keeps the box ticked', async () => {
    const user = userEvent.setup();
    open({ failAccept: true });
    await user.click(await screen.findByRole('checkbox', { name: AGREE }));
    await user.click(screen.getByRole('button', { name: 'Đồng ý và chấm công' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được đồng ý');
    expect(screen.getByRole('checkbox', { name: AGREE })).toBeChecked();
  });

  it('asks again after a withdrawal', async () => {
    open({ consent: WITHDRAWN });
    expect(await screen.findByRole('heading', { level: 1, name: 'Đồng ý lại trước khi chấm công' })).toBeInTheDocument();
  });

  it('with the consent in force, goes straight on to the check-in', async () => {
    open({ consent: ACCEPTED });
    expect(await screen.findByRole('heading', { name: 'Bạn đã đồng ý chấm công bằng điện thoại' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('an Account whose Employee cannot check in gets the denied state', async () => {
    open({ forbidden: true });
    expect(await screen.findByRole('heading', { name: 'Tài khoản này không chấm công bằng điện thoại được' })).toBeInTheDocument();
  });

  it('a failed read can be tried again', async () => {
    const user = userEvent.setup();
    open({ failConsent: true });
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được thông tin chấm công');
    server.use(...checkinApi().handlers);
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByRole('heading', { level: 1, name: 'Trước lần chấm công đầu tiên' });
  });

  it('leads back to Tổng quan', async () => {
    open();
    await screen.findByRole('heading', { level: 1, name: 'Trước lần chấm công đầu tiên' });
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Tổng quan' })).toHaveAttribute('href', '/');
  });
});
