import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { ADJUSTMENT_ID, adjustmentApi, adjustmentCheck, adjustmentDetail, returnedDetail, type AdjustmentApi } from '@/test/attendance-adjustment-handlers';
import { AN } from '@/test/approval-fixtures';
import { HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const AN_ACCOUNT: Account = { ...HR_ACCOUNT, roles: ['EMPLOYEE'], dataScope: 'SELF', permissions: ['COMPANY_VIEW'], employeeId: AN.id };
const HUNG_ACCOUNT: Account = { ...HR_ACCOUNT, roles: ['LINE_MANAGER'], dataScope: 'ORG_UNIT', permissions: ['COMPANY_VIEW', 'ATTENDANCE_VIEW'], employeeId: '00000000-0000-4000-b000-000000000012' };

const open = (api: AdjustmentApi, path: string, session: Account = AN_ACCOUNT) => {
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session, path }) };
};

describe('Đơn bổ sung công', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('offers only the missing Out, sends it and opens the request', async () => {
    const { api, router } = open(adjustmentApi(), '/attendance/adjustments/new?date=2026-10-12');
    expect(await screen.findByRole('heading', { name: 'Gửi đơn bổ sung công' })).toBeInTheDocument();
    expect(await screen.findByText('Thiếu quẹt ra')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Giờ vào' })).not.toBeInTheDocument();
    expect(screen.getByText('Lê Văn Hùng')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Gửi đơn' }));
    expect(screen.getByText('Nhập giờ còn thiếu.')).toBeInTheDocument();
    expect(screen.getByText('Nhập lý do để người duyệt hiểu vì sao thiếu quẹt.')).toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: 'Giờ ra' }), '17:05');
    await userEvent.type(screen.getByRole('textbox', { name: /Lý do/ }), 'Quên quẹt khi về');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi đơn' }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/attendance/adjustments/${ADJUSTMENT_ID}`));
    expect(api.sent).toEqual([{ date: '2026-10-12', out: '17:05', reason: 'Quên quẹt khi về' }]);
    expect(within(toastRegion()).getByText('Đã gửi đơn bổ sung công ngày 12/10/2026')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Đơn bổ sung công' })).toBeInTheDocument();
  });

  it('says why a day takes no request, without the fields', async () => {
    open(adjustmentApi({ check: adjustmentCheck({ problems: ['already_open'] }) }), '/attendance/adjustments/new?date=2026-10-12');
    expect(await screen.findByText('Bạn đã có một đơn bổ sung công đang chờ cho ngày này.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gửi đơn' })).not.toBeInTheDocument();
  });

  it('puts a server refusal on its field', async () => {
    open(adjustmentApi({ send: { status: 400, code: 'validation.invalid', errors: [{ field: 'out', code: 'out_before_in' }] } }), '/attendance/adjustments/new?date=2026-10-12');
    await userEvent.type(await screen.findByRole('textbox', { name: 'Giờ ra' }), '07:00');
    await userEvent.type(screen.getByRole('textbox', { name: /Lý do/ }), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi đơn' }));
    expect(await screen.findByText('Giờ ra phải sau giờ vào.')).toBeInTheDocument();
  });

  it('shows the request with the day before and after, and the sender cancels it', async () => {
    const { api } = open(adjustmentApi(), `/attendance/adjustments/${ADJUSTMENT_ID}`);
    const compare = await screen.findByRole('table', { name: /hiện tại và sau khi duyệt/ });
    const rows = within(compare).getAllByRole('row');
    expect(rows[2]).toHaveTextContent('RaThiếu17:05bổ sung');
    expect(screen.getByText('Quên quẹt khi về')).toBeInTheDocument();
    expect(screen.getByText('Cập nhật công theo ngày')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Hủy đơn' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Hủy đơn bổ sung công này?' })).getByRole('button', { name: 'Hủy đơn' }));
    await waitFor(() => expect(api.cancelled).toBe(1));
    expect(within(toastRegion()).getByText('Đã hủy đơn bổ sung công')).toBeInTheDocument();
  });

  it('edits a returned request and sends it again', async () => {
    const { api } = open(adjustmentApi({ detail: returnedDetail() }), `/attendance/adjustments/${ADJUSTMENT_ID}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Sửa và gửi lại' }));
    const out = await screen.findByRole('textbox', { name: 'Giờ ra' });
    expect(out).toHaveValue('17:05');
    await userEvent.clear(out);
    await userEvent.type(out, '17:10');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi lại' }));
    await waitFor(() => expect(api.edited).toEqual([{ out: '17:10', reason: 'Quên quẹt khi về' }]));
  });

  it('shows the approver the request without the sender’s actions', async () => {
    open(adjustmentApi(), `/attendance/adjustments/${ADJUSTMENT_ID}`, HUNG_ACCOUNT);
    expect(await screen.findByRole('heading', { name: 'Đơn bổ sung công của Nguyễn Văn An' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy đơn' })).not.toBeInTheDocument();
  });

  it('shows the approval inbox the day before and after, and the sender a link to the request', async () => {
    const approval = { ...adjustmentDetail().approval!, allowed: { decide: true, onBehalfOf: null, resubmit: false, cancel: false } };
    server.use(http.get('*/api/approvals/:id', () => HttpResponse.json(approval)));
    open(adjustmentApi(), `/approvals/${ADJUSTMENT_ID}`, HUNG_ACCOUNT);
    expect(await screen.findByRole('table', { name: /hiện tại và sau khi duyệt/ })).toBeInTheDocument();
    expect(screen.getByText('Quên quẹt khi về')).toBeInTheDocument();
  });
});
