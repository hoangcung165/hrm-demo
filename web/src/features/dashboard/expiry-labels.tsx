// The icon, sentence and badge of a "Sắp hết hạn" row.
import type { TFunction } from 'i18next';
import { Award, FileText, Hourglass, IdCard, Plane } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ExpiryType, UpcomingExpiryItem } from '@/features/expiry/api';
import { formatDate } from '@/lib/format';

const ICONS: Record<ExpiryType, ReactNode> = {
  CONTRACT: <FileText />,
  PROBATION: <Hourglass />,
  VISA: <Plane />,
  WORK_PERMIT: <IdCard />,
  CERTIFICATE: <Award />,
};

export const expiryIcon = (type: ExpiryType) => ICONS[type];

/** "HĐLĐ xác định thời hạn hết hạn 30/11/2026", "Hết thử việc 02/11/2026". */
export function expirySentence(t: TFunction, item: UpcomingExpiryItem): string {
  const date = formatDate(item.expiresOn);
  if (item.type === 'PROBATION') return t('dashboard.expiry.sub.PROBATION', { date });
  return t('dashboard.expiry.sub.other', { name: item.sourceName || t(`expiry.type.${item.type}`), date });
}

/** A certificate is for information, the rest needs a decision (renew, extend, end): warning. */
export const expiryTone = (type: ExpiryType) => (type === 'CERTIFICATE' ? 'neutral' : 'warning');

export const expiryLeft = (t: TFunction, days: number) => (days <= 0 ? t('dashboard.expiry.today') : t('dashboard.expiry.left', { count: days }));
