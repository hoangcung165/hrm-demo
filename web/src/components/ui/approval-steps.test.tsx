import { render, screen, within } from '@testing-library/react';
import { ApprovalSteps } from './approval-steps';

describe('ApprovalSteps', () => {
  it('lists the steps in order, marks the current one and shows its badge, captions and quote', () => {
    render(
      <ApprovalSteps
        label="Các bước duyệt"
        steps={[
          { id: 'sent', title: 'Đã gửi', state: 'done', captions: ['Nguyễn Văn An · 07/10/2026 09:12'] },
          { id: '1', title: 'Cấp 1 · Quản lý trực tiếp', state: 'done', badge: <span>Đã duyệt</span>, quote: 'Đã kiểm tra với An' },
          { id: '2', title: 'Cấp 2 · HR', state: 'current', badge: <span>Chờ duyệt</span>, captions: ['Bạn hoặc Trương Thị Ngọc Hân'] },
          { id: 'apply', title: 'Áp dụng vào hồ sơ', state: 'pending' },
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: 'Các bước duyệt' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((item) => item.querySelector('span.font-medium')?.textContent)).toEqual(['Đã gửi', 'Cấp 1 · Quản lý trực tiếp', 'Cấp 2 · HR', 'Áp dụng vào hồ sơ']);
    expect(items[2]).toHaveAttribute('aria-current', 'step');
    expect(items.filter((item) => item.hasAttribute('aria-current'))).toHaveLength(1);
    expect(within(items[1]!).getByText('“Đã kiểm tra với An”')).toBeInTheDocument();
    expect(within(items[2]!).getByText('Bạn hoặc Trương Thị Ngọc Hân')).toBeInTheDocument();
    expect(items[3]!.querySelector('span.font-medium')).toHaveClass('text-ink-muted');
  });

  it('draws a cross where the request stopped', () => {
    render(<ApprovalSteps label="Các bước duyệt" steps={[{ id: '1', title: 'Cấp 1', state: 'stopped', badge: <span>Bị từ chối</span> }]} />);
    const item = screen.getByRole('listitem');
    expect(item.querySelector('svg.lucide-x')).toBeInTheDocument();
    expect(within(item).getByText('Bị từ chối')).toBeInTheDocument();
  });
});
