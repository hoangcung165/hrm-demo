import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { formatDate } from '@/lib/format';
import { AN_ID, MINE, nextWeekday, requestId } from '@/test/leave-fixtures';
import { leaveApi } from '@/test/leave-handlers';
import { EMPLOYEE_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const AN: Account = { ...EMPLOYEE_ACCOUNT, employeeId: AN_ID };

const open = (path: string) => {
  const api = leaveApi();
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session: AN, path }) };
};

describe('LeaveRequestPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('shows a waiting request with its days, people copied, balance after and steps, and cancels it', async () => {
    const user = userEvent.setup();
    const { api } = open(`/leave/requests/${requestId(1)}`);
    expect(await screen.findByRole('heading', { name: 'Đơn nghỉ' })).toBeInTheDocument();
    expect(screen.getByText('Phép năm · 1,5 ngày')).toBeInTheDocument();
    const info = screen.getByRole('region', { name: 'Thông tin đơn' });
    expect(within(info).getByText(/^Thứ Năm .* buổi chiều đến Thứ Sáu .* cả ngày$/)).toBeInTheDocument();
    expect(within(info).getByText('Về quê dự đám cưới')).toBeInTheDocument();
    expect(within(info).getByText('Vũ Thị Lan')).toBeInTheDocument();
    expect(within(info).getByText('4,5 ngày Phép năm')).toBeInTheDocument();
    const steps = screen.getByRole('list', { name: 'Các bước duyệt' });
    expect(within(steps).getByText('Trừ vào số dư')).toBeInTheDocument();
    expect(within(steps).getByText('Khi duyệt xong')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sửa đơn' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hủy đơn' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(`Hủy đơn nghỉ ${formatDate(MINE[0]!.startDate)}?`)).toBeInTheDocument();
    expect(within(dialog).getByText(/Đơn đang chờ duyệt/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Hủy đơn' }));
    await waitFor(() => expect(api.cancelled).toEqual([requestId(1)]));
    expect(within(toastRegion()).getByText(`Đã hủy đơn nghỉ ${formatDate(MINE[0]!.startDate)}`)).toBeInTheDocument();
    expect(await screen.findByText('Đã hủy')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy đơn' })).not.toBeInTheDocument();
  });

  it('warns that cancelling an approved request gives the days back and tells the approver', async () => {
    const user = userEvent.setup();
    open(`/leave/requests/${requestId(2)}`);
    await user.click(await screen.findByRole('button', { name: 'Hủy đơn' }));
    expect(within(screen.getByRole('dialog')).getByText('Đơn đã duyệt. Hủy sẽ hoàn 1 ngày vào Phép năm và báo cho Lê Văn Hùng.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Không hủy' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows why a request was returned, and edits and sends it again', async () => {
    const user = userEvent.setup();
    const { api, router } = open(`/leave/requests/${requestId(3)}`);
    expect(await screen.findByText('Lê Văn Hùng trả về để bạn bổ sung')).toBeInTheDocument();
    expect(screen.getByText('Ngày đó có họp dự án, đổi sang buổi chiều nhé.')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Sửa đơn' }));
    expect(await screen.findByRole('heading', { name: 'Sửa đơn nghỉ' })).toBeInTheDocument();
    expect(await screen.findByRole('radio', { name: /Phép năm/ })).toBeChecked();
    expect(screen.getByLabelText(/^Từ ngày/)).toHaveValue(MINE[2]!.startDate);
    await user.click(screen.getByRole('combobox', { name: 'Buổi của ngày đầu' }));
    await user.click(screen.getByRole('option', { name: 'Buổi chiều' }));
    const later = nextWeekday(3, 28);
    fireEvent.change(screen.getByLabelText(/^Từ ngày/), { target: { value: later } });
    fireEvent.change(screen.getByLabelText(/^Đến ngày/), { target: { value: later } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gửi lại' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Gửi lại' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/leave/requests/${requestId(3)}`));
    expect(api.sent).toEqual([{ id: requestId(3), body: expect.objectContaining({ startDate: later, startPart: 'AFTERNOON', endDate: later, endPart: 'AFTERNOON' }) }]);
    expect(within(toastRegion()).getByText('Đã gửi lại đơn nghỉ cho Lê Văn Hùng')).toBeInTheDocument();
  });

  it('says a request that is not there was not found', async () => {
    open(`/leave/requests/${requestId(42)}`);
    expect(await screen.findByText('Không tìm thấy đơn nghỉ')).toBeInTheDocument();
  });
});
