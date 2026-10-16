// Shared UI rules: the server validates again and is always authoritative.
import type { ContractWrite, AmendmentWrite } from './write';
import type { EmploymentContract } from './api';

export type ContractKind = 'PROBATION' | 'FIXED_TERM' | 'INDEFINITE' | 'EMPLOYMENT_WITH_PROBATION';
export const CONTRACT_KINDS: ContractKind[] = ['PROBATION', 'FIXED_TERM', 'INDEFINITE', 'EMPLOYMENT_WITH_PROBATION'];

export const contractDefaults = (type: string) => ({
  insured: type !== 'PROBATION',
  taxMethod: type === 'PROBATION' ? 'WITHHOLD_10' : 'PROGRESSIVE',
});

export function probationPay(referenceSalary: number) {
  return Math.round(referenceSalary * 0.85);
}

/** Day-boundaries are inclusive; adjacent terms separated by a day do not overlap. */
export function overlapsContract(
  rows: Pick<EmploymentContract, 'id' | 'startsOn' | 'endsOn'>[],
  from: string, to: string | null, ignoreId?: string,
) {
  return rows.some(row => row.id !== ignoreId
    && (to === null || row.startsOn <= to)
    && (row.endsOn === null || row.endsOn >= from));
}

export const validMoney = (value: string) => value.trim() !== '' &&
  /^\d+(?:\.\d{1,2})?$/.test(value.trim()) && Number.isFinite(Number(value));

export function parseAllowances(value: string) {
  try { return Array.isArray(JSON.parse(value)) ? value : null; }
  catch { return null; }
}

export function validateContract(
  body: ContractWrite,
  other: EmploymentContract[],
  editingId?: string,
): 'required' | 'date' | 'salary' | 'allowances' | 'overlap' | 'reason' | null {
  if (!body.contractNumber.trim() || !CONTRACT_KINDS.includes(body.contractType as ContractKind)
    || !body.signedOn || !body.startsOn) return 'required';
  if (body.endsOn !== null && body.endsOn < body.startsOn) return 'date';
  if (!Number.isFinite(body.baseSalary) || body.baseSalary < 0 ||
    body.insuranceSalary !== null && (!Number.isFinite(body.insuranceSalary) || body.insuranceSalary < 0)) return 'salary';
  if (parseAllowances(body.allowancesJson) === null) return 'allowances';
  if (overlapsContract(other, body.startsOn, body.endsOn, editingId)) return 'overlap';
  const defaults = contractDefaults(body.contractType);
  if ((body.insured !== null && body.insured !== defaults.insured
    || body.taxMethod !== null && body.taxMethod !== defaults.taxMethod)
    && !body.overrideReason?.trim()) return 'reason';
  return null;
}

export function validateAmendment(
  body: AmendmentWrite,
  contract: EmploymentContract,
): 'required' | 'date' | 'salary' | 'allowances' | 'noChange' | 'reason' | null {
  if (!body.amendmentNumber.trim() || !body.signedOn || !body.effectiveOn
    || !body.description.trim()) return 'required';
  if (body.effectiveOn < contract.startsOn || contract.endsOn !== null && body.effectiveOn > contract.endsOn) return 'date';
  if (body.baseSalary !== null && (!Number.isFinite(body.baseSalary) || body.baseSalary < 0)
    || body.insuranceSalary !== null && (!Number.isFinite(body.insuranceSalary) || body.insuranceSalary < 0)) return 'salary';
  if (body.allowancesJson !== null && parseAllowances(body.allowancesJson) === null) return 'allowances';
  if (body.baseSalary === null && body.insuranceSalary === null && body.allowancesJson === null
    && body.insured === null && body.taxMethod === null) return 'noChange';
  if ((body.insured !== null && body.insured !== contract.insured
    || body.taxMethod !== null && body.taxMethod !== contract.taxMethod)
    && !body.overrideReason?.trim()) return 'reason';
  return null;
}
