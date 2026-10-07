import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import '@/i18n';
import type { TreePickerNode } from './tree-picker';
import { TreeSelect } from './tree-select';

const node = (id: string, name: string, children: TreePickerNode[] = []): TreePickerNode => ({ id, name, children });
const NODES = [
  node('ptpm', 'Phòng Phát triển phần mềm', [node('web', 'Nhóm Web'), node('game', 'Nhóm Game')]),
  node('cn', 'Chi nhánh Đà Nẵng', [node('pm', 'Phòng Phần mềm Đà Nẵng', [node('webdn', 'Nhóm Web Đà Nẵng')])]),
];

function Harness({ onChange }: { onChange: (id: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <TreeSelect
      label="Đơn vị tổ chức"
      nodes={NODES}
      value={value}
      onChange={(id) => {
        setValue(id);
        onChange(id);
      }}
      allLabel="Tất cả đơn vị"
      searchLabel="Tìm đơn vị"
      noMatchText="Không có đơn vị nào khớp."
      tags={{ game: 'Ngừng hoạt động' }}
      foot={<span>Chân menu</span>}
    />
  );
}

const trigger = () => screen.getByRole('button', { name: /^Đơn vị tổ chức: / });
const menu = () => screen.getByRole('dialog', { name: 'Đơn vị tổ chức' });

describe('TreeSelect', () => {
  it('shows the "all" row first and chosen, the top of the tree, and the foot', async () => {
    render(<Harness onChange={() => {}} />);
    expect(trigger()).toHaveAccessibleName('Đơn vị tổ chức: Tất cả đơn vị');
    await userEvent.click(trigger());
    const rows = within(menu()).getAllByRole('treeitem');
    expect(rows.map((row) => row.textContent)).toEqual(['Tất cả đơn vị', 'Phòng Phát triển phần mềm', 'Chi nhánh Đà Nẵng']);
    expect(rows[0]).toHaveAttribute('aria-checked', 'true');
    expect(within(menu()).getByRole('searchbox', { name: 'Tìm đơn vị' })).toHaveFocus();
    expect(within(menu()).getByText('Chân menu')).toBeInTheDocument();
  });

  it('searches without accents, keeps the ancestors of a match, tags rows, and chooses one', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(trigger());
    await userEvent.type(within(menu()).getByRole('searchbox', { name: 'Tìm đơn vị' }), 'nhom');
    expect(within(menu()).getAllByRole('treeitem').map((row) => row.getAttribute('aria-level'))).toEqual(['1', '2', '2', '1', '2', '3']);
    expect(within(menu()).getByRole('treeitem', { name: 'Nhóm Game' })).toHaveAccessibleDescription('Ngừng hoạt động');
    await userEvent.click(within(menu()).getByRole('treeitem', { name: 'Nhóm Web Đà Nẵng' }));
    expect(onChange).toHaveBeenCalledWith('webdn');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger()).toHaveAccessibleName('Đơn vị tổ chức: Nhóm Web Đà Nẵng');
    expect(trigger()).toHaveFocus();

    // Opening again shows the branch of the chosen row; the "all" row gives '' back.
    await userEvent.click(trigger());
    expect(within(menu()).getByRole('treeitem', { name: 'Nhóm Web Đà Nẵng' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(within(menu()).getByRole('treeitem', { name: 'Tất cả đơn vị' }));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('says so when the search matches no row, and moves into the tree with the down arrow', async () => {
    render(<Harness onChange={() => {}} />);
    await userEvent.click(trigger());
    const box = within(menu()).getByRole('searchbox', { name: 'Tìm đơn vị' });
    await userEvent.type(box, 'zzz');
    expect(within(menu()).getByRole('status')).toHaveTextContent('Không có đơn vị nào khớp.');
    await userEvent.clear(box);
    await userEvent.keyboard('{ArrowDown}');
    expect(within(menu()).getByRole('treeitem', { name: 'Tất cả đơn vị' })).toHaveFocus();
  });
});
