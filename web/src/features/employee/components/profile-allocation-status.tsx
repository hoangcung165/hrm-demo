// Status of an allocation in the project history: Bắt đầu dd/mm (upcoming) `info`, Đang tham gia `success`, Đã kết thúc `neutral`.
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { AllocationStatus } from '@/features/project/api';
import { formatDayMonth } from '@/lib/format';

export type ProfileAllocationStatusProps = { status: AllocationStatus; startDate: string };

const VARIANT = { UPCOMING: 'info', RUNNING: 'success', ENDED: 'neutral' } as const;

export function ProfileAllocationStatus({ status, startDate }: ProfileAllocationStatusProps) {
  const { t } = useTranslation();
  return (
    <Badge variant={VARIANT[status]} className="whitespace-nowrap">
      {status === 'UPCOMING' ? t('employees.profile.projects.startsOn', { date: formatDayMonth(startDate) }) : t(`employees.profile.projects.status.${status}`)}
    </Badge>
  );
}
