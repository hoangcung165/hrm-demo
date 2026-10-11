import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { orgUnitOptionsOk } from '@/test/org-unit-handlers';
import { unitId } from '@/test/org-unit-fixtures';
import { LAN_EMPLOYEE_ID, PROJECTS, projectId } from '@/test/project-fixtures';
import { projectListApi, projectsDenied, projectsFail } from '@/test/project-handlers';
import { EMPLOYEE_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

/** The PM persona: PROJECT_VIEW and PROJECT_EDIT, linked to Vũ Thị Lan. */
const PM: Account = {
  ...HR_ACCOUNT,
  fullName: 'Vũ Thị Lan',
  roles: ['PROJECT_MANAGER', 'EMPLOYEE'],
  dataScope: 'SELF',
  permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'PROJECT_VIEW', 'PROJECT_EDIT'],
  employeeId: LAN_EMPLOYEE_ID,
};
/** HR reads every project and manages none. */
const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'PROJECT_VIEW'], employeeId: '00000000-0000-4000-b000-000000000055' };

const asPhone = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)', addEventListener: () => {}, removeEventListener: () => {} }));

const open = (search = '', session: Account = PM, list = projectListApi()) => {
  server.use(list.handler, orgUnitOptionsOk());
  return { list, ...renderRoutes(routes, { session, path: `/projects${search}` }) };
};
const table = async () => {
  const found = await screen.findByRole('table', { name: 'Danh sách dự án' });
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Đang tải danh sách dự án' })).not.toBeInTheDocument());
  return found;
};
const bodyRows = async () => within(await table()).getAllByRole('row').slice(1);
const codesShown = async () => (await bodyRows()).map((row) => within(row).getAllByRole('cell')[0]!.textContent!.match(/DA-\d+/)![0]);

describe('ProjectsPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('a PM starts on "Tôi quản lý" with both tab counts, and "Tất cả dự án" lists every open project newest first', async () => {
    const { list } = open('', PM, projectListApi(PROJECTS, { delayMs: 30 }));
    expect(screen.getByRole('heading', { level: 1, name: 'Dự án' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).getByRole('link', { name: 'Dự án' })).toHaveAttribute('aria-current', 'page');

    expect(await codesShown()).toEqual(['DA-031', 'DA-029']);
    expect(list.requests[0]).toBe('page=0&size=20&mine=true');
    const mine = screen.getByRole('tab', { name: /Tôi quản lý/ });
    expect(mine).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(mine).toHaveTextContent('Tôi quản lý2'));
    expect(screen.getByRole('tab', { name: /Tất cả dự án/ })).toHaveTextContent('Tất cả dự án6');

    await userEvent.click(screen.getByRole('tab', { name: /Tất cả dự án/ }));
    await waitFor(async () => expect(await codesShown()).toEqual(['DA-033', 'DA-031', 'DA-029', 'DA-027', 'DA-025', 'DA-022']));
    expect(screen.getByText('Hiển thị 1–6 trên 6 dự án. Ẩn 2 dự án đã đóng.')).toBeInTheDocument();
  });

  it('shows the columns of the artboard: code and client, PM, dates, members with the overload, status', async () => {
    open('?tab=all');
    expect(within(await table()).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Dự án', 'PM', 'Thời gian', 'Thành viên', 'Trạng thái']);
    const row = within(await table()).getByRole('link', { name: 'Ứng dụng đặt lịch khám' }).closest('tr')!;
    const cells = within(row).getAllByRole('cell');
    expect(within(row).getByRole('link', { name: 'Ứng dụng đặt lịch khám' })).toHaveAttribute('href', `/projects/${projectId('DA-031')}`);
    expect(cells[0]).toHaveTextContent('DA-031 · Bệnh viện Đa khoa Tâm An');
    expect(cells[1]).toHaveTextContent('Vũ Thị Lan');
    expect(cells[2]).toHaveTextContent('01/09/2026đến 31/03/2027');
    expect(cells[3]).toHaveTextContent('7 người1 quá tải');
    expect(cells[4]).toHaveTextContent('Đang chạy');
    const internal = within(await table()).getByRole('link', { name: 'Nền tảng dữ liệu nội bộ' }).closest('tr')!;
    expect(within(internal).getAllByRole('cell')[0]).toHaveTextContent('DA-033 · Dự án nội bộ');
    expect(within(internal).getAllByRole('cell')[4]).toHaveTextContent('Lên kế hoạch');
  });

  it('HR has no "Tôi quản lý" tab and reads every project', async () => {
    open('', HR);
    expect(await codesShown()).toHaveLength(6);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('searches without accents, and filters by status, owning unit and overload; the filters live in the URL', async () => {
    const { list, router } = open('?tab=all');
    await table();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm theo mã, tên hoặc khách hàng' }), 'lua vang');
    await waitFor(async () => expect(await codesShown()).toEqual(['DA-027']));
    expect(router.state.location.search).toContain('q=lua+vang');

    await userEvent.click(screen.getByRole('combobox', { name: 'Trạng thái' }));
    await userEvent.click(screen.getByRole('option', { name: 'Tất cả trạng thái' }));
    await waitFor(async () => expect(await codesShown()).toEqual(['DA-027', 'DA-018']));
    expect(list.requests.at(-1)).toContain('status=PLANNED%2CACTIVE%2CON_HOLD%2CCLOSED');

    await userEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    await waitFor(async () => expect(await codesShown()).toHaveLength(6));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Chỉ dự án có người quá tải' }));
    await waitFor(async () => expect(await codesShown()).toEqual(['DA-031', 'DA-029']));
    expect(router.state.location.search).toBe('?tab=all&overloaded=true');
  });

  it('opens with the owning unit from the URL, and says when nothing matches', async () => {
    open(`?tab=all&orgUnitId=${unitId('PMDN')}`);
    expect(await codesShown()).toEqual(['DA-027']);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm theo mã, tên hoặc khách hàng' }), 'không có');
    expect(await screen.findByRole('heading', { name: 'Không có dự án nào khớp “không có”' })).toBeInTheDocument();
    await userEvent.click(within(screen.getAllByRole('status').find((el) => el.textContent?.includes('khớp'))!).getByRole('button', { name: 'Xóa bộ lọc' }));
    await waitFor(async () => expect(await codesShown()).toHaveLength(6));
  });

  it('says when the PM manages no project yet', async () => {
    open('', PM, projectListApi(PROJECTS, { me: '00000000-0000-4000-b000-999999999999' }));
    expect(await screen.findByRole('heading', { name: 'Bạn chưa quản lý dự án nào' })).toBeInTheDocument();
  });

  it('offers a retry when the list cannot be loaded', async () => {
    server.use(projectsFail(), orgUnitOptionsOk());
    renderRoutes(routes, { session: HR, path: '/projects' });
    expect(await screen.findByRole('heading', { name: 'Không tải được danh sách dự án' })).toBeInTheDocument();
    server.use(projectListApi().handler);
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await codesShown()).toHaveLength(6);
  });

  it('without PROJECT_VIEW: no nav item, no request, the no-permission state; and the same when the API refuses', async () => {
    const { list } = open('', EMPLOYEE_ACCOUNT);
    expect(await screen.findByRole('heading', { name: 'Bạn không xem được danh sách dự án' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).queryByRole('link', { name: 'Dự án' })).not.toBeInTheDocument();
    expect(list.requests).toEqual([]);
  });

  it('shows the no-permission state when the API refuses the list', async () => {
    server.use(projectsDenied(), orgUnitOptionsOk());
    renderRoutes(routes, { session: HR, path: '/projects' });
    expect(await screen.findByRole('heading', { name: 'Bạn không xem được danh sách dự án' })).toBeInTheDocument();
  });

  it('at 390: compact rows with the status and overload, the filter dialog, and the view-only note', async () => {
    asPhone();
    open();
    const rows = await screen.findByRole('list', { name: 'Danh sách dự án' });
    const first = within(rows).getAllByRole('listitem')[0]!;
    expect(first).toHaveTextContent('Ứng dụng đặt lịch khám');
    expect(first).toHaveTextContent('DA-031 · PM Vũ Thị Lan');
    expect(first).toHaveTextContent('Đang chạy');
    expect(first).toHaveTextContent('1 quá tải');
    expect(first).toHaveTextContent('7 người · đến 31/03/2027');
    expect(screen.getByText('Trên điện thoại chỉ xem dự án và thành viên. Tạo dự án và phân bổ nhân sự làm trên máy tính.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lọc' }));
    expect(await screen.findByRole('dialog', { name: 'Lọc dự án' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Chỉ dự án có người quá tải' }));
    expect(await screen.findByRole('button', { name: 'Xem 2 dự án' })).toBeInTheDocument();
  });
});
