import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addWeeks, format, startOfWeek } from 'date-fns';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { unitId } from '@/test/org-unit-fixtures';
import { orgUnitOptionsOk } from '@/test/org-unit-handlers';
import { heatmapApi, overviewDenied, overviewFail, resourceListsApi } from '@/test/resource-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'PROJECT_VIEW', 'RESOURCE_VIEW'] };
const PM: Account = { ...HR_ACCOUNT, roles: ['PROJECT_MANAGER', 'EMPLOYEE'], dataScope: 'SELF', permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'RESOURCE_VIEW'] };

const open = (search = '', session: Account = HR) => {
  const lists = resourceListsApi();
  server.use(heatmapApi().handler, orgUnitOptionsOk(), ...lists.handlers);
  return { lists, ...renderRoutes(routes, { session, path: `/resources${search}` }) };
};
const tile = (label: string) => within(screen.getByRole('list', { name: 'Số liệu chính' })).getByText(label).closest('li')!;
const ready = async () => {
  await screen.findByRole('list', { name: 'Số liệu chính' });
  await waitFor(() => expect(tile('Dự án đang chạy')).toHaveTextContent('3'));
};
const last = (requests: string[]) => new URLSearchParams(requests[requests.length - 1]);

describe('Nguồn lực: Tổng quan', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('is the tab Nguồn lực opens on, with the stat tiles from the API', async () => {
    open();
    expect(screen.getByRole('tab', { name: 'Tổng quan' })).toHaveAttribute('aria-selected', 'true');
    await ready();
    expect(tile('Dự án đang chạy')).toHaveTextContent('1 sắp bắt đầu · 1 tạm dừng');
    expect(tile('Nhân sự trong dự án')).toHaveTextContent('4');
    expect(tile('Nhân sự trong dự án')).toHaveTextContent('Trong 5 người của nguồn lực');
    expect(tile('Tải phân bổ trung bình')).toHaveTextContent('48%');
    expect(tile('Bench')).toHaveTextContent('2');
    expect(tile('Quá tải')).toHaveTextContent('0');
    expect(tile('Quá tải')).toHaveTextContent('1 người trong 12 tuần tới');
    expect(tile('Sắp hết dự án')).toHaveTextContent('3');
  });

  it('leads from the last three tiles to the list behind them, keeping the department', async () => {
    open(`?unit=${unitId('PTPM')}`);
    await waitFor(() => expect(tile('Bench')).toHaveTextContent('Tải dưới 50% tuần này'));
    expect(within(tile('Bench')).getByRole('link')).toHaveAttribute('href', `/resources?tab=bench&unit=${unitId('PTPM')}`);
    expect(within(tile('Quá tải')).getByRole('link')).toHaveAttribute('href', `/resources?tab=heatmap&level=OVER&unit=${unitId('PTPM')}`);
    expect(within(tile('Sắp hết dự án')).getByRole('link')).toHaveAttribute('href', `/resources?tab=ending&unit=${unitId('PTPM')}`);
  });

  it('lists the running projects with head count, FTE and the overloaded and incoming people, linked with PROJECT_VIEW', async () => {
    open();
    const block = (await screen.findByRole('region', { name: 'Nhân sự theo dự án' }));
    expect(await within(block).findByRole('link', { name: /DA-027 Hệ thống bán hàng tại quầy/ })).toHaveAttribute('href', '/projects/p-DA-027');
    expect(within(block).getByText('4 người')).toBeInTheDocument();
    expect(within(block).getByText('2,4 FTE')).toBeInTheDocument();
    expect(within(block).getByText('1 người quá tải')).toBeInTheDocument();
    expect(within(block).getByText('1 người sắp vào')).toBeInTheDocument();
  });

  it('shows plain project names to an Account that cannot open projects', async () => {
    open('', PM);
    const block = await screen.findByRole('region', { name: 'Nhân sự theo dự án' });
    expect(await within(block).findByText('Hệ thống bán hàng tại quầy')).toBeInTheDocument();
    expect(within(block).queryByRole('link')).not.toBeInTheDocument();
  });

  it('splits this week by level with the counts and shares', async () => {
    open();
    const block = await screen.findByRole('region', { name: 'Mức Tải phân bổ tuần này' });
    expect(await within(block).findByRole('img', { name: /Bench: 2, Còn trống: 2, Gần đầy hoặc đủ: 1, Quá tải: 0/ })).toBeInTheDocument();
    const rows = within(block).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Bench2 người40%');
    expect(rows[3]).toHaveTextContent('Quá tải0 người0%');
  });

  it('draws the 12 weeks as columns read out with their numbers, and shows the same numbers as a table', async () => {
    open();
    const block = await screen.findByRole('region', { name: 'Mức tải 12 tuần tới' });
    const columns = await within(block).findAllByRole('img');
    expect(columns).toHaveLength(12);
    const thisWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM');
    expect(columns[1]).toHaveAccessibleName(/Quá tải 1/);
    expect(columns[0]!.getAttribute('aria-label')).toContain(thisWeek);

    await userEvent.click(within(block).getByRole('button', { name: 'Xem dạng bảng' }));
    const table = within(block).getByRole('table', { name: 'Số người theo mức Tải phân bổ trong 12 tuần tới' });
    expect(within(table).getAllByRole('row')).toHaveLength(13);
    expect(within(within(table).getAllByRole('row')[2]!).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['2', '1', '1', '1', '5']);
    expect(within(block).queryByRole('img')).not.toBeInTheDocument();

    await userEvent.click(within(block).getByRole('button', { name: 'Xem dạng biểu đồ' }));
    expect(await within(block).findAllByRole('img')).toHaveLength(12);
  });

  it('names who needs attention: overloaded in the next 12 weeks, and allocations ending with the load after', async () => {
    open();
    const block = await screen.findByRole('region', { name: 'Cần chú ý' });
    const over = await within(block).findByRole('region', { name: 'Quá tải trong 12 tuần tới' });
    expect(within(over).getByRole('link', { name: /Cao Minh Trí/ })).toBeInTheDocument();
    expect(within(over).getByText('120%')).toBeInTheDocument();
    expect(within(over).getByText(/DA-029, DA-031/)).toBeInTheDocument();
    expect(within(over).getByRole('link', { name: 'Xem trên heatmap' })).toHaveAttribute('href', '/resources?tab=heatmap&level=OVER');

    const ending = within(block).getByRole('region', { name: 'Sắp hết dự án' });
    expect(within(ending).getByText(/DA-031 · kết thúc hôm nay · tải sau đó 60%/)).toBeInTheDocument();
    expect(within(ending).getByText(/DA-027 · còn 5 ngày · tải sau đó 0%/)).toBeInTheDocument();
    expect(within(ending).getAllByText('Chưa có phân bổ tiếp theo')).toHaveLength(1);
    expect(within(ending).getByRole('link', { name: 'Xem tất cả' })).toHaveAttribute('href', '/resources?tab=ending');
  });

  it('asks the API for the department chosen and keeps it in the URL', async () => {
    const { lists, router } = open();
    await ready();
    await userEvent.click(screen.getByRole('button', { name: /^Phòng ban:/ }));
    await userEvent.click(await screen.findByText('Phòng Dịch vụ khách hàng'));
    await waitFor(() => expect(last(lists.overview).get('orgUnitId')).toBe(unitId('DVKH')));
    expect(router.state.location.search).toBe(`?unit=${unitId('DVKH')}`);
    await waitFor(() => expect(tile('Sắp hết dự án')).toHaveTextContent('1'));
    const over = await screen.findByRole('region', { name: 'Quá tải trong 12 tuần tới' });
    expect(within(over).getByText('Không ai quá tải trong 12 tuần tới.')).toBeInTheDocument();
  });

  it('steps through the weeks and back to "Tuần này"', async () => {
    const { lists, router } = open();
    await ready();
    await userEvent.click(screen.getByRole('button', { name: 'Khoảng sau' }));
    const next = format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1), 'yyyy-MM-dd');
    await waitFor(() => expect(last(lists.overview).get('week')).toBe(next));
    expect(router.state.location.search).toBe(`?week=${next}`);
    await userEvent.click(screen.getByRole('button', { name: 'Tuần này' }));
    await waitFor(() => expect(last(lists.overview).get('week')).toBeNull());
  });

  it('gives every block its own error and retry when the dashboard cannot be loaded, then recovers', async () => {
    server.use(overviewFail(), heatmapApi().handler, orgUnitOptionsOk(), ...resourceListsApi().handlers);
    renderRoutes(routes, { session: HR, path: '/resources' });
    expect(await screen.findByText('Không tải được số liệu chính')).toBeInTheDocument();
    for (const title of ['Nhân sự theo dự án', 'Mức Tải phân bổ tuần này', 'Mức tải 12 tuần tới', 'Cần chú ý']) {
      const block = screen.getByRole('region', { name: title });
      expect(within(block).getByText(`Không tải được ${title}`)).toBeInTheDocument();
      expect(within(block).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    }
    server.use(...resourceListsApi().handlers);
    await userEvent.click(within(screen.getByRole('region', { name: 'Cần chú ý' })).getByRole('button', { name: 'Thử lại' }));
    await ready();
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
  });

  it('shows the denied state when the API refuses', async () => {
    server.use(overviewDenied(), heatmapApi().handler, orgUnitOptionsOk(), ...resourceListsApi().handlers);
    renderRoutes(routes, { session: HR, path: '/resources' });
    expect(await screen.findByText('Bạn không có quyền xem Nguồn lực')).toBeInTheDocument();
  });

  it('switches to the other tabs keeping only the department', async () => {
    const { router } = open(`?unit=${unitId('PTPM')}&week=2030-01-07`);
    await ready();
    await userEvent.click(screen.getByRole('tab', { name: /^Heatmap/ }));
    await waitFor(() => expect(router.state.location.search).toBe(`?unit=${unitId('PTPM')}&tab=heatmap`));
    await userEvent.click(screen.getByRole('tab', { name: 'Tổng quan' }));
    await waitFor(() => expect(router.state.location.search).toBe(`?unit=${unitId('PTPM')}`));
  });
});
