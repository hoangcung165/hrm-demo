// "Sửa dự án" on the project detail, for whoever may edit it (`canEdit`). Without PROJECT_EDIT_ALL the PM stays.
import { Pencil } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useCurrentAccount } from '@/features/auth/account-context';
import type { Project } from '@/features/project/api';
import { ProjectDialog } from '@/features/project/components/project-dialog';

export function ProjectEditButton({ project }: { project: Project }) {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  if (!project.canEdit) return null;
  const pm = project.pm ? { id: project.pm.id, fullName: project.pm.fullName, code: project.pm.code } : null;
  return (
    <>
      <Button ref={button} variant="secondary" onClick={() => setOpen(true)}>
        <Pencil aria-hidden="true" />
        {t('projects.form.editTitle')}
      </Button>
      {open ? (
        <ProjectDialog
          target={{ mode: 'edit', project }}
          freePm={permissions.includes('PROJECT_EDIT_ALL')}
          pm={pm}
          onClose={() => setOpen(false)}
          onSaved={() => setOpen(false)}
          fallbackFocus={button}
        />
      ) : null}
    </>
  );
}
