// "Đang dùng" or "Ngừng dùng": the status of a shift, as text, never colour alone.
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

export type ShiftStatusBadgeProps = { active: boolean };

export function ShiftStatusBadge({ active }: ShiftStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge variant={active ? 'success' : 'neutral'} className="whitespace-nowrap">
      {t(active ? 'shifts.status.ACTIVE' : 'shifts.status.INACTIVE')}
    </Badge>
  );
}
