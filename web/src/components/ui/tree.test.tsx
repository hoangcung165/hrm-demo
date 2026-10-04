import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Tree, type TreeNode, type TreeProps } from './tree';

const leaf = (id: string, name: string, extra: Partial<TreeNode> = {}): TreeNode => ({
  id,
  name,
  ariaLabel: `${name}, mô tả hàng`,
  typeLabel: 'Nhóm',
  head: null,
  number: 0,
  active: true,
  children: [],
  ...extra,
});

const NODES: TreeNode[] = [
  leaf('root', 'Công ty Mẫu', {
    typeLabel: 'Công ty',
    number: 30,
    head: { name: 'Phạm Quốc Bảo' },
    children: [
      leaf('kd', 'Phòng Kinh doanh', {
        typeLabel: 'Phòng ban',
        number: 18,
        children: [leaf('mkt', 'Nhóm Marketing', { number: 7 }), leaf('game', 'Nhóm Game', { active: false })],
      }),
      leaf('hcns', 'Phòng Hành chính - Nhân sự', { typeLabel: 'Phòng ban', number: 9, head: { name: 'Trần Thị Mai' } }),
    ],
  }),
];

const LABELS = { unit: 'Đơn vị', type: 'Loại', head: 'Trưởng đơn vị', number: 'Nhân viên', inactive: 'Ngừng hoạt động', vacant: 'Chưa có' };

function Harness(props: Partial<TreeProps>) {
  const [expanded, setExpanded] = useState(new Set(['root', 'kd']));
  const [selected, setSelected] = useState<string | null>('root');
  return (
    <Tree
      label="Cây đơn vị"
      nodes={NODES}
      labels={LABELS}
      expandedIds={expanded}
      selectedId={selected}
      onSelect={setSelected}
      onToggle={(id) => setExpanded((current) => new Set(current.has(id) ? [...current].filter((x) => x !== id) : [...current, id]))}
      {...props}
    />
  );
}

/** The twist is a mouse-only control, hidden from assistive technology and named by its tooltip. */
const twist = (name: string) => screen.getByTitle(name);
const item = (name: RegExp) => screen.getByRole('treeitem', { name });
const itemNames = () => screen.getAllByRole('treeitem').map((row) => row.getAttribute('data-tree-id'));

describe('Tree', () => {
  it('renders rows with level, selection, expansion, type, head and number', () => {
    render(<Harness />);
    expect(screen.getByRole('tree', { name: 'Cây đơn vị' })).toBeInTheDocument();
    expect(itemNames()).toEqual(['root', 'kd', 'mkt', 'game', 'hcns']);
    const root = item(/Công ty Mẫu/);
    expect(root).toHaveAttribute('aria-level', '1');
    expect(root).toHaveAttribute('aria-selected', 'true');
    expect(root).toHaveAttribute('aria-expanded', 'true');
    expect(within(root).getByText('Phạm Quốc Bảo')).toBeInTheDocument();
    expect(within(root).getByText('30')).toBeInTheDocument();
    const marketing = item(/Nhóm Marketing/);
    expect(marketing).toHaveAttribute('aria-level', '3');
    expect(marketing).not.toHaveAttribute('aria-expanded');
    expect(within(marketing).getByText('Chưa có')).toBeInTheDocument();
    expect(within(marketing).getByText('Nhóm')).toBeInTheDocument();
  });

  it('marks an inactive node with a text Badge, not by colour alone', () => {
    render(<Harness />);
    const game = item(/Nhóm Game/);
    expect(within(game).getByText('Ngừng hoạt động')).toBeInTheDocument();
    expect(within(game).queryByText('Chưa có')).not.toBeInTheDocument();
    // The stand-in the row shows when the name leaves no room for the text: the icon, with the text as its tooltip.
    expect(within(game).getByTitle('Ngừng hoạt động')).toHaveTextContent('');
  });

  it('collapses and expands with the twist without selecting the row', async () => {
    render(<Harness />);
    await userEvent.click(twist('Thu gọn Phòng Kinh doanh'));
    expect(itemNames()).toEqual(['root', 'kd', 'hcns']);
    expect(item(/Phòng Kinh doanh/)).toHaveAttribute('aria-expanded', 'false');
    expect(item(/Phòng Kinh doanh/)).toHaveAttribute('aria-selected', 'false');
    await userEvent.click(twist('Mở Phòng Kinh doanh'));
    expect(itemNames()).toEqual(['root', 'kd', 'mkt', 'game', 'hcns']);
  });

  it('selects a row on click', async () => {
    render(<Harness />);
    await userEvent.click(item(/Nhóm Marketing/));
    expect(item(/Nhóm Marketing/)).toHaveAttribute('aria-selected', 'true');
    expect(item(/Công ty Mẫu/)).toHaveAttribute('aria-selected', 'false');
  });

  it('has one row in the tab order and moves focus with the arrow keys, Home and End', async () => {
    render(<Harness />);
    expect(screen.getAllByRole('treeitem').filter((row) => row.tabIndex === 0)).toEqual([item(/Công ty Mẫu/)]);
    await userEvent.tab();
    expect(item(/Công ty Mẫu/)).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(item(/Phòng Kinh doanh/)).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(item(/Nhóm Marketing/)).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(item(/Hành chính/)).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(item(/Nhóm Game/)).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(item(/Phòng Kinh doanh/)).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(item(/Công ty Mẫu/)).toHaveFocus();
  });

  it('collapses with Left, expands with Right and selects with Enter', async () => {
    render(<Harness />);
    item(/Phòng Kinh doanh/).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(itemNames()).toEqual(['root', 'kd', 'hcns']);
    expect(item(/Phòng Kinh doanh/)).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(itemNames()).toEqual(['root', 'kd', 'mkt', 'game', 'hcns']);
    await userEvent.keyboard('{Enter}');
    expect(item(/Phòng Kinh doanh/)).toHaveAttribute('aria-selected', 'true');
  });

  it('names each row by the consumer label alone and hides the twist from assistive technology', () => {
    render(<Harness />);
    expect(screen.getByRole('treeitem', { name: 'Phòng Kinh doanh, mô tả hàng' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(twist('Thu gọn Phòng Kinh doanh')).toHaveAttribute('aria-hidden', 'true');
    // One name for the tree; the section around it is not a second region with the same name.
    expect(screen.queryByRole('region', { name: 'Cây đơn vị' })).not.toBeInTheDocument();
  });

  it('keeps the arrow keys working after a click on the twist', async () => {
    render(<Harness />);
    await userEvent.click(twist('Thu gọn Phòng Kinh doanh'));
    expect(item(/Phòng Kinh doanh/)).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(item(/Hành chính/)).toHaveFocus();
  });

  it('selects with Space without scrolling the page', async () => {
    render(<Harness />);
    item(/Nhóm Marketing/).focus();
    const notPrevented = fireEvent.keyDown(item(/Nhóm Marketing/), { key: ' ' });
    expect(notPrevented).toBe(false);
    expect(item(/Nhóm Marketing/)).toHaveAttribute('aria-selected', 'true');
  });

  it('moves the tab stop to a row selected from outside the tree', async () => {
    const { rerender } = render(<Harness />);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    expect(item(/Phòng Kinh doanh/)).toHaveAttribute('tabindex', '0');
    rerender(<Harness selectedId="hcns" />);
    expect(screen.getAllByRole('treeitem').filter((row) => row.tabIndex === 0)).toEqual([item(/Hành chính/)]);
  });

  it('compact shows the unit and the number only', () => {
    render(<Harness variant="compact" />);
    expect(screen.queryByText('Trần Thị Mai')).not.toBeInTheDocument();
    expect(screen.queryByText('Phòng ban')).not.toBeInTheDocument();
    expect(within(item(/Hành chính/)).getByText('9')).toBeInTheDocument();
    // The Badge goes under the name, always with its text: no icon-only stand-in.
    expect(within(item(/Nhóm Game/)).getByText('Ngừng hoạt động')).toBeInTheDocument();
    expect(within(item(/Nhóm Game/)).queryByTitle('Ngừng hoạt động')).not.toBeInTheDocument();
  });

  it('loading shows skeleton rows and is busy', () => {
    render(<Harness loading label="Đang tải cây đơn vị" />);
    expect(screen.getByRole('region', { name: 'Đang tải cây đơn vị' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('treeitem')).not.toBeInTheDocument();
  });

  it('renders the toolbar and, without rows, only the State block', () => {
    render(
      <Harness nodes={[]} toolbar={<button type="button">Công cụ</button>}>
        <p>Không có đơn vị nào khớp</p>
      </Harness>,
    );
    expect(screen.getByRole('button', { name: 'Công cụ' })).toBeInTheDocument();
    expect(screen.getByText('Không có đơn vị nào khớp')).toBeInTheDocument();
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
  });
});
