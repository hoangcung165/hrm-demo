// Who approves a level, as a step shows it: "Quản lý trực tiếp", "PM của dự án", or the role ("HR").
import type { TFunction } from 'i18next';
import type { Role } from '@/features/auth/account';
import type { ApproverRule } from './api';

export function approverLabel(t: TFunction, rule: ApproverRule, role: Role | null): string {
  return rule === 'ROLE' && role ? t(`role.${role}`) : t(`approvals.rule.${rule}`);
}
