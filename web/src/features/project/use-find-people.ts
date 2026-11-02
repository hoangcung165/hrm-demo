// The state of the Tìm người drawer: the criteria as typed, the search they stand for (a moment after typing stops),
// the field errors (the client's own, or the ones the API refused with) and the result.
import { useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import type { Project } from './api';
import { canAddRow, criteriaErrors, emptyRow, initialCriteria, serverCriteriaErrors, toQuery, type CriteriaDraft, type CriteriaErrors, type SkillRow } from './candidate-criteria';
import { useProjectCandidates, useSkillOptions, type CandidateSort } from './candidates-api';

export const SEARCH_DELAY_MS = 300;

export function useFindPeople(project: Project) {
  const [draft, setDraft] = useState<CriteriaDraft>(() => initialCriteria(project));
  const nextKey = useRef(1);
  const skills = useSkillOptions();

  const localErrors = criteriaErrors(draft, project);
  const settled = useDebouncedValue(draft, SEARCH_DELAY_MS);
  const query = Object.keys(localErrors).length > 0 ? null : toQuery(settled, project);
  const search = useProjectCandidates(project.id, query);
  const refused = serverCriteriaErrors(search.error);
  const errors: CriteriaErrors = { ...refused, ...localErrors };

  const patch = (change: Partial<CriteriaDraft>) => setDraft((current) => ({ ...current, ...change }));
  const changeRow = (key: number, change: Partial<SkillRow>) => setDraft((current) => ({ ...current, rows: current.rows.map((row) => (row.key === key ? { ...row, ...change } : row)) }));

  return {
    draft,
    skills,
    errors,
    /** The search that is running or done; null while the criteria are not a search. */
    query,
    search,
    /** The API refused the search for a field the form has: the fields say why, no error state. */
    refusedFields: Object.keys(refused).length > 0 && search.error instanceof ApiError,
    setFrom: (from: string) => patch({ from }),
    setTo: (to: string) => patch({ to }),
    setNeed: (need: string) => patch({ need }),
    setSort: (sort: CandidateSort) => patch({ sort }),
    changeRow,
    canAdd: canAddRow(draft.rows),
    addRow: () => {
      setDraft((current) => (canAddRow(current.rows) ? { ...current, rows: [...current.rows, emptyRow(nextKey.current++)] } : current));
    },
    removeRow: (key: number) =>
      setDraft((current) => {
        const rows = current.rows.filter((row) => row.key !== key);
        return { ...current, rows: rows.length > 0 ? rows : [emptyRow(nextKey.current++)] };
      }),
  };
}
