import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { formatNumber, formatPercent } from '@/lib/format';
import { HEADCOUNT, headcountFail, UNIT_IDS } from '@/test/dashboard-headcount-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { overviewFail, overviewFor } from '@/test/resource-handlers';
import { server } from '@/test/server';

const DIRECTOR: Account = {
  ...HR_ACCOUNT,
  fullName: 'Phạm Quốc Bảo',
  roles: ['DIRECTOR'],
  permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'RESOURCE_VIEW', 'PROJECT_VIEW'],
  employeeId: '55555555-5555-4555-8555-555555555555',
};
const PM: Account = { ...DIRECTOR, fullName: 'Hoàng Văn Phúc', roles: ['PROJECT_MANAGER'], dataScope: 'SELF', permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'PROJECT_VIEW', 'RESOURCE_VIEW'] };
const MANAGER: Account = { ...DIRECTOR, roles: ['LINE_MANAGER'], dataScope: 'ORG_UNIT', permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'EMPLOYEE_VIEW', 'PROJECT_VIEW'] };

const widget = (name: string) => screen.getByRole('region', { name });
const resourceTiles = () => screen.getByRole('list', { name: 'Nguồn lực tuần này' });
const tileOf = (label: string) => within(resourceTiles()).getByText(label, { exact: true }).closest('a')!;

/** Counts the requests of the two reads the blocks make. */
function spy(account: Account, overview = overviewFor(null)) {
  const calls = { overview: 0, headcount: 0 };
  server.use(
    http.get('*/api/resources/overview', () => {
      calls.overview += 1;
      return HttpResponse.json(overview);
    }),
    http.get('*/api/dashboard/headcount', () => {
      calls.headcount += 1;
      return HttpResponse.json(HEADCOUNT);
    }),
  );
  renderRoutes(routes, { session: account, path: '/' });
  return calls;
}

describe('Tổng quan: resource tiles, running projects and headcount charts', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('shows the three tiles with the numbers of the Nguồn lực overview, each leading to its filtered view', async () => {
    const { tiles, thresholds } = overviewFor(null);
    spy(DIRECTOR);
    await within(await screen.findByRole('list', { name: 'Nguồn lực tuần này' })).findByText(formatPercent(tiles.averageLoad!));
    expect(tileOf('Tải phân bổ trung bình')).toHaveTextContent(formatPercent(tiles.averageLoad!));
    expect(tileOf('Tải phân bổ trung bình')).toHaveAttribute('href', '/resources');
    expect(tileOf('Bench')).toHaveTextContent(formatNumber(tiles.bench));
    expect(tileOf('Bench')).toHaveTextContent(`Tải dưới ${thresholds.benchPercent}% tuần này`);
    expect(tileOf('Bench')).toHaveAttribute('href', '/resources?tab=bench');
    expect(tileOf('Quá tải')).toHaveTextContent(formatNumber(tiles.overloadedNow));
    expect(tileOf('Quá tải')).toHaveTextContent(`${formatNumber(tiles.overloadedIn12Weeks)} người trong 12 tuần tới`);
    expect(tileOf('Quá tải')).toHaveAttribute('href', '/resources?tab=heatmap&level=OVER');
  });

  it('lists the running projects as a Bar list: head count, code, overload, and the total in the head', async () => {
    spy(DIRECTOR);
    const block = widget('Dự án đang chạy');
    const list = await within(block).findByRole('list', { name: 'Dự án đang chạy, số người có phân bổ tuần này' });
    expect(within(block).getByRole('heading', { name: 'Dự án đang chạy' }).parentElement).toHaveTextContent('3');
    expect(within(block).getByRole('link', { name: 'Nguồn lực' })).toHaveAttribute('href', '/resources');
    const [first, second] = within(list).getAllByRole('listitem');
    expect(first).toHaveTextContent('Hệ thống bán hàng tại quầyDA-027 · 1 quá tải4 người');
    expect(within(first!).getByRole('link', { name: 'Hệ thống bán hàng tại quầy' })).toHaveAttribute('href', '/projects/p-DA-027');
    expect(second).toHaveTextContent('Ứng dụng đặt lịch khámDA-031');
    expect(second).toHaveTextContent('2 người');
    expect(second).not.toHaveTextContent('quá tải');
  });

  it('draws Nhân viên theo đơn vị with a link to each unit\'s own Employees, and the joins and leaves with a sentence per month', async () => {
    spy(DIRECTOR);
    const units = await within(widget('Nhân viên theo đơn vị')).findByRole('list', { name: 'Nhân viên theo đơn vị' });
    expect(within(widget('Nhân viên theo đơn vị')).getByRole('heading', { name: 'Nhân viên theo đơn vị' }).parentElement).toHaveTextContent('130');
    const web = within(units).getByRole('link', { name: 'Nhóm Web' });
    expect(web).toHaveAttribute('href', `/employees?orgUnitId=${UNIT_IDS.web}&includeSubUnits=false`);
    expect(web.closest('li')).toHaveTextContent('Nhóm Web59');
    expect(within(units).getByText('Trực thuộc công ty').closest('li')).toHaveTextContent('1');
    expect(within(units).queryByRole('link', { name: 'Trực thuộc công ty' })).not.toBeInTheDocument();
    expect(within(widget('Nhân viên theo đơn vị')).getByRole('link', { name: 'Cơ cấu tổ chức' })).toHaveAttribute('href', '/org');

    const flow = await within(widget('Vào làm và nghỉ việc')).findByRole('list', { name: 'Vào làm và nghỉ việc theo tháng, 6 tháng gần nhất: tổng 27 vào làm, 7 nghỉ việc' });
    expect(within(flow).getByText('Tháng 07/2026: 6 vào làm, 1 nghỉ việc')).toBeInTheDocument();
    expect(within(flow).getByText('+5 −0')).toBeInTheDocument();
    expect(within(flow).getByText('T10')).toHaveClass('text-brand-blue');
  });

  it('shows the resource blocks and no headcount to an Account with RESOURCE_VIEW but not EMPLOYEE_VIEW, and asks only for what it shows', async () => {
    const calls = spy(PM);
    await screen.findByRole('list', { name: 'Nguồn lực tuần này' });
    await within(widget('Dự án đang chạy')).findByRole('list');
    expect(screen.queryByRole('region', { name: 'Nhân viên theo đơn vị' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Vào làm và nghỉ việc' })).not.toBeInTheDocument();
    expect(calls.headcount).toBe(0);
  });

  it('shows none of the resource blocks and does not ask for them without RESOURCE_VIEW', async () => {
    const calls = spy(MANAGER);
    await screen.findByRole('list', { name: 'Số liệu chính' });
    await waitFor(() => expect(screen.getByRole('list', { name: 'Số liệu chính' })).not.toHaveAttribute('aria-busy'));
    expect(screen.queryByRole('list', { name: 'Nguồn lực tuần này' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Dự án đang chạy' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Nhân viên theo đơn vị' })).not.toBeInTheDocument();
    expect(calls).toEqual({ overview: 0, headcount: 0 });
  });

  it('keeps the other blocks when the overview fails, and retries it from the tiles', async () => {
    server.use(overviewFail());
    renderRoutes(routes, { session: DIRECTOR, path: '/' });
    const user = userEvent.setup();
    expect(await screen.findByText('Không tải được số liệu nguồn lực')).toBeInTheDocument();
    expect(await within(widget('Dự án đang chạy')).findByText('Không tải được danh sách dự án đang chạy')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Số liệu chính' })).toBeInTheDocument();
    server.use(http.get('*/api/resources/overview', () => HttpResponse.json(overviewFor(null))));
    await user.click(within(screen.getByRole('region', { name: 'Nguồn lực tuần này' })).getByRole('button', { name: 'Thử lại' }));
    expect(await within(await screen.findByRole('list', { name: 'Nguồn lực tuần này' })).findByText('Bench')).toBeInTheDocument();
  });

  it('keeps the tiles and the projects when the headcount fails', async () => {
    server.use(headcountFail());
    renderRoutes(routes, { session: DIRECTOR, path: '/' });
    expect(await within(widget('Nhân viên theo đơn vị')).findByText('Không tải được nhân viên theo đơn vị')).toBeInTheDocument();
    expect(within(widget('Vào làm và nghỉ việc')).getByText('Không tải được số người vào làm và nghỉ việc')).toBeInTheDocument();
    expect(await within(await screen.findByRole('list', { name: 'Nguồn lực tuần này' })).findByText('Bench')).toBeInTheDocument();
    expect(await within(widget('Dự án đang chạy')).findByRole('list')).toBeInTheDocument();
  });

  it('says why a block is empty instead of drawing zeros', async () => {
    server.use(http.get('*/api/resources/overview', () => HttpResponse.json({ ...overviewFor(null), projects: [] })));
    renderRoutes(routes, { session: DIRECTOR, path: '/' });
    expect(await within(widget('Dự án đang chạy')).findByText('Chưa có dự án đang chạy')).toBeInTheDocument();
    expect(await within(widget('Nhân viên theo đơn vị')).findByText('Chưa có nhân viên')).toBeInTheDocument();
    expect(within(widget('Vào làm và nghỉ việc')).getByText('Chưa có ai vào làm hoặc nghỉ việc')).toBeInTheDocument();
  });
});
