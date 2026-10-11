// Trạng thái dự án as a Badge: Đang chạy `success`, Lên kế hoạch `info`, Tạm dừng `warning`, Đã đóng `neutral`.
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { ProjectStatus } from '../api';

export type ProjectStatusBadgeProps = { status: ProjectStatus };

const VARIANT = { ACTIVE: 'success', PLANNED: 'info', ON_HOLD: 'warning', CLOSED: 'neutral' } as const;

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge variant={VARIANT[status]} className="whitespace-nowrap">
      {t(`projects.status.${status}`)}
    </Badge>
  );
}
