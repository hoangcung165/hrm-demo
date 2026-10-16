import { render, screen, within } from '@testing-library/react';
import { DayBreakdown } from './day-breakdown';

describe('DayBreakdown', () => {
  it('lists the runs with the days that do not count muted, and the total in danger when over', () => {
    render(
      <DayBreakdown
        title="Số ngày nghỉ"
        total="2,5 ngày"
        invalid
        rows={[
          { key: 'a', when: 'T6 30/10', label: 'Buổi chiều', value: '0,5' },
          { key: 'b', when: '31/10 – 01/11', label: 'Ngày nghỉ hằng tuần', value: '0', muted: true },
          { key: 'c', when: 'T2 02/11', label: 'Cả ngày', value: '1' },
        ]}
      />,
    );
    const region = screen.getByRole('region', { name: 'Số ngày nghỉ' });
    expect(within(region).getByText('2,5 ngày')).toHaveClass('text-danger');
    const rows = within(region).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual(['T6 30/10Buổi chiều0,5', '31/10 – 01/11Ngày nghỉ hằng tuần0', 'T2 02/11Cả ngày1']);
    expect(rows[1]).toHaveClass('text-ink-muted');
  });
});
