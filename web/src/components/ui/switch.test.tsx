import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './switch';

describe('Switch', () => {
  it('turns on and off by its label', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Cho phép Ủy quyền duyệt" caption="Trong một khoảng ngày." />);
    const control = screen.getByRole('switch', { name: 'Cho phép Ủy quyền duyệt' });
    expect(control).toHaveAttribute('aria-checked', 'false');
    expect(control).toHaveAccessibleDescription('Trong một khoảng ngày.');
    await user.click(control);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('stays as it is when locked', () => {
    render(<Switch checked={false} onChange={() => {}} label="Tự duyệt" locked caption="Bảng lương luôn cần người duyệt." />);
    expect(screen.getByRole('switch', { name: 'Tự duyệt' })).toBeDisabled();
  });
});
