// The criteria of Tìm người as the drawer holds them (text the user typed), and what makes them a search: at least one
// chosen skill, a range of days inside the project, a Cần phân bổ from 1 to 100 or none. Pure; messages are i18n keys.
import { companyTodayIso } from '@/lib/company-time';
import { ApiError } from '@/lib/api';
import type { Project } from './api';
import { MAX_REQUIRED_SKILLS, type CandidateQuery, type CandidateSort } from './candidates-api';

/** A row of "Kỹ năng cần có": `skillId` '' until a skill is chosen. */
export type SkillRow = { key: number; skillId: string; minLevel: number };

export type CriteriaDraft = { rows: SkillRow[]; from: string; to: string; need: string; sort: CandidateSort };

/** Field messages as i18n keys under `projects.findPeople.validation`, with the values their text needs. */
export type CriteriaError = { key: string; values?: Record<string, string> };
export type CriteriaErrors = Partial<Record<'from' | 'to' | 'need', CriteriaError>>;

export const emptyRow = (key: number): SkillRow => ({ key, skillId: '', minLevel: 1 });

/** First open: no skill yet, the range from today (or the project's first day) to the project's last day. */
export function initialCriteria(project: Pick<Project, 'startDate' | 'endDate'>, today: string = companyTodayIso()): CriteriaDraft {
  const later = today > project.startDate ? today : project.startDate;
  return { rows: [emptyRow(0)], from: later > project.endDate ? project.endDate : later, to: project.endDate, need: '', sort: 'match' };
}

/** The skills chosen so far, in the order of the rows. */
export const chosenSkills = (rows: SkillRow[]) => rows.filter((row) => row.skillId !== '');

export function canAddRow(rows: SkillRow[]): boolean {
  return rows.length < MAX_REQUIRED_SKILLS && rows.every((row) => row.skillId !== '');
}

/** What is wrong with the range and the percent, per field. Empty when they are fine. */
export function criteriaErrors(draft: CriteriaDraft, project: Pick<Project, 'startDate' | 'endDate'>): CriteriaErrors {
  const errors: CriteriaErrors = {};
  if (!draft.from) errors.from = { key: 'fromRequired' };
  else if (draft.from < project.startDate) errors.from = { key: 'fromBeforeProject', values: { date: project.startDate } };
  else if (draft.from > project.endDate) errors.from = { key: 'fromAfterProject', values: { date: project.endDate } };
  if (!draft.to) errors.to = { key: 'toRequired' };
  else if (draft.to > project.endDate) errors.to = { key: 'toAfterProject', values: { date: project.endDate } };
  else if (draft.to < project.startDate) errors.to = { key: 'toBeforeProject', values: { date: project.startDate } };
  else if (draft.from && !errors.from && draft.to < draft.from) errors.to = { key: 'toBeforeFrom' };
  if (draft.need.trim() !== '') {
    const need = Number(draft.need);
    if (!/^\d+$/.test(draft.need.trim()) || need < 1 || need > 100) errors.need = { key: 'need' };
  }
  return errors;
}

/** The search the criteria stand for, or null while a skill is missing or a field has an error. */
export function toQuery(draft: CriteriaDraft, project: Pick<Project, 'startDate' | 'endDate'>): CandidateQuery | null {
  const skills = chosenSkills(draft.rows);
  if (skills.length === 0 || Object.keys(criteriaErrors(draft, project)).length > 0) return null;
  return {
    skills: skills.map((row) => ({ skillId: row.skillId, minLevel: row.minLevel })),
    from: draft.from,
    to: draft.to,
    need: draft.need.trim() === '' ? null : Number(draft.need),
    sort: draft.sort,
  };
}

const SERVER_KEYS: Record<string, Record<string, CriteriaError>> = {
  from: { outside_project: { key: 'outsideProject' } },
  to: { outside_project: { key: 'outsideProject' }, before_start: { key: 'toBeforeFrom' } },
  need: { out_of_range: { key: 'need' } },
};

/** The field errors of a refused search (400 `validation.invalid`) that the form has a field for; empty for any other failure. */
export function serverCriteriaErrors(error: unknown): CriteriaErrors {
  const errors: CriteriaErrors = {};
  if (!(error instanceof ApiError) || error.status !== 400) return errors;
  for (const { field, code } of error.fieldErrors) {
    const known = SERVER_KEYS[field]?.[code];
    if (known) errors[field as 'from' | 'to' | 'need'] = known;
  }
  return errors;
}
