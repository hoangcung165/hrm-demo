import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { BarList } from './bar-list';

const show = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);
const fillOf = (row: HTMLElement) => row.querySelector<HTMLElement>('[aria-hidden="true"] > span')!;

describe('BarList', () => {
  it('names the chart, links a label to its list and always shows the number', () => {
    show(<BarList label="Nhân viên theo đơn vị" rows={[{ key: 'a', label: 'Nhóm Web', value: 59, to: '/employees?x=1' }, { key: 'b', label: 'Nhóm Di động', value: 42 }]} />);
    const list = screen.getByRole('list', { name: 'Nhân viên theo đơn vị' });
    const [web, mobile] = within(list).getAllByRole('listitem');
    expect(within(web!).getByRole('link', { name: 'Nhóm Web' })).toHaveAttribute('href', '/employees?x=1');
    expect(web).toHaveTextContent('Nhóm Web59');
    expect(within(mobile!).queryByRole('link')).not.toBeInTheDocument();
    expect(mobile).toHaveTextContent('Nhóm Di động42');
  });

  it('scales bars to the largest value, draws a zero as nothing and a small value as at least a sliver', () => {
    show(<BarList label="x" rows={[{ key: 'a', label: 'A', value: 200 }, { key: 'b', label: 'B', value: 100 }, { key: 'c', label: 'C', value: 1 }, { key: 'd', label: 'D', value: 0 }]} />);
    const rows = screen.getAllByRole('listitem');
    expect(fillOf(rows[0]!).style.width).toBe('100%');
    expect(fillOf(rows[1]!).style.width).toBe('50%');
    expect(fillOf(rows[2]!)).toHaveClass('min-w-1');
    expect(fillOf(rows[3]!).style.width).toBe('0%');
    expect(fillOf(rows[3]!)).not.toHaveClass('min-w-1');
    expect(rows[3]).toHaveTextContent('D0');
  });

  it('hides the bars from assistive technology, so a row reads as its label and number', () => {
    show(<BarList label="x" rows={[{ key: 'a', label: 'A', value: 3 }]} />);
    expect(screen.getByRole('listitem').querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByRole('listitem')).toHaveTextContent('A3');
  });

  it('rich: a second line with the caption and the warning in danger, and the number with its unit', () => {
    show(<BarList label="Dự án" variant="rich" format={(value) => `${value} người`} rows={[{ key: 'a', label: 'Cổng khách hàng', value: 9, caption: 'DA-029', alert: '1 quá tải' }]} />);
    const row = screen.getByRole('listitem');
    expect(row).toHaveTextContent('Cổng khách hàngDA-029 · 1 quá tải9 người');
    expect(within(row).getByText('1 quá tải')).toHaveClass('text-danger');
  });
});
