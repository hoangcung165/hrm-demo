// The request form with what it needs (the active types, the caller's balances), its loading and error states, and
// what happens on send: a toast that names the approver, then the request.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { useToast } from '@/components/ui/use-toast';
import { errorMessage } from '@/features/auth/error-message';
import { useLeaveBalances, type LeaveBalanceItem } from '@/features/leave/api';
import { LeaveRequestForm } from '@/features/leave/components/leave-request-form';
import { formatDays } from '@/features/leave/leave-format';
import { useLeaveTypes, type LeaveTypeItem } from '@/features/leave/policy-api';
import { useLeaveForm, type LeaveFormValues } from '@/features/leave/use-leave-form';
import { useLeaveSend } from '@/features/leave/use-leave-send';
import { formatDate } from '@/lib/format';
import { companyToday } from '@/lib/company-time';
import { useMediaQuery } from '@/lib/use-media-query';

export type LeaveFormBodyProps = {
  /** The returned request being edited, with its values. */
  editing?: { id: string; values: LeaveFormValues };
};

export function LeaveFormBody({ editing }: LeaveFormBodyProps) {
  const { t } = useTranslation();
  const types = useLeaveTypes();
  const balances = useLeaveBalances(companyToday().getFullYear());
  if (types.isError || balances.isError) {
    return (
      <Card bare>
        <ErrorState title={t('leave.form.loadError')} description={t('state.errorHint')} onRetry={() => void Promise.all([types.refetch(), balances.refetch()])} />
      </Card>
    );
  }
  if (!types.data || !balances.data) return <Loading label={t('leave.form.loading')} rows={4} />;
  return <LoadedForm editing={editing} types={types.data.items} balanceItems={balances.data.items} />;
}

type LoadedFormProps = LeaveFormBodyProps & { types: LeaveTypeItem[]; balanceItems: LeaveBalanceItem[] };

function LoadedForm({ editing, types, balanceItems }: LoadedFormProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const compact = useMediaQuery('(max-width: 767px)');
  const balances = useMemo(() => new Map(balanceItems.map((item) => [item.leaveType.id, item])), [balanceItems]);
  const form = useLeaveForm(editing?.values ?? null, (id) => types.find((type) => type.id === id)?.policy?.halfDayAllowed ?? true);
  const send = useLeaveSend(form, editing?.id);
  const onSend = async () => {
    const approver = send.result?.approvers.firstLevel[0]?.fullName;
    const outcome = await send.submit();
    if (!outcome) return;
    if (!outcome.ok) {
      toast({ variant: 'danger', message: t('leave.form.sendFailed'), detail: errorMessage(outcome.error, t) });
      return;
    }
    const request = outcome.request;
    toast({
      variant: 'success',
      message: approver ? t(editing ? 'leave.form.resentTo' : 'leave.form.sentTo', { name: approver }) : t(editing ? 'leave.form.resent' : 'leave.form.sent'),
      detail: t('leave.form.sentDetail', { type: request.leaveType.name, days: formatDays(request.days), date: formatDate(request.startDate) }),
    });
    navigate(editing ? `/leave/requests/${request.id}` : '/leave');
  };
  return (
    <LeaveRequestForm
      form={form}
      send={send}
      types={types}
      balances={balances}
      compact={compact}
      sendLabel={t(editing ? 'leave.form.resend' : 'leave.form.send')}
      onSend={() => void onSend()}
      backTo={editing ? `/leave/requests/${editing.id}` : '/leave'}
    />
  );
}
