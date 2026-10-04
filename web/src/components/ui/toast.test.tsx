import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { TOAST_DURATION_MS } from './toast';
import { ToastProvider } from './toast-provider';
import { useToast, type ToastOptions } from './use-toast';

function Trigger({ toast }: { toast: ToastOptions }) {
  const show = useToast();
  return <button onClick={() => show(toast)}>show</button>;
}
const renderWith = (toast: ToastOptions) =>
  render(
    <ToastProvider>
      <Trigger toast={toast} />
    </ToastProvider>,
  );

describe('Toast', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });
  afterEach(() => vi.useRealTimers());

  it('success: announced politely with message and detail, and closes itself after 5s', () => {
    vi.useFakeTimers();
    renderWith({ variant: 'success', message: 'Đã lưu thông tin công ty', detail: '09:30' });
    act(() => screen.getByRole('button', { name: 'show' }).click());
    const toast = within(screen.getByRole('region', { name: 'Thông báo kết quả thao tác' })).getByRole('status');
    expect(toast).toHaveTextContent('Đã lưu thông tin công ty');
    expect(toast).toHaveTextContent('09:30');
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1));
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('danger: an alert that stays until closed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderWith({ variant: 'danger', message: 'Không lưu được thông tin công ty', detail: 'Kiểm tra kết nối mạng rồi thử lại.' });
    await userEvent.click(screen.getByRole('button', { name: 'show' }));
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS * 4));
    const toast = screen.getByRole('alert');
    expect(toast).toHaveTextContent('Không lưu được thông tin công ty');
    await userEvent.click(within(toast).getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('runs the optional action and stacks at most three', async () => {
    const undo = vi.fn();
    renderWith({ variant: 'danger', message: 'Đã xóa', action: { label: 'Hoàn tác', onClick: undo } });
    for (let i = 0; i < 4; i += 1) await userEvent.click(screen.getByRole('button', { name: 'show' }));
    expect(screen.getAllByRole('alert')).toHaveLength(3);
    await userEvent.click(screen.getAllByRole('button', { name: 'Hoàn tác' })[0]!);
    expect(undo).toHaveBeenCalledOnce();
  });
});
