// MSW handlers for "Nhóm của tôi" (HRM-20/FE-5). Contract: "## API contract: HRM-20/BE-3" on issue #22.
import { http, HttpResponse } from 'msw';
import type { DashboardTeam, TeamMember } from '@/features/dashboard/team-api';
import { problem } from './auth-handlers';

const card = (n: number, fullName: string) => ({ id: `e-4${n}`, code: `NV004${n}`, fullName, orgUnitName: 'Nhóm Web' });
const leaveType = { id: 'lt-pn', code: 'PN', name: 'Phép năm', active: true };

export const TEAM_THRESHOLDS = { benchPercent: 50, nearFullPercent: 90, endingWeeks: 4 };

/** Four people of Nhóm Web: one over 100%, one on Bench, one with two leaves, one with a single leave day. */
export const TEAM_MEMBERS: TeamMember[] = [
  { employee: card(1, 'Cao Minh Trí'), load: 120, upcomingLeave: [] },
  { employee: card(2, 'Mạc Thị Quỳnh'), load: 40, upcomingLeave: [{ leaveType, startDate: '2026-11-05', endDate: '2026-11-06' }, { leaveType, startDate: '2026-11-16', endDate: '2026-11-16' }] },
  { employee: card(3, 'Nguyễn Văn An'), load: 80, upcomingLeave: [{ leaveType, startDate: '2026-11-10', endDate: '2026-11-10' }] },
  { employee: card(4, 'Trương Thị Ngọc Hân'), load: 95, upcomingLeave: [] },
];

export const teamOf = (members: TeamMember[] = TEAM_MEMBERS): DashboardTeam => ({ weekFrom: '2026-11-02', weekTo: '2026-11-08', thresholds: TEAM_THRESHOLDS, members });

/** `calls` counts how many times the team was asked for. */
export function teamApi(members: TeamMember[] = TEAM_MEMBERS) {
  let calls = 0;
  return { calls: () => calls, handler: http.get('*/api/dashboard/team', () => { calls += 1; return HttpResponse.json(teamOf(members)); }) };
}

/** What every test gets unless it says otherwise: a team with nobody in it. */
export const teamEmpty = () => http.get('*/api/dashboard/team', () => HttpResponse.json(teamOf([])));
/** An Account that heads no unit. */
export const teamForbidden = () => http.get('*/api/dashboard/team', () => problem(403, 'auth.forbidden'));
export const teamFail = () => http.get('*/api/dashboard/team', () => problem(500, 'error.unknown'));
