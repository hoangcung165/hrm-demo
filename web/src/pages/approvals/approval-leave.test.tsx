import { screen, within } from '@testing-library/react';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { approvalId } from '@/test/approval-fixtures';
import { approvalApi } from '@/test/approval-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

/** Trần Thị Mai, HR, linked to her Employee; request 2 of the inbox is a leave request waiting for her. */
const MAI: Account = { ...HR_ACCOUNT, employeeId: '00000000-0000-4000-c000-000000000011' };

describe('ApprovalRequestPage, leave request', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('shows the approver the request, the balance before and after, and who else of the unit is off', async () => {
    server.use(...approvalApi().handlers);
    renderRoutes(routes, { session: MAI, path: `/approvals/${approvalId(2)}` });
    expect(await screen.findByRole('heading', { name: 'Nghỉ phép của Nguyễn Văn Khoa' })).toBeInTheDocument();
    const request = await screen.findByRole('region', { name: 'Đơn nghỉ' });
    expect(within(request).getByText('1,5 ngày làm việc')).toBeInTheDocument();
    expect(within(request).getByText('Về quê dự đám cưới')).toBeInTheDocument();
    const balance = screen.getByRole('region', { name: 'Số dư Phép năm của Nguyễn Văn Khoa' });
    expect(within(balance).getByText('Còn lại trước đơn').nextElementSibling).toHaveTextContent('6 ngày');
    expect(within(balance).getByText('Còn lại sau duyệt').nextElementSibling).toHaveTextContent('4,5 ngày');
    const unit = screen.getByRole('region', { name: 'Phòng Phát triển phần mềm trong những ngày này' });
    expect(within(unit).getByText('Cao Minh Trí')).toBeInTheDocument();
    expect(within(unit).getByText('Đã duyệt')).toBeInTheDocument();
    const projects = screen.getByRole('region', { name: 'Dự án bị ảnh hưởng' });
    expect(within(projects).getByText('DA-025')).toBeInTheDocument();
    expect(within(projects).getByText('Cổng thông tin khách hàng')).toBeInTheDocument();
    const steps = screen.getByRole('list', { name: 'Các bước duyệt' });
    expect(within(steps).getByText('Trừ vào số dư')).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Quyết định của bạn' })).toBeInTheDocument();
  });
});
