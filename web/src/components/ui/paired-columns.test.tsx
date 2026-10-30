import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PairedColumns, type PairedPeriod } from './paired-columns';

const period = (n: number, a: number, b: number, current = false): PairedPeriod => ({ key: `2026-0${n}`, short: `T0${n}`, full: `Tháng 0${n}/2026`, a, b, current, sentence: `Tháng 0${n}/2026: ${a} vào làm, ${b} nghỉ việc` });
const periods = [period(1, 4, 1), period(2, 2, 2), period(3, 6, 0), period(4, 3, 1, true)];
const show = () => render(<PairedColumns label="Vào làm và nghỉ việc theo tháng: tổng 15 vào làm, 4 nghỉ việc" periods={periods} seriesA="Vào làm" seriesB="Nghỉ việc" />);

describe('PairedColumns', () => {
  it('names the chart and gives every period one sentence, so no number lives only in the picture', () => {
    show();
    const list = screen.getByRole('list', { name: 'Vào làm và nghỉ việc theo tháng: tổng 15 vào làm, 4 nghỉ việc' });
    expect(list.querySelectorAll(':scope > li')).toHaveLength(4);
    expect(screen.getByText('Tháng 03/2026: 6 vào làm, 0 nghỉ việc')).toHaveClass('sr-only');
  });

  it('prints both numbers under every period, a zero included, and marks the current one', () => {
    show();
    expect(screen.getByText('+6 −0')).toBeInTheDocument();
    expect(screen.getByText('+4 −1', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('T04')).toHaveClass('text-brand-blue');
    expect(screen.getByText('T03')).not.toHaveClass('text-brand-blue');
  });

  it('scales both series to the largest value of either, draws no bar for a zero and shows the legend in order', () => {
    const { container } = show();
    const bars = container.querySelectorAll<HTMLElement>('li > span[aria-hidden="true"]:not([class*="absolute"]) > span');
    expect(bars[0]!.style.height).toBe('66.66666666666666%');
    expect(bars[4]!.style.height).toBe('100%');
    expect(bars[5]!.style.height).toBe('0%');
    expect(bars[5]).not.toHaveClass('min-h-0.5');
    expect(Array.from(container.querySelectorAll('ul li')).map((li) => li.textContent)).toEqual(['Vào làm', 'Nghỉ việc']);
  });

  it('opens a tooltip with the full period and both series on keyboard focus, and closes it on blur', async () => {
    show();
    const user = userEvent.setup();
    await user.tab();
    expect(await screen.findByText('Tháng 01/2026', { selector: 'span.font-semibold' })).toBeInTheDocument();
    await user.tab();
    expect(screen.queryByText('Tháng 01/2026', { selector: 'span.font-semibold' })).not.toBeInTheDocument();
    expect(screen.getByText('Tháng 02/2026', { selector: 'span.font-semibold' })).toBeInTheDocument();
  });
});
