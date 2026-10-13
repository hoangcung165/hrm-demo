// "Tạo dự án" on the project list: PROJECT_EDIT_ALL names any PM; PROJECT_EDIT alone needs a linked Employee, who
// becomes the PM. Desktop only (the phone is view-only for projects). Opens the new project once it is saved.
import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useCurrentAccount } from '@/features/auth/account-context';
import { ProjectDialog } from '@/features/project/components/project-dialog';

export function ProjectCreateButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { permissions, employeeId, fullName } = useCurrentAccount();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const freePm = permissions.includes('PROJECT_EDIT_ALL');
  if (!freePm && !(permissions.includes('PROJECT_EDIT') && employeeId)) return null;
  return (
    <>
      <Button ref={button} onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" />
        {t('projects.form.createTitle')}
      </Button>
      {open ? (
        <ProjectDialog
          target={{ mode: 'create', pmEmployeeId: freePm ? '' : (employeeId ?? '') }}
          freePm={freePm}
          pm={freePm || !employeeId ? null : { id: employeeId, fullName, code: null }}
          onClose={() => setOpen(false)}
          onSaved={(project) => {
            setOpen(false);
            void navigate(`/projects/${project.id}`);
          }}
          fallbackFocus={button}
        />
      ) : null}
    </>
  );
}
