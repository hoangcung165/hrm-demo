import { render, screen } from '@testing-library/react';
import { Sun } from 'lucide-react';
import { BalanceCard } from './balance-card';

const segments = [
  { tone: 'used' as const, value: 4, text: 'Đã dùng 4' },
  { tone: 'pending' as const, value: 1.5, text: 'Đang chờ 1,5' },
  { tone: 'remaining' as const, value: 4.5, text: 'Còn lại 4,5' },
  { tone: 'room' as const, value: 2, text: 'Ứng trước được 2' },
];

describe('BalanceCard', () => {
  it('shows the figure, a bar sized by the days and named as a whole, and the legend', () => {
    render(<BalanceCard icon={<Sun />} title="Phép năm 2026" caption="Định mức 12 ngày" figure="4,5" figureLabel="ngày còn lại" segments={segments} barLabel="Phép năm 2026: còn lại 4,5" />);
    expect(screen.getByRole('region', { name: 'Phép năm 2026' })).toBeInTheDocument();
    const bar = screen.getByRole('img', { name: 'Phép năm 2026: còn lại 4,5' });
    expect([...bar.children].map((part) => (part as HTMLElement).style.width)).toEqual(['33.33333333333333%', '12.5%', '37.5%', '16.666666666666664%']);
    expect(screen.getByText('Ứng trước được 2')).toBeInTheDocument();
    expect(screen.getByText('4,5')).not.toHaveClass('text-danger');
  });

  it('shows a negative balance in danger and draws no empty parts', () => {
    render(<BalanceCard icon={<Sun />} title="Phép năm" figure="−1,5" figureLabel="ngày, đang ứng trước" negative segments={[{ tone: 'used', value: 13.5, text: 'Đã dùng 13,5' }, { tone: 'remaining', value: 0, text: 'Còn lại 0' }]} barLabel="Phép năm" />);
    expect(screen.getByText('−1,5')).toHaveClass('text-danger');
    expect(screen.getByRole('img', { name: 'Phép năm' }).children).toHaveLength(1);
  });
});
