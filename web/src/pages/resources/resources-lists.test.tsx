import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { unitId } from '@/test/org-unit-fixtures';
import { orgUnitOptionsOk } from '@/test/org-unit-handlers';
import { benchDenied, benchFail, heatmapApi, resourceListsApi } from '@/test/resource-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'RESOURCE_VIEW'] };
const PM: Account = { ...HR_ACCOUNT, roles: ['PROJECT_MANAGER', 'EMPLOYEE'], dataScope: 'SELF', permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'PROJECT_VIEW', 'RESOURCE_VIEW'] };

const asPhone = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)', addEventListener: () => {}, removeEventListener: () => {} }));

const open = (search: string, session: Account = HR) => {
  const lists = resourceListsApi();
  server.use(heatmapApi().handler, orgUnitOptionsOk(), ...lists.handlers);
  return { lists, ...renderRoutes(routes, { session, path: `/resources${search}` }) };
};
const rowsOf = async (name: string) => {
  const grid = await screen.findByRole('table', { name });
  await waitFor(() => expect(within(grid).getAllByRole('row').length).toBeGreaterThan(1));
  return within(grid).getAllByRole('row').slice(1);
};
const last = (requests: string[]) => new URLSearchParams(requests[requests.length - 1]);

describe('Nguồn lực: Bench and Sắp hết dự án', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows the counts on the tab labels', async () => {
    open('');
    expect(await screen.findByRole('tab', { name: /Bench\s*2/ })).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: /Sắp hết dự án\s*3/ })).toBeInTheDocument();
  });

  it('lists the Bench lowest load first with the summary line, the next allocation and the latest project', async () => {
    const { lists } = open('?tab=bench');
    const rows = await rowsOf('Danh sách nhân sự ở bench');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Phan Khánh Duy')).toBeInTheDocument();
    expect(within(rows[0]!).getAllByText('Chưa có')).toHaveLength(2);
    expect(within(rows[1]!).getByText(/DA-033 · Nền tảng dữ liệu nội bộ · 30%/)).toBeInTheDocument();
    expect(within(rows[1]!).getByText(/DA-027 · Hệ thống bán hàng tại quầy, đến /)).toBeInTheDocument();
    expect(screen.getByText('2 người có Tải phân bổ dưới 50% tuần này: 1 người không có phân bổ nào, 1 người dưới ngưỡng.')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Bench/ })).toHaveAttribute('aria-selected', 'true');
    expect(lists.bench.some((q) => q.includes('size=50'))).toBe(true);
  });

  it('filters by department in the URL, and takes the department to the other tab only', async () => {
    const { lists } = open('?tab=bench&q=x&page=2');
    await rowsOf('Danh sách nhân sự ở bench');
    await userEvent.click(screen.getByRole('button', { name: /^Phòng ban:/ }));
    await userEvent.click(await screen.findByText('Phòng Phát triển phần mềm'));
    await waitFor(() => expect(last(lists.bench).get('orgUnitId')).toBe(unitId('PTPM')));
    expect(await screen.findByText('1 người có Tải phân bổ dưới 50% tuần này: 0 người không có phân bổ nào, 1 người dưới ngưỡng.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /Sắp hết dự án/ }));
    const rows = await rowsOf('Danh sách phân bổ sắp kết thúc');
    expect(rows).toHaveLength(2);
    expect(last(lists.ending).get('orgUnitId')).toBe(unitId('PTPM'));
  });

  it('steps the period and switches to the month view', async () => {
    const { lists } = open('?tab=bench');
    await rowsOf('Danh sách nhân sự ở bench');
    await userEvent.click(screen.getByRole('button', { name: 'Theo tháng' }));
    await waitFor(() => expect(last(lists.bench).get('granularity')).toBe('MONTH'));
    expect(await screen.findByText(/tháng này: /)).toBeInTheDocument();
  });

  it('lists the ending allocations earliest first, and keeps the people without a next allocation on request', async () => {
    const { lists } = open('?tab=ending');
    const rows = await rowsOf('Danh sách phân bổ sắp kết thúc');
    expect(rows.map((row) => within(row).getByRole('link').textContent)).toEqual([expect.stringContaining('Cao Minh Trí'), expect.stringContaining('Phan Khánh Duy'), expect.stringContaining('Trần Thị Mai')]);
    expect(within(rows[0]!).getByText('kết thúc hôm nay')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('còn 5 ngày')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Chưa có phân bổ tiếp theo')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Vẫn có phân bổ ở dự án khác')).toBeInTheDocument();
    expect(screen.getByText('3 người có phân bổ kết thúc trong 4 tuần tới; 1 người chưa có phân bổ tiếp theo.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Chỉ người chưa có phân bổ tiếp theo' }));
    await waitFor(() => expect(last(lists.ending).get('onlyWithoutNext')).toBe('true'));
    await waitFor(async () => expect(await rowsOf('Danh sách phân bổ sắp kết thúc')).toHaveLength(1));
    expect(screen.getByText(/^3 người có phân bổ kết thúc/)).toBeInTheDocument();
  });

  it('says so when nobody is on the Bench in the department, and clears the filter', async () => {
    open(`?tab=bench&unit=${unitId('DVKH')}`);
    expect(await screen.findByText('Không ai ở bench trong phòng ban này')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Xóa bộ lọc' }).at(-1)!);
    expect(await rowsOf('Danh sách nhân sự ở bench')).toHaveLength(2);
  });

  it('explains an empty "only without next" list', async () => {
    open(`?tab=ending&nonext=1&unit=${unitId('DVKH')}`);
    expect(await screen.findByText('Không có phân bổ nào sắp kết thúc trong phòng ban này')).toBeInTheDocument();
  });

  it('shows an error with a retry, and the denied state when the API refuses', async () => {
    server.use(benchFail(), heatmapApi().handler, orgUnitOptionsOk(), ...resourceListsApi().handlers);
    const { unmount } = renderRoutes(routes, { session: HR, path: '/resources?tab=bench' });
    expect(await screen.findByText('Không tải được Bench')).toBeInTheDocument();
    server.use(...resourceListsApi().handlers);
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await rowsOf('Danh sách nhân sự ở bench')).toHaveLength(2);
    unmount();
    server.use(benchDenied());
    renderRoutes(routes, { session: HR, path: '/resources?tab=bench' });
    expect(await screen.findByText('Bạn không có quyền xem Nguồn lực')).toBeInTheDocument();
  });

  it('offers the profile in the row menu with EMPLOYEE_VIEW, and opens the person on the heatmap by code', async () => {
    const { lists } = open('?tab=bench');
    const rows = await rowsOf('Danh sách nhân sự ở bench');
    await userEvent.click(within(rows[0]!).getByRole('button', { name: 'Thao tác của Nguyễn Văn An' }));
    expect(await screen.findByRole('menuitem', { name: 'Xem hồ sơ' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Xem trên heatmap' }));
    expect(await screen.findByRole('tab', { name: 'Heatmap' })).toHaveAttribute('aria-selected', 'true');
    expect(lists.bench.length).toBeGreaterThan(0);
  });

  it('shows plain names and no profile item to an Account that cannot open profiles', async () => {
    open('?tab=bench', PM);
    const rows = await rowsOf('Danh sách nhân sự ở bench');
    expect(within(rows[0]!).queryByRole('link')).not.toBeInTheDocument();
    await userEvent.click(within(rows[0]!).getByRole('button', { name: 'Thao tác của Nguyễn Văn An' }));
    expect(screen.queryByRole('menuitem', { name: 'Xem hồ sơ' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Xem trên heatmap' })).toBeInTheDocument();
  });

  it('on a phone shows compact rows', async () => {
    asPhone();
    open('?tab=bench');
    expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Dự án gần nhất' })).not.toBeInTheDocument();
  });
});
