import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Inbox } from 'lucide-react';
import { MemoryRouter } from 'react-router';
import i18n from '@/i18n';
import { DashboardWidget } from './dashboard-widget';

const show = (props: Parameters<typeof DashboardWidget>[0]) => render(<MemoryRouter><DashboardWidget {...props} /></MemoryRouter>);

describe('DashboardWidget', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('shows the title, the total and a link to the filtered list', () => {
    show({ title: 'Sắp hết hạn', count: 12, link: { label: 'Xem tất cả', to: '/expiry?x=1', ariaLabel: 'Xem tất cả giấy tờ sắp hết hạn' }, description: 'Trong 45 ngày tới', children: <p>5 dòng</p> });
    expect(screen.getByRole('heading', { name: 'Sắp hết hạn' })).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Trong 45 ngày tới')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem tất cả giấy tờ sắp hết hạn' })).toHaveAttribute('href', '/expiry?x=1');
    expect(screen.getByText('5 dòng')).toBeInTheDocument();
  });

  it('while loading keeps only the title, marks the block busy and shows no count or link', () => {
    show({ title: 'Nghỉ hôm nay', count: 3, link: { label: 'Lịch nghỉ', to: '/leave-calendar' }, loading: true, children: <p>dòng</p> });
    expect(screen.getByRole('region', { name: 'Nghỉ hôm nay' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('3')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText('dòng')).not.toBeInTheDocument();
  });

  it('on error names what failed and retries without touching the head title', async () => {
    const onRetry = vi.fn();
    show({ title: 'Sắp hết hạn', count: 12, link: { label: 'Xem tất cả', to: '/expiry' }, error: { title: 'Không tải được danh sách sắp hết hạn', onRetry } });
    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được danh sách sắp hết hạn');
    expect(screen.getByRole('heading', { name: 'Sắp hết hạn' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('when empty shows the sentence that says why, without a count', () => {
    show({ title: 'Nghỉ hôm nay', count: 0, empty: { icon: <Inbox />, title: 'Hôm nay không ai nghỉ', text: 'Cả nhóm có mặt.' } });
    expect(screen.getByText('Hôm nay không ai nghỉ')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
