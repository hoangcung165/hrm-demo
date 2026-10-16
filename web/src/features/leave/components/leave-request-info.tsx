// The details of a request (artboard `#18 Chi tiết đơn nghỉ`): the days in words, the count, the reason, the files
// to download, the people copied and, for the sender, the balance after approval.
import { Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { DetailList, type DetailListItem } from '@/components/ui/detail-list';
import { useToast } from '@/components/ui/use-toast';
import { downloadLeaveAttachment, type LeaveRequestDetail } from '../api';
import { formatDays, formatSpanLong } from '../leave-format';
import { formatFileSize } from '@/lib/format';

export type LeaveRequestInfoProps = { request: LeaveRequestDetail };

export function LeaveRequestInfo({ request }: LeaveRequestInfoProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const none = <span className="text-ink-muted">{t('leave.detail.none')}</span>;
  const items: DetailListItem[] = [
    { label: t('leave.detail.type'), value: request.leaveType.name },
    { label: t('leave.detail.dates'), value: formatSpanLong(t, request.startDate, request.startPart, request.endDate, request.endPart) },
    { label: t('leave.detail.count'), value: t('leave.detail.workingDays', { value: formatDays(request.days) }) },
    { label: t('leave.detail.reason'), value: request.reason ? <span className="[overflow-wrap:anywhere] whitespace-pre-line">{request.reason}</span> : none },
    {
      label: t('leave.detail.files'),
      value: request.attachments.length ? (
        <ul className="flex flex-col gap-1">
          {request.attachments.map((file) => (
            <li key={file.id}>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-auto min-h-8 max-w-full text-left"
                onClick={() => downloadLeaveAttachment(request.id, file).catch(() => toast({ variant: 'danger', message: t('leave.files.downloadFailed', { name: file.fileName }) }))}
              >
                <Paperclip aria-hidden="true" className="!size-4" />
                {file.fileName}
                <span className="text-caption text-ink-muted">{formatFileSize(file.sizeBytes)}</span>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        none
      ),
    },
    { label: t('leave.detail.cc'), value: request.cc.length ? request.cc.map((person) => person.fullName).join(', ') : none },
  ];
  if (request.balance?.limited && request.remainingAfter !== null && request.status !== 'CANCELLED' && request.status !== 'REJECTED') {
    items.push({ label: t('leave.detail.after'), value: t('leave.detail.afterValue', { days: formatDays(request.remainingAfter), type: request.leaveType.name }) });
  }
  return <DetailList items={items} className="max-md:grid-cols-1 max-md:gap-y-1 max-md:[&_dd]:mb-2" />;
}
