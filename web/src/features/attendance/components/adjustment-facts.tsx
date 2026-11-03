// The facts of a Đơn bổ sung công as a detail list: the day, its shift, the time(s) it gives and the reason. Shared by
// the approval inbox and the request page.
import type { TFunction } from 'i18next';
import type { DetailListItem } from '@/components/ui/detail-list';
import { formatCompanyTime } from '@/lib/format';
import type { AdjustmentDetail } from '../adjustment-api';
import { dayLabel, shiftTimes } from './daily-cells';

export function adjustmentFacts(request: AdjustmentDetail, t: TFunction): DetailListItem[] {
  return [
    { label: t('attendanceAdjustment.field.day'), value: `${dayLabel(request.date, t)}/${request.date.slice(0, 4)}` },
    { label: t('attendanceDaily.col.shift'), value: request.shift ? `${request.shift.name} · ${shiftTimes(request.shift, t)}` : '–' },
    { label: t('attendanceAdjustment.field.in'), value: request.in ? formatCompanyTime(request.in) : '–' },
    { label: t('attendanceAdjustment.field.out'), value: request.out ? formatCompanyTime(request.out) : '–' },
    { label: t('attendanceAdjustment.field.reason'), value: <span className="[overflow-wrap:anywhere]">{request.reason}</span> },
  ];
}
