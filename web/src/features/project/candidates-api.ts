// Tìm người (HRM-16): the people who could join a project, by skill and % còn trống.
// Contract: "## Candidates (BE-1, #378)" in the "## API contract" comment on issue #18.
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CATALOGS_KEY, type CatalogPage } from '@/features/catalog/api';
import { PROJECTS_KEY } from './api';

/** One required skill: the Danh mục item and the lowest level (1 to 5) that counts. */
export type SkillRequirement = { skillId: string; minLevel: number };

export type CandidateSort = 'match' | 'free';

/** The criteria of a search, complete and valid: `need` null when the user left "Cần phân bổ" empty. */
export type CandidateQuery = { skills: SkillRequirement[]; from: string; to: string; need: number | null; sort: CandidateSort };

/** Most skills a search takes (the backend refuses more with `too_many`). */
export const MAX_REQUIRED_SKILLS = 5;
export const SKILL_LEVELS = [1, 2, 3, 4, 5] as const;

/** Mirrors the backend record `CandidatePerson`. */
export type CandidatePerson = { id: string; code: string; fullName: string; orgUnitName: string | null; positionName: string | null };

/** Mirrors the backend record `CandidateSkill`: a required skill against what the person has (`level` null: not at all). */
export type CandidateSkill = { skillId: string; name: string; level: number | null; minLevel: number; met: boolean };

/** Mirrors the backend record `CandidateMonth`: the highest Tải phân bổ of a month (`yyyy-MM`) within the range. */
export type CandidateMonth = { month: string; peakPercent: number };

/** Mirrors the backend record `CandidateLeave`: approved leave inside the range, ISO dates. */
export type CandidateLeave = { from: string; to: string };

/** Mirrors the backend record `ProjectCandidate`. `freePercent` is 100 minus `peakLoad`, never below 0. */
export type ProjectCandidate = {
  employee: CandidatePerson;
  matched: number;
  required: number;
  skills: CandidateSkill[];
  peakLoad: number;
  freePercent: number;
  overloaded: boolean;
  months: CandidateMonth[];
  approvedLeave: CandidateLeave[];
};

/** Mirrors the backend record `ProjectCandidatesResponse`. `excludedMembers`: project members left out in the range. */
export type ProjectCandidates = { total: number; excludedMembers: number; page: number; size: number; items: ProjectCandidate[] };

/** Rows asked for at once: the backend's largest page. */
export const CANDIDATE_PAGE_SIZE = 100;

export function candidatesPath(projectId: string, query: CandidateQuery): string {
  const search = new URLSearchParams({
    skills: query.skills.map((each) => `${each.skillId}:${each.minLevel}`).join(','),
    from: query.from,
    to: query.to,
    sort: query.sort,
    page: '0',
    size: String(CANDIDATE_PAGE_SIZE),
  });
  if (query.need !== null) search.set('need', String(query.need));
  return `/api/projects/${projectId}/candidates?${search.toString()}`;
}

/** The search for the criteria as typed. `null`: not complete or not valid yet, no call. */
export function useProjectCandidates(projectId: string, query: CandidateQuery | null) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, 'candidates', projectId, query],
    queryFn: () => api<ProjectCandidates>(candidatesPath(projectId, query!)),
    enabled: query !== null,
    retry: false,
  });
}

/** The skills a search can ask for: the active items of the Kỹ năng catalog, by name. */
export function useSkillOptions() {
  return useQuery({
    queryKey: [...CATALOGS_KEY, 'skills', 'active'],
    queryFn: async () => (await api<CatalogPage>('/api/catalogs/skills/items?page=0&size=200&status=ACTIVE')).items.map((item) => ({ id: item.id, name: item.name })),
  });
}
