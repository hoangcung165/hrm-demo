import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonMenu, type PersonMenuItem } from './person-menu';

const items = (onSelect = vi.fn()): PersonMenuItem[] => [
  { id: 'hr', name: 'Trần Thị Mai', caption: 'HR · Trưởng phòng nhân sự', current: true, onSelect },
  { id: 'pm', name: 'Vũ Thị Lan', caption: 'PM · Quản lý dự án', onSelect },
  { id: 'acc', name: 'Hoàng Thị Thu', caption: 'Tài khoản đã khóa hoặc chưa được tạo', disabled: true, onSelect },
];

const open = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Demo as…' }));
  return screen.findByRole('menu', { name: 'Demo as…' });
};

describe('PersonMenu', () => {
  it('shows the heading and one item per person with its caption, the current one marked', async () => {
    render(<PersonMenu trigger={<button type="button">Demo as…</button>} heading="Đăng nhập nhanh bằng persona" items={items()} />);
    const menu = await open();
    expect(within(menu).getByText('Đăng nhập nhanh bằng persona')).toBeInTheDocument();
    const rows = within(menu).getAllByRole('menuitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Trần Thị Mai');
    expect(rows[0]).toHaveTextContent('HR · Trưởng phòng nhân sự');
    expect(rows[0]).toHaveAttribute('aria-current', 'true');
    expect(rows[1]).not.toHaveAttribute('aria-current');
  });

  it('calls onSelect for an available person and never for a disabled one', async () => {
    const onSelect = vi.fn();
    render(<PersonMenu trigger={<button type="button">Demo as…</button>} items={items(onSelect)} />);
    const menu = await open();
    const locked = within(menu).getByRole('menuitem', { name: /Hoàng Thị Thu/ });
    expect(locked).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(locked);
    expect(onSelect).not.toHaveBeenCalled();
    await userEvent.click(within(menu).getByRole('menuitem', { name: /Vũ Thị Lan/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows the status block instead of the items', async () => {
    render(<PersonMenu trigger={<button type="button">Demo as…</button>} items={items()} status={<p>Không tải được danh sách persona.</p>} />);
    const menu = await open();
    expect(within(menu).getByText('Không tải được danh sách persona.')).toBeInTheDocument();
    expect(within(menu).queryAllByRole('menuitem')).toHaveLength(0);
  });
});
