import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addWeeks, format, startOfWeek } from 'date-fns';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { orgUnitOptionsOk } from '@/test/org-unit-handlers';
import { unitId } from '@/test/org-unit-fixtures';
import { HEATMAP_PEOPLE, heatmapApi, heatmapDenied, heatmapFail, personId, resourceListsApi, type FixturePerson } from '@/test/resource-handlers';
import { EMPLOYEE_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';
import { companyToday } from '@/lib/company-time';

/** HR reads the resources and the profiles. */
const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'RESOURCE_VIEW'] };
/** A PM sees the resources but not the profiles. */
const PM: Account = { ...HR_ACCOUNT, roles: ['PROJECT_MANAGER', 'EMPLOYEE'], dataScope: 'SELF', permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'PROJECT_VIEW', 'RESOURCE_VIEW'] };

const asPhone = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)', addEventListener: () => {}, removeEventListener: () => {} }));

const open = (search = '', session: Account = HR, api = heatmapApi()) => {
  server.use(api.handler, orgUnitOptionsOk(), ...resourceListsApi().handlers);
  return { api, ...renderRoutes(routes, { session, path: `/resources${search ? `${search}&tab=heatmap` : '?tab=heatmap'}` }) };
};
const table = async () => {
  const found = await screen.findByRole('table', { name: 'Heatmap Tải phân bổ theo nhân viên' });
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Đang tải heatmap' })).not.toBeInTheDocument());
  return found;
};
const bodyRows = async () => within(await table()).getAllByRole('row').filter((row) => within(row).queryAllByRole('img').length > 0);
const namesShown = async () => (await bodyRows()).map((row) => within(row).getByRole('rowheader').querySelector('.truncate')!.textContent!);
const lastRequest = (api: { requests: string[] }) => new URLSearchParams(api.requests[api.requests.length - 1]);

describe('ResourcesPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows the heatmap with the week columns, the current week marked, and a number in every cell', async () => {
    const { api } = open();
    expect(screen.getByRole('heading', { level: 1, name: 'Nguồn lực' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).getByRole('link', { name: 'Nguồn lực' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('tab', { name: 'Heatmap' })).toHaveAttribute('aria-selected', 'true');

    const grid = await table();
    expect(within(grid).getAllByRole('columnheader').filter((header) => header.getAttribute('scope') === 'col')).toHaveLength(13);
    expect(within(grid).getAllByRole('columnheader').filter((header) => header.getAttribute('aria-current') === 'date')).toHaveLength(1);
    const thisWeek = format(startOfWeek(companyToday(), { weekStartsOn: 1 }), 'dd/MM');
    expect(within(grid).getAllByRole('columnheader', { current: 'date' })[0]).toHaveTextContent(thisWeek);
    expect(api.requests[0]).toBe('granularity=WEEK&columns=12&sort=LOAD_DESC&page=0&size=50');

    const tri = within(grid).getByRole('rowheader', { name: /Cao Minh Trí/ }).closest('tr')!;
    expect(within(tri).getAllByRole('img')).toHaveLength(12);
    expect(within(tri).getAllByRole('img')[0]).toHaveTextContent('60%');
    expect(within(tri).getAllByRole('img')[1]).toHaveAccessibleName(/^Tải phân bổ 120%, quá tải\. Cao Minh Trí, tuần \d+ \(/);
    expect(within(tri).getAllByRole('img')[1]).toHaveTextContent('120%');
    expect(screen.getByRole('list', { name: 'Chú giải Tải phân bổ' })).toHaveTextContent('49%Dưới 50%: Bench50%50–89%90%Từ 90% đến 100%120%Trên 100%: Quá tải');
  });

  it('lists the highest load first and says how many people are overloaded', async () => {
    open();
    expect(await namesShown()).toEqual(['Cao Minh Trí', 'Vũ Thị Lan', 'Trần Thị Mai', 'Phan Khánh Duy', 'Nguyễn Văn An']);
    expect(screen.getByText(/^5 người\./)).toBeInTheDocument();
    expect(screen.getByText('0 người quá tải tuần này')).toBeInTheDocument();
    expect(screen.getByText(/1 người quá tải trong khoảng đang xem/)).toBeInTheDocument();
  });

  it('links a row to the profile for someone who may open profiles, and shows plain names to someone who may not', async () => {
    open();
    expect(within(await table()).getByRole('link', { name: /Cao Minh Trí/ })).toHaveAttribute('href', `/employees/${personId(1)}`);
  });

  it('shows plain names without links when the Account cannot open profiles', async () => {
    open('', PM);
    await table();
    expect(within(await table()).queryByRole('link')).not.toBeInTheDocument();
    expect(within(await table()).getByRole('rowheader', { name: /Cao Minh Trí/ })).toBeInTheDocument();
  });

  it('filters by load level and sorts, keeping them in the URL', async () => {
    const { api, router } = open();
    await table();
    await userEvent.click(screen.getByRole('combobox', { name: 'Mức tải' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Quá tải' }));
    await waitFor(async () => expect(await namesShown()).toEqual(['Cao Minh Trí']), { timeout: 5000 });
    expect(lastRequest(api).get('level')).toBe('OVER');
    expect(router.state.location.search).toBe('?tab=heatmap&level=over');

    await userEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    await waitFor(async () => expect((await namesShown()).length).toBe(5), { timeout: 5000 });
    await userEvent.click(screen.getByRole('combobox', { name: 'Sắp xếp' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Theo tên' }));
    await waitFor(async () => expect(await namesShown()).toEqual(['Cao Minh Trí', 'Nguyễn Văn An', 'Phan Khánh Duy', 'Trần Thị Mai', 'Vũ Thị Lan']));
    expect(lastRequest(api).get('sort')).toBe('NAME');
  });

  it('searches by name without accents, and a search without a match offers to clear it', async () => {
    const { api } = open();
    await table();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã nhân viên' }), 'tri');
    await waitFor(async () => expect(await namesShown()).toEqual(['Cao Minh Trí']), { timeout: 5000 });
    expect(lastRequest(api).get('q')).toBe('tri');

    await userEvent.clear(screen.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã nhân viên' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã nhân viên' }), 'zzz');
    expect(await screen.findByText('Không có nhân viên nào khớp')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Xóa bộ lọc' }).at(-1)!);
    await waitFor(async () => expect((await namesShown()).length).toBe(5), { timeout: 5000 });
  });

  it('steps through the weeks, back to "Tuần này", and switches to months', async () => {
    const { api, router } = open();
    await table();
    await userEvent.click(screen.getByRole('button', { name: 'Khoảng sau' }));
    const next = format(addWeeks(startOfWeek(companyToday(), { weekStartsOn: 1 }), 12), 'yyyy-MM-dd');
    await waitFor(() => expect(lastRequest(api).get('from')).toBe(next));
    expect(router.state.location.search).toBe(`?tab=heatmap&from=${next}`);
    await userEvent.click(screen.getByRole('button', { name: 'Tuần này' }));
    await waitFor(() => expect(lastRequest(api).get('from')).toBeNull());
    expect(screen.queryByRole('button', { name: 'Tuần này' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Theo tháng' }));
    await waitFor(() => expect(lastRequest(api).get('granularity')).toBe('MONTH'));
    expect(lastRequest(api).get('columns')).toBe('6');
    const grid = await table();
    await waitFor(() => expect(within(grid).getAllByRole('columnheader').filter((header) => header.getAttribute('scope') === 'col')).toHaveLength(7));
  });

  it('does not step further than 12 weeks from now', async () => {
    open(`?from=${format(addWeeks(startOfWeek(companyToday(), { weekStartsOn: 1 }), 12), 'yyyy-MM-dd')}`);
    await table();
    expect(screen.getByRole('button', { name: 'Khoảng sau' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Khoảng trước' })).toBeEnabled();
  });

  it('pages 50 people at a time', async () => {
    const many: FixturePerson[] = Array.from({ length: 120 }, (_, i) => ({ id: personId(100 + i), code: `NV${String(i).padStart(5, '0')}`, fullName: `Nhân viên ${String(i).padStart(3, '0')}`, orgUnitName: null, unitCode: null, weeks: Array.from({ length: 12 }, () => i % 120) }));
    const { api } = open('', HR, heatmapApi(many));
    expect((await bodyRows()).length).toBe(50);
    expect(screen.getByText('Hiển thị 1–50 trên 120 người.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^3$|Trang 3/ }));
    await waitFor(() => expect(lastRequest(api).get('page')).toBe('2'));
    await waitFor(async () => expect((await bodyRows()).length).toBe(20));
  });

  it('says so when nobody is allocated in the period, and shows the people with 0%', async () => {
    open('', HR, heatmapApi(HEATMAP_PEOPLE.map((p) => ({ ...p, weeks: Array.from({ length: 12 }, () => 0) }))));
    expect(await screen.findByText('Chưa ai có phân bổ trong khoảng này. Phân bổ nhân sự vào dự án để heatmap có số liệu.')).toBeInTheDocument();
    expect((await bodyRows()).length).toBe(5);
  });

  it('says so when there is no active Employee', async () => {
    open('', HR, heatmapApi([]));
    expect(await screen.findByText('Chưa có nhân viên')).toBeInTheDocument();
  });

  it('shows a loading table first, then retries after an error', async () => {
    server.use(heatmapFail(), orgUnitOptionsOk(), ...resourceListsApi().handlers);
    renderRoutes(routes, { session: HR, path: '/resources?tab=heatmap' });
    expect(await screen.findByText('Không tải được heatmap')).toBeInTheDocument();
    const ok = heatmapApi();
    server.use(ok.handler);
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await table()).toBeInTheDocument();
  });

  it('shows the denied state without RESOURCE_VIEW and when the API refuses', async () => {
    const { unmount } = renderRoutes(routes, { session: EMPLOYEE_ACCOUNT, path: '/resources' });
    expect(await screen.findByText('Bạn không có quyền xem Nguồn lực')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nguồn lực' })).not.toBeInTheDocument();
    unmount();
    server.use(heatmapDenied(), orgUnitOptionsOk(), ...resourceListsApi().handlers);
    renderRoutes(routes, { session: HR, path: '/resources?tab=heatmap' });
    expect(await screen.findByText('Bạn không có quyền xem Nguồn lực')).toBeInTheDocument();
  });

  it('on a phone shows three weeks, with the filters in a dialog', async () => {
    asPhone();
    const { api } = open();
    await table();
    expect(api.requests[0]).toBe('granularity=WEEK&columns=3&sort=LOAD_DESC&page=0&size=50');
    expect(screen.queryByRole('combobox', { name: 'Mức tải' })).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Theo tháng' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lọc' }));
    const dialog = await screen.findByRole('dialog', { name: 'Lọc heatmap' });
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Mức tải' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Bench' }));
    await waitFor(() => expect(lastRequest(api).get('level')).toBe('BENCH'));
    await act(async () => {});
    expect(within(dialog).getByRole('button', { name: /^Xem \d+ người$/ })).toBeInTheDocument();
  });

  it('filters by department', async () => {
    const { api } = open(`?unit=${unitId('DVKH')}`);
    await waitFor(async () => expect(await namesShown()).toEqual(['Trần Thị Mai']));
    expect(lastRequest(api).get('orgUnitId')).toBe(unitId('DVKH'));
  });
});
