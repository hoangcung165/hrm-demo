// The projects of the approved #15 artboards ("HRM-15 Dự án"), fictional clients. Vũ Thị Lan manages DA-031 and
// DA-029; Cao Minh Trí's overlap makes one member of each overloaded.
import type { Allocation, AllocationList, EmployeeCard, LoadPeriod, Project, ProjectListItem, ProjectStatus } from '@/features/project/api';
import { unitId } from './org-unit-fixtures';

export const projectId = (code: string) => `00000000-0000-4000-a000-${code.replace(/\D/g, '').padStart(12, '0')}`;
export const LAN_EMPLOYEE_ID = '00000000-0000-4000-b000-000000000065';

const UNIT_CODES: Record<string, string> = { 'Phòng Phát triển phần mềm': 'PTPM', 'Phòng Phần mềm Đà Nẵng': 'PMDN', 'Phòng Dịch vụ khách hàng': 'DVKH' };

const pm = (fullName: string, orgUnitName: string, id = `00000000-0000-4000-b000-${String(fullName.length).padStart(12, '0')}`) => ({ id, code: 'NV00012', fullName, orgUnitName });
const LAN = pm('Vũ Thị Lan', 'Phòng Phát triển phần mềm', LAN_EMPLOYEE_ID);
const HIEN = pm('Lương Văn Hiển', 'Phòng Phần mềm Đà Nẵng');

function project(code: string, name: string, client: string | null, who: ProjectListItem['pm'], start: string, end: string, status: ProjectStatus, running: number, upcoming = 0, overloaded = 0): ProjectListItem {
  return {
    id: projectId(code),
    code,
    name,
    client,
    pm: who,
    orgUnit: { id: unitId(UNIT_CODES[who?.orgUnitName ?? ''] ?? 'PTPM'), name: who?.orgUnitName ?? '', active: true },
    startDate: start,
    endDate: end,
    status,
    canEdit: who?.id === LAN_EMPLOYEE_ID,
    members: { running, upcoming, overloaded },
  };
}

export const PROJECTS: ProjectListItem[] = [
  project('DA-031', 'Ứng dụng đặt lịch khám', 'Bệnh viện Đa khoa Tâm An', LAN, '2026-09-01', '2027-03-31', 'ACTIVE', 6, 1, 1),
  project('DA-029', 'Cổng khách hàng bảo hiểm', 'Bảo hiểm Hướng Dương', LAN, '2026-06-15', '2026-12-15', 'ACTIVE', 9, 0, 1),
  project('DA-027', 'Hệ thống bán hàng tại quầy', 'Bán lẻ Lúa Vàng', HIEN, '2026-05-01', '2026-11-30', 'ACTIVE', 6),
  project('DA-025', 'Triển khai ERP', 'Trường Đại học Bình Minh', pm('Ngô Thanh Sơn', 'Phòng Dịch vụ khách hàng'), '2026-03-01', '2026-10-31', 'ACTIVE', 5),
  project('DA-033', 'Nền tảng dữ liệu nội bộ', null, pm('Hoàng Gia Huy', 'Phòng Phát triển phần mềm'), '2026-11-01', '2027-04-30', 'PLANNED', 0, 3),
  project('DA-022', 'Website thương mại điện tử', 'Thời trang Sen Hồng', pm('Lê Văn Hùng', 'Phòng Phát triển phần mềm'), '2026-02-01', '2026-12-31', 'ON_HOLD', 4),
  project('DA-018', 'Ứng dụng hội viên', 'Bán lẻ Lúa Vàng', HIEN, '2025-08-01', '2026-06-30', 'CLOSED', 0),
  project('DA-015', 'Cổng tuyển dụng', null, pm('Trần Đức Hòa', 'Phòng Phần mềm Đà Nẵng'), '2025-03-01', '2025-12-31', 'CLOSED', 0),
];

/** A project as `GET /api/projects/{id}` returns it. */
export const projectDetail = (code: string, overrides: Partial<Project> = {}): Project => ({
  ...PROJECTS.find((p) => p.code === code)!,
  laborBudget: code === 'DA-031' ? 2_400_000_000 : null,
  createdAt: '2026-08-20T02:00:00Z',
  updatedAt: '2026-10-10T02:00:00Z',
  ...overrides,
});

const card = (fullName: string, orgUnitName: string, n: number): EmployeeCard => ({ id: `00000000-0000-4000-c000-${String(n).padStart(12, '0')}`, code: `NV${String(n).padStart(5, '0')}`, fullName, orgUnitName });
const ROLE = (name: string) => ({ id: `00000000-0000-4000-d000-${String(name.length).padStart(12, '0')}`, code: name.slice(0, 3).toUpperCase(), name, active: true });

function allocation(n: number, who: EmployeeCard, role: string, percent: number, start: string, end: string, status: Allocation['status'], peak: number, overloadedPeriods: LoadPeriod[] = []): Allocation {
  return { id: `00000000-0000-4000-e000-${String(n).padStart(12, '0')}`, projectId: projectId('DA-031'), employee: who, projectRole: ROLE(role), percent, startDate: start, endDate: end, status, peakLoad: peak, overloadedPeriods };
}

const TRI_OVERLOAD: LoadPeriod = {
  from: '2026-10-14',
  to: '2026-10-31',
  totalPercent: 120,
  overloaded: true,
  parts: [
    { projectId: projectId('DA-029'), projectCode: 'DA-029', projectName: 'Cổng khách hàng bảo hiểm', percent: 60, thisProject: false },
    { projectId: projectId('DA-031'), projectCode: 'DA-031', projectName: 'Ứng dụng đặt lịch khám', percent: 60, thisProject: true },
  ],
};

/** The members of DA-031 on the artboard: Cao Minh Trí overloaded, Mạc Thị Quỳnh starting later. */
export const DA031_CURRENT: AllocationList = {
  currentCount: 7,
  endedCount: 2,
  items: [
    allocation(1, card('Vũ Thị Lan', 'Phòng Phát triển phần mềm', 65), 'Quản lý dự án', 50, '2026-09-01', '2027-03-31', 'RUNNING', 100),
    allocation(2, card('Cao Minh Trí', 'Nhóm Web', 31), 'Lập trình viên', 60, '2026-10-14', '2026-12-31', 'UPCOMING', 120, [TRI_OVERLOAD]),
    allocation(3, card('Tô Thị Bích Ngọc', 'Nhóm Mobile', 33), 'Lập trình viên', 100, '2026-09-01', '2027-03-31', 'RUNNING', 100),
    allocation(4, card('Lưu Đức Mạnh', 'Nhóm Nền tảng và DevOps', 35), 'DevOps', 30, '2026-09-01', '2026-12-31', 'RUNNING', 90),
    allocation(5, card('Quách Văn Long', 'Nhóm Kiểm thử', 37), 'Kiểm thử viên', 50, '2026-10-01', '2027-03-31', 'RUNNING', 100),
    allocation(6, card('Dương Thị Hạnh', 'Nhóm Triển khai', 38), 'Thiết kế UI/UX', 40, '2026-09-01', '2026-11-30', 'RUNNING', 40),
    allocation(7, card('Mạc Thị Quỳnh', 'Nhóm Web', 22), 'Lập trình viên', 100, '2026-11-01', '2027-03-31', 'UPCOMING', 100),
  ],
};

export const DA031_ENDED: AllocationList = {
  currentCount: 7,
  endedCount: 2,
  items: [
    allocation(8, card('Hoàng Gia Huy', 'Nhóm Dữ liệu', 63), 'Phân tích nghiệp vụ', 50, '2026-09-01', '2026-09-30', 'ENDED', 50),
    allocation(9, card('Ngô Thanh Sơn', 'Nhóm Triển khai', 66), 'Phân tích nghiệp vụ', 20, '2026-09-01', '2026-09-15', 'ENDED', 70),
  ],
};
