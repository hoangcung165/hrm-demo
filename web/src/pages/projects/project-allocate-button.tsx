// "Phân bổ nhân sự" on the project detail, for whoever may edit the project (and it is not closed). Desktop only.
import { UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAllocationActions } from '@/features/project/allocation-actions-context';

export function ProjectAllocateButton() {
  const { t } = useTranslation();
  const actions = useAllocationActions();
  if (!actions) return null;
  return (
    <Button ref={actions.addButtonRef} onClick={actions.openAdd}>
      <UserPlus aria-hidden="true" />
      {t('projects.allocate.addTitle')}
    </Button>
  );
}
