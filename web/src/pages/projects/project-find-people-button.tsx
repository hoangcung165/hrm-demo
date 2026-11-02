// "Tìm người" on the project detail, for whoever may edit the project's allocations (and it is not closed). Desktop only.
import { UserSearch } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { Project } from '@/features/project/api';
import { FindPeopleDrawer } from '@/features/project/components/find-people-drawer';

export function ProjectFindPeopleButton({ project }: { project: Project }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  if (!project.canEdit || project.status === 'CLOSED') return null;
  return (
    <>
      <Button ref={button} variant="secondary" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <UserSearch aria-hidden="true" />
        {t('projects.findPeople.open')}
      </Button>
      {open ? <FindPeopleDrawer project={project} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
