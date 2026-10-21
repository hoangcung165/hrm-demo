import { http, HttpResponse } from 'msw';
import { addDays, addMonths, format } from 'date-fns';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { companyToday } from '@/lib/company-time';
import { toIsoDate } from '@/lib/format';
import { ADMIN_ACCOUNT, EMPLOYEE_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const employeeId = '11111111-2222-3333-4444-555555555555';
const items = Array.from({ length: 21 }, (_, index) => ({
  type: index === 0 ? 'VISA' : 'CONTRACT', sourceId: `source-${index}`, employeeId,
  employeeCode: `NV${index}`, employeeName: index === 0 ? 'Nguyễn Văn An' : `Nhân viên ${index}`,
  sourceName: index === 0 ? 'Visa lao động' : null, expiresOn: '2026-11-12',
  daysRemaining: 22, sourcePath: `/employees/${employeeId}?tab=${index === 0 ? 'documents' : 'contracts'}`,
}));

function open(session: Account = ADMIN_ACCOUNT, mode: 'list' | 'empty' | 'error' | 'denied' = 'list', search = '') {
  const requests: URL[] = [];
  server.use(http.get('*/api/expiry', ({ request }) => {
    const url = new URL(request.url);
    requests.push(url);
    if (mode === 'error') return HttpResponse.json({ message: 'Down' }, { status: 500 });
    if (mode === 'denied') return HttpResponse.json({ message: 'Forbidden' }, { status: 403 });
    const type = url.searchParams.get('type');
    const filtered = mode === 'empty' ? [] : items.filter((item) => !type || item.type === type);
    const page = Number(url.searchParams.get('page'));
    return HttpResponse.json({ items: filtered.slice(page * 20, page * 20 + 20), total: filtered.length, page, size: 20, asOf: '2026-10-21' });
  }));
  return { requests, ...renderRoutes(routes, { session, path: `/expiry${search}` }) };
}

describe('Upcoming expiry list', () => {
  beforeEach(async () => { localStorage.clear(); await i18n.changeLanguage('vi'); });

  it('shows safe source links, type/date filters in the URL, and server pagination', async () => {
    const { requests, router } = open();
    const table = await screen.findByRole('table', { name: 'Danh sách sắp hết hạn' });
    expect(await within(table).findByRole('link', { name: 'Xem Visa lao động của Nguyễn Văn An' })).toHaveAttribute('href', `/employees/${employeeId}?tab=documents`);
    expect(within(table).getByRole('link', { name: 'Xem Hợp đồng của Nhân viên 1' })).toHaveAttribute('href', `/employees/${employeeId}?tab=contracts`);
    expect(within(table).queryByText(/salary|số giấy tờ/i)).not.toBeInTheDocument();
    expect(requests[0]?.search).toBe('?page=0&size=20');
    await userEvent.click(screen.getByRole('button', { name: /Trang sau|Trang tiếp/ }));
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('page')).toBe('1'));
    await userEvent.click(screen.getByRole('combobox', { name: 'Loại hồ sơ' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Visa' }));
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('type')).toBe('VISA'));
    expect(router.state.location.search).toContain('type=VISA');
    expect(router.state.location.search).not.toContain('page=2');
    expect(screen.getByRole('link', { name: 'Xem Visa lao động của Nguyễn Văn An' })).toBeInTheDocument();
    const from = toIsoDate(addDays(companyToday(), 5));
    await userEvent.type(screen.getByLabelText('Từ ngày'), from);
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('from')).toBe(from));
    await userEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('never requests data without both permissions, and handles a server denial', async () => {
    const { requests } = open(EMPLOYEE_ACCOUNT);
    expect(screen.getByText('Cần quyền xem hồ sơ nhân viên và thông tin nhạy cảm để xem danh sách này.')).toBeInTheDocument();
    expect(requests).toHaveLength(0);
    const account = { ...ADMIN_ACCOUNT, id: 'new-account' };
    const second = open(account, 'denied');
    expect(await screen.findAllByText('Bạn không có quyền xem')).not.toHaveLength(0);
    expect(second.requests).toHaveLength(1);
  });

  it('explains the empty list and filtered no-match state', async () => {
    open(ADMIN_ACCOUNT, 'empty');
    expect(await screen.findByText('Chưa có mục sắp hết hạn')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Loại hồ sơ' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Visa' }));
    expect(await screen.findByText('Không có kết quả')).toBeInTheDocument();
  });

  it('offers a retry after load failure', async () => {
    const { requests } = open(ADMIN_ACCOUNT, 'error');
    expect(await screen.findByText('Không tải được danh sách sắp hết hạn. Hãy thử lại.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
    await waitFor(() => expect(requests.length).toBeGreaterThan(1));
  });

  it('ignores an impossible calendar day in a shared URL', async () => {
    const month = Array.from({ length: 12 }, (_, index) => format(addMonths(companyToday(), index + 1), 'yyyy-MM'))
      .find((value) => /-(04|06|09|11)$/.test(value))!;
    const { requests } = open(ADMIN_ACCOUNT, 'list', `?from=${month}-31`);
    expect(await screen.findByRole('link', { name: 'Xem Visa lao động của Nguyễn Văn An' })).toBeInTheDocument();
    expect(requests[0]?.searchParams.has('from')).toBe(false);
    expect(screen.getByLabelText('Từ ngày')).toHaveValue('');
  });
});
