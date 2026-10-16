import { fireEvent, render, screen } from '@testing-library/react';
import { DatePartField } from './date-part-field';

describe('DatePartField', () => {
  it('ties the label to the date, names the part select, and marks the date invalid with or without a message', () => {
    const dates: string[] = [];
    const { rerender } = render(
      <DatePartField label="Từ ngày" required date="" onDateChange={(d) => dates.push(d)} part="FULL" onPartChange={() => {}} partOptions={[{ value: 'FULL', label: 'Cả ngày' }, { value: 'AFTERNOON', label: 'Buổi chiều' }]} partLabel="Buổi của ngày đầu" />,
    );
    fireEvent.change(screen.getByLabelText(/^Từ ngày/), { target: { value: '2026-10-30' } });
    expect(dates).toEqual(['2026-10-30']);
    expect(screen.getByRole('combobox', { name: 'Buổi của ngày đầu' })).toHaveTextContent('Cả ngày');
    rerender(<DatePartField label="Từ ngày" date="2026-10-30" onDateChange={() => {}} part="FULL" onPartChange={() => {}} partOptions={[{ value: 'FULL', label: 'Cả ngày' }]} partLabel="Buổi của ngày đầu" invalid />);
    expect(screen.getByLabelText(/^Từ ngày/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('combobox', { name: 'Buổi của ngày đầu' })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
