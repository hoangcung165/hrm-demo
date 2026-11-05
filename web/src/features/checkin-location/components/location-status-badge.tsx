// "Đang dùng" or "Ngừng dùng": the status of a Địa điểm chấm công, as text, never colour alone.
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

export type LocationStatusBadgeProps = { active: boolean };

export function LocationStatusBadge({ active }: LocationStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge variant={active ? 'success' : 'neutral'} className="whitespace-nowrap">
      {t(active ? 'checkinLocations.status.ACTIVE' : 'checkinLocations.status.INACTIVE')}
    </Badge>
  );
}
