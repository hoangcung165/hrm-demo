// "n quá tải": how many members are above 100% Tải phân bổ from today on. Danger Badge with its icon, never colour alone.
import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';

export type ProjectOverloadBadgeProps = { count: number };

export function ProjectOverloadBadge({ count }: ProjectOverloadBadgeProps) {
  const { t } = useTranslation();
  if (count <= 0) return null;
  return (
    <Badge variant="danger" className="whitespace-nowrap">
      <TriangleAlert aria-hidden="true" />
      {t('projects.overloaded', { count, number: formatNumber(count) })}
    </Badge>
  );
}
