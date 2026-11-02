// "Tìm người" (HRM-16): a wide, non-modal drawer on the project detail that finds who could join the project — by
// skill, level and free time in a range. Read-only here: allocating from a result comes with the next slice.
import { useTranslation } from 'react-i18next';
import { Drawer } from '@/components/ui/drawer';
import { formatDateRange } from '@/lib/format';
import type { Project } from '../api';
import { useFindPeople } from '../use-find-people';
import { FindPeopleCriteria } from './find-people-criteria';
import { FindPeopleResults } from './find-people-results';

export type FindPeopleDrawerProps = { project: Project; onClose: () => void };

/** Mounted while open, so each opening starts from the first-open criteria. */
export function FindPeopleDrawer({ project, onClose }: FindPeopleDrawerProps) {
  const { t } = useTranslation();
  const state = useFindPeople(project);
  return (
    <Drawer open wide onClose={onClose} caption={`${project.code} · ${project.name} · ${formatDateRange(project.startDate, project.endDate)}`} title={t('projects.findPeople.title')}>
      <div className="flex flex-col gap-4">
        <FindPeopleCriteria state={state} />
        <FindPeopleResults state={state} />
      </div>
    </Drawer>
  );
}
