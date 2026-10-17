import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { SalarySegmentBar } from './salary-segment-bar';
import type { SalaryProfileSegment } from '../salary-profile-api';
import type { PeriodPiece } from '../salary-period';

const segment: SalaryProfileSegment = {
  from: '2026-01-16', to: '2026-01-31', baseSalary: 21_000_000, insuranceSalary: 18_000_000,
  allowancesJson: '[]', insured: true, taxMethod: 'PROGRESSIVE',
  sourceContractId: 'contract-1', sourceAmendmentId: 'amendment-1', overrideReason: null,
};

const pieces: PeriodPiece[] = [
  { kind: 'gap', from: '2026-01-01', to: '2026-01-15', days: 15 },
  { kind: 'salary', from: '2026-01-16', to: '2026-01-31', days: 16, segment },
];

describe('HRM-10 salary segment bar accessibility', () => {
  beforeEach(async () => { await i18n.changeLanguage('vi'); });

  it('lets the keyboard scroll the bar sideways', async () => {
    render(<SalarySegmentBar pieces={pieces} revealedKey={null} />);
    const region = screen.getByRole('region', { name: 'Cuộn ngang để xem đủ các đoạn hiệu lực' });
    expect(region).toHaveAttribute('tabindex', '0');
    await userEvent.tab();
    expect(region).toHaveFocus();
    expect(within(region).getByRole('list', { name: 'Thanh đoạn hiệu lực Hồ sơ lương' })).toBeInTheDocument();
  });

  it('names an uncovered period in words, not by colour alone, and masks pay', () => {
    render(<SalarySegmentBar pieces={pieces} revealedKey={null} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Chưa có hồ sơ');
    expect(items[1]).toHaveTextContent('•••••• ₫');
    expect(screen.queryByText('21.000.000 ₫')).not.toBeInTheDocument();
  });
});
