// The projects of the approved #15 artboards ("HRM-15 Dự án"), fictional clients. Vũ Thị Lan manages DA-031 and
// DA-029; Cao Minh Trí's overlap makes one member of each overloaded.
import type { ProjectListItem, ProjectStatus } from '@/features/project/api';
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
