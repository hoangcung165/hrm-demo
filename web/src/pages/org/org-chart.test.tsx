import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import { EMPTY_ORG, orgStructure, unitId } from '@/test/org-unit-fixtures';
import { orgUnitsDenied, orgUnitsFail, orgUnitsOk } from '@/test/org-unit-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const COMPANY_NAME = 'Công ty Cổ phần Công nghệ Mẫu';
const openChart = (search = '') => renderRoutes(routes, { session: HR_ACCOUNT, path: `/org?view=chart${search}` });
const chart = () => screen.findByRole('tree', { name: 'Sơ đồ tổ chức' });
const card = (name: RegExp | string) => screen.findByRole('treeitem', { name });
const cardCount = () => screen.getAllByRole('treeitem').length;
const button = (name: RegExp | string) => screen.getByRole('button', { name });
const zoomLevel = () => within(screen.getByRole('group', { name: 'Thu phóng' })).getByText(/%$/);

/** jsdom has no layout: give the chart and its viewport a size, so "Vừa màn hình" has something to fit. */
function mockLayout(chartSize: { width: number; height: number }, viewport: { width: number; height: number }) {
  const isChart = (element: HTMLElement) => element.getAttribute('role') === 'tree';
  const spies = [
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return isChart(this) ? chartSize.width : 0;
    }),
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return isChart(this) ? chartSize.height : 0;
    }),
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(viewport.width),
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(viewport.height),
  ];
  return () => spies.forEach((spy) => spy.mockRestore());
}

describe('OrgPage: org chart', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('shows skeleton cards while loading, then every active unit with its head and headcount', async () => {
    server.use(http.get('*/api/org-units', async () => (await delay(50), HttpResponse.json(orgStructure({ filled: true })))));
    openChart();
    expect(screen.getByRole('status', { name: 'Đang tải sơ đồ tổ chức' })).toHaveAttribute('aria-busy', 'true');
    const tree = await chart();
    expect(screen.queryByRole('status', { name: 'Đang tải sơ đồ tổ chức' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Sơ đồ tổ chức' })).toHaveAttribute('aria-selected', 'true');
    // The company and the 19 active units; the inactive Nhóm Game is hidden by default.
    expect(cardCount()).toBe(20);
    expect(screen.getByRole('checkbox', { name: 'Hiện đơn vị ngừng hoạt động' })).not.toBeChecked();
    expect(within(tree).queryByText('Nhóm Game')).not.toBeInTheDocument();

    const company = await card(`${COMPANY_NAME}, Công ty, Trưởng đơn vị: Phạm Quốc Bảo, 186 nhân viên`);
    expect(company).toHaveAttribute('aria-level', '1');
    expect(within(company).getByText('Công ty')).toBeInTheDocument();
    expect(within(company).getByText('Phạm Quốc Bảo')).toBeInTheDocument();
    expect(within(company).queryByRole('button')).not.toBeInTheDocument();

    const sales = await card('Phòng Kinh doanh, Phòng ban, Trưởng đơn vị: Đinh Công Sơn, 20 nhân viên');
    expect(sales).toHaveAttribute('aria-level', '2');
    expect(within(sales).getByText('Phòng ban · KD')).toBeInTheDocument();
    expect(within(sales).getByText('Đinh Công Sơn')).toBeInTheDocument();
    expect(within(sales).getByText('20 nhân viên')).toBeInTheDocument();
    expect(within(sales).getByRole('button', { name: 'Thu gọn 2 đơn vị con của Phòng Kinh doanh' })).toHaveTextContent('2 đơn vị');

    // A stacked card: no type and code line, and the vacant head.
    const marketing = await card('Nhóm Marketing, Nhóm, Trưởng đơn vị: chưa có, 7 nhân viên');
    expect(marketing).toHaveAttribute('aria-level', '3');
    expect(within(marketing).getByText('Chưa có trưởng đơn vị')).toBeInTheDocument();
    expect(within(marketing).queryByText('Nhóm · MKT')).not.toBeInTheDocument();
    expect(within(marketing).queryByRole('button')).not.toBeInTheDocument();
    expect(await card(/^Nhóm Web Đà Nẵng,/)).toHaveAttribute('aria-level', '4');
  });

  it('looks right before HRM-06: no heads and zero headcounts', async () => {
    server.use(orgUnitsOk());
    openChart();
    const tree = await chart();
    expect(within(tree).getAllByText('Chưa có trưởng đơn vị')).toHaveLength(19);
    expect(within(tree).getAllByText('0 nhân viên')).toHaveLength(20);
    expect(await card('Phòng Kinh doanh, Phòng ban, Trưởng đơn vị: chưa có, 0 nhân viên')).toBeInTheDocument();
    expect(within(await card(new RegExp(`^${COMPANY_NAME}`))).getByText('Phạm Quốc Bảo')).toBeInTheDocument();
  });

  it('collapses and expands one unit, then all', async () => {
    server.use(orgUnitsOk());
    openChart();
    await chart();
    await userEvent.click(button('Thu gọn 2 đơn vị con của Phòng Kinh doanh'));
    expect(screen.queryByRole('treeitem', { name: /^Nhóm Marketing/ })).not.toBeInTheDocument();
    expect(cardCount()).toBe(18);
    expect(await card(/^Phòng Kinh doanh/)).toHaveAttribute('aria-expanded', 'false');
    const expand = button('Mở 2 đơn vị con của Phòng Kinh doanh');
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(expand);
    expect(cardCount()).toBe(20);

    await userEvent.click(button('Thu gọn tất cả'));
    // The company keeps its row of units.
    expect(cardCount()).toBe(7);
    await userEvent.click(button('Mở 2 đơn vị con của Chi nhánh Đà Nẵng'));
    expect(cardCount()).toBe(9);
    await userEvent.click(button('Mở tất cả'));
    expect(cardCount()).toBe(20);
  });

  it('shows inactive units only when the checkbox is on', async () => {
    server.use(orgUnitsOk());
    openChart();
    await chart();
    expect(button('Thu gọn 5 đơn vị con của Phòng Phát triển phần mềm')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Hiện đơn vị ngừng hoạt động' }));
    const game = await card('Nhóm Game, Nhóm, Trưởng đơn vị: chưa có, 0 nhân viên, Ngừng hoạt động');
    expect(within(game).getByText('Ngừng hoạt động')).toBeInTheDocument();
    // An inactive unit shows the Badge, not a vacant head.
    expect(within(game).queryByText('Chưa có trưởng đơn vị')).not.toBeInTheDocument();
    expect(button('Thu gọn 6 đơn vị con của Phòng Phát triển phần mềm')).toHaveTextContent('6 đơn vị');
    expect(cardCount()).toBe(21);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Hiện đơn vị ngừng hoạt động' }));
    expect(cardCount()).toBe(20);
  });

  it('zooms between 50% and 150% in steps of 10', async () => {
    server.use(orgUnitsOk());
    openChart();
    const tree = await chart();
    expect(zoomLevel()).toHaveTextContent('100%');
    await userEvent.click(button('Phóng to'));
    expect(zoomLevel()).toHaveTextContent('110%');
    expect(tree).toHaveStyle({ transform: 'scale(1.1)' });
    for (let step = 0; step < 4; step += 1) await userEvent.click(button('Phóng to'));
    expect(zoomLevel()).toHaveTextContent('150%');
    expect(button('Phóng to')).toBeDisabled();
    for (let step = 0; step < 10; step += 1) await userEvent.click(button('Thu nhỏ'));
    expect(zoomLevel()).toHaveTextContent('50%');
    expect(tree).toHaveStyle({ transform: 'scale(0.5)' });
    expect(button('Thu nhỏ')).toBeDisabled();
    expect(button('Phóng to')).toBeEnabled();
  });

  it('fits the whole chart in the viewport, and steps on from there', async () => {
    const restore = mockLayout({ width: 1098, height: 800 }, { width: 900, height: 500 });
    try {
      server.use(orgUnitsOk());
      openChart();
      await chart();
      await userEvent.click(button('Vừa màn hình'));
      // The height is the tighter side: 500 / 800.
      expect(zoomLevel()).toHaveTextContent('62%');
      await userEvent.click(button('Phóng to'));
      expect(zoomLevel()).toHaveTextContent('70%');
      await userEvent.click(button('Vừa màn hình'));
      await userEvent.click(button('Thu nhỏ'));
      expect(zoomLevel()).toHaveTextContent('60%');
    } finally {
      restore();
    }
  });

  it('keeps the centre of the viewport in place when zooming with the buttons', async () => {
    // A 1000 × 600 viewport over a chart that starts at the content edge (jsdom has no offsets).
    const restore = mockLayout({ width: 2000, height: 1200 }, { width: 1000, height: 600 });
    try {
      server.use(orgUnitsOk());
      openChart();
      const view = (await chart()).parentElement!.parentElement!;
      view.scrollLeft = 300;
      view.scrollTop = 100;
      await userEvent.click(button('Phóng to'));
      // (scroll + client / 2) × 1.1 − client / 2
      expect(view.scrollLeft).toBeCloseTo(380);
      expect(view.scrollTop).toBeCloseTo(140);
      await userEvent.click(button('Thu nhỏ'));
      expect(view.scrollLeft).toBeCloseTo(300);
      expect(view.scrollTop).toBeCloseTo(100);
      // A fit does not anchor: it goes back to the start, where the layout centres the chart.
      await userEvent.click(button('Vừa màn hình'));
      expect(zoomLevel()).toHaveTextContent('50%');
    } finally {
      restore();
    }
  });

  it('explains pan and zoom for the pointer in use', async () => {
    server.use(orgUnitsOk());
    const view = openChart();
    await chart();
    expect(screen.getByText('Kéo nền để di chuyển · Ctrl + cuộn để thu phóng · Bấm tên đơn vị để mở trong Cây đơn vị')).toBeInTheDocument();
    expect(screen.queryByText(/Vuốt để di chuyển/)).not.toBeInTheDocument();
    view.unmount();

    // A touch screen: no background drag and no Ctrl + wheel.
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: coarse)', addEventListener: () => {}, removeEventListener: () => {} }));
    try {
      server.use(orgUnitsOk());
      openChart();
      await chart();
      expect(screen.getByText('Vuốt để di chuyển · Dùng − và + để thu phóng · Chạm tên đơn vị để mở trong Cây đơn vị')).toBeInTheDocument();
      expect(screen.queryByText(/Kéo nền để di chuyển/)).not.toBeInTheDocument();
      await i18n.changeLanguage('en');
      expect(screen.getByText('Swipe to pan · Use − and + to zoom · Tap a unit name to open it in the Unit tree')).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('opens a unit in the tree tab from its name', async () => {
    server.use(orgUnitsOk());
    const { router } = openChart(`&unit=${unitId('QA')}`);
    await chart();
    expect(await card(/^Nhóm Kiểm thử/)).toHaveAttribute('aria-selected', 'true');
    expect(await card(/^Phòng Kinh doanh/)).toHaveAttribute('aria-selected', 'false');
    const link = screen.getByRole('link', { name: 'Phòng Kinh doanh' });
    expect(link).toHaveAttribute('href', `/org?unit=${unitId('KD')}`);
    await userEvent.click(link);
    expect(router.state.location.search).toBe(`?unit=${unitId('KD')}`);
    expect(screen.getByRole('tab', { name: 'Cây đơn vị' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('treeitem', { name: /^Phòng Kinh doanh/ })).toHaveAttribute('aria-selected', 'true');
    // The link is gone with the chart: focus lands on the unit's detail.
    expect(await screen.findByRole('heading', { level: 2, name: 'Phòng Kinh doanh' })).toHaveFocus();
  });

  it('opens the company from its name, without a unit in the URL', async () => {
    server.use(orgUnitsOk());
    const { router } = openChart(`&unit=${unitId('QA')}`);
    await chart();
    const link = screen.getByRole('link', { name: COMPANY_NAME });
    expect(link).toHaveAttribute('href', '/org');
    await userEvent.click(link);
    expect(router.state.location.search).toBe('');
    expect(await screen.findByRole('region', { name: COMPANY_NAME })).toBeInTheDocument();
  });

  it('works from the keyboard: arrows move, Space toggles the children, Enter opens the unit', async () => {
    server.use(orgUnitsOk());
    const { router } = openChart();
    await chart();
    const company = await card(new RegExp(`^${COMPANY_NAME}`));
    // One tab stop: the cards, their links and toggles are reached with the arrow keys, Enter and Space.
    expect(company).toHaveAttribute('tabindex', '0');
    expect(screen.getAllByRole('treeitem').filter((item) => item.tabIndex === 0)).toHaveLength(1);
    act(() => company.focus());
    await userEvent.keyboard(' ');
    // The company never collapses.
    expect(cardCount()).toBe(20);
    await userEvent.keyboard('{ArrowDown}');
    const software = await card(/^Phòng Phát triển phần mềm/);
    expect(software).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(software).toHaveAttribute('aria-expanded', 'false');
    expect(cardCount()).toBe(15);
    await userEvent.keyboard('{ArrowDown}');
    expect(await card(/^Phòng Dịch vụ khách hàng/)).toHaveFocus();
    await userEvent.keyboard('{ArrowUp} ');
    expect(software).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(await card(/^Nhóm Web,/)).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(router.state.location.search).toBe(`?unit=${unitId('WEB')}`);
    expect(await screen.findByRole('heading', { level: 2, name: 'Nhóm Web' })).toHaveFocus();
  });

  it('keeps focus on the card after its toggle is clicked', async () => {
    server.use(orgUnitsOk());
    openChart();
    await chart();
    await userEvent.click(button('Thu gọn 2 đơn vị con của Phòng Kinh doanh'));
    expect(await card(/^Phòng Kinh doanh/)).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(await card(/^Nhóm Marketing/)).toBeInTheDocument();
  });

  it('shows the company alone with the empty state when there is no unit', async () => {
    server.use(orgUnitsOk(EMPTY_ORG));
    openChart();
    await chart();
    expect(cardCount()).toBe(1);
    expect(screen.getByRole('heading', { name: 'Chưa có đơn vị nào' })).toBeInTheDocument();
    expect(screen.getByText(`Phòng ban, chi nhánh và nhóm dưới ${COMPANY_NAME} sẽ hiện ở đây.`)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Thu phóng' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('shows the load error and retries', async () => {
    server.use(orgUnitsFail());
    openChart();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được cơ cấu tổ chức');
    server.use(orgUnitsOk());
    await userEvent.click(button('Thử lại'));
    expect(await card(/^Nhóm Web Đà Nẵng/)).toBeInTheDocument();
  });

  it('shows the denied state, not the load error, when the API answers 403', async () => {
    server.use(orgUnitsDenied());
    openChart();
    expect(await screen.findByRole('heading', { name: 'Bạn không có quyền xem Cơ cấu tổ chức' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
  });

  it('is translated to English', async () => {
    await i18n.changeLanguage('en');
    server.use(orgUnitsOk(orgStructure({ filled: true })));
    openChart();
    const tree = await screen.findByRole('tree', { name: 'Org chart' });
    expect(await card('Phòng Kinh doanh, Department, Unit head: Đinh Công Sơn, 20 employees')).toBeInTheDocument();
    expect(within(tree).getByText('Department · KD')).toBeInTheDocument();
    expect(within(tree).getByText('No unit head yet')).toBeInTheDocument();
    expect(within(tree).getByText('20 employees')).toBeInTheDocument();
    expect(button('Collapse 2 child units of Phòng Kinh doanh')).toHaveTextContent('2 units');
    expect(within(screen.getByRole('group', { name: 'Zoom' })).getByRole('button', { name: 'Fit to screen' })).toBeInTheDocument();
    expect(button('Zoom out')).toBeInTheDocument();
    expect(button('Zoom in')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show inactive units' }));
    expect(within(await card(/^Nhóm Game,.*Inactive$/)).getByText('Inactive')).toBeInTheDocument();
    await userEvent.click(button('Collapse all'));
    expect(button('Expand 2 child units of Phòng Kinh doanh')).toBeInTheDocument();
    await userEvent.click(button('Expand all'));
    expect(cardCount()).toBe(21);
  });
});
