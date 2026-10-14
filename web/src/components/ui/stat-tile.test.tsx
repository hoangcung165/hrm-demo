import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { StatTile } from './stat-tile';

const show = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('StatTile', () => {
  it('shows the label, the number and the hint', () => {
    show(<StatTile label="Dự án đang chạy" value="7" hint="2 sắp bắt đầu" />);
    expect(screen.getByText('Dự án đang chạy')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('2 sắp bắt đầu')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('is one link to the list behind the number when it has a target', () => {
    show(<StatTile label="Bench" value="3" to="/resources?tab=bench" />);
    expect(screen.getByRole('link', { name: /Bench/ })).toHaveAttribute('href', '/resources?tab=bench');
  });

  it('shows a dash for a missing number, and a skeleton instead of the number while loading', () => {
    const { rerender } = show(<StatTile label="Tải phân bổ trung bình" value={null} />);
    expect(screen.getByText('–')).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <StatTile label="Tải phân bổ trung bình" value="75%" busy />
      </MemoryRouter>,
    );
    expect(screen.queryByText('75%')).not.toBeInTheDocument();
  });
});
