// The example company of the backend seeder as GET /api/org-units returns it.
// `orgStructure()` is what the API sends until HRM-06 (no heads, no headcounts); `orgStructure({ filled: true })`
// adds heads and headcounts as on the artboard.
import type { OrgStructure, OrgUnit, OrgUnitHead, OrgUnitType } from '@/features/org-unit/api';

type Spec = { code: string; name: string; type: OrgUnitType; parent?: string; head?: string; direct?: number; active?: boolean };

const D = 'DEPARTMENT';
const T = 'TEAM';
const SPECS: Spec[] = [
  { code: 'PTPM', name: 'Phòng Phát triển phần mềm', type: D, head: 'Đỗ Thành Trung', direct: 2 },
  { code: 'WEB', name: 'Nhóm Web', type: T, parent: 'PTPM', head: 'Lý Gia Huy', direct: 24 },
  { code: 'MOBILE', name: 'Nhóm Mobile', type: T, parent: 'PTPM', head: 'Đặng Thùy Linh', direct: 16 },
  { code: 'DEVOPS', name: 'Nhóm Nền tảng và DevOps', type: T, parent: 'PTPM', head: 'Vũ Minh Đức', direct: 10 },
  { code: 'DATA', name: 'Nhóm Dữ liệu', type: T, parent: 'PTPM', head: 'Tạ Quang Vinh', direct: 8 },
  { code: 'QA', name: 'Nhóm Kiểm thử', type: T, parent: 'PTPM', head: 'Trịnh Ngọc Ánh', direct: 18 },
  { code: 'GAME', name: 'Nhóm Game', type: T, parent: 'PTPM', active: false },
  { code: 'DVKH', name: 'Phòng Dịch vụ khách hàng', type: D, head: 'Đoàn Khánh Vy', direct: 2 },
  { code: 'TK', name: 'Nhóm Triển khai', type: T, parent: 'DVKH', head: 'Bùi Anh Tuấn', direct: 14 },
  { code: 'HTKH', name: 'Nhóm Hỗ trợ khách hàng', type: T, parent: 'DVKH', head: 'Ngô Thị Lan', direct: 9 },
  { code: 'KD', name: 'Phòng Kinh doanh', type: D, head: 'Đinh Công Sơn', direct: 2 },
  { code: 'KDGP', name: 'Nhóm Kinh doanh giải pháp', type: T, parent: 'KD', head: 'Hoàng Minh Quân', direct: 11 },
  { code: 'MKT', name: 'Nhóm Marketing', type: T, parent: 'KD', direct: 7 },
  { code: 'HCNS', name: 'Phòng Hành chính - Nhân sự', type: D, head: 'Trần Thị Mai', direct: 9 },
  { code: 'TCKT', name: 'Phòng Tài chính - Kế toán', type: D, head: 'Lương Thu Hà', direct: 8 },
  { code: 'CNDN', name: 'Chi nhánh Đà Nẵng', type: 'BRANCH', head: 'Huỳnh Tấn Phát', direct: 3 },
  { code: 'PMDN', name: 'Phòng Phần mềm Đà Nẵng', type: D, parent: 'CNDN', head: 'Trương Quốc Thịnh', direct: 1 },
  { code: 'WEBDN', name: 'Nhóm Web Đà Nẵng', type: T, parent: 'PMDN', head: 'Phan Văn Tài', direct: 16 },
  { code: 'MOBDN', name: 'Nhóm Mobile Đà Nẵng', type: T, parent: 'PMDN', head: 'Hồ Kim Ngân', direct: 13 },
  { code: 'KTDN', name: 'Phòng Kiểm thử Đà Nẵng', type: D, parent: 'CNDN', head: 'Võ Thanh Tâm', direct: 11 },
];

const POSITION: Record<OrgUnitType, string> = { BRANCH: 'Giám đốc chi nhánh', DEPARTMENT: 'Trưởng phòng', TEAM: 'Trưởng nhóm' };
const HEAD_DETAILS: Record<string, [code: string, position: string]> = { PTPM: ['NV-00012', 'Giám đốc kỹ thuật'], QA: ['NV-00176', 'Trưởng nhóm'] };

/** Id of a fixture unit by its code, e.g. `unitId('QA')`. */
export const unitId = (code: string) => `00000000-0000-4000-8000-${String(SPECS.findIndex((spec) => spec.code === code) + 1).padStart(12, '0')}`;

const REPRESENTATIVE: OrgUnitHead = { employeeId: null, fullName: 'Phạm Quốc Bảo', employeeCode: null, position: 'Giám đốc', avatarUrl: null };
const COMPANY_NAME = 'Công ty Cổ phần Công nghệ Mẫu';

export function orgStructure({ filled = false }: { filled?: boolean } = {}): OrgStructure {
  const childrenOf = (code?: string) => SPECS.filter((spec) => spec.parent === code);
  const total = (spec: Spec): number => (spec.direct ?? 0) + childrenOf(spec.code).reduce((sum, child) => sum + total(child), 0);
  const units: OrgUnit[] = SPECS.map((spec, index) => {
    const [employeeCode, position] = HEAD_DETAILS[spec.code] ?? [`NV-${String(200 + index).padStart(5, '0')}`, POSITION[spec.type]];
    return {
      id: unitId(spec.code),
      code: spec.code,
      name: spec.name,
      type: spec.type,
      parentId: spec.parent ? unitId(spec.parent) : null,
      active: spec.active ?? true,
      head: filled && spec.head ? { employeeId: unitId(spec.code).replace('4000', '4001'), fullName: spec.head, employeeCode, position, avatarUrl: null } : null,
      headcountDirect: filled ? (spec.direct ?? 0) : 0,
      headcountTotal: filled ? total(spec) : 0,
      childCount: childrenOf(spec.code).length,
      sortOrder: childrenOf(spec.parent).indexOf(spec) + 1,
    };
  });
  const employeeCount = filled ? 2 + childrenOf().reduce((sum, spec) => sum + total(spec), 0) : 0;
  return {
    root: { name: COMPANY_NAME, type: 'COMPANY', head: REPRESENTATIVE, headcountDirect: filled ? 2 : 0, headcountTotal: employeeCount, childCount: childrenOf().length },
    units,
    summary: { activeUnitCount: units.filter((unit) => unit.active).length, employeeCount },
  };
}

/** A company that has no units yet. */
export const EMPTY_ORG: OrgStructure = {
  root: { name: COMPANY_NAME, type: 'COMPANY', head: REPRESENTATIVE, headcountDirect: 0, headcountTotal: 0, childCount: 0 },
  units: [],
  summary: { activeUnitCount: 0, employeeCount: 0 },
};
