import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Users } from 'lucide-react';
import i18n from '@/i18n';
import { ConfirmDialog } from './confirm-dialog';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { Loading } from './loading';

describe('shared states (P10)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('EmptyState shows a title, a description and its action', () => {
    render(<EmptyState icon={<Users />} title="Chưa có nhân viên nào" description="Thêm nhân viên đầu tiên." actions={<button>Thêm nhân viên</button>} />);
    expect(screen.getByRole('heading', { name: 'Chưa có nhân viên nào' })).toBeInTheDocument();
    expect(screen.getByText('Thêm nhân viên đầu tiên.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm nhân viên' })).toBeInTheDocument();
  });

  it('ErrorState is announced and retries', async () => {
    const onRetry = vi.fn();
    render(<ErrorState title="Không tải được danh sách nhân viên" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được danh sách nhân viên');
    expect(screen.getByRole('alert')).toHaveTextContent('Kiểm tra kết nối mạng rồi thử lại.');
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('Loading is announced as busy', () => {
    render(<Loading />);
    expect(screen.getByRole('status', { name: 'Đang tải' })).toHaveAttribute('aria-busy', 'true');
  });

  it('ConfirmDialog names the object, confirms and cancels', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Chấm dứt hợp đồng của Nguyễn Văn An?"
        description="Hợp đồng HĐ-2025-0241 sẽ kết thúc từ 31/10/2026 và không thể hoàn tác."
        confirmLabel="Chấm dứt hợp đồng"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Chấm dứt hợp đồng của Nguyễn Văn An?' });
    expect(dialog).toHaveAccessibleDescription('Hợp đồng HĐ-2025-0241 sẽ kết thúc từ 31/10/2026 và không thể hoàn tác.');
    await userEvent.click(screen.getByRole('button', { name: 'Chấm dứt hợp đồng' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
