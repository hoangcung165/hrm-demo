// A flow in one line, as the flows table shows it: "2 cấp · Quản lý trực tiếp → HR".
import type { TFunction } from 'i18next';
import { approverLabel } from './approver-label';
import type { ApprovalFlowLevel } from './flow-api';

export function flowSummary(t: TFunction, levels: ApprovalFlowLevel[]): string {
  const chain = levels.map((level) => (level.rule === 'ROLE' && !level.role ? '…' : approverLabel(t, level.rule, level.role))).join(' → ');
  return t('approvalFlows.levels', { count: levels.length, chain });
}
