// The edited copy of one request type's flow: levels added, removed and changed, the auto-approve days (kept as typed
// text until it is a whole number from 1 to 30) and delegation. Unsaved while it differs from the saved flow.
import { useState } from 'react';
import type { Role } from '@/features/auth/account';
import type { ApproverRule } from './api';
import { MAX_AUTO_APPROVE_DAYS, MAX_LEVELS, type ApprovalFlow, type ApprovalFlowInput, type ApprovalFlowLevel } from './flow-api';

export type FlowDraft = { levels: ApprovalFlowLevel[]; autoApprove: boolean; days: string; delegationAllowed: boolean };

const draftOf = (flow: ApprovalFlow): FlowDraft => ({
  levels: flow.levels,
  autoApprove: flow.autoApproveDays !== null,
  days: String(flow.autoApproveDays ?? 3),
  delegationAllowed: flow.delegationAllowed,
});

const same = (a: FlowDraft, b: FlowDraft) =>
  JSON.stringify(a.levels) === JSON.stringify(b.levels) &&
  a.autoApprove === b.autoApprove &&
  (!a.autoApprove || a.days.trim() === b.days.trim()) &&
  a.delegationAllowed === b.delegationAllowed;

export function useApprovalFlowDraft(flow: ApprovalFlow) {
  const saved = draftOf(flow);
  const [draft, setDraft] = useState<FlowDraft>(saved);
  const [base, setBase] = useState(flow);
  // The saved flow changed (a save, another type): start again from it.
  if (base !== flow) {
    setBase(flow);
    setDraft(saved);
  }
  const days = Number(draft.days);
  const daysInvalid = draft.autoApprove && (!/^\d+$/.test(draft.days.trim()) || days < 1 || days > MAX_AUTO_APPROVE_DAYS);
  const rolesMissing = draft.levels.map((level) => level.rule === 'ROLE' && !level.role);
  const update = (change: Partial<FlowDraft>) => setDraft((current) => ({ ...current, ...change }));
  const setLevel = (index: number, level: ApprovalFlowLevel) => update({ levels: draft.levels.map((l, i) => (i === index ? level : l)) });
  return {
    draft,
    dirty: !same(draft, saved),
    daysInvalid,
    rolesMissing,
    invalid: daysInvalid || rolesMissing.some(Boolean),
    canAdd: draft.levels.length < MAX_LEVELS,
    setRule: (index: number, rule: ApproverRule) => setLevel(index, { rule, role: rule === 'ROLE' ? (draft.levels[index]?.role ?? null) : null }),
    setRole: (index: number, role: Role) => setLevel(index, { rule: 'ROLE', role }),
    addLevel: () => update({ levels: [...draft.levels, { rule: 'ROLE', role: null }] }),
    removeLevel: (index: number) => update({ levels: draft.levels.filter((_, i) => i !== index) }),
    setAutoApprove: (on: boolean) => update({ autoApprove: on }),
    setDays: (value: string) => update({ days: value }),
    setDelegation: (on: boolean) => update({ delegationAllowed: on }),
    discard: () => setDraft(saved),
    input: (): ApprovalFlowInput => ({ levels: draft.levels, autoApproveDays: draft.autoApprove ? Number(draft.days) : null, delegationAllowed: draft.delegationAllowed }),
  };
}

export type ApprovalFlowDraft = ReturnType<typeof useApprovalFlowDraft>;
