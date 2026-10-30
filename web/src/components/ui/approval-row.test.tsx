import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ApprovalRow, type ApprovalRowProps } from './approval-row';

const labels = { approve: 'Duyệt', approving: 'Đang duyệt…', reject: 'Từ chối', open: 'Mở để duyệt', approveAria: 'Duyệt nghỉ phép của Hân', rejectAria: 'Từ chối nghỉ phép của Hân', openAria: 'Mở nghỉ phép của Hân để duyệt' };
const base: ApprovalRowProps = { sender: 'Trương Thị Ngọc Hân', title: 'Nghỉ phép · Trương Thị Ngọc Hân', to: '/approvals/1', what: 'Thứ Ba 20/10 (sáng) · 0,5 ngày', unitLevel: 'Nhóm Web · Cấp 1/1', labels, onApprove: () => {}, onReject: () => {} };
const show = (props: Partial<ApprovalRowProps>) => render(<MemoryRouter><ul><ApprovalRow {...base} {...props} /></ul></MemoryRouter>);

describe('ApprovalRow', () => {
  it('shows the request with Từ chối before Duyệt, each naming the request', async () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    show({ onApprove, onReject, badges: <span>Tự duyệt 30/10</span> });
    expect(screen.getByRole('link', { name: 'Nghỉ phép · Trương Thị Ngọc Hân' })).toHaveAttribute('href', '/approvals/1');
    expect(screen.getByText('Nhóm Web · Cấp 1/1')).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(['Từ chối nghỉ phép của Hân', 'Duyệt nghỉ phép của Hân']);
    await userEvent.click(screen.getByRole('button', { name: 'Duyệt nghỉ phép của Hân' }));
    await userEvent.click(screen.getByRole('button', { name: 'Từ chối nghỉ phép của Hân' }));
    expect(onApprove).toHaveBeenCalledOnce();
    expect(onReject).toHaveBeenCalledOnce();
  });

  it('offers only "Mở để duyệt" when the request needs the approver\'s eyes', () => {
    show({ needsOpening: true });
    expect(screen.getByRole('link', { name: 'Mở nghỉ phép của Hân để duyệt' })).toHaveAttribute('href', '/approvals/1');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('disables both buttons while the decision is on its way', () => {
    show({ busy: true });
    expect(screen.getByRole('button', { name: 'Duyệt nghỉ phép của Hân' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Từ chối nghỉ phép của Hân' })).toBeDisabled();
    expect(screen.getByText('Đang duyệt…')).toBeInTheDocument();
  });

  it.each([
    ['approved', 'Đã duyệt'],
    ['moved', 'Chuyển cấp 2'],
    ['rejected', 'Đã từ chối'],
  ] as const)('turns into its %s result, without buttons', (kind, badge) => {
    show({ result: { kind, text: 'Kết quả của Hân', detail: 'Chi tiết', badge } });
    expect(screen.getByText('Kết quả của Hân')).toBeInTheDocument();
    expect(screen.getByText('Chi tiết')).toBeInTheDocument();
    expect(screen.getByText(badge)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
