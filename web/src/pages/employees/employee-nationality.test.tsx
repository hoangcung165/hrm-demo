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
const HR: Account = {...HR_ACCOUNT,permissions:[...HR_ACCOUNT.permissions,'EMPLOYEE_VIEW','EMPLOYEE_EDIT']};
let nationality: string | null;
let writes: Array<{nationality:string|null}>;

function prepare() {
  const list = employeeListApi();
  server.use(
    http.get('*/api/employees/:id/nationality',()=>HttpResponse.json({nationality})),
    http.put('*/api/employees/:id/nationality',async({request})=>{
      const body = await request.json() as {nationality:string|null};
      writes.push(body);
      nationality=body.nationality;
      return HttpResponse.json({nationality});
    }),
    employeeProfileApi().handler, list.handler, ...catalogApi().handlers,orgUnitsOk(),
  );
  return list;
}

beforeEach(async()=>{
  localStorage.clear();
  await i18n.changeLanguage('vi');
  nationality=null;
  writes=[];
});

describe('HRM-08 nationality filter and editor',()=>{
  it('writes a URL-backed nationality filter and clears it with other filters',async()=>{
    const list=prepare();
    const {router}=renderRoutes(routes,{session:HR,path:'/employees'});
    await screen.findByRole('table',{name:'Danh sách nhân viên'});
    const input=screen.getByRole('textbox',{name:'Quốc tịch'});
    fireEvent.change(input,{target:{value:'v'}});
    expect(list.requests.at(-1)).not.toContain('nationality=');
    fireEvent.change(input,{target:{value:'vn'}});
    await waitFor(()=>expect(list.requests.at(-1)).toContain('nationality=VN'));
    expect(new URLSearchParams(router.state.location.search).get('nationality')).toBe('VN');
    await userEvent.click(screen.getByRole('button',{name:'Xóa bộ lọc'}));
    await waitFor(()=>expect(list.requests.at(-1)).not.toContain('nationality='));
  });

  it('edits nationality in employee profile without changing identity fields',async()=>{
    prepare();
    renderRoutes(routes,{session:HR,path:`/employees/${id}`});
    const card=await screen.findByRole('region',{name:'Quốc tịch'});
    expect(within(card).getByText('Chưa có')).toBeInTheDocument();
    await userEvent.click(within(card).getByRole('button',{name:'Cập nhật quốc tịch'}));
    const dialog=screen.getByRole('dialog',{name:'Cập nhật quốc tịch'});
    fireEvent.change(within(dialog).getByRole('textbox',{name:'Quốc tịch'}),{target:{value:'au'}});
    await userEvent.click(within(dialog).getByRole('button',{name:'Lưu quốc tịch'}));
    await waitFor(()=>expect(writes).toEqual([{nationality:'AU'}]));
    expect(within(await screen.findByRole('region',{name:'Quốc tịch'})).getByText('AU')).toBeInTheDocument();
  });

  it('hides nationality edit for a read-only employee viewer',async()=>{
    prepare();
    renderRoutes(routes,{session:{...HR,permissions:['EMPLOYEE_VIEW']},path:`/employees/${id}`});
    await screen.findByRole('region',{name:'Quốc tịch'});
    expect(screen.queryByRole('button',{name:'Cập nhật quốc tịch'})).not.toBeInTheDocument();
  });
});
