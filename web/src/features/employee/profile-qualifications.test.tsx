import { http, HttpResponse } from 'msw';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { employeeId } from '@/test/employee-fixtures';
import { employeeProfileApi } from '@/test/employee-profile-handlers';
import { orgUnitsOk } from '@/test/org-unit-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';
import type { EmployeeCertificate, EmployeeSkill } from './profile-qualifications-api';
import type { Attachment } from './profile-documents-api';

const SKILL_ID = 'b6445a62-2f63-45e6-93d8-b8ae0d307289';
const RECORD_ID = '51ff380c-dfa5-4b90-9b11-51002de1e608';
const CERT_ID = '83cb4320-5b7e-421c-b61c-10639465ca64';
const FILE_ID = '34abe50f-5b81-4e89-b61e-64c0547745d5';
const path = `/employees/${employeeId(7)}?tab=skills`;
const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'EMPLOYEE_EDIT', 'EMPLOYEE_SENSITIVE_VIEW'] };
const VIEWER: Account = { ...HR_ACCOUNT, permissions: ['EMPLOYEE_VIEW'] };

function open(session: Account = HR, initialSkills: EmployeeSkill[] = [], initialCertificates: EmployeeCertificate[] = [], initialFiles: Attachment[] = []) {
  const skills = [...initialSkills];
  const certificates = [...initialCertificates];
  const writes: string[] = [];
  const reads: string[] = [];
  const files: Attachment[] = [...initialFiles];
  server.use(employeeProfileApi().handler, orgUnitsOk(),
    http.get('*/api/catalogs/skills/items', () => HttpResponse.json({ total: 1, items: [
      { id: SKILL_ID, code: 'REACT', name: 'React', active: true },
    ] })),
    http.get('*/api/employees/:employeeId/skills', () => HttpResponse.json(skills)),
    http.post('*/api/employees/:employeeId/skills', async ({ request }) => {
      const body = await request.json() as { skillId: string; level: number };
      writes.push(`skill:${body.skillId}:${body.level}`);
      const added = { id: RECORD_ID, skill: { id: SKILL_ID, code: 'REACT', name: 'React', active: true }, level: body.level };
      skills.push(added); return HttpResponse.json(added, { status: 201 });
    }),
    http.put('*/api/employees/:employeeId/skills/:id', async ({ request }) => {
      const body = await request.json() as { level: number };
      writes.push(`level:${body.level}`); skills[0]!.level = body.level;
      return HttpResponse.json(skills[0]);
    }),
    http.delete('*/api/employees/:employeeId/skills/:id', () => {
      writes.push('delete-skill'); skills.splice(0, 1); return new HttpResponse(null, { status: 204 });
    }),
    http.get('*/api/employees/:employeeId/certificates', () => HttpResponse.json(certificates)),
    http.post('*/api/employees/:employeeId/certificates', async ({ request }) => {
      const body = await request.json() as Omit<EmployeeCertificate, 'id'>;
      writes.push(`certificate:${body.name}:${body.attachmentId}`);
      const added = { ...body, id: CERT_ID }; certificates.push(added);
      return HttpResponse.json(added, { status: 201 });
    }),
    http.put('*/api/employees/:employeeId/certificates/:id', async ({ request }) => {
      const body = await request.json() as Omit<EmployeeCertificate, 'id'>;
      writes.push(`certificate-edit:${body.name}`); Object.assign(certificates[0]!, body);
      return HttpResponse.json(certificates[0]);
    }),
    http.delete('*/api/employees/:employeeId/certificates/:id', () => {
      writes.push('delete-certificate'); certificates.splice(0, 1); return new HttpResponse(null, { status: 204 });
    }),
    http.get('*/api/employees/:employeeId/attachments', () => { reads.push('attachments'); return HttpResponse.json(files); }),
    http.get('*/api/employees/:employeeId/expat-documents', () => HttpResponse.json([])),
    http.delete('*/api/employees/:employeeId/attachments/:id', ({ params }) => {
      writes.push('delete-attachment');
      files.splice(files.findIndex(file => file.id === params.id), 1);
      certificates.forEach(certificate => { if (certificate.attachmentId === params.id) certificate.attachmentId = null; });
      return new HttpResponse(null, { status: 204 });
    }),
    http.post('*/api/employees/:employeeId/attachments', async ({ request }) => {
      const data = await request.formData();
      const file = data.get('file') as File;
      writes.push('upload');
      const saved = { id: FILE_ID, fileName: 'certificate.pdf', contentType: file.type, contentLength: file.size,
        sha256: '', uploadedAt: '2026-10-15T00:00:00Z' };
      files.push(saved); return HttpResponse.json(saved, { status: 201 });
    }),
  );
  renderRoutes(routes, { session, path });
  return { skills, certificates, writes, reads };
}

describe('HRM-09 profile qualifications', () => {
  beforeEach(async () => { localStorage.clear(); await i18n.changeLanguage('vi'); });

  it('shows the two empty states and allows HR to add, edit and delete a skill', async () => {
    const { writes } = open();
    expect(await screen.findByRole('heading', { name: 'Chưa có kỹ năng' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Chưa có chứng chỉ' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thêm kỹ năng' }));
    const dialog = screen.getByRole('dialog', { name: 'Thêm kỹ năng' });
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Kỹ năng' }));
    await userEvent.click(screen.getByRole('option', { name: 'React' }));
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Mức độ' }));
    await userEvent.click(screen.getByRole('option', { name: 'Mức 4/5' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Mức 4/5')).toBeInTheDocument();
    expect(writes).toContain(`skill:${SKILL_ID}:4`);
    await userEvent.click(screen.getByRole('button', { name: 'Sửa React' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Sửa kỹ năng' })).getByRole('combobox', { name: 'Mức độ' }));
    await userEvent.click(screen.getByRole('option', { name: 'Mức 5/5' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Sửa kỹ năng' })).getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Mức 5/5')).toBeInTheDocument();
    expect(writes).toContain('level:5');
    await userEvent.click(screen.getByRole('button', { name: 'Xóa React?' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Xóa React?' })).getByRole('button', { name: 'Xóa' }));
    await waitFor(() => expect(writes).toContain('delete-skill'));
    expect(await screen.findByRole('heading', { name: 'Chưa có kỹ năng' })).toBeInTheDocument();
  });

  it('validates certificate dates, uploads a private file and links it to the saved record', async () => {
    const { writes } = open();
    await screen.findByRole('heading', { name: 'Chưa có chứng chỉ' });
    await userEvent.click(screen.getByRole('button', { name: 'Thêm chứng chỉ' }));
    const dialog = screen.getByRole('dialog', { name: 'Thêm chứng chỉ' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Tên chứng chỉ' }), 'AWS Associate');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Đơn vị cấp' }), 'AWS');
    fireEvent.change(within(dialog).getByLabelText('Ngày cấp'), { target: { value: '2026-04-01' } });
    fireEvent.change(within(dialog).getByLabelText('Ngày hết hạn'), { target: { value: '2026-03-01' } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Ngày hết hạn không được trước ngày cấp');
    fireEvent.change(within(dialog).getByLabelText('Ngày hết hạn'), { target: { value: '2027-04-01' } });
    await userEvent.upload(within(dialog).getByLabelText('Tải tệp mới lên'), new File(['sample'], 'certificate.pdf', { type: 'application/pdf' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByRole('heading', { name: 'AWS Associate' })).toBeInTheDocument();
    expect(writes).toContain('upload');
    expect(writes).toContain(`certificate:AWS Associate:${FILE_ID}`);
    expect(await screen.findByRole('button', { name: 'Tải certificate.pdf' })).toBeInTheDocument();
  });

  it('keeps the tab read-only without edit permission and never requests private attachments', async () => {
    const skills: EmployeeSkill[] = [{ id: RECORD_ID, skill: { id: SKILL_ID, code: 'REACT', name: 'React', active: true }, level: 3 }];
    const certificates: EmployeeCertificate[] = [{ id: CERT_ID, name: 'AWS Associate', issuer: 'AWS',
      issuedAt: '2024-01-01', expiresAt: '2025-01-01', attachmentId: FILE_ID }];
    const { reads } = open(VIEWER, skills, certificates);
    expect(await screen.findByText('Mức 3/5')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'AWS Associate' })).toBeInTheDocument();
    expect(screen.getByText('Đã hết hạn')).toBeInTheDocument();
    expect(screen.getByText('Có tệp đính kèm; cần quyền xem tài liệu để tải xuống.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm kỹ năng' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm chứng chỉ' })).not.toBeInTheDocument();
    expect(reads).not.toContain('attachments');
  });

  it('edits and deletes a certificate without deleting its independent document', async () => {
    const record: EmployeeCertificate = { id: CERT_ID, name: 'Old certificate', issuer: null,
      issuedAt: '2024-01-01', expiresAt: null, attachmentId: null };
    const { writes } = open(HR, [], [record]);
    await screen.findByRole('heading', { name: 'Old certificate' });
    await userEvent.click(screen.getByRole('button', { name: 'Sửa Old certificate' }));
    const editor = screen.getByRole('dialog', { name: 'Sửa chứng chỉ' });
    await userEvent.clear(within(editor).getByRole('textbox', { name: 'Tên chứng chỉ' }));
    await userEvent.type(within(editor).getByRole('textbox', { name: 'Tên chứng chỉ' }), 'Updated certificate');
    await userEvent.click(within(editor).getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByRole('heading', { name: 'Updated certificate' })).toBeInTheDocument();
    expect(writes).toContain('certificate-edit:Updated certificate');
    await userEvent.click(screen.getByRole('button', { name: 'Xóa Updated certificate?' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Xóa Updated certificate?' })).getByRole('button', { name: 'Xóa' }));
    expect(await screen.findByRole('heading', { name: 'Chưa có chứng chỉ' })).toBeInTheDocument();
    expect(writes).toContain('delete-certificate');
    expect(writes).not.toContain('delete-attachment');
  });

  it('refreshes the certificate link after its document is deleted from the Documents tab', async () => {
    const record: EmployeeCertificate = { id: CERT_ID, name: 'AWS Associate', issuer: 'AWS',
      issuedAt: '2024-01-01', expiresAt: null, attachmentId: FILE_ID };
    const file: Attachment = { id: FILE_ID, fileName: 'certificate.pdf', contentType: 'application/pdf',
      contentLength: 120, sha256: '', uploadedAt: '2026-10-15T00:00:00Z' };
    const { writes } = open(HR, [], [record], [file]);
    expect(await screen.findByRole('button', { name: 'Tải certificate.pdf' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Tài liệu' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Xóa certificate.pdf?' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Xóa certificate.pdf?' })).getByRole('button', { name: 'Xóa' }));
    await waitFor(() => expect(writes).toContain('delete-attachment'));
    await userEvent.click(screen.getByRole('tab', { name: 'Kỹ năng' }));
    expect(await screen.findByRole('heading', { name: 'AWS Associate' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Có tệp đính kèm; cần quyền xem tài liệu để tải xuống.')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Tải certificate.pdf' })).not.toBeInTheDocument();
  });
});
