import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import '@/i18n';
import { TreePicker, type TreePickerNode, type TreePickerProps } from './tree-picker';

const node = (id: string, name: string, children: TreePickerNode[] = []): TreePickerNode => ({ id, name, children });
const NODES = [
  node('root', 'Công ty Mẫu', [
    node('kd', 'Phòng Kinh doanh', [node('mkt', 'Nhóm Marketing')]),
    node('cn', 'Chi nhánh Đà Nẵng', [node('pm', 'Phòng Phần mềm Đà Nẵng', [node('web', 'Nhóm Web Đà Nẵng')]), node('kt', 'Phòng Kiểm thử Đà Nẵng')]),
  ]),
];
const DISABLED = { cn: 'Đơn vị cha hiện tại', pm: 'Đang chuyển', web: 'Đơn vị con' };

function Harness(props: Partial<TreePickerProps>) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [value, setValue] = useState<string | null>(null);
  return (
    <>
      <button type="button">Trước</button>
      <TreePicker
        label="Đơn vị cha mới"
        nodes={NODES}
        expandedIds={new Set(['root', 'kd', 'cn', 'pm'].filter((id) => !collapsed.includes(id)))}
        value={value}
        onChange={setValue}
        onToggle={(id) => setCollapsed((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))}
        disabled={DISABLED}
        {...props}
      />
      <button type="button">Sau</button>
    </>
  );
}

const item = (name: string) => screen.getByRole('treeitem', { name });
const checked = () => screen.getAllByRole('treeitem').filter((row) => row.getAttribute('aria-checked') === 'true').map((row) => row.textContent);

describe('TreePicker', () => {
  it('is a tree of rows with their level; nothing is chosen at first', () => {
    render(<Harness aria-required />);
    const tree = screen.getByRole('tree', { name: 'Đơn vị cha mới' });
    expect(tree).toBeRequired();
    expect(screen.getAllByRole('treeitem')).toHaveLength(7);
    expect(item('Công ty Mẫu')).toHaveAttribute('aria-level', '1');
    expect(item('Nhóm Web Đà Nẵng')).toHaveAttribute('aria-level', '4');
    expect(item('Phòng Kinh doanh')).toHaveAttribute('aria-expanded', 'true');
    expect(item('Nhóm Marketing')).not.toHaveAttribute('aria-expanded');
    expect(checked()).toEqual([]);
  });

  it('chooses one row at a time with the mouse', async () => {
    render(<Harness />);
    await userEvent.click(item('Phòng Kinh doanh'));
    expect(checked()).toEqual(['Phòng Kinh doanh']);
    await userEvent.click(item('Phòng Kiểm thử Đà Nẵng'));
    expect(checked()).toEqual(['Phòng Kiểm thử Đà Nẵng']);
    expect(item('Phòng Kinh doanh')).toHaveAttribute('aria-checked', 'false');
  });

  it('tells assistive tech which rows cannot be chosen and why, and does not choose them', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    for (const [name, reason] of [['Chi nhánh Đà Nẵng', 'Đơn vị cha hiện tại'], ['Phòng Phần mềm Đà Nẵng', 'Đang chuyển'], ['Nhóm Web Đà Nẵng', 'Đơn vị con']] as const) {
      expect(item(name)).toHaveAttribute('aria-disabled', 'true');
      expect(item(name)).toHaveAccessibleDescription(reason);
    }
    expect(item('Phòng Kinh doanh')).not.toHaveAttribute('aria-disabled');
    expect(item('Phòng Kinh doanh')).not.toHaveAccessibleDescription();

    await userEvent.click(item('Chi nhánh Đà Nẵng'));
    item('Nhóm Web Đà Nẵng').focus();
    await userEvent.keyboard('{Enter} ');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('has one tab stop and moves between the visible rows with the arrow keys, Home and End', async () => {
    render(<Harness />);
    await userEvent.tab();
    await userEvent.tab();
    expect(item('Công ty Mẫu')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(item('Nhóm Marketing')).toHaveFocus();
    // A disabled row takes focus, so its reason is read.
    await userEvent.keyboard('{ArrowDown}');
    expect(item('Chi nhánh Đà Nẵng')).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(item('Phòng Kiểm thử Đà Nẵng')).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}{ArrowLeft}');
    expect(item('Phòng Phần mềm Đà Nẵng')).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(item('Công ty Mẫu')).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Sau' })).toHaveFocus();
    // Back in: the tab stop is the row that had focus.
    await userEvent.tab({ shift: true });
    expect(item('Công ty Mẫu')).toHaveFocus();
  });

  it('chooses with Enter or Space, and the chosen row holds the tab stop', async () => {
    render(<Harness />);
    item('Phòng Kinh doanh').focus();
    await userEvent.keyboard('{Enter}');
    expect(checked()).toEqual(['Phòng Kinh doanh']);
    await userEvent.keyboard('{ArrowDown} ');
    expect(checked()).toEqual(['Nhóm Marketing']);
    expect(screen.getAllByRole('treeitem').filter((row) => row.tabIndex === 0)).toEqual([item('Nhóm Marketing')]);
  });

  it('collapses and expands with Left and Right, also on a disabled row, and with the twist', async () => {
    render(<Harness />);
    item('Chi nhánh Đà Nẵng').focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(item('Chi nhánh Đà Nẵng')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('treeitem', { name: 'Phòng Kiểm thử Đà Nẵng' })).not.toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(item('Phòng Phần mềm Đà Nẵng')).toHaveFocus();

    await userEvent.click(screen.getByTitle('Thu gọn Phòng Kinh doanh'));
    expect(screen.queryByRole('treeitem', { name: 'Nhóm Marketing' })).not.toBeInTheDocument();
    // The twist does not choose the row, and focus stays on the row for the keyboard.
    expect(checked()).toEqual([]);
    expect(item('Phòng Kinh doanh')).toHaveFocus();
    await userEvent.click(screen.getByTitle('Mở Phòng Kinh doanh'));
    expect(item('Nhóm Marketing')).toBeInTheDocument();
  });

  it('keeps the reason of a disabled row in one block with the name, so it can go under the name on a narrow screen', () => {
    render(<Harness />);
    const row = item('Chi nhánh Đà Nẵng');
    const name = within(row).getByText('Chi nhánh Đà Nẵng');
    const reason = within(row).getByText('Đơn vị cha hiện tại');
    // Name first, reason right after it, nothing between them: below 768px the pair stacks and the row grows.
    expect(name.nextElementSibling).toBe(reason);
    expect(reason.parentElement).toBe(name.parentElement);
    expect(row).toHaveAccessibleName('Chi nhánh Đà Nẵng');
    expect(row).toHaveAccessibleDescription('Đơn vị cha hiện tại');
    // A row that can be chosen has no reason.
    expect(within(item('Phòng Kinh doanh')).getByText('Phòng Kinh doanh').nextElementSibling).toBeNull();
  });

  it('marks the tree invalid and ties it to the message of its field', () => {
    render(
      <>
        <Harness invalid aria-describedby="note" />
        <span id="note">Chọn đơn vị cha mới.</span>
      </>,
    );
    expect(screen.getByRole('tree')).toBeInvalid();
    expect(screen.getByRole('tree')).toHaveAccessibleDescription('Chọn đơn vị cha mới.');
  });
});
