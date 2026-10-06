import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { Dialog } from './dialog';
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

  it('the container is a polite live region that is there before any toast', () => {
    renderWith({ variant: 'success', message: 'Đã lưu thông tin công ty' });
    const region = screen.getByRole('region', { name: 'Thông báo kết quả thao tác' });
    expect(region).toBeEmptyDOMElement();
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'false');
    expect(region).toHaveAttribute('aria-relevant', 'additions text');
  });

  it('success: added to the live region with message and detail, no live region of its own, closes itself after 5s', () => {
    vi.useFakeTimers();
    renderWith({ variant: 'success', message: 'Đã lưu thông tin công ty', detail: '09:30' });
    const region = screen.getByRole('region', { name: 'Thông báo kết quả thao tác' });
    act(() => screen.getByRole('button', { name: 'show' }).click());
    expect(region).toHaveTextContent('Đã lưu thông tin công ty');
    expect(region).toHaveTextContent('09:30');
    // One announcement: nothing inside the polite region is a second polite (or assertive) region.
    expect(within(region).queryByRole('status')).not.toBeInTheDocument();
    expect(within(region).queryByRole('alert')).not.toBeInTheDocument();
    expect(region.querySelector('[aria-live]')).toBeNull();
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1));
    expect(region).toHaveTextContent('Đã lưu thông tin công ty');
    act(() => vi.advanceTimersByTime(1));
    expect(region).toBeEmptyDOMElement();
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

  it('over an open Dialog: its close button works, and closing it does not close the dialog', async () => {
    const onOpenChange = vi.fn();
    render(
      <ToastProvider>
        <Dialog open onOpenChange={onOpenChange} title="Chuyển Nhóm Web" footer={<Trigger toast={{ variant: 'danger', message: 'Không chuyển được Nhóm Web' }} />} />
      </ToastProvider>,
    );
    // A modal dialog switches pointer events off outside itself; the Toast switches them back on in CSS, which jsdom does not load.
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByRole('button', { name: 'show' }));
    const toast = screen.getByRole('alert');
    // The Toast region is not hidden from assistive technology behind the dialog.
    expect(toast.closest('[aria-hidden="true"]')).toBeNull();

    await user.click(toast);
    await user.click(within(toast).getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Chuyển Nhóm Web' })).toBeInTheDocument();

    // A pointer-down anywhere else outside still closes the dialog.
    await user.click(document.body);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('runs the optional action and stacks at most three', async () => {
    const undo = vi.fn();
    renderWith({ variant: 'danger', message: 'Đã xóa', action: { label: 'Hoàn tác', onClick: undo } });
    for (let i = 0; i < 4; i += 1) await userEvent.click(screen.getByRole('button', { name: 'show' }));
    expect(screen.getAllByRole('alert')).toHaveLength(3);
    await userEvent.click(screen.getAllByRole('button', { name: 'Hoàn tác' })[0]!);
    expect(undo).toHaveBeenCalledOnce();
    // The action closes its own Toast.
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });
});
