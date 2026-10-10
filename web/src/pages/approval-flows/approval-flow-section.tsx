// The flows table beside the edited flow, the save bar while it has unsaved changes, and the guard that asks before
// another type or page throws them away.
import { useTranslation } from 'react-i18next';
import { UnsavedChangesGuard } from '@/components/layout/unsaved-changes-guard';
import { SaveBar } from '@/components/ui/save-bar';
import { useToast } from '@/components/ui/use-toast';
import type { ApprovalRequestType } from '@/features/approval/api';
import { ApprovalFlowEditor } from '@/features/approval/components/approval-flow-editor';
import { ApprovalFlowTable } from '@/features/approval/components/approval-flow-table';
import { useSaveApprovalFlow, type ApprovalFlow } from '@/features/approval/flow-api';
import { useApprovalFlowDraft } from '@/features/approval/use-approval-flow-draft';
import { errorMessage } from '@/features/auth/error-message';

export type ApprovalFlowSectionProps = {
  flows: ApprovalFlow[];
  selected: ApprovalRequestType;
};

export function ApprovalFlowSection({ flows, selected }: ApprovalFlowSectionProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const flow = flows.find((f) => f.requestType === selected) ?? flows[0]!;
  const edit = useApprovalFlowDraft(flow);
  const save = useSaveApprovalFlow();
  const type = t(`approvals.type.${flow.requestType}`);
  const onSave = () => {
    if (edit.invalid) {
      toast({ variant: 'danger', message: t('approvalFlows.save.failed', { type }), detail: t('approvalFlows.save.fix') });
      return;
    }
    save.mutate(
      { type: flow.requestType, input: edit.input() },
      {
        onSuccess: () => toast({ variant: 'success', message: t('approvalFlows.save.saved', { type }) }),
        onError: (error) => toast({ variant: 'danger', message: t('approvalFlows.save.failed', { type }), detail: errorMessage(error, t) }),
      },
    );
  };
  return (
    <>
      <div className="grid items-start gap-6 min-[1200px]:grid-cols-[480px_minmax(0,1fr)] min-[1440px]:grid-cols-[520px_minmax(0,1fr)]">
        <ApprovalFlowTable flows={flows} selected={flow.requestType} />
        <ApprovalFlowEditor key={flow.requestType} flow={flow} edit={edit} />
      </div>
      {edit.dirty || save.isPending ? (
        <SaveBar
          label={t('approvalFlows.save.label')}
          title={t(save.isPending ? 'approvalFlows.save.saving' : 'approvalFlows.save.title', { type })}
          caption={t('approvalFlows.save.caption')}
          saving={save.isPending}
          discardLabel={t('approvalFlows.save.discard')}
          saveLabel={t('approvalFlows.save.save')}
          onDiscard={edit.discard}
          onSave={onSave}
        />
      ) : null}
      <UnsavedChangesGuard
        when={edit.dirty}
        includeSearch
        title={t('approvalFlows.leave.title')}
        description={t('approvalFlows.leave.text', { type })}
        confirmLabel={t('approvalFlows.leave.confirm')}
      />
    </>
  );
}
