// The tab "Ủy quyền duyệt": the caller's delegations to others (end one early, cancel one that has not started, each
// asked first) and the ones others gave them.
import { UserCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { StateBlock } from '@/components/ui/state-block';
import { useToast } from '@/components/ui/use-toast';
import { useApprovalDelegations, type ApprovalDelegation } from '@/features/approval/api';
import { ApprovalDelegationTable } from '@/features/approval/components/approval-delegation-table';
import { useDelegationActions } from '@/features/approval/delegation-api';
import { errorMessage } from '@/features/auth/error-message';
import { formatDateRange } from '@/lib/format';

export type ApprovalDelegationsSectionProps = { compact: boolean };

export function ApprovalDelegationsSection({ compact }: ApprovalDelegationsSectionProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const delegations = useApprovalDelegations();
  const { end, cancel } = useDelegationActions();
  const [asked, setAsked] = useState<{ kind: 'end' | 'cancel'; delegation: ApprovalDelegation } | null>(null);
  if (delegations.isError) {
    return (
      <Card bare>
        <ErrorState title={t('delegations.loadError')} onRetry={() => void delegations.refetch()} />
      </Card>
    );
  }
  if (!delegations.data) return <Loading label={t('delegations.loading')} />;
  const { given, received } = delegations.data;
  const name = asked?.delegation.delegate.fullName ?? '';
  const confirm = () => {
    if (!asked) return;
    const mutation = asked.kind === 'end' ? end : cancel;
    mutation.mutate(asked.delegation.id, {
      onSuccess: () => {
        toast({ variant: 'success', message: t(asked.kind === 'end' ? 'delegations.endEarly.done' : 'delegations.cancel.done', { name }) });
        setAsked(null);
      },
      onError: (error) => {
        toast({ variant: 'danger', message: t('delegations.failed'), detail: errorMessage(error, t) });
        setAsked(null);
      },
    });
  };
  const empty = (text: string) => (
    <Card bare>
      <StateBlock variant="plain" icon={<UserCheck />} title={text} />
    </Card>
  );
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="delegations-given" className="flex flex-col gap-3">
        <h2 id="delegations-given" className="text-heading">
          {t('delegations.given.title')}
        </h2>
        {given.length ? (
          <ApprovalDelegationTable side="given" rows={given} compact={compact} onEnd={(d) => setAsked({ kind: 'end', delegation: d })} onCancel={(d) => setAsked({ kind: 'cancel', delegation: d })} />
        ) : (
          empty(t('delegations.given.empty'))
        )}
        <p className="text-caption text-ink-muted">{t('delegations.given.hint')}</p>
      </section>
      <section aria-labelledby="delegations-received" className="flex flex-col gap-3">
        <h2 id="delegations-received" className="text-heading">
          {t('delegations.received.title')}
        </h2>
        {received.length ? <ApprovalDelegationTable side="received" rows={received} compact={compact} /> : empty(t('delegations.received.empty'))}
      </section>
      <ConfirmDialog
        open={asked !== null}
        title={t(asked?.kind === 'cancel' ? 'delegations.cancel.title' : 'delegations.endEarly.title', { name })}
        description={
          asked?.kind === 'cancel'
            ? t('delegations.cancel.text', { range: formatDateRange(asked.delegation.startDate, asked.delegation.endDate) })
            : t('delegations.endEarly.text', { name })
        }
        confirmLabel={t(asked?.kind === 'cancel' ? 'delegations.cancel.confirm' : 'delegations.endEarly.confirm')}
        cancelLabel={asked?.kind === 'cancel' ? t('delegations.cancel.keep') : undefined}
        pending={end.isPending || cancel.isPending}
        onConfirm={confirm}
        onCancel={() => setAsked(null)}
      />
    </div>
  );
}
