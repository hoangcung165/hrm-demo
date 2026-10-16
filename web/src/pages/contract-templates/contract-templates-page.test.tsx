import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import { ADMIN_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';
import type { ContractTemplateSummary } from '@/features/contract/template-api';

const one: ContractTemplateSummary = {
  id: 'template-1', contractType: 'FIXED_TERM', version: 1,
  fileName: 'fixed-v1.docx', active: false, uploadedAt: '2026-10-14T12:30:00Z',
};
const two: ContractTemplateSummary = {
  ...one, id: 'template-2', version: 2, fileName: 'fixed-v2.docx', active: true,
};

describe('HRM-10 FE-4 Document Templates', () => {
  beforeEach(async () => { localStorage.clear(); await i18n.changeLanguage('vi'); });

  it('shows versions, active marker, supported fields and the system navigation item', async () => {
    server.use(http.get('*/api/contract-templates/:type', () => HttpResponse.json([two, one])));
    renderRoutes(routes, { session: ADMIN_ACCOUNT, path: '/contract-templates' });
    expect(screen.getByRole('heading', { name: 'Mẫu văn bản', level: 1 })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Điều hướng chính' }))
      .getByRole('link', { name: 'Mẫu văn bản' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByText('fixed-v2.docx')).toBeInTheDocument();
    expect(screen.getByText('fixed-v1.docx')).toBeInTheDocument();
    expect(screen.getByText('Đang dùng')).toBeInTheDocument();
    expect(screen.getByText('Bản cũ')).toBeInTheDocument();
    expect(screen.getByText('{{employee_name}}')).toBeInTheDocument();
  });

  it('does not call the protected endpoint when the caller lacks the required permissions', async () => {
    let calls = 0;
    server.use(http.get('*/api/contract-templates/:type', () => {
      calls++; return HttpResponse.json([two]);
    }));
    renderRoutes(routes, { session: HR_ACCOUNT, path: '/contract-templates' });
    expect(await screen.findByText('Không có quyền quản lý mẫu hợp đồng')).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('uploads DOCX via multipart and refreshes the version list', async () => {
    let rows: ContractTemplateSummary[] = [];
    let uploaded = '';
    server.use(
      http.get('*/api/contract-templates/:type', () => HttpResponse.json(rows)),
      http.post('*/api/contract-templates/:type', async ({ request }) => {
        const file = (await request.formData()).get('file');
        uploaded = file && typeof file === 'object' && 'name' in file ? String(file.name) : '';
        rows = [{ ...two, fileName: uploaded, version: 1 }];
        return HttpResponse.json(rows[0], { status: 201 });
      }),
    );
    renderRoutes(routes, { session: ADMIN_ACCOUNT, path: '/contract-templates' });
    await screen.findByText('Chưa có mẫu hợp đồng');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['docx'], 'official.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }));
    await userEvent.click(screen.getByRole('button', { name: 'Tải mẫu lên' }));
    await waitFor(() => expect(uploaded).toBe('official.docx'));
    expect(await screen.findByText('official.docx')).toBeInTheDocument();
  });

  it('rejects a PDF before contacting the API', async () => {
    let uploads = 0;
    server.use(
      http.get('*/api/contract-templates/:type', () => HttpResponse.json([])),
      http.post('*/api/contract-templates/:type', () => { uploads++; return HttpResponse.json({}); }),
    );
    renderRoutes(routes, { session: ADMIN_ACCOUNT, path: '/contract-templates' });
    await screen.findByText('Chưa có mẫu hợp đồng');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // userEvent.upload honours the accept attribute; fire change explicitly for invalid-type coverage.
    const bad = new File(['pdf'], 'not-a-docx.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { configurable: true, value: [bad] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(await screen.findByText('Chỉ nhận file .docx hợp lệ.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải mẫu lên' })).toBeDisabled();
    expect(uploads).toBe(0);
  });
});
