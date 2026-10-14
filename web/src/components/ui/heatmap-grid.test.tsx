import { render, screen, within } from '@testing-library/react';
import { HeatmapGrid } from './heatmap-grid';

const COLUMNS = [
  { id: 'w1', label: '06/10', name: 'Tuần 41, 06/10 – 12/10' },
  { id: 'w2', label: '13/10', name: 'Tuần 42, 13/10 – 19/10', current: true },
];
const ROWS = [{ id: 'a', lead: <span>Cao Minh Trí</span>, cells: [{ percent: 60, label: 'Tải phân bổ 60%' }, { percent: 120, label: 'Tải phân bổ 120%, quá tải' }] }];

describe('HeatmapGrid', () => {
  it('renders a named table with one row per person, the current column marked and the loads printed', () => {
    render(<HeatmapGrid caption="Heatmap" leadHeader="Nhân viên" columns={COLUMNS} months={[{ id: 'm', label: 'Tháng 10/2026', span: 2 }]} rows={ROWS} />);
    const table = screen.getByRole('table', { name: 'Heatmap' });
    expect(within(table).getByRole('rowheader', { name: 'Cao Minh Trí' })).toBeInTheDocument();
    expect(within(table).getByText('Tháng 10/2026')).toBeInTheDocument();
    expect(table.querySelector('th[aria-current="date"]')).toHaveTextContent('Tuần 42');
    expect(within(table).getByLabelText('Tải phân bổ 120%, quá tải')).toHaveTextContent('120%');
  });

  it('shows skeleton rows and a named status while loading', () => {
    render(<HeatmapGrid caption="Heatmap" leadHeader="Nhân viên" columns={COLUMNS} rows={[]} loading loadingLabel="Đang tải heatmap" loadingRows={3} />);
    expect(screen.getByRole('status', { name: 'Đang tải heatmap' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(1 + 3);
  });
});
