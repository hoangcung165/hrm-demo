// The request types of a delegation in one line: "Tất cả loại cho phép ủy quyền" when it covers them all.
import type { TFunction } from 'i18next';
import type { ApprovalRequestType } from './api';
import { DELEGABLE_TYPES } from './delegation-api';

export function delegationTypes(t: TFunction, types: ApprovalRequestType[]): string {
  if (DELEGABLE_TYPES.every((type) => types.includes(type))) return t('delegations.allTypes');
  return DELEGABLE_TYPES.filter((type) => types.includes(type))
    .map((type) => t(`approvals.type.${type}`))
    .join(', ');
}
