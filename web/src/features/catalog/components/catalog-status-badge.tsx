// "Đang dùng" or "Ngừng hoạt động": the status of a catalog item, as text, never colour alone.
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

export type CatalogStatusBadgeProps = { active: boolean };

export function CatalogStatusBadge({ active }: CatalogStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge variant={active ? 'success' : 'neutral'} className="whitespace-nowrap">
      {t(active ? 'catalogs.status.ACTIVE' : 'catalogs.status.INACTIVE')}
    </Badge>
  );
}
