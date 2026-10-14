import { render, screen } from '@testing-library/react';
import { HeatCell, heatLevel } from './heat-cell';
import { HeatLegend } from './heat-legend';

describe('HeatCell', () => {
  it('maps a load to its level by the default thresholds: under 50 bench, 50 to 89 partial, 90 to 100 full, above 100 over', () => {
    expect([0, 40, 49, 50, 89, 90, 100, 101, 120].map((percent) => heatLevel(percent))).toEqual(['bench', 'bench', 'bench', 'partial', 'partial', 'full', 'full', 'over', 'over']);
  });

  it('follows the thresholds the company sets, and above 100 is over whatever they are', () => {
    const company = { bench: 25, nearFull: 80 };
    expect([24, 25, 79, 80, 100, 101].map((percent) => heatLevel(percent, company))).toEqual(['bench', 'partial', 'partial', 'full', 'full', 'over']);
  });

  it('shows the percent with the warning icon only when overloaded, and is read by its label', () => {
    const { container } = render(
      <>
        <HeatCell percent={120} label="Tải phân bổ 120%, quá tải" />
        <HeatCell percent={100} label="Tải phân bổ 100%" />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Tải phân bổ 120%, quá tải' })).toHaveTextContent('120%');
    expect(screen.getByRole('img', { name: 'Tải phân bổ 100%' })).toHaveTextContent('100%');
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('the legend names each level', () => {
    render(<HeatLegend label="Chú giải Tải phân bổ" items={[{ percent: 60, label: 'Dưới 90%' }, { percent: 120, label: 'Quá tải' }]} />);
    expect(screen.getByRole('list', { name: 'Chú giải Tải phân bổ' })).toHaveTextContent('60%Dưới 90%120%Quá tải');
  });
});
