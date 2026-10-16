import { companyTodayIso } from '@/lib/company-time';
import type { EmploymentContract } from './api';
import type { ContractWrite } from './contract-write-api';

export type Allowance = { type: string; amount: number };
export type ContractFields = {
  contractNumber: string; contractType: string; signedOn: string;
  startsOn: string; endsOn: string; indefinite: boolean;
  baseSalary: string; insuranceSalary: string;
  agreedSalary: string; probationPercent: string;
  insured: boolean; taxMethod: string; overrideReason: string;
  allowances: Allowance[];
};
export const defaultsFor = (type: string) => ({
  insured: type !== 'PROBATION',
  taxMethod: type === 'PROBATION' ? 'WITHHOLD_10' : 'PROGRESSIVE',
});
export function initialContract(record: EmploymentContract | null): ContractFields {
  const type = record?.contractType ?? 'FIXED_TERM';
  const salary = record?.baseSalary ?? 0;
  const percent = type === 'PROBATION' ? 85 : 100;
  let allowances: Allowance[] = [];
  try {
    const data: unknown = JSON.parse(record?.allowancesJson ?? '[]');
    if (Array.isArray(data)) {
      allowances = data.filter((x): x is Allowance => Boolean(x && typeof x.type === 'string' && typeof x.amount === 'number'));
    }
  } catch { /* Existing invalid JSON must not crash the editor. */ }
  return {
    contractNumber: record?.contractNumber ?? '', contractType: type,
    signedOn: record?.signedOn ?? companyTodayIso(),
    startsOn: record?.startsOn ?? companyTodayIso(), endsOn: record?.endsOn ?? '',
    indefinite: record ? record.endsOn === null : false,
    baseSalary: record ? String(salary) : '',
    insuranceSalary: record?.insuranceSalary == null ? '' : String(record.insuranceSalary),
    agreedSalary: record && type === 'PROBATION' ? String(Math.round(salary / (percent / 100))) : '',
    probationPercent: String(percent),
    insured: record?.insured ?? defaultsFor(type).insured,
    taxMethod: record?.taxMethod ?? defaultsFor(type).taxMethod,
    overrideReason: '',
    allowances,
  };
}
export function moneyNumber(raw: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw.trim())) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n <= 999_999_999_999 ? n : null;
}
export function probationPay(agreed: string, percent: string): number | null {
  const amount = moneyNumber(agreed); const ratio = moneyNumber(percent);
  if (amount === null || ratio === null || ratio < 85 || ratio > 100) return null;
  return Math.round(amount * ratio / 100);
}
export function contractPayload(form: ContractFields, editing: boolean): ContractWrite | null {
  const salary = editing || form.contractType !== 'PROBATION'
    ? moneyNumber(form.baseSalary) : probationPay(form.agreedSalary, form.probationPercent);
  const insuranceSalary = form.insuranceSalary.trim() ? moneyNumber(form.insuranceSalary) : salary;
  if (!form.contractNumber.trim() || !form.signedOn || !form.startsOn || salary === null ||
      insuranceSalary === null || (!form.indefinite && (!form.endsOn || form.endsOn < form.startsOn))) return null;
  if (form.allowances.some(a => !a.type.trim() || !Number.isFinite(a.amount) || a.amount < 0)) return null;
  const defaults = defaultsFor(form.contractType);
  const overrides = form.insured !== defaults.insured || form.taxMethod !== defaults.taxMethod;
  if (overrides && !form.overrideReason.trim()) return null;
  return {
    contractNumber: form.contractNumber.trim(),
    contractType: form.contractType, signedOn: form.signedOn, startsOn: form.startsOn,
    endsOn: form.indefinite ? null : form.endsOn, baseSalary: salary,
    insuranceSalary, allowancesJson: JSON.stringify(form.allowances.map(a => ({ type: a.type.trim(), amount: a.amount }))),
    insured: form.insured, taxMethod: form.taxMethod, overrideReason: form.overrideReason.trim() || null,
  };
}
