// Status of an Account: the same mapping as an inactive Organization unit, a word and an icon, never colour alone.
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { AccountStatus } from '../api';

export type AccountStatusBadgeProps = { status: AccountStatus };

export function AccountStatusBadge({ status }: AccountStatusBadgeProps) {
  const { t } = useTranslation();
  return status === 'LOCKED' ? (
    <Badge variant="neutral" className="whitespace-nowrap">
      <Lock aria-hidden="true" />
      {t('accounts.status.LOCKED')}
    </Badge>
  ) : (
    <Badge variant="success" className="whitespace-nowrap">
      {t('accounts.status.ACTIVE')}
    </Badge>
  );
}
