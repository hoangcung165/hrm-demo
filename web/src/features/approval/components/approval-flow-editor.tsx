// The flow of one request type, edited in place (artboard `#12 Cấu hình luồng phê duyệt`): its levels (1–3), Tự duyệt
// with the days, Ủy quyền duyệt, and the fixed rule that nobody approves their own request. Payroll keeps both
// switches off, locked, with the reason.
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { FormGroup } from '@/components/ui/form-group';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { ApprovalFlow } from '../flow-api';
import type { ApprovalFlowDraft } from '../use-approval-flow-draft';
import { ApprovalFlowLevelRow } from './approval-flow-level-row';

export type ApprovalFlowEditorProps = {
  flow: ApprovalFlow;
  edit: ApprovalFlowDraft;
};

export function ApprovalFlowEditor({ flow, edit }: ApprovalFlowEditorProps) {
  const { t } = useTranslation();
  const { draft } = edit;
  const type = flow.requestType;
  const locked = !flow.automationAllowed;
  return (
    <section aria-label={t('approvalFlows.edit', { type: t(`approvals.type.${type}`) })}>
      <Card title={t(`approvals.type.${type}`)} description={t(`approvalFlows.description.${type}`)}>
        <div className="flex flex-col gap-4">
          <FormGroup legend={t('approvalFlows.levels.legend')} className="border-t-0 pt-0">
            <ol className="flex flex-col gap-3">
              {draft.levels.map((level, index) => (
                <ApprovalFlowLevelRow
                  key={index}
                  index={index}
                  level={level}
                  type={type}
                  roleMissing={edit.rolesMissing[index] ?? false}
                  canRemove={draft.levels.length > 1}
                  onRule={(rule) => edit.setRule(index, rule)}
                  onRole={(role) => edit.setRole(index, role)}
                  onRemove={() => edit.removeLevel(index)}
                />
              ))}
            </ol>
            <div className="mt-3 flex items-center gap-3">
              <Button variant="secondary" size="sm" disabled={!edit.canAdd} onClick={edit.addLevel}>
                <Plus aria-hidden="true" className="!size-4" />
                {t('approvalFlows.levels.add')}
              </Button>
              <span className="text-caption text-ink-muted">{t('approvalFlows.levels.max')}</span>
            </div>
          </FormGroup>
          <FormGroup legend={t('approvalFlows.auto.legend')}>
            <div className="flex flex-col gap-4">
              <Switch
                label={t('approvalFlows.auto.label')}
                caption={t(locked ? 'approvalFlows.auto.locked' : 'approvalFlows.auto.hint')}
                checked={draft.autoApprove}
                locked={locked}
                onChange={edit.setAutoApprove}
              />
              {draft.autoApprove ? (
                <Field label={t('approvalFlows.auto.days')} helper={t('approvalFlows.auto.range')} error={edit.daysInvalid ? t('approvalFlows.auto.invalid') : undefined} className="w-44">
                  {(control) => (
                    <Input
                      {...control}
                      inputMode="numeric"
                      maxLength={2}
                      value={draft.days}
                      onChange={(event) => edit.setDays(event.target.value)}
                      className="tabular-nums"
                      trailing={<span className="text-ink-muted">{t('approvalFlows.auto.unit')}</span>}
                    />
                  )}
                </Field>
              ) : null}
            </div>
          </FormGroup>
          <FormGroup legend={t('approvalFlows.delegation.legend')}>
            <Switch
              label={t('approvalFlows.delegation.label')}
              caption={t(locked ? 'approvalFlows.delegation.locked' : 'approvalFlows.delegation.hint')}
              checked={draft.delegationAllowed}
              locked={locked}
              onChange={edit.setDelegation}
            />
          </FormGroup>
          <Alert variant="info" title={t('approvalFlows.selfRule.title')}>
            {t('approvalFlows.selfRule.text')}
          </Alert>
        </div>
      </Card>
    </section>
  );
}
