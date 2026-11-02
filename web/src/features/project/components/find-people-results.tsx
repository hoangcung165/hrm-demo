// The result of the Tìm người drawer in each of its states: no skill chosen yet, a field with an error, loading,
// load error with retry, nobody meets the criteria, and the people, grouped by skills met when ordered by match.
import { Search, UserSearch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { MatchGroup, MatchList } from '@/components/ui/match-row';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { StateBlock } from '@/components/ui/state-block';
import type { CandidateQuery, ProjectCandidate, ProjectCandidates } from '../candidates-api';
import type { useFindPeople } from '../use-find-people';
import { FindPeopleMatch } from './find-people-match';

export type FindPeopleResultsProps = { state: ReturnType<typeof useFindPeople>; onAllocate?: (candidate: ProjectCandidate) => void };

/** The people in the API's order, cut into runs of the same number of skills met. */
function runsOfMatch(items: ProjectCandidate[]): ProjectCandidate[][] {
  const runs: ProjectCandidate[][] = [];
  for (const item of items) {
    const last = runs[runs.length - 1];
    if (last && last[0]!.matched === item.matched) last.push(item);
    else runs.push([item]);
  }
  return runs;
}

function Loading() {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <p role="status" className="sr-only">
        {t('projects.findPeople.loading')}
      </p>
      <Skeleton shape="title" className="w-40" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-3 border-b border-line pb-4 last:border-b-0">
          <span className="flex items-center gap-4">
            <span className="flex flex-1 items-center gap-2">
              <Skeleton shape="circle" />
              <span className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="w-1/2" />
                <Skeleton className="w-1/3" />
              </span>
            </span>
            <Skeleton shape="control" className="h-8 w-18" />
          </span>
          <span className="flex gap-2">
            <Skeleton className="h-7 w-35 rounded-full" />
            <Skeleton className="h-7 w-40 rounded-full" />
          </span>
        </div>
      ))}
    </div>
  );
}

/** "Java từ mức 5 hoặc Tiếng Nhật từ mức 4": what nobody meets. */
function criteriaText(query: CandidateQuery, names: Map<string, string>, t: (key: string, values?: Record<string, unknown>) => string): string {
  return query.skills.map((each) => t('projects.findPeople.criterion', { skill: names.get(each.skillId) ?? '', level: each.minLevel })).join(t('projects.findPeople.or'));
}

function Nobody({ state, query }: { state: FindPeopleResultsProps['state']; query: CandidateQuery }) {
  const { t } = useTranslation();
  const names = new Map((state.skills.data ?? []).map((each) => [each.id, each.name]));
  // The one asked for at the highest level, first of them: lowering it by one is the gentlest way to widen the search.
  const hardest = query.skills.reduce((best, each) => (each.minLevel > best.minLevel ? each : best), query.skills[0]!);
  const row = state.draft.rows.find((each) => each.skillId === hardest.skillId);
  return (
    <StateBlock
      variant="plain"
      icon={<Search />}
      title={t('projects.findPeople.noneTitle', { criteria: criteriaText(query, names, t) })}
      description={t('projects.findPeople.noneText')}
      actions={
        hardest.minLevel > 1 && row ? (
          <Button variant="secondary" size="sm" onClick={() => state.changeRow(row.key, { minLevel: hardest.minLevel - 1 })}>
            {t('projects.findPeople.lower', { skill: names.get(hardest.skillId) ?? '', level: hardest.minLevel - 1 })}
          </Button>
        ) : undefined
      }
    />
  );
}

function People({ state, query, data, onAllocate }: { state: FindPeopleResultsProps['state']; query: CandidateQuery; data: ProjectCandidates; onAllocate?: (candidate: ProjectCandidate) => void }) {
  const { t } = useTranslation();
  const sortOptions = [
    { value: 'match', label: t('projects.findPeople.sortMatch') },
    { value: 'free', label: t('projects.findPeople.sortFree') },
  ];
  const row = (each: ProjectCandidate) => <FindPeopleMatch key={each.employee.id} candidate={each} need={query.need} onAllocate={onAllocate} />;
  const required = query.skills.length;
  return (
    <>
      <div className="flex items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 aria-live="polite" className="text-[14px] leading-5 font-semibold tabular-nums">
            {t('projects.findPeople.count', { count: data.total })}
          </h3>
          <span className="text-caption text-ink-muted">
            {data.excludedMembers > 0 ? t('projects.findPeople.excluded', { count: data.excludedMembers }) : t('projects.findPeople.excludedNone')}
          </span>
        </div>
        <Field label={t('projects.findPeople.sort')} className="w-60">
          {(control) => <Select {...control} value={state.draft.sort} onChange={(sort) => state.setSort(sort === 'free' ? 'free' : 'match')} options={sortOptions} placeholder={t('projects.findPeople.sort')} />}
        </Field>
      </div>
      <div>
        {query.sort === 'match' ? (
          runsOfMatch(data.items).map((run) => {
            const matched = run[0]!.matched;
            const all = matched === required;
            return (
              <MatchGroup
                key={matched}
                title={all ? t('projects.findPeople.groupAll', { count: required }) : t('projects.findPeople.groupSome', { matched, required })}
                count={run.length}
                listLabel={all ? t('projects.findPeople.listAll', { count: required }) : t('projects.findPeople.listSome', { matched, required })}
              >
                {run.map(row)}
              </MatchGroup>
            );
          })
        ) : (
          <MatchList label={t('projects.findPeople.list')}>{data.items.map(row)}</MatchList>
        )}
        {data.total > data.items.length ? <p className="pt-3 text-caption text-ink-muted">{t('projects.findPeople.truncated', { shown: data.items.length, total: data.total })}</p> : null}
      </div>
    </>
  );
}

export function FindPeopleResults({ state, onAllocate }: FindPeopleResultsProps) {
  const { t } = useTranslation();
  const { query, search } = state;
  if (query === null || state.refusedFields) {
    if (Object.keys(state.errors).length > 0) return <p className="m-0 text-caption text-ink-muted">{t('projects.findPeople.fixFields')}</p>;
    return <EmptyState icon={<UserSearch />} title={t('projects.findPeople.idleTitle')} description={t('projects.findPeople.idleText')} />;
  }
  if (search.isError) return <ErrorState title={t('projects.findPeople.errorTitle')} description={t('projects.findPeople.errorText')} onRetry={() => void search.refetch()} />;
  if (!search.data) return <Loading />;
  if (search.data.items.length === 0) return <Nobody state={state} query={query} />;
  return <People state={state} query={query} data={search.data} onAllocate={onAllocate} />;
}
