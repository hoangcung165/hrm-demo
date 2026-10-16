// The "Tạo đơn nghỉ" / "Sửa đơn" form (artboards `#18 Tạo đơn nghỉ (390)`, `vượt số dư`, `trạng thái`). On the
// desktop the fields sit on the left and what the check says (days, balance after, approver) with "Gửi đơn" on the
// right; at 390 one column in the drawn order with "Gửi đơn" pinned to the bottom.
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import type { LeaveBalanceItem } from '../api';
import { problemText } from '../problem-text';
import type { LeaveTypeItem } from '../policy-api';
import type { LeaveForm } from '../use-leave-form';
import type { LeaveSend } from '../use-leave-send';
import { LeaveApproverPreview } from './leave-approver-preview';
import { LeaveCcField } from './leave-cc-field';
import { LeaveCheckResult } from './leave-check-result';
import { LeaveDatesFields } from './leave-dates-fields';
import { LeaveFilesField } from './leave-files-field';
import { LeaveReasonField } from './leave-reason-field';
import { LeaveSendBar } from './leave-send-bar';
import { LeaveTypeChoice } from './leave-type-choice';

export type LeaveRequestFormProps = {
  form: LeaveForm;
  send: LeaveSend;
  types: LeaveTypeItem[];
  balances: Map<string, LeaveBalanceItem>;
  compact: boolean;
  /** "Gửi đơn" or "Gửi lại". */
  sendLabel: string;
  onSend: () => void;
  backTo: string;
};

export function LeaveRequestForm({ form, send, types, balances, compact, sendLabel, onSend, backTo }: LeaveRequestFormProps) {
  const { t } = useTranslation();
  const { values } = form;
  const typeName = types.find((type) => type.id === values.leaveTypeId)?.name ?? '';
  const fieldProblem = (code: string) => {
    const problem = send.problems.find((each) => each.code === code);
    return problem ? problemText(t, problem, typeName).title : undefined;
  };
  const required = t('leave.form.required');
  const dates = (
    <LeaveDatesFields
      form={form}
      startError={send.missing.start ? required : undefined}
      endError={send.missing.end ? required : fieldProblem('leave.invalid_dates')}
      invalid={send.has('leave.over_balance') || send.has('leave.overlap')}
    />
  );
  const type = <LeaveTypeChoice types={types} balances={balances} value={values.leaveTypeId} onChange={form.setType} error={send.missing.type ? t('leave.form.typeRequired') : undefined} />;
  const check = <LeaveCheckResult send={send} typeName={typeName} ready={form.payload !== null} />;
  const reason = <LeaveReasonField value={values.reason} onChange={form.setReason} />;
  const files = <LeaveFilesField files={values.files} onAdd={form.addFile} onRemove={form.removeFile} required={fieldProblem('leave.attachment_required')} />;
  const approver = <LeaveApproverPreview approvers={send.result?.approvers} />;
  const cc = <LeaveCcField value={values.cc} onAdd={form.addCc} onRemove={form.removeCc} />;
  const bar = <LeaveSendBar send={send} label={sendLabel} onSend={onSend} backTo={backTo} sticky={compact} />;
  if (compact) {
    return (
      <div className="flex flex-col gap-5">
        {type}
        {dates}
        {check}
        {reason}
        {files}
        {approver}
        {cc}
        {bar}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-6">
      <Card title={t('leave.form.detailsTitle')}>
        <div className="flex flex-col gap-5">
          {type}
          {dates}
          {reason}
          {files}
          {cc}
        </div>
      </Card>
      <div className="sticky top-4 flex flex-col gap-4">
        {check}
        <Card title={t('leave.approver.title')}>
          <LeaveApproverPreview approvers={send.result?.approvers} labelHidden />
        </Card>
        {bar}
      </div>
    </div>
  );
}
