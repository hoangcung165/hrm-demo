// On "Hồ sơ của tôi": the Employee's profile update that is still open, waiting or returned to them, with a link to
// it. While one is open no new one can be sent.
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Alert } from '@/components/ui/alert';
import type { ApprovalInboxItem } from '@/features/approval/api';

export type ProfileUpdateStatusProps = { open: ApprovalInboxItem };

export function ProfileUpdateStatus({ open }: ProfileUpdateStatusProps) {
  const { t } = useTranslation();
  const returned = open.status === 'RETURNED_FOR_INFO';
  return (
    <Alert variant={returned ? 'warning' : 'info'} title={t(`profileUpdate.open.${returned ? 'RETURNED_FOR_INFO' : 'PENDING'}`)}>
      {returned ? t('profileUpdate.open.returnedText') : t('profileUpdate.open.pendingText', { level: open.level, count: open.levelCount })}{' '}
      <Link to={`/approvals/${open.id}`} className="font-medium text-link">
        {t('profileUpdate.open.view')}
      </Link>
    </Alert>
  );
}
