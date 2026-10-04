import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import i18n from '@/i18n';
import { DateRangePicker, type DateRangeValue } from './date-range-picker';

function Sample({ initial }: { initial: DateRangeValue }) {
  const [value, setValue] = useState(initial);
  return <DateRangePicker label="Thời gian nghỉ" value={value} onChange={setValue} />;
}

describe('DateRangePicker', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('shows a placeholder while no range is chosen', () => {
    render(<Sample initial={{}} />);
    expect(screen.getByRole('button', { name: /Thời gian nghỉ/ })).toHaveTextContent('Chọn khoảng ngày');
  });

  it('lets the user pick a range in the calendar', async () => {
    render(<Sample initial={{ from: new Date(2026, 9, 2), to: new Date(2026, 9, 2) }} />);
    const trigger = screen.getByRole('button', { name: /Thời gian nghỉ/ });
    expect(trigger).toHaveTextContent('02/10/2026 – 02/10/2026');
    await userEvent.click(trigger);
    const grid = await screen.findByRole('grid');
    expect(grid).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /(^|\D)6 tháng 10/ }));
    expect(trigger).toHaveTextContent('02/10/2026 – 06/10/2026');
  });
});
