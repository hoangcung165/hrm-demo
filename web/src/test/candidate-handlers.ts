// MSW handlers for Tìm người ("## Candidates (BE-1)" on issue #18): the active Kỹ năng catalog and the candidates of
// a project, answered from the people of the #16 artboard in the order the backend gives (match, then % còn trống,
// then name; or % còn trống first). A search with a skill nobody has answers with nobody.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { CandidateSkill, ProjectCandidate, ProjectCandidates } from '@/features/project/candidates-api';
import { problem } from './auth-handlers';

export const REACT = { id: '00000000-0000-4000-f000-000000000001', name: 'React' };
export const TYPESCRIPT = { id: '00000000-0000-4000-f000-000000000002', name: 'TypeScript' };
export const JAVA = { id: '00000000-0000-4000-f000-000000000003', name: 'Java' };
export const SKILLS = [JAVA, REACT, TYPESCRIPT];

/** `GET /api/catalogs/skills/items`: only the fields Tìm người reads. */
export const skillCatalogOk = (): HttpHandler =>
  http.get('*/api/catalogs/skills/items', () => HttpResponse.json({ items: SKILLS.map((each) => ({ ...each, code: each.name.toUpperCase(), active: true, inUse: true })), total: SKILLS.length }));

const skill = (who: typeof REACT, level: number | null, minLevel: number): CandidateSkill => ({ skillId: who.id, name: who.name, level, minLevel, met: level !== null && level >= minLevel });
const MONTHS = ['2026-11', '2026-12', '2027-01', '2027-02', '2027-03'];
const months = (...peaks: number[]) => peaks.map((peakPercent, index) => ({ month: MONTHS[index]!, peakPercent }));

function person(n: number, fullName: string, positionName: string, orgUnitName: string, react: number | null, typescript: number | null, peakLoad: number, peaks: number[], approvedLeave: ProjectCandidate['approvedLeave'] = []): ProjectCandidate {
  const skills = [skill(REACT, react, 3), skill(TYPESCRIPT, typescript, 3)];
  return {
    employee: { id: `00000000-0000-4000-c000-${String(n).padStart(12, '0')}`, code: `NV${String(n).padStart(5, '0')}`, fullName, orgUnitName, positionName },
    matched: skills.filter((each) => each.met).length,
    required: 2,
    skills,
    peakLoad,
    freePercent: Math.max(0, 100 - peakLoad),
    overloaded: peakLoad > 100,
    months: months(...peaks),
    approvedLeave,
  };
}

export const KHANH_DUY = person(72, 'Phan Khánh Duy', 'Nhân viên', 'Nhóm Web Đà Nẵng', 4, 3, 30, [30, 0, 0, 0, 0]);
export const VAN_KHAI = person(81, 'La Văn Khải', 'Nhân viên', 'Nhóm Web Đà Nẵng', 3, 4, 50, [50, 50, 50, 50, 50]);
export const VAN_AN = person(82, 'Nguyễn Văn An', 'Nhân viên', 'Nhóm Web', 3, 3, 80, [80, 80, 20, 20, 20], [{ from: '2026-12-24', to: '2026-12-26' }]);
export const MINH_TUAN = person(83, 'Đoàn Minh Tuấn', 'Trưởng nhóm', 'Nhóm Web Đà Nẵng', 5, 4, 110, [110, 60, 60, 60, 60]);
export const VAN_THANH = person(84, 'Kiều Văn Thành', 'Nhân viên', 'Nhóm Mobile', 4, 2, 0, [0, 0, 0, 0, 0]);
export const DIEM_MY = person(85, 'Ông Thị Diễm My', 'Nhân viên', 'Nhóm Mobile Đà Nẵng', null, 3, 40, []);

export const PEOPLE = [KHANH_DUY, VAN_KHAI, VAN_AN, MINH_TUAN, VAN_THANH, DIEM_MY];

const byName = (a: ProjectCandidate, b: ProjectCandidate) => a.employee.fullName.localeCompare(b.employee.fullName, 'vi');

export type CandidatesApi = { handler: HttpHandler; requests: URLSearchParams[] };

/** `people`: who the project's search finds; `fail`: answer every search with a server error; `refuse`: with this field error. */
export function candidatesApi({ people = PEOPLE, excludedMembers = 7, fail = false, refuse }: { people?: ProjectCandidate[]; excludedMembers?: number; fail?: boolean; refuse?: { field: string; code: string } } = {}): CandidatesApi {
  const requests: URLSearchParams[] = [];
  const handler = http.get('*/api/projects/:id/candidates', ({ request }) => {
    const search = new URL(request.url).searchParams;
    requests.push(search);
    if (fail) return problem(500, 'error.unknown');
    if (refuse) return problem(400, 'validation.invalid', { errors: [refuse] });
    const free = search.get('sort') === 'free';
    const items = [...people].sort((a, b) =>
      free ? b.freePercent - a.freePercent || b.matched - a.matched || byName(a, b) : b.matched - a.matched || b.freePercent - a.freePercent || byName(a, b),
    );
    const body: ProjectCandidates = { total: items.length, excludedMembers, page: 0, size: 100, items };
    return HttpResponse.json(body);
  });
  return { handler, requests };
}
