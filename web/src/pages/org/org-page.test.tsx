import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import { EMPTY_ORG, orgStructure, unitId } from '@/test/org-unit-fixtures';
import { orgUnitsDenied, orgUnitsFail, orgUnitsOk } from '@/test/org-unit-handlers';
import { DIRECTOR_ACCOUNT, EMPLOYEE_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const COMPANY_NAME = 'Công ty Cổ phần Công nghệ Mẫu';
const openPage = (path = '/org', session = HR_ACCOUNT) => renderRoutes(routes, { session, path });
const row = (name: RegExp | string) => screen.findByRole('treeitem', { name });
const rowCount = () => screen.getAllByRole('treeitem').length;
const detail = (name: string) => screen.findByRole('region', { name });
/** The twist is a mouse-only control, hidden from assistive technology and named by its tooltip. */
const twist = (name: string) => screen.getByTitle(name);
const search = () => screen.getByRole('searchbox', { name: 'Tìm đơn vị' });
/** Value of a detail-list row, found by its label. */
const field = (card: HTMLElement, label: string) => within(card).getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement;

describe('OrgPage: unit tree', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('shows skeletons while loading, then the summary, every level open and the company selected', async () => {
    server.use(http.get('*/api/org-units', async () => (await delay(50), HttpResponse.json(orgStructure()))));
    openPage();
    expect(screen.getByRole('region', { name: 'Đang tải cây đơn vị' })).toHaveAttribute('aria-busy', 'true');
    expect(await row(new RegExp(COMPANY_NAME))).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('19 đơn vị · 0 nhân viên')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cây đơn vị' })).toHaveAttribute('aria-selected', 'true');
    expect(rowCount()).toBe(21);
    expect(screen.getByRole('checkbox', { name: 'Hiện đơn vị ngừng hoạt động' })).toBeChecked();
    // Until HRM-06 the API sends no heads: active units show "Chưa có", the inactive one a Badge.
    expect(within(await row(/Nhóm Web Đà Nẵng/)).getByText('Chưa có')).toBeInTheDocument();
    expect(within(await row(/Nhóm Game/)).getByText('Ngừng hoạt động')).toBeInTheDocument();

    const card = await detail(COMPANY_NAME);
    expect(field(card, 'Loại')).toHaveTextContent('Công ty');
    expect(field(card, 'Người đại diện theo pháp luật')).toHaveTextContent('Phạm Quốc BảoGiám đốc');
    expect(within(card).queryByText('Mã đơn vị')).not.toBeInTheDocument();
    expect(within(card).queryByText('Đơn vị cha')).not.toBeInTheDocument();
    expect(within(within(card).getByRole('table')).getAllByRole('link')).toHaveLength(6);
  });

  it('selects a unit into the URL and shows its detail, heads and headcounts', async () => {
    server.use(orgUnitsOk(orgStructure({ filled: true })));
    const { router } = openPage();
    expect(await screen.findByText('19 đơn vị · 186 nhân viên')).toBeInTheDocument();
    expect(within(await row(/Nhóm Marketing/)).getByText('Chưa có')).toBeInTheDocument();
    await userEvent.click(await row(/Phòng Phát triển phần mềm/));
    expect(router.state.location.search).toBe(`?unit=${unitId('PTPM')}`);

    const card = await detail('Phòng Phát triển phần mềm');
    expect(within(card).getByText('Đang hoạt động')).toBeInTheDocument();
    expect(within(card).getByText('Phòng ban · PTPM')).toBeInTheDocument();
    expect(field(card, 'Mã đơn vị')).toHaveTextContent('PTPM');
    expect(field(card, 'Trưởng đơn vị')).toHaveTextContent('Đỗ Thành TrungNV-00012 · Giám đốc kỹ thuật');
    expect(field(card, 'Nhân viên')).toHaveTextContent('782 thuộc trực tiếp · 76 ở đơn vị con');
    const children = within(card).getByRole('table', { name: 'Đơn vị con của Phòng Phát triển phần mềm' });
    expect(within(children).getAllByRole('row')).toHaveLength(7);
    expect(within(children).getAllByRole('row').at(-1)).toHaveTextContent('Nhóm GameNgừng hoạt độngKhông có trưởng đơn vị0');
  });

  it('follows the parent link and a child link', async () => {
    server.use(orgUnitsOk());
    const { router } = openPage(`/org?unit=${unitId('PMDN')}`);
    const card = await detail('Phòng Phần mềm Đà Nẵng');
    expect(await row(/Phòng Phần mềm Đà Nẵng/)).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(within(card).getByRole('link', { name: 'Nhóm Web Đà Nẵng' }));
    expect(router.state.location.search).toBe(`?unit=${unitId('WEBDN')}`);
    const team = await detail('Nhóm Web Đà Nẵng');
    expect(within(team).getByText('Chưa có đơn vị con.')).toBeInTheDocument();
    expect(field(team, 'Trưởng đơn vị')).toHaveTextContent('Chưa có');
    await userEvent.click(within(team).getByRole('link', { name: 'Phòng Phần mềm Đà Nẵng' }));
    await userEvent.click(within(await detail('Phòng Phần mềm Đà Nẵng')).getByRole('link', { name: 'Chi nhánh Đà Nẵng' }));
    await userEvent.click(within(await detail('Chi nhánh Đà Nẵng')).getByRole('link', { name: COMPANY_NAME }));
    expect(await detail(COMPANY_NAME)).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('moves focus to the detail heading after a detail link, not after a click in the tree', async () => {
    server.use(orgUnitsOk());
    openPage(`/org?unit=${unitId('PMDN')}`);
    await userEvent.click(within(await detail('Phòng Phần mềm Đà Nẵng')).getByRole('link', { name: 'Nhóm Web Đà Nẵng' }));
    expect(await screen.findByRole('heading', { name: 'Nhóm Web Đà Nẵng' })).toHaveFocus();
    await userEvent.click(within(await detail('Nhóm Web Đà Nẵng')).getByRole('link', { name: 'Phòng Phần mềm Đà Nẵng' }));
    expect(await screen.findByRole('heading', { name: 'Phòng Phần mềm Đà Nẵng' })).toHaveFocus();
    await userEvent.click(await row(/^Nhóm Mobile Đà Nẵng/));
    expect(await row(/^Nhóm Mobile Đà Nẵng/)).toHaveFocus();
  });

  it('names each row with its type, head, headcount and status', async () => {
    server.use(orgUnitsOk(orgStructure({ filled: true })));
    openPage();
    expect(await row('Phòng Kinh doanh, Phòng ban, Trưởng đơn vị: Đinh Công Sơn, 20 nhân viên')).toBeInTheDocument();
    expect(await row('Nhóm Marketing, Nhóm, Trưởng đơn vị: chưa có, 7 nhân viên')).toBeInTheDocument();
    expect(await row('Nhóm Game, Nhóm, Trưởng đơn vị: chưa có, 0 nhân viên, Ngừng hoạt động')).toBeInTheDocument();
    await i18n.changeLanguage('en');
    expect(await row('Phòng Kinh doanh, Department, Unit head: Đinh Công Sơn, 20 employees')).toBeInTheDocument();
    expect(await row('Nhóm Game, Team, Unit head: none yet, 0 employees, Inactive')).toBeInTheDocument();
  });

  it('opens the units above a selection that sits in a collapsed branch and makes it the tab stop', async () => {
    server.use(orgUnitsOk());
    openPage();
    await row(/^Nhóm Web Đà Nẵng/);
    await userEvent.click(screen.getByRole('button', { name: 'Thu gọn tất cả' }));
    expect(rowCount()).toBe(7);
    const card = await detail(COMPANY_NAME);
    await userEvent.click(within(card).getByRole('link', { name: 'Chi nhánh Đà Nẵng' }));
    await userEvent.click(within(await detail('Chi nhánh Đà Nẵng')).getByRole('link', { name: 'Phòng Phần mềm Đà Nẵng' }));
    const selected = await row(/^Phòng Phần mềm Đà Nẵng/);
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(selected).toHaveAttribute('tabindex', '0');
    // Only the branch of the selection opened.
    expect(rowCount()).toBe(9);
  });

  it('shows an inactive unit with its Badge in the detail', async () => {
    server.use(orgUnitsOk());
    openPage(`/org?unit=${unitId('GAME')}`);
    const card = await detail('Nhóm Game');
    expect(within(card).getByText('Ngừng hoạt động')).toBeInTheDocument();
    expect(within(card).queryByText('Đang hoạt động')).not.toBeInTheDocument();
    expect(field(card, 'Đơn vị cha')).toHaveTextContent('Phòng Phát triển phần mềm');
  });

  it('falls back to the company node for an unknown unit id', async () => {
    server.use(orgUnitsOk());
    openPage('/org?unit=does-not-exist');
    expect(await detail(COMPANY_NAME)).toBeInTheDocument();
    expect(await row(new RegExp(COMPANY_NAME))).toHaveAttribute('aria-selected', 'true');
  });

  it('searches by name or code without diacritics, keeping ancestors', async () => {
    server.use(orgUnitsOk());
    openPage();
    await row(/Nhóm Mobile Đà Nẵng/);
    await userEvent.type(search(), 'mobile');
    expect(screen.getAllByRole('treeitem').map((item) => item.getAttribute('aria-level'))).toEqual(['1', '2', '3', '2', '3', '4']);
    expect(screen.queryByRole('treeitem', { name: /Nhóm Web/ })).not.toBeInTheDocument();
    await userEvent.clear(search());
    await userEvent.type(search(), 'hcns');
    expect(rowCount()).toBe(2);
    await userEvent.click(screen.getByRole('button', { name: 'Xóa nội dung tìm' }));
    expect(search()).toHaveValue('');
    expect(rowCount()).toBe(21);
  });

  it('announces the search result once typing pauses', async () => {
    server.use(orgUnitsOk());
    openPage();
    await row(/^Nhóm Mobile Đà Nẵng/);
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();
    await userEvent.type(search(), 'mobile');
    expect(status).toBeEmptyDOMElement();
    await waitFor(() => expect(status).toHaveTextContent('Tìm thấy 2 đơn vị'));
    await userEvent.clear(search());
    expect(status).toBeEmptyDOMElement();
    await userEvent.type(search(), 'thiết kế');
    await waitFor(() => expect(status).toHaveTextContent('Không có đơn vị nào khớp “thiết kế”'));
    await i18n.changeLanguage('en');
    const searchEn = screen.getByRole('searchbox', { name: 'Search units' });
    await userEvent.clear(searchEn);
    await userEvent.type(searchEn, 'hcns');
    await waitFor(() => expect(status).toHaveTextContent('1 unit found'));
    await userEvent.clear(searchEn);
    await userEvent.type(searchEn, 'web');
    await waitFor(() => expect(status).toHaveTextContent('2 units found'));
  });

  it('says when no unit matches and clears the search', async () => {
    server.use(orgUnitsOk());
    openPage();
    await row(/Nhóm Web Đà Nẵng/);
    await userEvent.type(search(), 'thiết kế');
    expect(screen.getByRole('heading', { name: 'Không có đơn vị nào khớp “thiết kế”' })).toBeInTheDocument();
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    const tree = screen.getByRole('region', { name: 'Cây đơn vị' });
    await userEvent.click(within(tree).getAllByRole('button', { name: 'Xóa nội dung tìm' }).at(-1)!);
    expect(rowCount()).toBe(21);
  });

  it('hides inactive units when the checkbox is off', async () => {
    server.use(orgUnitsOk());
    openPage();
    await row(/Nhóm Game/);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Hiện đơn vị ngừng hoạt động' }));
    expect(screen.queryByRole('treeitem', { name: /Nhóm Game/ })).not.toBeInTheDocument();
    expect(rowCount()).toBe(20);
  });

  it('collapses all to the first level and opens all again', async () => {
    server.use(orgUnitsOk());
    openPage();
    await row(/Nhóm Game/);
    await userEvent.click(screen.getByRole('button', { name: 'Thu gọn tất cả' }));
    expect(rowCount()).toBe(7);
    await userEvent.click(twist('Mở Chi nhánh Đà Nẵng'));
    expect(rowCount()).toBe(9);
    await userEvent.click(screen.getByRole('button', { name: 'Thu gọn tất cả' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mở tất cả' }));
    expect(rowCount()).toBe(21);
  });

  it('shows the load error and retries', async () => {
    server.use(orgUnitsFail());
    openPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được cơ cấu tổ chức');
    server.use(orgUnitsOk());
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await row(/Nhóm Web Đà Nẵng/)).toBeInTheDocument();
  });

  it('shows the denied state, not the load error, when the API answers 403', async () => {
    server.use(orgUnitsDenied());
    openPage();
    expect(await screen.findByRole('heading', { name: 'Bạn không có quyền xem Cơ cấu tổ chức' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
  });

  it('shows the empty state when only the company exists', async () => {
    server.use(orgUnitsOk(EMPTY_ORG));
    openPage();
    expect(await screen.findByRole('heading', { name: 'Chưa có đơn vị nào' })).toBeInTheDocument();
    expect(rowCount()).toBe(1);
    expect(screen.queryByRole('searchbox', { name: 'Tìm đơn vị' })).not.toBeInTheDocument();
    expect(screen.getByText('0 đơn vị · 0 nhân viên')).toBeInTheDocument();
  });

  it('denies an Account without ORG_VIEW and does not call the API', async () => {
    // No org handler: a request would fail the test (onUnhandledRequest: 'error').
    openPage('/org', EMPLOYEE_ACCOUNT);
    expect(screen.getByRole('heading', { name: 'Bạn không có quyền xem Cơ cấu tổ chức' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('tree')).not.toBeInTheDocument());
  });

  it('is read-only: a Director sees the tree and no action buttons', async () => {
    server.use(orgUnitsOk(orgStructure({ filled: true })));
    openPage(`/org?unit=${unitId('QA')}`, DIRECTOR_ACCOUNT);
    const card = await detail('Nhóm Kiểm thử');
    expect(field(card, 'Trưởng đơn vị')).toHaveTextContent('Trịnh Ngọc ÁnhNV-00176 · Trưởng nhóm');
    expect(field(card, 'Nhân viên')).toHaveTextContent(/^18$/);
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thêm đơn vị|Sửa|Chuyển đơn vị/ })).not.toBeInTheDocument();
  });

  it('keeps the view in the URL and carries the selected unit over to the chart', async () => {
    server.use(orgUnitsOk());
    const { router } = openPage(`/org?unit=${unitId('QA')}`);
    await detail('Nhóm Kiểm thử');
    await userEvent.click(screen.getByRole('tab', { name: 'Sơ đồ tổ chức' }));
    expect(router.state.location.search).toBe(`?unit=${unitId('QA')}&view=chart`);
    const chart = await screen.findByRole('tree', { name: 'Sơ đồ tổ chức' });
    expect(within(chart).getByRole('treeitem', { name: /^Nhóm Kiểm thử/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('region', { name: 'Nhóm Kiểm thử' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Cây đơn vị' }));
    expect(await detail('Nhóm Kiểm thử')).toBeInTheDocument();
  });

  it('is translated to English', async () => {
    await i18n.changeLanguage('en');
    server.use(orgUnitsOk(orgStructure({ filled: true })));
    openPage(`/org?unit=${unitId('GAME')}`);
    const card = await detail('Nhóm Game');
    expect(screen.getByText('19 units · 186 employees')).toBeInTheDocument();
    expect(within(card).getByText('Inactive')).toBeInTheDocument();
    expect(within(card).getByText('Team · GAME')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Org chart' })).toBeInTheDocument();
    await userEvent.click(await row(/^Công ty/));
    expect(within(await detail(COMPANY_NAME)).getByText('Legal representative', { selector: 'dt' })).toBeInTheDocument();
  });
});
