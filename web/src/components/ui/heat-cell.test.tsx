import { render, screen } from '@testing-library/react';
import { HeatCell, heatLevel } from './heat-cell';
import { HeatLegend } from './heat-legend';

describe('HeatCell', () => {
  it('maps a load to its level: 0 bench, under 100 partial, 100 full, above 100 over', () => {
    expect([0, 40, 99, 100, 101, 120].map(heatLevel)).toEqual(['bench', 'partial', 'partial', 'full', 'over', 'over']);
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
    render(<HeatLegend label="Chú giải Tải phân bổ" items={[{ percent: 40, label: 'Dưới 100%' }, { percent: 120, label: 'Quá tải' }]} />);
    expect(screen.getByRole('list', { name: 'Chú giải Tải phân bổ' })).toHaveTextContent('40%Dưới 100%120%Quá tải');
  });
});
