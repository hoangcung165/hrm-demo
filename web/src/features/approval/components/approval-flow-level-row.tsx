// One level of the flow being edited: "Cấp n", who approves it (the sender's line manager, the PM of the project for
// timesheets, or a role) and the role for a role level, and the button that removes it while more than one is left.
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import type { Role } from '@/features/auth/account';
import type { ApprovalRequestType, ApproverRule } from '../api';
import type { ApprovalFlowLevel } from '../flow-api';

/** The roles a level can name; every Employee holds EMPLOYEE, so it never approves. */
const ROLES: Role[] = ['HR', 'ACCOUNTANT', 'DIRECTOR', 'ADMIN'];

export type ApprovalFlowLevelRowProps = {
  index: number;
  level: ApprovalFlowLevel;
  type: ApprovalRequestType;
  roleMissing: boolean;
  canRemove: boolean;
  onRule: (rule: ApproverRule) => void;
  onRole: (role: Role) => void;
  onRemove: () => void;
};

export function ApprovalFlowLevelRow({ index, level, type, roleMissing, canRemove, onRule, onRole, onRemove }: ApprovalFlowLevelRowProps) {
  const { t } = useTranslation();
  const n = index + 1;
  const rules: ApproverRule[] = type === 'TIMESHEET' ? ['PROJECT_MANAGER', 'LINE_MANAGER', 'ROLE'] : ['LINE_MANAGER', 'ROLE'];
  return (
    <li className="grid grid-cols-[56px_minmax(0,1fr)_44px] items-end gap-3 rounded-md border border-line p-3 md:grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)_44px]">
      <span className="flex h-10 items-center font-semibold max-md:row-span-2 max-md:self-start">{t('approvalFlows.levels.level', { level: n })}</span>
      <Field label={t('approvalFlows.levels.approver')}>
        {(control) => (
          <Select
            {...control}
            value={level.rule}
            onChange={(value) => onRule(value as ApproverRule)}
            options={rules.map((rule) => ({ value: rule, label: t(`approvalFlows.levels.rule.${rule}`) }))}
            placeholder={t('approvalFlows.levels.approver')}
          />
        )}
      </Field>
      {level.rule === 'ROLE' ? (
        <Field label={t('approvalFlows.levels.role')} required error={roleMissing ? t('approvalFlows.levels.roleRequired') : undefined} className="max-md:col-start-2">
          {(control) => (
            <Select
              {...control}
              value={level.role ?? ''}
              onChange={(value) => onRole(value as Role)}
              options={ROLES.map((role) => ({ value: role, label: t(`role.${role}`) }))}
              placeholder={t('approvalFlows.levels.chooseRole')}
            />
          )}
        </Field>
      ) : (
        <span className="flex h-10 items-center text-caption text-ink-muted max-md:col-start-2 max-md:h-auto">{t(`approvalFlows.levels.hint.${level.rule}`)}</span>
      )}
      {canRemove ? (
        <Button variant="ghost" size="icon" aria-label={t('approvalFlows.levels.remove', { level: n })} onClick={onRemove} className="max-md:col-start-3 max-md:row-start-1">
          <Trash2 aria-hidden="true" />
        </Button>
      ) : (
        <span className="max-md:hidden" />
      )}
    </li>
  );
}
