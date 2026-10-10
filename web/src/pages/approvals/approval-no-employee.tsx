// An Account that is not linked to an Employee (the first Admin) has no inbox: the API answers 403.
import { UserX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';

export function ApprovalNoEmployee() {
  const { t } = useTranslation();
  return (
    <Card bare>
      <StateBlock variant="denied" icon={<UserX />} title={t('approvals.noEmployee.title')} description={t('approvals.noEmployee.text')} />
    </Card>
  );
}
