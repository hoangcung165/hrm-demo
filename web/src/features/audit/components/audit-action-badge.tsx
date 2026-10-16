// What was done to the record: "Thêm", "Sửa" or "Xóa", always as text, never by colour alone.
import { useTranslation } from 'react-i18next';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { AuditAction } from '../api';

const VARIANT: Record<AuditAction, BadgeProps['variant']> = { CREATE: 'success', UPDATE: 'info', DELETE: 'danger' };

export type AuditActionBadgeProps = { action: AuditAction };

export function AuditActionBadge({ action }: AuditActionBadgeProps) {
  const { t } = useTranslation();
  return <Badge variant={VARIANT[action] ?? 'neutral'}>{t(`audit.action.${action}`, { defaultValue: action })}</Badge>;
}
