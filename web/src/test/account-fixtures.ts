// Accounts as GET /api/accounts returns them: the 23 of the artboard `#04 Tài khoản và vai trò (danh sách)`,
// sorted by full name without accents, as the backend sorts.
import type { AccountRow } from '@/features/account/api';
import type { DataScope, Role } from '@/features/auth/account';
import { ADMIN_ACCOUNT } from './render';

type Spec = [fullName: string, email: string, roles: Role[], extra?: Partial<AccountRow>];

const SPECS: Spec[] = [
  ['Bùi Thanh Tùng', 'tung.bui@congty.vn', ['EMPLOYEE'], { createdAt: '2026-10-02T03:00:00Z' }],
  ['Đặng Thùy Linh', 'linh.dang@congty.vn', ['EMPLOYEE']],
  ['Đinh Công Sơn', 'son.dinh@congty.vn', ['LINE_MANAGER', 'EMPLOYEE']],
  ['Đỗ Minh Quân', 'demo.admin@hrm.local', ['ADMIN'], { demoPersona: 'ADMIN' }],
  ['Đỗ Thành Trung', 'trung.do@congty.vn', ['LINE_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE']],
  ['Hoàng Thị Thu', 'demo.accountant@hrm.local', ['ACCOUNTANT', 'EMPLOYEE'], { demoPersona: 'ACCOUNTANT' }],
  ['Hoàng Văn Nam', 'nam.hoang@congty.vn', ['EMPLOYEE'], { status: 'LOCKED', createdAt: '2026-10-01T03:00:00Z' }],
  ['Huỳnh Tấn Phát', 'phat.huynh@congty.vn', ['DIRECTOR', 'EMPLOYEE']],
  ['Lê Văn Hùng', 'demo.line-manager@hrm.local', ['LINE_MANAGER', 'EMPLOYEE'], { demoPersona: 'LINE_MANAGER' }],
  ['Lương Thu Hà', 'ha.luong@congty.vn', ['ACCOUNTANT', 'EMPLOYEE']],
  ['Lý Gia Huy', 'huy.ly@congty.vn', ['EMPLOYEE']],
  ['Ngô Thị Lan', 'lan.ngo@congty.vn', ['EMPLOYEE'], { status: 'LOCKED' }],
  ['Nguyễn Thị Hương', 'huong.nguyen@congty.vn', ['HR', 'LINE_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE'], { createdAt: '2026-10-01T03:00:00Z' }],
  ['Nguyễn Văn An', 'demo.employee@hrm.local', ['EMPLOYEE'], { demoPersona: 'EMPLOYEE' }],
  ['Phạm Quốc Bảo', 'demo.director@hrm.local', ['DIRECTOR', 'EMPLOYEE'], { demoPersona: 'DIRECTOR' }],
  ['Phan Văn Tài', 'tai.phan@congty.vn', ['PROJECT_MANAGER', 'EMPLOYEE']],
  [ADMIN_ACCOUNT.fullName, ADMIN_ACCOUNT.email, ['ADMIN'], { id: ADMIN_ACCOUNT.id }],
  ['Tạ Quang Vinh', 'vinh.ta@congty.vn', ['EMPLOYEE']],
  ['Trần Thị Mai', 'demo.hr@hrm.local', ['HR', 'EMPLOYEE'], { demoPersona: 'HR' }],
  ['Trịnh Ngọc Ánh', 'anh.trinh@congty.vn', ['LINE_MANAGER', 'EMPLOYEE']],
  ['Trương Quốc Thịnh', 'thinh.truong@congty.vn', ['EMPLOYEE']],
  ['Võ Thanh Tâm', 'tam.vo@congty.vn', ['HR', 'EMPLOYEE']],
  ['Vũ Thị Lan', 'demo.project-manager@hrm.local', ['PROJECT_MANAGER', 'EMPLOYEE'], { demoPersona: 'PROJECT_MANAGER' }],
];

const COMPANY_WIDE: Role[] = ['ADMIN', 'HR', 'ACCOUNTANT', 'DIRECTOR'];
const scopeOf = (roles: Role[]): DataScope => (roles.some((role) => COMPANY_WIDE.includes(role)) ? 'COMPANY' : roles.includes('LINE_MANAGER') ? 'ORG_UNIT' : 'SELF');

/** Id of a fixture Account by its position in the list, from 1. */
export const accountId = (position: number) => `00000000-0000-4000-a000-${String(position).padStart(12, '0')}`;

export const ACCOUNTS: AccountRow[] = SPECS.map(([fullName, email, roles, extra], index) => ({
  id: accountId(index + 1),
  email,
  fullName,
  roles,
  dataScope: scopeOf(roles),
  status: 'ACTIVE',
  employee: null,
  demoPersona: null,
  createdAt: '2026-10-04T05:00:00Z',
  ...extra,
}));
