import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { catalogApi } from '@/test/catalog-handlers';
import { employeeId } from '@/test/employee-fixtures';
import { employeeListApi } from '@/test/employee-handlers';
import { employeeProfileApi } from '@/test/employee-profile-handlers';
import { orgUnitsOk } from '@/test/org-unit-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const id = employeeId(7);
const base = '*/api/employees/:employeeId';
const HR: Account = { ...HR_ACCOUNT,
  permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'EMPLOYEE_EDIT', 'EMPLOYEE_SENSITIVE_VIEW'] };

type Document = { id: string; documentType: string; documentNumber: string; issuingCountry: string;
  issuedAt: string | null; expiresAt: string; masked: boolean };
let documents: Document[];
let uploads: number;
let writes: number;

function open(account: Account = HR) {
  server.use(
    http.get(base + '/expat-documents', () => HttpResponse.json(documents)),
    http.post(base + '/expat-documents', async ({ request }) => {
      writes++;
      const body = await request.json() as Omit<Document, 'id' | 'masked'>;
      const row = { ...body, id: 'passport-new', masked: false };
      documents.push(row); return HttpResponse.json(row, {status:201});
    }),
    http.delete(base + '/expat-documents/:id', ({ params }) => {
      writes++;
      documents = documents.filter(d => d.id !== params.id);
      return new HttpResponse(null, {status:204});
    }),
    http.get(base + '/attachments', () => HttpResponse.json([])),
    http.post(base + '/attachments', async ({ request }) => {
      uploads++;
      const form = await request.formData();
      const file = form.get('file');
      return file ? HttpResponse.json({id:'uploaded',fileName:'document.pdf',contentType:'application/pdf',
        contentLength:34,sha256:'x',uploadedAt:'2026-10-14T09:00:00Z'},{status:201})
        : new HttpResponse(null,{status:400});
    }),
    employeeProfileApi().handler, employeeListApi().handler, ...catalogApi().handlers, orgUnitsOk(),
  );
  return renderRoutes(routes,{session:account,path:`/employees/${id}?tab=documents`});
}

describe('HRM-08 FE-2C documents and attachments', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
    documents = [{id:'passport-old',documentType:'PASSPORT',documentNumber:'A123456789',
      issuingCountry:'VN',issuedAt:'2024-01-01',expiresAt:'2034-01-01',masked:false}];
    uploads = 0; writes = 0;
  });

  it('shows two separate sections and expat metadata, with a private download area', async () => {
    open();
    expect(await screen.findByRole('heading',{name:'Giấy tờ nhân viên nước ngoài'})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:'Tài liệu đính kèm'})).toBeInTheDocument();
    const passport = await screen.findByRole('region',{name:'Hộ chiếu (Passport)'});
    expect(within(passport).getByText('VN')).toBeInTheDocument();
    expect(within(passport).getByText('01/01/2034')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Tải tài liệu lên'})).toBeInTheDocument();
  });

  it('validates expiry before issue and creates document only after correction', async () => {
    open();
    await screen.findByRole('region',{name:'Hộ chiếu (Passport)'});
    await userEvent.click(screen.getByRole('button',{name:'Thêm giấy tờ'}));
    const dialog = screen.getByRole('dialog',{name:'Thêm giấy tờ'});
    await userEvent.type(within(dialog).getByRole('textbox',{name:'Số giấy tờ'}),'P123456789');
    fireEvent.change(within(dialog).getByLabelText('Ngày cấp'),{target:{value:'2026-01-01'}});
    fireEvent.change(within(dialog).getByLabelText('Ngày hết hạn'),{target:{value:'2025-01-01'}});
    await userEvent.click(within(dialog).getByRole('button',{name:'Lưu giấy tờ'}));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Kiểm tra số giấy tờ');
    expect(writes).toBe(0);
    fireEvent.change(within(dialog).getByLabelText('Ngày hết hạn'),{target:{value:'2030-01-01'}});
    await userEvent.click(within(dialog).getByRole('button',{name:'Lưu giấy tờ'}));
    await waitFor(()=>expect(writes).toBe(1));
  });

  it('guards uploads by 5MiB file policy and hides write controls from read-only HR', async () => {
    open();
    await screen.findByRole('button',{name:'Tải tài liệu lên'});
    const fileInput = screen.getByLabelText('Chọn tệp đính kèm');
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.pdf',{type:'application/pdf'});
    fireEvent.change(fileInput,{target:{files:[oversized]}});
    expect(await screen.findByRole('alert')).toHaveTextContent('Chỉ nhận PDF');
    expect(uploads).toBe(0);
  });

  it('does not expose document mutations to read-only users', async () => {
    open({...HR, permissions:['EMPLOYEE_VIEW']});
    await screen.findByRole('region',{name:'Hộ chiếu (Passport)'});
    expect(screen.queryByRole('button',{name:'Thêm giấy tờ'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Tải tài liệu lên'})).not.toBeInTheDocument();
  });
});
