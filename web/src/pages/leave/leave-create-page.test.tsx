import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { formatDate } from '@/lib/format';
import { AN_ID, ANNUAL, balancesOf, LAN, nextWeekday, plusDays, SICK, YEAR } from '@/test/leave-fixtures';
import { leaveApi, type LeaveApiOptions } from '@/test/leave-handlers';
import { EMPLOYEE_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const AN: Account = { ...EMPLOYEE_ACCOUNT, employeeId: AN_ID };

const open = (options: LeaveApiOptions = {}) => {
  const api = leaveApi(options);
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session: AN, path: '/leave/new' }) };
};
const setDate = (label: string, value: string) => fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), { target: { value } });
const send = () => screen.getByRole('button', { name: 'Gửi đơn' });
const breakdown = () => screen.getByRole('region', { name: 'Số ngày nghỉ' });

describe('LeaveCreatePage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('counts the days without the weekend, says the balance after, and sends the request to the approver', async () => {
    const user = userEvent.setup();
    const { api, router } = open();
    const friday = nextWeekday(5);
    const monday = plusDays(friday, 3);
    await user.click(await screen.findByRole('radio', { name: /Phép năm/ }));
    expect(screen.getByRole('radio', { name: /Phép năm/ }).closest('label')).toHaveTextContent('Còn 4,5 · ứng thêm được 2');
    setDate('Từ ngày', friday);
    await user.click(screen.getByRole('combobox', { name: 'Buổi của ngày đầu' }));
    await user.click(screen.getByRole('option', { name: 'Buổi chiều' }));
    setDate('Đến ngày', monday);
    await waitFor(() => expect(within(breakdown()).getByText('1,5 ngày')).toBeInTheDocument());
    const rows = within(breakdown()).getAllByRole('listitem').map((row) => row.textContent);
    expect(rows).toEqual([expect.stringMatching(/^T6 .*Buổi chiều0,5$/), expect.stringMatching(/Ngày nghỉ hằng tuần0$/), expect.stringMatching(/^T2 .*Cả ngày1$/)]);
    expect(screen.getByText('Sau đơn này Phép năm còn 3 ngày (đã trừ cả 1,5 ngày đang chờ duyệt).')).toBeInTheDocument();
    expect(screen.getByText('Lê Văn Hùng')).toBeInTheDocument();
    expect(screen.getByText('Theo Luồng phê duyệt Nghỉ phép. Tự duyệt sau 3 ngày nếu không ai xử lý.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Lý do (không bắt buộc)'), 'Việc gia đình');
    await user.click(screen.getByRole('combobox', { name: 'Thông báo cho (CC) (không bắt buộc)' }));
    await user.click(await screen.findByRole('option', { name: /Vũ Thị Lan/ }));
    expect(screen.getByRole('list', { name: 'Người được báo' })).toHaveTextContent('Vũ Thị Lan');
    await waitFor(() => expect(send()).toBeEnabled());
    await user.click(send());
    await waitFor(() => expect(router.state.location.pathname).toBe('/leave'));
    expect(api.sent).toEqual([
      { id: null, body: { leaveTypeId: ANNUAL.id, startDate: friday, startPart: 'AFTERNOON', endDate: monday, endPart: 'FULL', reason: 'Việc gia đình', cc: [LAN.id], attachmentIds: [] } },
    ]);
    expect(within(toastRegion()).getByText('Đã gửi đơn nghỉ cho Lê Văn Hùng')).toBeInTheDocument();
    expect(within(toastRegion()).getByText(`Phép năm, 1,5 ngày từ ${formatDate(friday)}. Bạn sẽ nhận thông báo khi có kết quả.`)).toBeInTheDocument();
  });

  it('says how many days of the request come off the Phép tồn first, and until when it can be taken', async () => {
    const user = userEvent.setup();
    open({ balances: balancesOf(4.5, { granted: 5, used: 2, remaining: 3, lost: 0, expiresOn: `${YEAR + 1}-12-31` }) });
    await user.click(await screen.findByRole('radio', { name: /Phép năm/ }));
    const friday = nextWeekday(5);
    setDate('Từ ngày', friday);
    setDate('Đến ngày', friday);
    await waitFor(() => expect(within(breakdown()).getByText('1 ngày')).toBeInTheDocument());
    expect(await screen.findByText(`1 ngày của đơn này trừ vào Phép tồn trước; Phép tồn còn 2 ngày sau đơn, dùng đến hết 31/12/${YEAR + 1}.`)).toBeInTheDocument();
  });

  it('names the Phép tồn left when the request is after its last day, and says it does not take from it', async () => {
    const user = userEvent.setup();
    open({ balances: balancesOf(4.5, { granted: 5, used: 2, remaining: 3, lost: 0, expiresOn: `${YEAR}-01-01` }) });
    await user.click(await screen.findByRole('radio', { name: /Phép năm/ }));
    const friday = nextWeekday(5);
    setDate('Từ ngày', friday);
    setDate('Đến ngày', friday);
    expect(await screen.findByText(`Phép tồn còn 3 ngày, dùng đến hết 01/01/${YEAR}. Đơn này nghỉ sau hạn nên không trừ vào đó.`)).toBeInTheDocument();
  });

  it('blocks a request over the balance and says the most that may be taken', async () => {
    const user = userEvent.setup();
    const { api } = open();
    await user.click(await screen.findByRole('radio', { name: /Phép năm/ }));
    const monday = nextWeekday(1);
    setDate('Từ ngày', monday);
    setDate('Đến ngày', plusDays(monday, 4));
    // Five days: within the balance with advance, which the form warns about.
    expect(await screen.findByText('Đơn này dùng 0,5 ngày ứng trước')).toBeInTheDocument();
    expect(send()).toBeEnabled();
    setDate('Đến ngày', plusDays(monday, 11));
    expect(await screen.findByText(/^Vượt số dư /)).toBeInTheDocument();
    expect(screen.getByText(/còn 4,5 ngày và được ứng thêm 2 ngày, tối đa 6,5 ngày/)).toBeInTheDocument();
    expect(send()).toBeDisabled();
    expect(screen.getByLabelText(/^Từ ngày/)).toHaveAttribute('aria-invalid', 'true');
    expect(api.sent).toEqual([]);
  });

  it('asks for a file for sick leave, uploads one, and takes the half day of a single day', async () => {
    const user = userEvent.setup();
    const { api } = open();
    await user.click(await screen.findByRole('radio', { name: /Nghỉ ốm/ }));
    const day = nextWeekday(3);
    setDate('Từ ngày', day);
    expect(screen.getByLabelText(/^Đến ngày/)).toHaveValue(day);
    await user.click(screen.getByRole('combobox', { name: 'Buổi của ngày đầu' }));
    await user.click(screen.getByRole('option', { name: 'Buổi sáng' }));
    expect(await screen.findByText('Nghỉ ốm cần giấy tờ đính kèm. Đính kèm ảnh hoặc PDF.')).toBeInTheDocument();
    expect(send()).toBeDisabled();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['%PDF-1.4'], 'giay-kham.pdf', { type: 'application/pdf' }));
    expect(await screen.findByText('giay-kham.pdf')).toBeInTheDocument();
    await waitFor(() => expect(send()).toBeEnabled());
    expect(within(breakdown()).getByText('0,5 ngày')).toBeInTheDocument();
    await user.click(send());
    await waitFor(() => expect(api.sent).toHaveLength(1));
    expect(api.sent[0]!.body).toMatchObject({ leaveTypeId: SICK.id, startPart: 'MORNING', endPart: 'MORNING', attachmentIds: ['file-1'] });
  });

  it('says what is missing when sending an empty form', async () => {
    const user = userEvent.setup();
    const { api } = open();
    await screen.findByRole('radio', { name: /Phép năm/ });
    await user.click(send());
    expect(screen.getByText('Chọn loại nghỉ.')).toBeInTheDocument();
    expect(screen.getAllByText('Chọn ngày.')).toHaveLength(2);
    expect(api.sent).toEqual([]);
  });
});
