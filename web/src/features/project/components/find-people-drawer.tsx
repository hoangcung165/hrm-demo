// "Tìm người" (HRM-16): a wide, non-modal drawer on the project detail that finds who could join the project — by
// skill, level and free time in a range. Read-only here: allocating from a result comes with the next slice.
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer } from '@/components/ui/drawer';
import { formatDateRange, formatPercent } from '@/lib/format';
import { useAllocationActions } from '../allocation-actions-context';
import type { Project } from '../api';
import type { ProjectCandidate } from '../candidates-api';
import { toQuery } from '../candidate-criteria';
import { useFindPeople } from '../use-find-people';
import { FindPeopleCriteria } from './find-people-criteria';
import { FindPeopleResults } from './find-people-results';

export type FindPeopleDrawerProps = { project: Project; onClose: () => void };

/** Mounted while open, so each opening starts from the first-open criteria. */
export function FindPeopleDrawer({ project, onClose }: FindPeopleDrawerProps) {
  const { t } = useTranslation();
  const state = useFindPeople(project);
  const actions = useAllocationActions();
  // After saving, the person has left the results and the button that opened the dialog is gone: focus lands here.
  const results = useRef<HTMLDivElement>(null);
  const query = state.query;
  const allocate =
    actions && query
      ? (candidate: ProjectCandidate) => {
          const skills = candidate.skills.filter((each) => each.level !== null).map((each) => t('projects.findPeople.skillLevel', { skill: each.name, level: each.level }));
          actions.openAdd({
            employee: { id: candidate.employee.id, code: candidate.employee.code, fullName: candidate.employee.fullName, orgUnitName: candidate.employee.orgUnitName },
            // The search waits a moment after typing; the dialog takes what is typed now, not what the results were found with.
            percent: (toQuery(state.draft, project) ?? query).need,
            startDate: query.from,
            endDate: query.to,
            note: t('projects.findPeople.allocateNote', { skills: skills.join(', '), free: formatPercent(candidate.freePercent) }),
            fallbackFocus: results,
          });
        }
      : undefined;
  return (
    <Drawer open wide onClose={onClose} caption={`${project.code} · ${project.name} · ${formatDateRange(project.startDate, project.endDate)}`} title={t('projects.findPeople.title')}>
      <div className="flex flex-col gap-4">
        <FindPeopleCriteria state={state} />
        <div ref={results} tabIndex={-1} className="flex flex-col gap-4 outline-none">
          <FindPeopleResults state={state} onAllocate={allocate} />
        </div>
      </div>
    </Drawer>
  );
}
