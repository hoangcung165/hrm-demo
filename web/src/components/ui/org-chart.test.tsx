import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrgChart, type OrgChartNode, type OrgChartProps } from './org-chart';
import { anchoredScroll, revealShift } from './org-chart-scroll';
import { OrgChartSkeleton } from './org-chart-skeleton';
import { fitZoom, zoomedIn, zoomedOut } from './use-org-chart-zoom';

const unit = (id: string, name: string, extra: Partial<OrgChartNode> = {}): OrgChartNode => ({
  id,
  name,
  ariaLabel: name,
  typeLabel: 'Phòng ban',
  code: id.toUpperCase(),
  head: null,
  headcount: 0,
  active: true,
  children: [],
  ...extra,
});

const ROOT = unit('root', 'Công ty Mẫu', {
  typeLabel: 'Công ty',
  code: null,
  head: { name: 'Phạm Quốc Bảo' },
  headcount: 1250,
  children: [
    unit('kd', 'Phòng Kinh doanh', {
      head: { name: 'Đinh Công Sơn' },
      headcount: 20,
      children: [unit('mkt', 'Nhóm Marketing', { headcount: 7 }), unit('old', 'Nhóm Cũ', { active: false })],
    }),
    // Inactive, with an active unit under it.
    unit('dn', 'Chi nhánh Đà Nẵng', { active: false, children: [unit('web', 'Nhóm Web')] }),
    unit('game', 'Phòng Game', { active: false }),
  ],
});

const LABELS: OrgChartProps['labels'] = {
  inactive: 'Ngừng hoạt động',
  vacant: 'Chưa có trưởng đơn vị',
  headcount: (count) => `${count} nhân viên`,
  childCount: (count) => `${count} đơn vị`,
  expand: (count, name) => `Mở ${count} đơn vị con của ${name}`,
  collapse: (count, name) => `Thu gọn ${count} đơn vị con của ${name}`,
};

function renderChart(props: Partial<OrgChartProps> = {}) {
  const onToggle = vi.fn();
  const onOpen = vi.fn();
  render(
    <OrgChart
      label="Sơ đồ tổ chức"
      root={ROOT}
      expandedIds={new Set(['kd', 'dn'])}
      selectedId={null}
      showInactive={false}
      zoom={100}
      onToggle={onToggle}
      onOpen={onOpen}
      hrefFor={(id) => `/org?unit=${id}`}
      labels={LABELS}
      {...props}
    />,
  );
  return { onToggle, onOpen };
}
const card = (name: string) => screen.getByRole('treeitem', { name });
const names = () => screen.getAllByRole('treeitem').map((item) => item.getAttribute('aria-label'));

describe('OrgChart', () => {
  it('renders the root, the row and the stacks as a tree with levels', () => {
    renderChart({ selectedId: 'mkt' });
    expect(screen.getByRole('tree', { name: 'Sơ đồ tổ chức' })).toBeInTheDocument();
    expect(card('Công ty Mẫu')).toHaveAttribute('aria-level', '1');
    expect(card('Phòng Kinh doanh')).toHaveAttribute('aria-level', '2');
    expect(card('Nhóm Marketing')).toHaveAttribute('aria-level', '3');
    expect(card('Nhóm Marketing')).toHaveAttribute('aria-selected', 'true');
    // The selected card holds the tab stop.
    expect(card('Nhóm Marketing')).toHaveAttribute('tabindex', '0');
    expect(card('Công ty Mẫu')).toHaveAttribute('tabindex', '-1');
    expect(within(card('Công ty Mẫu')).getByText('Công ty')).toBeInTheDocument();
    expect(within(card('Công ty Mẫu')).getByText('1.250')).toBeInTheDocument();
    expect(within(card('Công ty Mẫu')).getByTitle('1250 nhân viên')).toBeInTheDocument();
    expect(within(card('Phòng Kinh doanh')).getByText('Phòng ban · KD')).toBeInTheDocument();
    expect(within(card('Nhóm Marketing')).getByText('Chưa có trưởng đơn vị')).toBeInTheDocument();
  });

  it('leaves inactive units out, except one that still has a unit to show', () => {
    renderChart();
    expect(names()).toEqual(['Công ty Mẫu', 'Phòng Kinh doanh', 'Nhóm Marketing', 'Chi nhánh Đà Nẵng', 'Nhóm Web']);
    expect(within(card('Chi nhánh Đà Nẵng')).getByText('Ngừng hoạt động')).toBeInTheDocument();
    // The toggle counts the units it shows.
    expect(screen.getByRole('button', { name: 'Thu gọn 1 đơn vị con của Phòng Kinh doanh' })).toHaveTextContent('1 đơn vị');
  });

  it('shows inactive units with the Badge when asked', () => {
    renderChart({ showInactive: true });
    expect(names()).toHaveLength(7);
    expect(within(card('Phòng Game')).getByText('Ngừng hoạt động')).toBeInTheDocument();
    expect(within(card('Phòng Game')).queryByText('Chưa có trưởng đơn vị')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thu gọn 2 đơn vị con của Phòng Kinh doanh' })).toBeInTheDocument();
  });

  it('hides the children of a collapsed unit and reports the toggle', async () => {
    const { onToggle } = renderChart({ expandedIds: new Set(['dn']) });
    expect(screen.queryByRole('treeitem', { name: 'Nhóm Marketing' })).not.toBeInTheDocument();
    expect(card('Phòng Kinh doanh')).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Mở 1 đơn vị con của Phòng Kinh doanh' }));
    expect(onToggle).toHaveBeenCalledWith('kd');
    // The company has no toggle and stays open.
    expect(within(card('Công ty Mẫu')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens a unit from its name; a modified click is left to the browser', async () => {
    const { onOpen } = renderChart();
    const link = screen.getByRole('link', { name: 'Nhóm Marketing' });
    expect(link).toHaveAttribute('href', '/org?unit=mkt');
    await userEvent.click(link);
    expect(onOpen).toHaveBeenCalledWith('mkt');
    onOpen.mockClear();
    // jsdom would report the navigation as not implemented.
    link.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(link, { ctrlKey: true });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('moves with the arrow keys, toggles with Space and opens with Enter', async () => {
    const { onToggle, onOpen } = renderChart();
    act(() => card('Công ty Mẫu').focus());
    await userEvent.keyboard(' {ArrowLeft}');
    expect(onToggle).not.toHaveBeenCalled();
    await userEvent.keyboard('{ArrowDown}');
    expect(card('Phòng Kinh doanh')).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(onToggle).toHaveBeenCalledWith('kd');
    await userEvent.keyboard('{ArrowRight}');
    expect(card('Nhóm Marketing')).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(onToggle).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalledWith('mkt');
    await userEvent.keyboard('{End}');
    expect(card('Nhóm Web')).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(card('Công ty Mẫu')).toHaveFocus();
  });

  it('scales the chart to the zoom', () => {
    renderChart({ zoom: 70 });
    expect(screen.getByRole('tree')).toHaveStyle({ transform: 'scale(0.7)' });
  });

  it('has a loading state announced as busy', () => {
    render(<OrgChartSkeleton label="Đang tải sơ đồ tổ chức" />);
    expect(screen.getByRole('status', { name: 'Đang tải sơ đồ tổ chức' })).toHaveAttribute('aria-busy', 'true');
  });
});

describe('org chart zoom steps', () => {
  it('steps by 10 between 50 and 150, also from the odd percentage a fit leaves', () => {
    expect(zoomedIn(100)).toBe(110);
    expect(zoomedIn(150)).toBe(150);
    expect(zoomedOut(50)).toBe(50);
    expect(zoomedIn(62)).toBe(70);
    expect(zoomedOut(62)).toBe(60);
    expect(zoomedIn(29)).toBe(50);
  });

  it('fits by the tighter side, never above 100% and not below 20%', () => {
    expect(fitZoom({ width: 900, height: 500 }, { width: 1098, height: 800 })).toBe(62);
    expect(fitZoom({ width: 356, height: 600 }, { width: 1098, height: 800 })).toBe(32);
    expect(fitZoom({ width: 2000, height: 2000 }, { width: 500, height: 400 })).toBe(100);
    expect(fitZoom({ width: 100, height: 100 }, { width: 5000, height: 400 })).toBe(20);
    // No layout yet (or jsdom): leave the zoom at 100%.
    expect(fitZoom({ width: 900, height: 500 }, { width: 0, height: 0 })).toBe(100);
  });
});

describe('org chart scroll arithmetic', () => {
  it('keeps the centre of the viewport at the centre through a zoom step', () => {
    // (scroll + client / 2) × z'/z − client / 2
    expect(anchoredScroll({ scroll: 300, client: 1000, offset: 0 }, 110 / 100)).toBeCloseTo(380);
    expect(anchoredScroll({ scroll: 380, client: 1000, offset: 0 }, 100 / 110)).toBeCloseTo(300);
    expect(anchoredScroll({ scroll: 0, client: 356, offset: 0 }, 50 / 100)).toBeCloseTo(-89);
    // The point under the centre is the same before and after: (scroll + client / 2 − offset) / zoom.
    const before = { scroll: 240, client: 356, offset: 16 };
    const after = anchoredScroll(before, 1.5);
    expect((after + 356 / 2 - 16) / 1.5).toBeCloseTo(240 + 356 / 2 - 16);
  });

  it('follows a chart that was centred while narrower than the viewport', () => {
    // 600 wide in a 1000 viewport (offset 200), zoomed ×2 to 1200 (offset 16): its middle stays in the middle.
    expect(anchoredScroll({ scroll: 0, client: 1000, offset: 200 }, 2, 16)).toBeCloseTo(600 + 16 - 500);
  });

  it('reveals the selected card on the axis where it is out of view, and only there', () => {
    const frame = { start: 100, end: 456 };
    expect(revealShift({ start: 120, end: 295 }, frame)).toBe(0);
    expect(revealShift({ start: 100, end: 456 }, frame)).toBe(0);
    // Out to the left, to the right, and cut by the edge: the card goes to the middle of the frame.
    expect(revealShift({ start: -300, end: -125 }, frame)).toBe(-490.5);
    expect(revealShift({ start: 600, end: 775 }, frame)).toBe(409.5);
    expect(revealShift({ start: 400, end: 575 }, frame)).toBe(209.5);
  });
});
