import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { attentionApi, EXPIRIES, expiryFail, LEAVE_MORNING, LEAVE_TODAY, leaveTodayFail } from '@/test/dashboard-attention-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'EMPLOYEE_SENSITIVE_VIEW'], employeeId: '55555555-5555-4555-8555-555555555555' };
const MANAGER: Account = { ...HR, roles: ['LINE_MANAGER'], dataScope: 'ORG_UNIT', permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'EMPLOYEE_VIEW'] };
const widget = (name: string) => screen.getByRole('region', { name });
const rowOf = (block: string, name: string) => within(widget(block)).getByRole('link', { name: new RegExp(name) }).closest('li')!;

describe('Tổng quan: Nghỉ hôm nay and Sắp hết hạn', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('lists who is off with the unit, the leave type and the part of the day or the last day, and opens the calendar on this week', async () => {
    server.use(...attentionApi().handlers);
    renderRoutes(routes, { session: HR, path: '/' });
    await within(await screen.findByRole('region', { name: 'Nghỉ hôm nay' })).findByText('Hồ Sỹ Quang');
    expect(within(widget('Nghỉ hôm nay')).getByRole('heading', { name: 'Nghỉ hôm nay' }).parentElement).toHaveTextContent('4');
    expect(within(widget('Nghỉ hôm nay')).getByRole('link', { name: 'Lịch nghỉ hôm nay' })).toHaveAttribute('href', '/leave-calendar?view=week&date=2026-10-30');
    const quang = rowOf('Nghỉ hôm nay', 'Hồ Sỹ Quang');
    expect(quang).toHaveTextContent('Chi nhánh Đà Nẵng');
    expect(quang).toHaveTextContent('Phép năm');
    expect(quang).toHaveTextContent('cả ngày, đến 03/11');
    expect(within(quang).getByRole('link', { name: 'Hồ Sỹ Quang' })).toHaveAttribute('href', '/employees/e-1');
    expect(rowOf('Nghỉ hôm nay', 'Lâm Thị Kim Oanh')).toHaveTextContent('Nghỉ ốmcả ngày');
    expect(rowOf('Nghỉ hôm nay', 'Lâm Thị Kim Oanh')).not.toHaveTextContent('đến');
    expect(rowOf('Nghỉ hôm nay', 'Thái Văn Bình')).toHaveTextContent('buổi chiều');
    expect(rowOf('Nghỉ hôm nay', 'Tống Thị Yến')).toHaveTextContent('cả ngày, đến 02/03/2027');
  });

  it('shows the morning for a person on half-day leave in the morning', async () => {
    server.use(...attentionApi(LEAVE_MORNING).handlers);
    renderRoutes(routes, { session: HR, path: '/' });
    await within(await screen.findByRole('region', { name: 'Nghỉ hôm nay' })).findByText('Thái Văn Bình');
    expect(rowOf('Nghỉ hôm nay', 'Thái Văn Bình')).toHaveTextContent('buổi sáng');
  });

  it('shows five rows and the total of what is off, as the head says', async () => {
    const entries = Array.from({ length: 7 }, (_, i) => ({ ...LEAVE_TODAY.entries[1]!, requestId: `x${i}`, employee: { ...LEAVE_TODAY.entries[1]!.employee, id: `p${i}`, fullName: `Người ${i}` } }));
    server.use(...attentionApi({ date: '2026-10-30', entries }).handlers);
    renderRoutes(routes, { session: HR, path: '/' });
    await within(await screen.findByRole('region', { name: 'Nghỉ hôm nay' })).findByText('Người 0');
    expect(within(widget('Nghỉ hôm nay')).getAllByRole('listitem')).toHaveLength(5);
    expect(within(widget('Nghỉ hôm nay')).getByRole('heading', { name: 'Nghỉ hôm nay' }).parentElement).toHaveTextContent('7');
  });

  it('lists the expiries soonest first with the days left, asks for five without a window and links to /expiry', async () => {
    const api = attentionApi();
    server.use(...api.handlers);
    renderRoutes(routes, { session: HR, path: '/' });
    await within(await screen.findByRole('region', { name: 'Sắp hết hạn' })).findByText('Phan Khánh Duy');
    // The window is the warning days of each type in the settings: the block sends no dates and no type.
    expect(api.expiryRequests).toEqual(['page=0&size=5']);
    const heading = within(widget('Sắp hết hạn')).getByRole('heading', { name: 'Sắp hết hạn' });
    expect(heading.parentElement).toHaveTextContent('12');
    expect(within(widget('Sắp hết hạn')).getByRole('link', { name: 'Xem tất cả giấy tờ sắp hết hạn' })).toHaveAttribute('href', '/expiry');
    const rows = within(widget('Sắp hết hạn')).getAllByRole('listitem');
    expect(rows.map((row) => within(row).getByRole('link').textContent)).toEqual(EXPIRIES.items.map((item) => item.employeeName));
    expect(rows[0]).toHaveTextContent('HĐLĐ xác định thời hạn hết hạn 30/10/2026');
    expect(rows[0]).toHaveTextContent('Hết hạn hôm nay');
    expect(rows[1]).toHaveTextContent('Hết thử việc 02/11/2026');
    expect(rows[1]).toHaveTextContent('Còn 3 ngày');
    expect(rows[2]).toHaveTextContent('Visa hết hạn 13/11/2026');
    expect(rows[3]).toHaveTextContent('Chứng chỉ AWS Solutions Architect hết hạn 28/11/2026');
    expect(within(rows[1]!).getByRole('link', { name: 'Xem Thử việc của Phan Khánh Duy' })).toHaveAttribute('href', '/employees/e-2?tab=contracts');
  });

  it('says why a block is empty', async () => {
    renderRoutes(routes, { session: HR, path: '/' });
    expect(await within(await screen.findByRole('region', { name: 'Nghỉ hôm nay' })).findByText('Hôm nay không ai nghỉ')).toBeInTheDocument();
    expect(await within(widget('Sắp hết hạn')).findByText('Chưa có mục sắp hết hạn')).toBeInTheDocument();
    expect(within(widget('Nghỉ hôm nay')).queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('keeps the other block when one fails, and retries it', async () => {
    server.use(leaveTodayFail(), http.get('*/api/expiry', () => HttpResponse.json(EXPIRIES)));
    renderRoutes(routes, { session: HR, path: '/' });
    const user = userEvent.setup();
    expect(await within(await screen.findByRole('region', { name: 'Nghỉ hôm nay' })).findByText('Không tải được danh sách nghỉ hôm nay')).toBeInTheDocument();
    expect(await within(widget('Sắp hết hạn')).findByText('Phan Khánh Duy')).toBeInTheDocument();
    server.use(...attentionApi().handlers);
    await user.click(within(widget('Nghỉ hôm nay')).getByRole('button', { name: 'Thử lại' }));
    expect(await within(widget('Nghỉ hôm nay')).findByText('Hồ Sỹ Quang')).toBeInTheDocument();
  });

  it('shows the expiry failure in its own block only', async () => {
    server.use(expiryFail(), http.get('*/api/dashboard/leave-today', () => HttpResponse.json(LEAVE_TODAY)));
    renderRoutes(routes, { session: HR, path: '/' });
    expect(await within(await screen.findByRole('region', { name: 'Sắp hết hạn' })).findByText('Không tải được danh sách sắp hết hạn')).toBeInTheDocument();
    expect(await within(widget('Nghỉ hôm nay')).findByText('Hồ Sỹ Quang')).toBeInTheDocument();
  });

  it('shows who is off but no expiries, and does not ask for them, without the right to read sensitive records', async () => {
    const api = attentionApi();
    server.use(...api.handlers);
    renderRoutes(routes, { session: MANAGER, path: '/' });
    await within(await screen.findByRole('region', { name: 'Nghỉ hôm nay' })).findByText('Hồ Sỹ Quang');
    await waitFor(() => expect(screen.getByRole('list', { name: 'Số liệu chính' })).not.toHaveAttribute('aria-busy'));
    expect(screen.queryByRole('region', { name: 'Sắp hết hạn' })).not.toBeInTheDocument();
    expect(api.expiryRequests).toEqual([]);
  });

  it('shows neither block, and asks for neither, without EMPLOYEE_VIEW', async () => {
    let asked = 0;
    server.use(http.get('*/api/dashboard/leave-today', () => { asked += 1; return HttpResponse.json(LEAVE_TODAY); }), http.get('*/api/expiry', () => { asked += 1; return HttpResponse.json(EXPIRIES); }));
    renderRoutes(routes, { session: { ...HR, roles: ['PROJECT_MANAGER'], permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'PROJECT_VIEW'] }, path: '/' });
    await screen.findByRole('heading', { level: 1, name: /^Chào buổi/ });
    expect(screen.queryByRole('region', { name: 'Nghỉ hôm nay' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Sắp hết hạn' })).not.toBeInTheDocument();
    expect(asked).toBe(0);
  });
});
