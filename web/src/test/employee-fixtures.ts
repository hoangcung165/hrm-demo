// Fictional Employees of the example company, as GET /api/employees returns them: on the units of
// `org-unit-fixtures` and the positions of `catalog-handlers`. 26 people, 2 of whom have left, so the default list
// ("Thử việc và chính thức") has 24 rows: one page of 20 and one of 4.
import type { EmployeeListItem, EmployeeStatus } from '@/features/employee/api';
import { CATALOG_ITEMS } from './catalog-handlers';
import { orgStructure, unitId } from './org-unit-fixtures';

type Spec = [code: number, fullName: string, unit: string | null, position: string, manager: number | null, hireDate: string, status?: EmployeeStatus];

const SPECS: Spec[] = [
  [1, 'Phạm Quốc Bảo', null, 'GD', null, '2018-01-02'],
  [2, 'Nguyễn Văn Khoa', 'PTPM', 'TP', 1, '2018-03-15'],
  [3, 'Trần Thị Mai', 'HCNS', 'TP', 1, '2018-04-02'],
  [4, 'Hoàng Thị Thu', 'TCKT', 'TP', 1, '2018-04-02'],
  [5, 'Trần Quang Vinh', 'DVKH', 'TP', 1, '2018-05-07'],
  [6, 'Đặng Hoàng Nam', 'KD', 'TP', 1, '2018-06-11'],
  [7, 'Lê Văn Hùng', 'WEB', 'NV', 2, '2018-08-01'],
  [8, 'Đỗ Thị Thu Hằng', 'MOBILE', 'NV', 2, '2018-09-03'],
  [9, 'Hồ Sỹ Quang', 'CNDN', 'TP', 1, '2018-10-01'],
  [10, 'Vũ Đức Thắng', 'DEVOPS', 'NV', 2, '2019-01-14'],
  [11, 'Hoàng Gia Huy', 'DATA', 'NV', 2, '2019-03-04'],
  [12, 'Lâm Gia Bảo', 'GAME', 'NV', 2, '2019-03-02', 'INACTIVE'],
  [13, 'Bùi Thị Ngọc Lan', 'QA', 'NV', 2, '2019-05-20'],
  [14, 'Vũ Thị Lan', 'PTPM', 'NV', 2, '2019-07-01'],
  [15, 'Ngô Thanh Sơn', 'TK', 'NV', 5, '2019-07-15'],
  [16, 'Trần Đức Hòa', 'PMDN', 'NV', 20, '2019-07-20'],
  [17, 'Phan Thị Mỹ Linh', 'HTKH', 'NV', 5, '2019-08-05'],
  [18, 'Trịnh Văn Phúc', 'KDGP', 'NV', 6, '2019-09-09'],
  [19, 'Võ Mạnh Cường', 'KDGP', 'NV', 18, '2019-09-14'],
  [20, 'Lương Văn Hiển', 'PMDN', 'TP', 9, '2019-10-01'],
  [21, 'Lý Thảo Vy', 'MKT', 'NV', 6, '2019-11-18'],
  [22, 'Nguyễn Văn An', 'WEB', 'NV', 7, '2025-03-03'],
  [23, 'Mạc Thị Quỳnh', 'WEB', 'TTS', 7, '2026-08-18', 'PROBATION'],
  [24, 'Tống Thị Ngọc', 'HTKH', 'NV', 17, '2023-12-11', 'INACTIVE'],
  [25, 'Phan Khánh Duy', 'WEBDN', 'TTS', 20, '2026-09-01', 'PROBATION'],
  [26, 'Phạm Thị Lan Anh', 'QA', 'NV', 13, '2026-09-21', 'PROBATION'],
];

/** Id of a fixture Employee by the number of its code, e.g. `employeeId(7)` for NV00007. */
export const employeeId = (code: number) => `00000000-0000-4000-b000-${String(code).padStart(12, '0')}`;
export const employeeCode = (code: number) => `NV${String(code).padStart(5, '0')}`;
/** Id of a fixture position by its catalog code, e.g. `positionId('TP')`. */
export const positionId = (code: string) => CATALOG_ITEMS.positions.find((item) => item.code === code)!.id;

function build(): EmployeeListItem[] {
  const { units } = orgStructure();
  const names = new Map(SPECS.map(([code, fullName]) => [code, fullName]));
  return SPECS.map(([code, fullName, unitCode, positionCode, manager, hireDate, status = 'OFFICIAL']) => {
    const unit = unitCode ? units.find((each) => each.id === unitId(unitCode))! : null;
    const parent = unit?.parentId ? units.find((each) => each.id === unit.parentId) : undefined;
    const position = CATALOG_ITEMS.positions.find((item) => item.code === positionCode)!;
    return {
      id: employeeId(code),
      code: employeeCode(code),
      fullName,
      status,
      orgUnit: unit ? { id: unit.id, code: unit.code, name: unit.name, active: unit.active, parentName: parent?.name ?? null } : null,
      position: { id: position.id, code: position.code ?? '', name: position.name, active: position.active },
      manager: manager === null ? null : { id: employeeId(manager), code: employeeCode(manager), fullName: names.get(manager)! },
      hireDate,
      phone: null,
      personalEmail: null,
    };
  });
}

export const EMPLOYEES: EmployeeListItem[] = build();
