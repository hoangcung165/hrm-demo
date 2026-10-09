import { render, screen, within } from '@testing-library/react';
import i18n from '@/i18n';
import { Steps } from './steps';

const STEPS = [{ label: 'Tải lên' }, { label: 'Kiểm tra' }, { label: 'Xác nhận' }];

describe('Steps', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('marks done, current and upcoming steps with their number or a check, not color alone', () => {
    render(<Steps steps={STEPS} current={1} />);
    const items = within(screen.getByRole('list', { name: 'Các bước' })).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['Bước 1, đã xong: Tải lên', '2Bước 2, đang làm: Kiểm tra', '3Bước 3: Xác nhận']);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).not.toHaveAttribute('aria-current');
  });

  it('is one line and a progress bar when compact, and all done when complete', () => {
    const { rerender } = render(<Steps steps={STEPS} current={1} compact />);
    expect(screen.getByText('Bước 2/3: Kiểm tra')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Các bước' })).toHaveAttribute('aria-valuenow', '1');
    rerender(<Steps steps={STEPS} current={2} complete />);
    expect(within(screen.getByRole('list', { name: 'Các bước' })).queryByRole('listitem', { current: 'step' })).not.toBeInTheDocument();
  });
});
