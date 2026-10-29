import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { QUICK_ITEMS, quickApi, quickEmpty, quickFail } from '@/test/dashboard-approval-handlers';
import { HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const MANAGER: Account = { ...HR_ACCOUNT, fullName: 'Lê Văn Hùng', roles: ['LINE_MANAGER', 'EMPLOYEE'], dataScope: 'ORG_UNIT', permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW'], employeeId: '55555555-5555-4555-8555-555555555555' };
const block = () => screen.getByRole('region', { name: /^Chờ bạn duyệt/ });
const rowOf = (name: string) => within(block()).getByText(new RegExp(`· ${name}$`)).closest('li')!;
const open = (api = quickApi()) => {
  server.use(...api.handlers);
  renderRoutes(routes, { session: MANAGER, path: '/' });
  return api;
};

describe('Tổng quan: Chờ bạn duyệt', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('lists the waiting requests with their count, a link to the inbox and a tile with the same number', async () => {
    open();
    await within(await screen.findByRole('region', { name: /^Chờ bạn duyệt/ })).findByText('Trương Thị Ngọc Hân', { exact: false });
    expect(within(block()).getByRole('heading', { name: 'Chờ bạn duyệt' }).parentElement).toHaveTextContent('4');
    expect(within(block()).getByRole('link', { name: 'Xem tất cả yêu cầu chờ bạn duyệt' })).toHaveAttribute('href', '/approvals');
    const row = rowOf('Mạc Thị Quỳnh');
    expect(within(row).getByRole('link', { name: 'Cập nhật hồ sơ · Mạc Thị Quỳnh' })).toHaveAttribute('href', `/approvals/${QUICK_ITEMS[1]!.request.id}`);
    expect(row).toHaveTextContent('3 trường: số điện thoại, địa chỉ');
    expect(row).toHaveTextContent('Nhóm Web · Cấp 1/2');
    expect(within(rowOf('Lê Văn Hùng')).getByText(/^Tự duyệt \d{2}\/\d{2}$/)).toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Số liệu chính' })).getByText('Chờ bạn duyệt').closest('li')).toHaveTextContent('4'));
  });

  it('offers only "Mở để duyệt" for a request with a warning', async () => {
    open();
    await screen.findByText('Nguyễn Văn An', { exact: false });
    const row = rowOf('Nguyễn Văn An');
    expect(within(row).getByText('Dùng 1,5 ngày ứng trước')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Mở nghỉ phép của Nguyễn Văn An để duyệt' })).toBeInTheDocument();
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
  });

  it('approves through the inbox endpoint, shows the result, then drops the row and the count', async () => {
    const api = open();
    const user = userEvent.setup();
    await screen.findByText('Trương Thị Ngọc Hân', { exact: false });
    await user.click(within(rowOf('Trương Thị Ngọc Hân')).getByRole('button', { name: 'Duyệt nghỉ phép của Trương Thị Ngọc Hân' }));
    await waitFor(() => expect(within(block()).getByText('Đã duyệt nghỉ phép của Trương Thị Ngọc Hân')).toBeInTheDocument());
    expect(api.decisions).toEqual([{ id: QUICK_ITEMS[0]!.request.id, decision: 'approve', body: {} }]);
    expect(within(toastRegion()).getByText('Đã duyệt nghỉ phép cho Trương Thị Ngọc Hân')).toBeInTheDocument();
    expect(within(block()).getByText('Đã duyệt')).toBeInTheDocument();
    await waitFor(() => expect(within(block()).queryByText('Đã duyệt nghỉ phép của Trương Thị Ngọc Hân')).not.toBeInTheDocument(), { timeout: 6000 });
    expect(within(block()).getByRole('heading', { name: 'Chờ bạn duyệt' }).parentElement).toHaveTextContent('3');
    expect(api.lists()).toBeGreaterThan(1);
  }, 15000);

  it('says a request only moved on when the level is not the last', async () => {
    open();
    const user = userEvent.setup();
    await screen.findByText('Mạc Thị Quỳnh', { exact: false });
    await user.click(within(rowOf('Mạc Thị Quỳnh')).getByRole('button', { name: 'Duyệt cập nhật hồ sơ của Mạc Thị Quỳnh' }));
    const row = await waitFor(() => {
      const found = within(block()).getByText('Đã duyệt cấp 1 cập nhật hồ sơ của Mạc Thị Quỳnh').closest('li')!;
      return found;
    });
    expect(row).toHaveTextContent('Chuyển tới HR duyệt cấp 2');
    expect(within(row).getByText('Chuyển cấp 2')).toBeInTheDocument();
    expect(within(toastRegion()).getByText(/Chuyển tới HR duyệt cấp 2\.$/)).toBeInTheDocument();
  });

  it('never rejects without a reason, and sends the reason that was given', async () => {
    const api = open();
    const user = userEvent.setup();
    await screen.findByText('Trương Thị Ngọc Hân', { exact: false });
    await user.click(within(rowOf('Trương Thị Ngọc Hân')).getByRole('button', { name: 'Từ chối nghỉ phép của Trương Thị Ngọc Hân' }));
    const dialog = await screen.findByRole('dialog', { name: 'Từ chối nghỉ phép của Trương Thị Ngọc Hân?' });
    await user.click(within(dialog).getByRole('button', { name: 'Từ chối' }));
    expect(within(dialog).getByText('Nhập lý do từ chối.')).toBeInTheDocument();
    expect(api.decisions).toHaveLength(0);
    await user.type(within(dialog).getByRole('textbox', { name: /Lý do/ }), 'Trùng đợt chốt dự án');
    await user.click(within(dialog).getByRole('button', { name: 'Từ chối' }));
    await waitFor(() => expect(within(block()).getByText('Đã từ chối nghỉ phép của Trương Thị Ngọc Hân')).toBeInTheDocument());
    expect(api.decisions).toEqual([{ id: QUICK_ITEMS[0]!.request.id, decision: 'reject', body: { comment: 'Trùng đợt chốt dự án' } }]);
    expect(within(block()).getByText('Lý do đã gửi cho người gửi')).toBeInTheDocument();
  });

  it('removes a request someone else decided meanwhile, with a notice, and reloads', async () => {
    const api = open(quickApi(QUICK_ITEMS, { fail: { [QUICK_ITEMS[0]!.request.id]: 409 } }));
    const user = userEvent.setup();
    await screen.findByText('Trương Thị Ngọc Hân', { exact: false });
    await user.click(within(rowOf('Trương Thị Ngọc Hân')).getByRole('button', { name: 'Duyệt nghỉ phép của Trương Thị Ngọc Hân' }));
    expect(await within(block()).findByText('Yêu cầu của Trương Thị Ngọc Hân đã được xử lý. Danh sách đã được tải lại.')).toBeInTheDocument();
    await waitFor(() => expect(within(block()).queryByRole('link', { name: 'Nghỉ phép · Trương Thị Ngọc Hân' })).not.toBeInTheDocument());
    expect(api.lists()).toBeGreaterThan(1);
  });

  it('keeps the row, with its buttons, when the decision could not be saved', async () => {
    open(quickApi(QUICK_ITEMS, { fail: { [QUICK_ITEMS[0]!.request.id]: 500 } }));
    const user = userEvent.setup();
    await screen.findByText('Trương Thị Ngọc Hân', { exact: false });
    await user.click(within(rowOf('Trương Thị Ngọc Hân')).getByRole('button', { name: 'Duyệt nghỉ phép của Trương Thị Ngọc Hân' }));
    expect(await screen.findByText('Không lưu được quyết định. Chưa có gì thay đổi.')).toBeInTheDocument();
    expect(within(rowOf('Trương Thị Ngọc Hân')).getByRole('button', { name: 'Duyệt nghỉ phép của Trương Thị Ngọc Hân' })).toBeEnabled();
  });

  it('says "Bạn đã duyệt hết" when nothing waits', async () => {
    server.use(quickEmpty());
    renderRoutes(routes, { session: MANAGER, path: '/' });
    expect(await screen.findByText('Bạn đã duyệt hết')).toBeInTheDocument();
  });

  it('names what failed and retries on its own, the tiles stay', async () => {
    server.use(quickFail());
    renderRoutes(routes, { session: MANAGER, path: '/' });
    expect(await screen.findByText('Không tải được danh sách chờ bạn duyệt')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Số liệu chính' })).toBeInTheDocument();
  });

  it('shows the block to neither a plain Employee nor an Account without an Employee', async () => {
    server.use(...quickApi().handlers);
    renderRoutes(routes, { session: { ...MANAGER, employeeId: null }, path: '/' });
    await screen.findByRole('list', { name: 'Số liệu chính' });
    expect(screen.queryByRole('region', { name: /^Chờ bạn duyệt/ })).not.toBeInTheDocument();
  });
});
